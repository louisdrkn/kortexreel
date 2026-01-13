import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  API_KEYS,
  GEMINI_MODELS,
  GeminiClient,
} from "../_shared/api-clients.ts";
import { buildProjectContext } from "../_shared/project-context.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AnalysisRequest {
  companyName: string;
  companyUrl: string;
  projectId: string;
  agencyContext?: string;
}

// Extract clean root domain
function extractRootDomain(url: string): string {
  try {
    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
      cleanUrl = `https://${cleanUrl}`;
    }
    const urlObj = new URL(cleanUrl);
    return urlObj.hostname.replace("www.", "");
  } catch {
    return url.replace(/^(https?:\/\/)?(www\.)?/, "").split("/")[0].split(
      "?",
    )[0].split("#")[0];
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { companyName, companyUrl, projectId } = await req
      .json() as AnalysisRequest;

    if (!companyName || !companyUrl || !projectId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Initialize Clients
    const firecrawlKey = API_KEYS.FIRECRAWL ||
      Deno.env.get("FIRECRAWL_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const rawAuthHeader = req.headers.get("Authorization");

    const supabase = createClient(supabaseUrl, supabaseKey);
    const gemini = new GeminiClient(API_KEYS.GEMINI);

    // Auth check
    let userId: string | null = null;
    if (rawAuthHeader) {
      const token = rawAuthHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const rootDomain = extractRootDomain(companyUrl);
    const formattedUrl = `https://${rootDomain}`;

    // --- 0. CHECK CACHE (Check-First Pattern) ---
    // Check if we already have a recent analysis (less than 7 days)
    const { data: existingAnalysis } = await supabase
      .from("company_analyses")
      .select("*")
      .eq("company_url", rootDomain)
      .eq("project_id", projectId)
      .single();

    if (existingAnalysis) {
      const analyzeDate = new Date(existingAnalysis.analyzed_at);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - analyzeDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 7) {
        console.log(
          `[KORTEX] 💰 CACHE HIT for ${companyName} (${rootDomain}) - Age: ${diffDays} days`,
        );
        return new Response(
          JSON.stringify({
            success: true,
            analysis: existingAnalysis,
            cached: true,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      } else {
        console.log(
          `[KORTEX] 🔄 CACHE EXPIRED for ${companyName} (${rootDomain}) - Age: ${diffDays} days. Re-analyzing.`,
        );
      }
    }

    console.log(`[KORTEX] 🧠 DEEP ANALYZER (Gemini 3.0 Pro)`);
    console.log(`[KORTEX] 🏢 Target: ${companyName} (${rootDomain})`);

    // --- OMNI-CONTEXT LOADING ---
    // We ignore any context passed from frontend and load the TRUTH from DB
    const AGENCY_CONTEXT = await buildProjectContext(supabase, projectId);

    // --- 1. Firecrawl Scraping (Multi-page) ---
    let scrapedContent = "";
    let keyUrls: Record<string, string> = {};
    let logoUrl = "";

    if (firecrawlKey) {
      const pagesToScrape = [
        { path: "", label: "home" },
        { path: "/about", label: "about" },
        { path: "/services", label: "services" },
        { path: "/solutions", label: "solutions" },
        { path: "/careers", label: "careers" },
        { path: "/pricing", label: "pricing" },
      ];

      for (const page of pagesToScrape) {
        try {
          // We do a simplified scrape loop to save time/tokens but get key pages
          const pageUrl = page.path
            ? `${formattedUrl}${page.path}`
            : formattedUrl;
          console.log(`[KORTEX] Scraping: ${pageUrl}`);

          const scrapeResp = await fetch(
            "https://api.firecrawl.dev/v1/scrape",
            {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${firecrawlKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                url: pageUrl,
                formats: ["markdown"],
                onlyMainContent: true,
                timeout: 15000,
              }),
            },
          );

          if (scrapeResp.ok) {
            const data = await scrapeResp.json();
            const md = data.data?.markdown || "";
            if (md.length > 200) {
              scrapedContent +=
                `\n\n=== REF: ${page.label.toUpperCase()} (${pageUrl}) ===\n${
                  md.slice(0, 5000)
                }`;
              keyUrls[page.label] = pageUrl;
              if (!logoUrl && data.data?.metadata?.ogImage) {
                logoUrl = data.data.metadata.ogImage;
              }
            }
          }
        } catch (e) {
          console.warn(`[KORTEX] Scrape fail for ${page.label}`, e);
        }
      }
    }

    if (!logoUrl) logoUrl = `https://logo.clearbit.com/${rootDomain}`;

    // --- 2. Gemini 3.0 Analysis ---
    console.log(
      `[KORTEX] Analyzing ${scrapedContent.length} chars with Gemini 3.0 Pro...`,
    );

    // Default fallback
    let analysisResult = {
      description_long: "Analysis failed or content insufficient.",
      detected_pain_points: [],
      buying_signals: [],
      strategic_analysis: "",
      custom_hook: "",
      match_score: 50,
      match_explanation: "Insufficient data.",
    };

    if (scrapedContent.length > 500) {
      const systemPrompt = `You are Kortex, an elite B2B Sales Intel Agent.
        Your goal is to prepare a deeply personalized commercial approach.
        
        CONTEXT OF OUR OFFER (AGENCY DNA & STRATEGY):
        ${AGENCY_CONTEXT}
        
        Analyze the provided website content for ${companyName}.
        
        OUTPUT JSON ONLY:
        {
          "description_long": "Clear summary of their activity (2-3 sentences). Who do they serve?",
          "detected_pain_points": ["Pain point 1 (MUST cite source/page)", "Pain point 2"],
          "buying_signals": ["Signal 1 (Hiring, Expansion, Tech)", "Signal 2"],
          "strategic_analysis": "Why they fit our offer. Structured argument based on PROOFS found.",
          "custom_hook": "Hyper-specific cold email hook (1-2 sentences) referencing a REAL detail found.",
          "match_score": 85,
          "match_explanation": "Why this score? (e.g. 'Strong fit due to X')"
        }`;

      try {
        const aiData = await gemini.generateJSON(
          `Analyze Target: ${companyName}\nDomain: ${rootDomain}\n\nCONTENT:\n${
            scrapedContent.slice(0, 40000)
          }`, // Gemini 3.0 has huge context
          GEMINI_MODELS.ULTRA,
          systemPrompt,
        );
        analysisResult = { ...analysisResult, ...aiData };
      } catch (e) {
        console.error("[KORTEX] Gemini Analysis Failed:", e);
      }
    }

    // --- 3. Save to Database ---
    const analysisRecord = {
      project_id: projectId,
      user_id: userId,
      company_name: companyName,
      company_url: rootDomain,
      logo_url: logoUrl,
      description_long: analysisResult.description_long,
      detected_pain_points: analysisResult.detected_pain_points || [],
      strategic_analysis: analysisResult.strategic_analysis,
      buying_signals: analysisResult.buying_signals || [],
      key_urls: keyUrls,
      custom_hook: analysisResult.custom_hook,
      match_score: analysisResult.match_score,
      match_explanation: analysisResult.match_explanation,
      analysis_status: "completed",
      analyzed_at: new Date().toISOString(),
    };

    const { data: savedAnalysis, error: saveError } = await supabase
      .from("company_analyses")
      .upsert(analysisRecord, { onConflict: "project_id,company_url" })
      .select()
      .single();

    if (saveError) {
      console.error("[KORTEX] DB Save Error:", saveError);
      throw saveError;
    }

    return new Response(
      JSON.stringify({ success: true, analysis: savedAnalysis }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[KORTEX] Critical Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
