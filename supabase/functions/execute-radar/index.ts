import { createClient } from "@supabase/supabase-js";
import {
  ContextAggregator,
  GlobalContext,
} from "../_shared/context-aggregator.ts";
import { GEMINI_MODELS, GeminiClient } from "../_shared/api-clients.ts";
import { SYSTEM_INSTRUCTION } from "../_shared/prompts.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ExecuteRequest {
  projectId: string;
  approved_queries: string[];
}

interface TribunalJudgment {
  name: string;
  match_score: number;
  reasoning: string;
  disqualification_reason?: string;
  detected_pain_points?: string[];
  evidence_snippet?: string;
  location?: string;
}

interface MapsPlace {
  placeId: string;
  formattedAddress: string;
  rating: number;
  userRatingsTotal: number;
  url: string;
}

interface FirecrawlSearchResponse {
  data?: {
    url?: string;
  }[];
}

interface FirecrawlScrapeResponse {
  data?: {
    markdown?: string;
  };
}

async function batchProcess<T, R>(
  items: T[],
  batchSize: number,
  processFn: (item: T) => Promise<R>,
  delayMs = 0,
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    console.log(
      `[BATCH] Processing items ${i + 1} to ${
        Math.min(i + batchSize, items.length)
      } of ${items.length}...`,
    );

    const batchResults = await Promise.all(
      batch.map(async (item) => {
        try {
          return await processFn(item);
        } catch (_e) {
          console.error(`[BATCH] Error processing item:`, _e);
          return null; // Return null on error
        }
      }),
    );

    // Filter out nulls first then cast to R (assuming R is not null)
    // We filter nulls explicitly in the loop below
    batchResults.forEach((res) => {
      if (res !== null) results.push(res);
    });

    if (delayMs > 0 && i + batchSize < items.length) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return results;
}

// Batch process remains same...

// Removed local callGemini in favor of GeminiClient usage later

