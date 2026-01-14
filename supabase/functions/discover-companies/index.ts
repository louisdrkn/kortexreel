import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { repairJson } from "../_shared/json-repair.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface DiscoverRequest {
  projectId: string;
  force_refresh?: boolean;
  strategy?: string;
}

// Helper for Gemini v1 Fetch
async function callGeminiV1(apiKey: string, prompt: string, temperature = 0.3) {
  const apiUrl =
    `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-pro:generateContent?key=${apiKey}`;

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: temperature,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("❌ GEMINI V1 FETCH FAILED:", response.status, errorText);
    throw new Error(`Gemini V1 Error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  return text;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { projectId, force_refresh, strategy } = await req
      .json() as DiscoverRequest;

    if (!projectId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing projectId parameter",
          code: "VALIDATION_FAIL",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // --- FETCH PROJECT CONTEXT ---
    console.log(`[DISCOVER] Fetching project context for ${projectId}...`);
    const { data: projectData, error: projectError } = await supabase
      .from("project_data")
      .select("data_type, data")
      .eq("project_id", projectId);

    if (projectError) {
      throw new Error(`Failed to fetch project data: ${projectError.message}`);
    }

    const agencyDNA = projectData?.find((d) =>
      d.data_type === "agency_dna"
    )?.data || {};
    const targetDef = projectData?.find((d) =>
      d.data_type === "target_definition"
    )?.data || {};

    console.log("DEBUG DNA:", {
      agencyDNA_keys: Object.keys(agencyDNA),
      pitch_preview: agencyDNA?.pitch
        ? agencyDNA.pitch.substring(0, 20)
        : "MISSING",
      target_preview: targetDef?.targetDescription
        ? targetDef.targetDescription.substring(0, 20)
        : "MISSING",
    });

    if (!projectData || projectData.length === 0) {
      console.warn("[DISCOVER] Project data not found.");
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "Données du projet introuvables. Veuillez remplir le Cerveau Agence.",
          code: "CONTEXT_MISSING",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // OPTION B: FORCE PASS to unblock User
    if (!agencyDNA?.pitch || agencyDNA.pitch.length < 10) {
      console.warn(
        "⚠️ VIOLATION: Pitch missing or too short, but forcing execution (Option B).",
      );
      // Fallback or just proceed - Gemini might hallucinate if empty.
    }
    if (
      !targetDef?.targetDescription || targetDef.targetDescription.length < 5
    ) {
      console.warn(
        "⚠️ VIOLATION: Target missing or too short, but forcing execution (Option B).",
      );
    }

    // --- 1. CACHE VERIFICATION ---
    const targetQuery =
      (targetDef?.targetDescription || "generic company search").toLowerCase()
        .trim();
    const signature = `${projectId}_${targetQuery.substring(0, 100)}`;

    if (signature && !force_refresh) {
      const { data: cachedProspects } = await supabase
        .from("kortex_prospects")
        .select("match_data")
        .eq("query_signature", signature)
        .limit(20);

      if (cachedProspects && cachedProspects.length > 0) {
        console.log("🚀 CACHE HIT: Prospects found in database!");

        // NORMALIZE CACHED DATA (Legacy Support)
        const normalizedCompanies = cachedProspects.map((p) => {
          const d = p.match_data;
          return {
            name: d.name || d.company_name || "Entreprise Inconnue",
            website: d.website || d.url || d.company_url || "",
            score: d.score || d.match_score || 0,
            reasoning: d.reasoning || d.why_match || d.match_explanation ||
              "Correspondance détectée par IA (Cache)",
            ...d,
          };
        });

        const responsePayload = {
          success: true,
          companies: normalizedCompanies,
          cached: true,
        };

        console.log(
          "FINAL_BACKEND_OUTPUT (CACHE):",
          JSON.stringify(responsePayload, null, 2),
        );

        return new Response(
          JSON.stringify(responsePayload),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // --- 2. CONFIGURATION ---
    const googleApiKey = Deno.env.get("GOOGLE_API_KEY") ||
      Deno.env.get("GEMINI_API_KEY");
    if (!googleApiKey) {
      throw new Error(
        "Missing Google API Key (GOOGLE_API_KEY or GEMINI_API_KEY)",
      );
    }

    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!firecrawlKey) throw new Error("Missing FIRECRAWL_API_KEY");

    // --- 3. THE COMMANDANT (Search Strategy) ---
    console.log("🫡 COMMANDANT: Planning search strategy (via Fetch v1)...");
    const strategyPrompt = `
    [SYSTEM: KORTEX COMMANDER]
    CONTEXT: You are "Expert Kortex", a master strategist.
    INPUTS:
    - PITCH: "${agencyDNA.pitch || "Not provided"}"
    - TARGET: "${targetDef.targetDescription || "Generic Target"}"
    - INDUSTRIES: "${(targetDef.industries || []).join(", ")}"
    - STRATEGY HINT: "${strategy || "None"}"
    
    MISSION: Generate 4 Google search queries to find COMPANIES matching this profile.
    STRICT JSON OUTPUT: { "firecrawl_missions": ["Query 1", "Query 2", "Query 3", "Query 4"] }
    `;

    const strategyRaw = await callGeminiV1(googleApiKey, strategyPrompt);
    const strategyJson = repairJson<{ firecrawl_missions: string[] }>(
      strategyRaw,
    );
    const missions = strategyJson?.firecrawl_missions || [];

    if (missions.length === 0) {
      throw new Error("AI failed to generate search queries.");
    }
    console.log(
      `[COMMANDANT] Generated ${missions.length} missions:`,
      missions,
    );

    // --- 4. THE SWARM (Firecrawl Execution) ---
    console.log("🐝 SWARM: Launching Firecrawl search...");
    let allUrls: string[] = [];

    await Promise.all(missions.map(async (q: string) => {
      try {
        const searchResp = await fetch("https://api.firecrawl.dev/v1/search", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${firecrawlKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query: q, limit: 5 }),
        });
        if (searchResp.ok) {
          const searchData = await searchResp.json();
          if (searchData.success && searchData.data) {
            searchData.data.forEach((item: any) => {
              if (item.url) allUrls.push(item.url);
            });
          }
        }
      } catch (e) {
        console.error(`[SWARM] Search error for "${q}":`, e);
      }
    }));

    const uniqueUrls = [...new Set(allUrls)]
      .filter((u) =>
        !u.includes("linkedin") && !u.includes("indeed") &&
        !u.includes("facebook")
      )
      .slice(0, 3); // Limit to 3 for speed

    if (uniqueUrls.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "No company websites found.",
          code: "NO_RESULTS",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(`[SWARM] Scraping ${uniqueUrls.length} sites...`);
    const scrapeResults = await Promise.all(uniqueUrls.map(async (url) => {
      try {
        const scrapeResp = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${firecrawlKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url,
            formats: ["markdown"],
            onlyMainContent: true,
            timeout: 30000,
          }),
        });
        if (scrapeResp.ok) {
          const d = await scrapeResp.json();
          return { url, content: d.data?.markdown || "", status: "success" };
        }
        return { url, content: "", status: "failed" };
      } catch (e) {
        return { url, content: "", status: "failed" };
      }
    }));

    const validSites = scrapeResults.filter((s) =>
      s.status === "success" && s.content.length > 200
    );

    if (validSites.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Could not scrape websites.",
          code: "SCRAPE_FAILED",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // --- 5. THE ANALYST (Validation & Scoring) ---
    console.log(
      `⚖️ ANALYST: Evaluating ${validSites.length} prospects (via Fetch v1)...`,
    );
    const sitesForAnalysis = validSites.map((site) => ({
      url: site.url,
      content: site.content.substring(0, 4000),
    }));

    const analysisPrompt = `
    [SYSTEM: KORTEX ANALYST]
    CONTEXT: Analyze these websites against the Agency DNA and Target Criteria.
    AGENCY PITCH: "${agencyDNA.pitch || ""}"
    TARGET: "${targetDef.targetDescription || ""}"
    PROSPECTS: ${JSON.stringify(sitesForAnalysis)}
    
    MISSION: Filter and score. 0-100.
    OUTPUT FORMAT (JSON Array): [{ "name": "...", "website": "...", "score": 0-100, "reasoning": "...", "pain_point_detected": "...", "evidence_snippet": "..." }]
    `;

    const analysisRaw = await callGeminiV1(googleApiKey, analysisPrompt);
    console.log("RAW AI RESPONSE:", analysisRaw); // DEBUG

    const validatedCompanies = repairJson<any[]>(analysisRaw) || [];

    // MAPPING SAFEGUARD: Ensure keys match what Frontend expects (useRadar.ts)
    // Frontend expects: name, website, score, reasoning
    const mappedCompanies = validatedCompanies.map((c) => ({
      name: c.name || c.company_name || "Entreprise Inconnue",
      website: c.website || c.url || c.company_url || "",
      score: c.score || c.match_score || 0,
      reasoning: c.reasoning || c.why_match || c.match_explanation ||
        "Correspondance détectée par IA",
      pain_point_detected: c.pain_point_detected,
      evidence_snippet: c.evidence_snippet,
      // Keep original fields just in case
      ...c,
    }));

    console.log("MAPPED COMPANIES:", JSON.stringify(mappedCompanies, null, 2));

    console.log(
      `[ANALYST] Validated ${mappedCompanies.length} qualified prospects`,
    );

    // --- 6. SAVE TO CACHE ---
    if (mappedCompanies.length > 0 && signature) {
      const validItems = mappedCompanies.filter((item: any) =>
        item && typeof item.name === "string" &&
        typeof item.score === "number"
      );
      if (validItems.length > 0) {
        await supabase.from("kortex_prospects").insert(
          validItems.map((item: any) => ({
            query_signature: signature,
            company_name: item.name,
            website_url: item.website,
            match_data: item,
          })),
        ).then(() => console.log("Cache updated."));
      }
    }

    const responsePayload = {
      success: true,
      companies: mappedCompanies,
      cached: false,
      searchPhases: {
        queries: missions.length,
        urls: allUrls.length,
        scraped: validSites.length,
        validated: validatedCompanies.length,
      },
    };

    console.log(
      "FINAL_BACKEND_OUTPUT:",
      JSON.stringify(responsePayload, null, 2),
    );

    return new Response(
      JSON.stringify(responsePayload),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("[DISCOVER] FATAL ERROR:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        code: "DISCOVER_FAIL",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
