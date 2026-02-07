import { createClient } from "@supabase/supabase-js";

import { GEMINI_MODELS, GeminiClient } from "../_shared/api-clients.ts";
import { SYSTEM_INSTRUCTION as DRACONIAN_SYSTEM_INSTRUCTION } from "../_shared/prompts.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AnalyzeRequest {
  companyId: string;
}

// Helper for Google Maps Place Search (Still local, or could be moved to shared but out of scope)
async function searchCompanyOnMaps(companyName: string, apiKey: string) {
  const url = "https://places.googleapis.com/v1/places:searchText";
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.googleMapsUri,places.id",
      },
      body: JSON.stringify({ textQuery: companyName }),
    });

    if (!resp.ok) return null;

    const data = await resp.json();
    const place = data.places?.[0];

    if (!place) return null;

    return {
      placeId: place.name,
      formattedAddress: place.formattedAddress,
      rating: place.rating,
      userRatingsTotal: place.userRatingCount,
      url: place.googleMapsUri,
    };
  } catch (e) {
    console.error(`[MAPS] Error searching for ${companyName}:`, e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { companyId } = await req.json() as AnalyzeRequest;

    if (!companyId) {
      throw new Error("Missing companyId");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    console.log(`[ANALYZE] Starting Deep Dive for Company ID: ${companyId}`);

    // 1. FETCH COMPANY DATA
    const { data: company, error: companyError } = await supabase
      .from("company_analyses")
      .select("*")
      .eq("id", companyId)
      .single();

    if (companyError || !company) {
      throw new Error("Company not found");
    }

    const projectId = company.project_id;
    const companyUrl = company.company_url;
    const companyName = company.company_name;

    // 2. FETCH CONTEXT (Agency Docs)
    // (Similar logic to discover-companies, kept concise)
    const { data: projectData } = await supabase
      .from("project_data")
      .select("data_type, data")
      .eq("project_id", projectId);

    const { data: documentsData } = await supabase
      .from("company_documents")
      .select("file_name, extracted_content")
      .eq("project_id", projectId)
      .eq("extraction_status", "completed");

    const agencyDNA = projectData?.find((d) =>
      d.data_type === "agency_dna"
    )?.data || {};
    const brainWebsiteContent = agencyDNA.extractedContent?.websiteContent ||
      "";
    const documentsContent = documentsData?.map((d) =>
      `--- DOCUMENT: ${d.file_name} ---\n${
        d.extracted_content?.substring(0, 500000)
      }`
    ).join("\n\n") || "";

    const GlobalContext = `
    === WEBSITE CONTENT (SOURCE OF TRUTH 1) ===
    ${brainWebsiteContent.substring(0, 20000)}

    === UPLOADED KNOWLEDGE BASE (SOURCE OF TRUTH 2 - CRITICAL) ===
    ${documentsContent.substring(0, 100000)}
    `;

    // PROOF OF LIFE
    if (documentsContent.length > 0) {
      console.log(
        `[ANALYZE] 📄 DOCUMENTS LOADED for Context (${documentsContent.length} chars)`,
      );
      console.log(
        `[ANALYZE] 🔍 PREVIEW: ${documentsContent.substring(0, 200)}...`,
      );
    } else {
      console.warn(`[ANALYZE] ⚠️ NO DOCUMENTS FOUND in Context!`);
    }

    // 3. API KEYS
    const googleApiKey = Deno.env.get("GOOGLE_API_KEY") ||
      Deno.env.get("GEMINI_API_KEY")!;
    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY")!;

    const gemini = new GeminiClient(googleApiKey);

    // 4. SCRAPE TARGET SITE (Robust)
    let validUrl = companyUrl;
    // Basic cleaning
    if (validUrl && !validUrl.startsWith("http")) {
      validUrl = "https://" + validUrl;
    }

    console.log(`[ANALYZE] Scraping ${validUrl || companyName}...`);
    let scrapedContent = "";
    let isScrapeSuccessful = false;

    if (validUrl && validUrl.includes(".")) {
      try {
        const scrapeResp = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${firecrawlKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: validUrl,
            formats: ["markdown"],
            onlyMainContent: true,
            timeout: 30000, // Reduced timeout to fail faster
          }),
        });

        if (scrapeResp.ok) {
          const d = await scrapeResp.json();
          scrapedContent = d.data?.markdown || "";
          isScrapeSuccessful = true;
        } else {
          console.warn("Firecrawl scrape failed, status:", scrapeResp.status);
        }
      } catch (e) {
        console.error("Scrape Error (continue anyway)", e);
      }
    }

    if (!isScrapeSuccessful) {
      console.warn("[ANALYZE] ⚠️ Scrape failed or no URL. Using Fallback.");
      scrapedContent = `[WEBSITE CONTENT UNAVAILABLE] 
        The AI could not access the website. 
        Analyze this company based strictly on its Name: "${companyName}" 
        and Industry/Context clues if available. 
        Focus on how the Agency can help a company with this name/profile.`;
    }

    // 5. ENRICH WITH GOOGLE MAPS
    const mapsData = await searchCompanyOnMaps(companyName, googleApiKey);

    // 6. GEMINI DEEP ANALYSIS
    console.log(`[ANALYZE] Running Gemini Analyst...`);

    const analysisPrompt = `
    [SYSTEM: KORTEX SKEPTIC - DEEP DIVE]
    CONTEXT: Deeply analyze this specific company to see if they are a perfect client for the Agency.
    
    === AGENCY CONTEXT ===
    ${GlobalContext}
    
    === TARGET COMPANY CONTENT ===
    URL: ${companyUrl} (Scrape Status: ${
      isScrapeSuccessful ? "Success" : "Failed"
    })
    CONTENT:
    ${scrapedContent.substring(0, 15000)}
    
    === MISSION ===
    1. Score this prospect (0-100) based on alignment with the Agency's solution.
       (If website content is missing, infer based on Company Name/Industry and typical pains in that sector).
    2. Identify specific pain points evidencing need for the Agency's solution.
    3. Find Buying Signals (e.g. outdated tech, hiring, bad reviews) - OR infer likely signals for this sector.
    
    OUTPUT JSON:
    {
        "match_score": 0-100,
        "match_explanation": "One sentence summary of why they fit or don't fit.",
        "detected_pain_points": ["Pain 1", "Pain 2"],
        "buying_signals": ["Signal 1", "Signal 2"],
        "strategic_analysis": "Detailed reasoning linking company problems to the Agency's solutions.",
        "evidence_snippet": "Quote from site or Inference rationale"
    }
    `;

    interface AnalysisResult {
      match_score: number;
      match_explanation: string;
      detected_pain_points: string[];
      buying_signals: string[];
      strategic_analysis: string;
      evidence_snippet: string;
    }

    // MIGRATION: Use GeminiClient + ULTRA + 0.0 + Draconian Truth
    // Note: Analysis prompt has its own persona, but Draconian Truth should overlay it for vocabulary.
    const result = await gemini.generateJSON<AnalysisResult>(
      analysisPrompt,
      GEMINI_MODELS.ULTRA,
      DRACONIAN_SYSTEM_INSTRUCTION,
      undefined,
      { temperature: 0.0 },
    ).catch((e) => {
      console.error("Gemini Failure Return default", e);
      return {
        match_score: 0,
        match_explanation: "Failed to analyze with AI",
        detected_pain_points: [],
        buying_signals: [],
        strategic_analysis: "AI Error during analysis",
        evidence_snippet: "",
      } as AnalysisResult;
    });

    // 7. SAVE RESULTS
    const updatePayload = {
      match_score: result.match_score || 0,
      match_explanation: result.match_explanation || "Analyzed",
      detected_pain_points: result.detected_pain_points || [],
      buying_signals: result.buying_signals || [],
      strategic_analysis: result.strategic_analysis || "No details",
      analysis_status: "deduced", // NOW it is fully analyzed
      analyzed_at: new Date().toISOString(),
      location: mapsData?.formattedAddress || company.location,
      custom_hook: JSON.stringify({
        googleMaps: mapsData,
        evidence: result.evidence_snippet,
      }),
    };

    const { error: updateError } = await supabase
      .from("company_analyses")
      .update(updatePayload)
      .eq("id", companyId);

    if (updateError) throw updateError;

    console.log(`[ANALYZE] Success! Score: ${result.match_score}`);

    return new Response(
      JSON.stringify({ success: true, data: { ...company, ...updatePayload } }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: unknown) {
    console.error("[ANALYZE] Error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
