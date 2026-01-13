import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { GoogleGenerativeAI } from "npm:@google/generative-ai";
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { projectId, force_refresh, strategy } = await req
      .json() as DiscoverRequest;

    // Input validation
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

    // --- FETCH PROJECT CONTEXT FROM DATABASE ---
    console.log(`[DISCOVER] Fetching project context for ${projectId}...`);
    const { data: projectData, error: projectError } = await supabase
      .from("project_data")
      .select("data_type, data")
      .eq("project_id", projectId);

    if (projectError) {
      console.error("[DISCOVER] Project data fetch error:", projectError);
      throw new Error(`Failed to fetch project data: ${projectError.message}`);
    }

    if (!projectData || projectData.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "Project data not found. Please configure Agency Brain with your pitch and target.",
          code: "CONTEXT_MISSING",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const agencyDNA = projectData.find((d) => d.data_type === "agency_dna")
      ?.data;
    const targetDef = projectData.find((d) =>
      d.data_type === "target_definition"
    )?.data;

    // Validate required fields
    // Validate required fields
    // RELAXED: Pitch can be inferred by the AI "Expert Kortex" if missing.
    // We only block if we have absolutely nothing to work with (no target).

    if (!targetDef?.targetDescription) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "Missing Target Definition. Please describe your ideal customer in Agency Brain.",
          code: "CONTEXT_MISSING",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log("[DISCOVER] ✅ Project context loaded:", {
      pitch: agencyDNA.pitch.substring(0, 50) + "...",
      target: targetDef.targetDescription.substring(0, 50) + "...",
    });

    // --- 1. CACHE VERIFICATION (FIXED) ---
    // Create signature from project + target (not from non-existent inputClient)
    const targetQuery = targetDef.targetDescription.toLowerCase().trim();
    const signature = `${projectId}_${targetQuery.substring(0, 100)}`;

    if (signature && !force_refresh) {
      console.log(
        "[DISCOVER] Checking cache with signature:",
        signature.substring(0, 50) + "...",
      );
      const { data: cachedProspects } = await supabase
        .from("kortex_prospects")
        .select("match_data")
        .eq("query_signature", signature)
        .limit(20);

      // IF CACHE HIT -> RETURN IMMEDIATELY (0 delay)
      if (cachedProspects && cachedProspects.length > 0) {
        console.log("🚀 CACHE HIT: Prospects found in database!");
        const formattedResults = cachedProspects.map((p) => p.match_data);
        return new Response(
          JSON.stringify({
            success: true,
            companies: formattedResults,
            cached: true,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      console.log("[DISCOVER] Cache miss - proceeding with fresh search...");
    }

    // --- 2. AI CONFIGURATION (LOCKED ON 1.5 PRO) ---
    const genAI = new GoogleGenerativeAI(Deno.env.get("GOOGLE_API_KEY") || "");
    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");

    if (!firecrawlKey) {
      throw new Error("Missing FIRECRAWL_API_KEY environment variable");
    }

    // Use stable version alias
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-pro",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.3,
      },
    });

    // --- 3. THE COMMANDANT (Search Strategy) ---
    console.log("🫡 COMMANDANT: Planning search strategy...");
    const strategyPrompt = `
    [SYSTEM: KORTEX COMMANDER]
    CONTEXT: You are "Expert Kortex", a master strategist. You know the agency perfectly. Use your internal knowledge and the target description below to generate search missions.
    CRITICAL: If the agency pitch is empty or not provided, DEDUCE it from your expertise in this field to best serve the target.
    
    INPUTS:
    - AGENCY PITCH: "${
      agencyDNA.pitch || "Not provided (DEDUCE from Agency Knowledge)"
    }"
    - AGENCY METHODOLOGY: "${agencyDNA.methodology || "Not provided"}"
    - AGENCY TRACK RECORD: ${
      JSON.stringify(agencyDNA.trackRecord || "Not provided")
    }
    - AGENCY DIFFERENCES: ${
      JSON.stringify(agencyDNA.differentiators || "Not provided")
    }
    - AGENCY RAW KNOWLEDGE (Docs/Website): "${
      agencyDNA.extractedContent
        ? (typeof agencyDNA.extractedContent === "string"
          ? agencyDNA.extractedContent.substring(0, 5000)
          : JSON.stringify(agencyDNA.extractedContent).substring(0, 5000))
        : "Not provided"
    }"

    - TARGET CUSTOMER: "${targetDef.targetDescription}"
    - TARGET SECTORS: "${
      (targetDef.industries || []).join(", ") || "All sectors"
    }"
    - COMPANY SIZE: "${targetDef.companySize || "All sizes"}"
    - DEAL BREAKERS: "${
      (targetDef.dealBreakers || []).join(", ") || "None specified"
    }"
    ${strategy ? `- STRATEGY HINT: "${strategy}"` : ""}
    
    MISSION: Generate 4 Google search queries to find COMPANIES (not people) that match this profile.
    ANGLES: 
    1. Pain/Problem Signal (e.g., "company struggling with X")
    2. Hiring/Resource Need (e.g., "hiring for Y position")
    3. Technology/Obsolescence (e.g., "using outdated Z")
    4. Growth/News Signal (e.g., "company expanding into W")

    STRICT JSON OUTPUT: { "firecrawl_missions": ["Query 1", "Query 2", "Query 3", "Query 4"] }
    `;

    const strategyResult = await model.generateContent(strategyPrompt);
    // FIX: JSON Crash Risk - Use repairJson
    const strategyJson = repairJson<{ firecrawl_missions: string[] }>(
      strategyResult.response.text(),
    );
    const missions = strategyJson?.firecrawl_missions || [];

    if (missions.length === 0) {
      throw new Error(
        "AI failed to generate search queries. Check your Agency Brain configuration.",
      );
    }

    console.log(
      `[COMMANDANT] Generated ${missions.length} search missions:`,
      missions,
    );

    // --- 4. THE SWARM (Firecrawl Execution) ---
    console.log("🐝 SWARM: Launching search agents...");
    let allUrls: string[] = [];

    // Search for URLs using Firecrawl REST API
    await Promise.all(missions.map(async (q: string) => {
      try {
        console.log(`[SWARM] Searching: "${q}"`);
        const searchResp = await fetch("https://api.firecrawl.dev/v1/search", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${firecrawlKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: q,
            limit: 5, // FIX: Harmonized limit (we slice to 3 later, so 5 gives buffer)
          }),
        });

        if (searchResp.ok) {
          const searchData = await searchResp.json();
          if (searchData.success && searchData.data) {
            searchData.data.forEach((item: any) => {
              if (item.url) allUrls.push(item.url);
            });
          }
        } else {
          console.error(
            `[SWARM] Search failed for "${q}": ${searchResp.status}`,
          );
        }
      } catch (e) {
        console.error(`[SWARM] Search error for query "${q}":`, e);
      }
    }));

    const uniqueUrls = [...new Set(allUrls)]
      .filter((u) =>
        !u.includes("linkedin") && !u.includes("indeed") &&
        !u.includes("facebook")
      )
      .slice(0, 3);

    console.log(
      `[SWARM] Found ${allUrls.length} URLs, filtered to ${uniqueUrls.length} unique company sites`,
    );

    if (uniqueUrls.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "No company websites found. Try refining your target description.",
          code: "NO_RESULTS",
          searchQueries: missions,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Scraping content using Firecrawl REST API
    console.log(`[SWARM] Scraping ${uniqueUrls.length} sites...`);
    const scrapeResults = await Promise.all(
      uniqueUrls.map(async (url) => {
        try {
          const scrapeResp = await fetch(
            "https://api.firecrawl.dev/v1/scrape",
            {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${firecrawlKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                url: url,
                formats: ["markdown"],
                onlyMainContent: true,
                timeout: 30000,
              }),
            },
          );

          if (scrapeResp.ok) {
            const scrapeData = await scrapeResp.json();
            const content = scrapeData.data?.markdown || "";
            return { url, content, status: "success" };
          } else {
            console.error(
              `[SWARM] Scrape failed for ${url}: ${scrapeResp.status}`,
            );
            return { url, content: "", status: "failed" };
          }
        } catch (err) {
          console.error(`[SWARM] Scrape error for ${url}:`, err);
          return { url, content: "", status: "failed" };
        }
      }),
    );

    const validSites = scrapeResults.filter((s) =>
      s.status === "success" && s.content.length > 200
    );

    if (validSites.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "Found websites but could not scrape their content. Sites may be blocking scrapers.",
          code: "SCRAPE_FAILED",
          attemptedUrls: uniqueUrls,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(
      `[SWARM] Successfully scraped ${validSites.length}/${uniqueUrls.length} sites`,
    );

    // --- 5. THE ANALYST (Validation & Scoring) ---
    console.log(`⚖️ ANALYST: Evaluating ${validSites.length} prospects...`);

    // Prepare sites data for analysis
    const sitesForAnalysis = validSites.map((site) => ({
      url: site.url,
      content: site.content.substring(0, 4000),
    }));

    const analysisPrompt = `
    [SYSTEM: KORTEX ANALYST]
    
    AGENCY DNA:
    - Pitch: "${agencyDNA.pitch}"
    - Methodology: "${agencyDNA.methodology || "Not specified"}"
    - Track Record: ${JSON.stringify(agencyDNA.trackRecord || {})}
    - Differentiators: ${JSON.stringify(agencyDNA.differentiators || [])}
    
    TARGET CRITERIA:
    - Ideal Customer: "${targetDef.targetDescription}"
    - Industries: "${(targetDef.industries || []).join(", ") || "Any"}"
    - Company Size: "${targetDef.companySize || "Any"}"
    - Deal Breakers (REJECT IF MATCH): ${
      JSON.stringify(targetDef.dealBreakers || [])
    }
    
    PROSPECT SITES TO ANALYZE:
    ${JSON.stringify(sitesForAnalysis)}

    MISSION: Filter and score these prospects. Only keep companies with a REAL, IDENTIFIABLE NEED for our solution.
    
    SCORING CRITERIA (0-100):
    - 0-40: Reject (wrong industry, already solved, or deal breaker match)
    - 41-70: Interesting (right profile but no urgent pain visible)
    - 71-100: Perfect Target (explicit evidence of need, pain point, or growth signal)
    
    OUTPUT FORMAT (JSON Array):
    [
      {
        "company_name": "Company Name",
        "url": "https://...",
        "match_score": 0-100,
        "pain_point_detected": "Specific problem identified",
        "evidence_snippet": "Exact quote or technical evidence from site",
        "why_match": "Short argument why our pitch solves their problem"
      }
    ]
    
    CRITICAL: Only include companies with match_score >= 50. Return empty array if none qualify.
    `;

    const finalResult = await model.generateContent(analysisPrompt);
    // FIX: JSON Crash Risk - Use repairJson
    const jsonResponse = repairJson<any[]>(finalResult.response.text(), []);

    // Ensure it's an array
    const validatedCompanies = Array.isArray(jsonResponse) ? jsonResponse : [];

    console.log(
      `[ANALYST] Validated ${validatedCompanies.length} qualified prospects`,
    );

    // --- 6. SAVE TO CACHE (For next time) ---
    if (validatedCompanies.length > 0 && signature) {
      console.log("[DISCOVER] Saving results to cache...");
      try {
        // FIX: Fragile Typing (Any) - Validate essential fields before insert
        const validItems = validatedCompanies.filter((item: any) =>
          item &&
          typeof item.company_name === "string" &&
          item.company_name.length > 1 &&
          typeof item.url === "string" &&
          item.url.startsWith("http") &&
          typeof item.match_score === "number"
        );

        if (validItems.length > 0) {
          await supabase.from("kortex_prospects").insert(
            validItems.map((item: any) => ({
              query_signature: signature,
              company_name: item.company_name,
              website_url: item.url,
              match_data: item,
            })),
          );
          console.log(
            `[DISCOVER] ✅ Cache updated successfully with ${validItems.length} valid items`,
          );
        } else {
          console.warn("[DISCOVER] Defaults: No valid items to cache.");
        }
      } catch (cacheErr) {
        console.error("[DISCOVER] Cache save failed (non-critical):", cacheErr);
        // Don't fail the request if cache save fails
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        companies: validatedCompanies,
        cached: false,
        searchPhases: {
          queriesGenerated: missions.length,
          urlsFound: allUrls.length,
          sitesScraped: validSites.length,
          companiesValidated: validatedCompanies.length,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("[DISCOVER-COMPANIES] Fatal Error:", error);
    console.error("[DISCOVER-COMPANIES] Stack:", error.stack);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Unknown error occurred",
        code: "DISCOVER_FAIL",
        details: error.stack?.split("\n")[0] || "Unknown error location",
      }),
      {
        status: 200, // Return 200 to ensure the client parses the JSON body
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