// Helper for Google Maps Place Search
async function searchCompanyOnMaps(
  companyName: string,
  apiKey: string,
): Promise<MapsPlace | null> {
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

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { projectId, approved_queries } = await req.json() as ExecuteRequest;
    if (!projectId) throw new Error("Missing projectId");
    if (!approved_queries || approved_queries.length === 0) {
      throw new Error("No queries provided");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // --- PHASE 0: ENRICHMENT (Global Context) ---
    console.log(`[EXECUTE] Loading Global Context for ${projectId}...`);

    const { data: projectOwner } = await supabase.from("projects").select(
      "user_id",
    ).eq("id", projectId).single();
    const userId = projectOwner?.user_id;
    if (!userId) throw new Error("User ID not found for project.");

    // Fetch Global Context (PDFs + Website)
    const aggregator = new ContextAggregator(supabase);
    let context: GlobalContext;
    try {
      context = await aggregator.assembleGlobalContext(projectId);
      console.log(
        `[EXECUTE] ✅ Global Context Loaded (${context.fullText.length} chars)`,
      );
    } catch (e) {
      console.error("[EXECUTE] ❌ Failed to load context:", e);
      throw e;
    }

    // Fetch Strategic Identity (still useful for quick prompt context)
    const { data: identity } = await supabase
      .from("strategic_identities")
      .select("*")
      .eq("project_id", projectId)
      .single();

    const identityContext = identity
      ? `
    === STRATEGIC IDENTITY ===
    Core Pain Points: ${JSON.stringify(identity.core_pain_points)}
    Required Symptoms: ${JSON.stringify(identity.symptom_profile)}
    Ideal Prospect: ${identity.ideal_prospect_profile}
    KILL CRITERIA: ${identity.exclusion_criteria}
    `
      : "No Strategic Identity found. Relying on Global Context.";

    const googleApiKey = Deno.env.get("GOOGLE_API_KEY") ||
      Deno.env.get("GEMINI_API_KEY")!;
    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!firecrawlKey) throw new Error("Missing Firecrawl API Key");

    const gemini = new GeminiClient(googleApiKey);

    // --- PHASE 1: THE UNLEASHED HUNT (Execution) ---
    console.log(
      `[EXECUTE] 🚀 Unleashing search on ${approved_queries.length} queries...`,
    );

    // 1. Search (Uncapped)
    const allUrls: string[] = [];
    const BATCH_SIZE_SEARCH = 5; // Parallel API calls

    await batchProcess(approved_queries, BATCH_SIZE_SEARCH, async (q) => {
      try {
        // UNLEASHED: Limit increased to 50 per query
        const searchResp = await fetch("https://api.firecrawl.dev/v1/search", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${firecrawlKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query: q, limit: 50, lang: "fr" }),
        });
        if (searchResp.ok) {
          const d = await searchResp.json() as FirecrawlSearchResponse;
          d.data?.forEach((item: { url?: string }) => {
            // Filter known junk domains immediately
            if (
              item.url &&
              !item.url.match(
                /(linkedin|indeed|facebook|google|instagram|youtube)\.com/,
              )
            ) {
              allUrls.push(item.url);
            }
          });
        }
      } catch (e) {
        console.error(`Search error "${q}":`, e);
      }
      return null;
    });

    const uniqueUrls = [...new Set(allUrls)];
    console.log(
      `[EXECUTE] Found ${uniqueUrls.length} unique candidates. Scraping...`,
    );

    if (uniqueUrls.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "No targets found in search.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2. Scrape (Uncapped, Batched)
    // We scrape EVERYTHING. No slice.
    // Batch size 10 to avoid timeouts/rate-limits
    const scrapeResults = await batchProcess(uniqueUrls, 10, async (url) => {
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
          const d = await scrapeResp.json() as FirecrawlScrapeResponse;
          return { url, content: d.data?.markdown || "", status: "success" };
        }
        return { url, content: "", status: "failed" };
      } catch (_e) {
        return { url, content: "", status: "failed" };
      }
    }, 100); // 100ms delay between batches

    const validSites = scrapeResults.filter((s) =>
      s.status === "success" && s.content.length > 200
    );

    console.log(`[EXECUTE] Successfully scraped ${validSites.length} sites.`);

    // --- PHASE 2: THE TRIBUNAL IMPENETRABLE (Filtering) ---
    if (validSites.length === 0) {
      throw new Error("Scraping yielded no valid content from candidates.");
    }

    // Process analysis in batches to handle large prompts
    const ANALYSIS_BATCH_SIZE = 10;

    await batchProcess(validSites, ANALYSIS_BATCH_SIZE, async (site) => {
      const siteContent = site.content.substring(0, 15000); // Prevent token overflow per site

      const TRIBUNAL_PROMPT = `
        [SYSTEM: KORTEX TRIBUNAL - DRACONIAN FILTER]
        You are the Final Judge. Your job is to PROTECT the agency from "Generic B2B Junk".
        
        === KNOWLEDGE BASE (THE LAW - PRIMARY SOURCE) ===
        ${context.fullText.substring(0, 50000)}

        === THE RULE OF LAW (SEMANTIC SANCTION) ===
        1. **MATCHING RULE**: The prospect must demonstrate a SPECIFIC SYMPTOM defined in the Strategic Identity AND the Knowledge Base.
        2. **SEMANTIC FIDELITY**: You must NOT invent terms. If a term is not in the documents, you must explain WHY you are using it.
           - If you use a term like "Tunnel de vente" or "Nouveaux contacts" and it is NOT in the text -> **FAIL**.
        3. **GENERIC REJECTION**: If the site looks like a generic B2B SaaS without the specific technical symptoms -> REJECT.

        === STRATEGIC IDENTITY ===
        ${identityContext}

        === THE SUSPECT ===
        URL: ${site.url}
        CONTENT:
        ${siteContent}

        === JUDGMENT PROTOCOL ===
        1. **DISQUALIFICATION CHECK**: Is this a competitor? Is it B2C? Is it irrelevant? 
           -> If YES: Score = 0. Stop.
        2. **SYMPTOM HUNT**: Do you see explicit evidence of the pains/symptoms defined in the Context?
           -> CITATION STRING REQUIRED. No evidence = No score.
        3. **VERDICT**:
           - **< 65**: REJECT. Non-correlated.
           - **>= 65**: APPROVE. High correlation. MUST provide 'evidence_snippet'.

        OUTPUT JSON:
        {
          "name": "Company Name",
          "match_score": number, 
          "reasoning": "Detailed verdict...",
          "disqualification_reason": "e.g. Competitor", 
          "detected_pain_points": ["Pain 1", "Pain 2", ...], 
          "evidence_snippet": "EXACT QUOTE from the page proving user pain - REQUIRED if score > 65",
          "location": "City/Country"
        }
        `;

      try {
        // --- AUDIT LOG ---
        console.log(`[AUDIT] TRIBUNAL ANALYZING: ${site.url}`);
        console.log(`[AUDIT] CONTEXT LENGTH: ${context.fullText.length}`);
        // -----------------

        const tribunalResult = await gemini.generateJSON<TribunalJudgment>(
          TRIBUNAL_PROMPT,
          GEMINI_MODELS.ULTRA,
          SYSTEM_INSTRUCTION,
        );

        if (!tribunalResult) return;

        // --- DECISION LOGIC ---
        const matchScore = tribunalResult.match_score || 0;
        const isQualified = matchScore >= 65;

        // Enrich Qualified with Google Maps
        let mapsData = null;
        if (isQualified && tribunalResult.name) {
          mapsData = await searchCompanyOnMaps(
            tribunalResult.name,
            googleApiKey,
          );
        }

        const payload = {
          project_id: projectId,
          user_id: userId,
          company_name: tribunalResult.name || "Unknown",
          company_url: site.url,
          match_score: matchScore,
          match_explanation: tribunalResult.reasoning || "No reasoning",
          detected_pain_points: tribunalResult.detected_pain_points || [],
          strategic_analysis: isQualified
            ? `VALIDATED: ${tribunalResult.evidence_snippet}`
            : `REJECTED: ${
              tribunalResult.disqualification_reason || "Low score"
            }`,
          analysis_status: isQualified ? "deduced" : "rejected", // RESULT
          analyzed_at: new Date().toISOString(),
          location: mapsData?.formattedAddress || tribunalResult.location ||
            "Unknown",
          custom_hook: JSON.stringify({
            googleMaps: mapsData,
            evidence: tribunalResult.evidence_snippet,
            disqualification: tribunalResult.disqualification_reason,
          }),
        };

        // Upsert to DB
        const { data: existing } = await supabase.from("company_analyses")
          .select("id")
          .eq("project_id", projectId)
          .eq("company_url", site.url)
          .maybeSingle();

        if (existing) {
          await supabase.from("company_analyses").update(payload).eq(
            "id",
            existing.id,
          );
        } else {
          await supabase.from("company_analyses").insert(payload);
        }

        if (isQualified) {
          console.log(
            `[TRIBUNAL] ✅ ACCEPTED: ${site.url} (Score: ${matchScore})`,
          );
        } else {
          console.log(
            `[TRIBUNAL] ❌ REJECTED: ${site.url} (Score: ${matchScore}) - ${tribunalResult.disqualification_reason}`,
          );
        }
      } catch (e) {
        console.error(`[TRIBUNAL] Error analyzing ${site.url}:`, e);
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Expert Débridé scan complete.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    console.error("[EXECUTE] FATAL:", error);
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
