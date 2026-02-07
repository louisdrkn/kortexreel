// import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

import { GEMINI_MODELS, GeminiClient } from "../_shared/api-clients.ts";
import { SYSTEM_INSTRUCTION as DRACONIAN_SYSTEM_INSTRUCTION } from "../_shared/prompts.ts";

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

interface SynthesisResult {
  unique_value_proposition?: string;
  core_pain_point_solved?: string;
  symptom_profile?: string;
  ideal_prospect_description?: string;
  exclusion_criteria?: string;
  source_citation?: string;
}

// BATCH PROCESSING HELPER
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
        } catch (e) {
          console.error(`[BATCH] Error processing item:`, e);
          return null as unknown as R; // Handle individual failures gracefully
        }
      }),
    );

    results.push(...batchResults);
    if (delayMs > 0 && i + batchSize < items.length) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return results.filter((r) => r !== null && r !== undefined);
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

    // --- 1. FETCH GLOBAL CONTEXT (The "Brain") ---
    console.log(`[DISCOVER] Fetching GLOBAL CONTEXT for ${projectId}...`);

    // A. FETCH PROJECT OWNER & DATA
    const { data: projectOwner, error: ownerError } = await supabase
      .from("projects")
      .select("user_id")
      .eq("id", projectId)
      .single();

    if (ownerError || !projectOwner) {
      throw new Error(`Failed to fetch project owner: ${ownerError?.message}`);
    }
    const userId = projectOwner.user_id;

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

    // B. FETCH DOCUMENTS
    const { data: documentsData, error: docsError } = await supabase
      .from("company_documents")
      .select("file_name, extracted_content")
      .eq("project_id", projectId)
      .eq("extraction_status", "completed");

    if (docsError) console.warn("Docs fetch warning:", docsError);

    // C. CONSTITUTE FULL CONTEXT
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

    === AGENCY INPUTS (SECONDARY) ===
    Pitch: ${agencyDNA.pitch || "Not provided"}
    Methodology: ${agencyDNA.methodology || "Not provided"}
    `;

    // Check for Deep Context availability
    if ((documentsContent.length + brainWebsiteContent.length) < 500) {
      throw new Error(
        "INSUFFICIENT_CONTEXT: Please upload Company Documents (PDFs) or ensure Website Content is scraped to enable Deep Context Radar.",
      );
    }

    console.log(
      `[DISCOVER] Global Context Loaded. Size approx: ${GlobalContext.length} chars.`,
    );

    // PROOF OF LIFE
    if (documentsContent.length > 0) {
      console.log(
        `[DISCOVER] 📄 DOCUMENTS LOADED (${documentsContent.length} chars)`,
      );
      console.log(
        `[DISCOVER] 🔍 PREVIEW: ${documentsContent.substring(0, 200)}...`,
      );
    } else {
      console.warn(
        `[DISCOVER] ⚠️ NO DOCUMENTS FOUND! Check Supabase 'company_documents' table.`,
      );
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

    const gemini = new GeminiClient(googleApiKey);

    // --- 3. CACHE CHECK (LIGHT) ---
    const targetQuery =
      (targetDef?.targetDescription || "generic company search").toLowerCase()
        .trim();

    // --- 4. THE BRAIN: SYNTHESIS (Deep Analysis) ---
    console.log("🧠 BRAIN: Synthesizing Solution Profile...");

    const synthesisPrompt = `
    [SYSTEM: KORTEX STRATEGIST]
    You are the "Brain" of Kortex. You analyze vast amounts of unstructured company data to distill the PURE ESSENCE of their value.
    
    === MISSION ===
    1. IGNORE the "Pitch" and "Agency Inputs" if they contradict the Documents.
    2. DERIVE the "Problematic" solely from the [UPLOADED KNOWLEDGE BASE] and [WEBSITE CONTENT].
    3. FORCE CITATION: You must cite the exact file or section that defines the problem.

    === INPUT: GLOBAL CONTEXT ===
    ${GlobalContext}

    OUTPUT JSON:
    {
        "unique_value_proposition": "The technical/methodological reason they win (Cite source)",
        "core_pain_point_solved": "The specific bleeding problem their clients have",
        "symptom_profile": "What does a prospect suffering from this look like? (e.g. specific job posts, tech stack, complaints, obsolete processes)",
        "ideal_prospect_description": "A precise description of the perfect buyer",
        "exclusion_criteria": "Who is NOT a client (e.g. competitors, too small)",
        "source_citation": "Extract from documents proving this positioning"
    }
    `;

    // MIGRATION: Use GeminiClient + ULTRA + 0.0 Temp + Draconian System Instruction
    const synthesis = await gemini.generateJSON<SynthesisResult>(
      synthesisPrompt,
      GEMINI_MODELS.ULTRA,
      DRACONIAN_SYSTEM_INSTRUCTION,
      undefined,
      { temperature: 0.0 },
    );

    console.log("🧠 SYNTHESIS RESULT:", JSON.stringify(synthesis, null, 2));

    // --- 5. THE COMMANDANT: STRATEGIC COUNCIL (Generation & Critique) ---
    console.log("🫡 COMMANDANT: Convening Strategic Council...");

    // A. BRAINSTORMING PHASE
    const strategyPrompt = `
    [SYSTEM: KORTEX STRATEGIST - QUERY COMMANDER]
    CONTEXT: You are "Expert Kortex".
    GOAL: Find ALL NEW PROSPECTS based on the SOLUTION PROFILE below. DO NOT LIMIT YOURSELF.

    === SOLUTION PROFILE (THE TRUTH) ===
    Pain Point: ${synthesis.core_pain_point_solved || "Unknown Pain Point"}
    Symptoms: ${synthesis.symptom_profile || "Unknown Symptoms"}
    Ideal Prospect: ${
      synthesis.ideal_prospect_description || "Unknown Prospect"
    }
    Exclusions: ${synthesis.exclusion_criteria || "None"}

    TARGET DEFINITION: "${targetDef?.targetDescription || "N/A"}"
    STRATEGY HINT: "${strategy || "None"}"

    === MISSION ===
    Generate 10 to 15 "Symptom-Hunting" Google search queries.
    Do NOT search for "Companies looking for...".
    Search for evidence of the PROBLEM existing.
    
    Examples of Good Queries:
    - "Vieux site fait en [Techno] filetype:php" (Technical Debt)
    - "Nous recrutons [Poste manquant] [Ville]" (Resource Gap)
    - "Migrating from [Competitor] to" (Churn signal)
    - "Complaint about [Process]" (Dissatisfaction)

    OUTPUT JSON: { "candidate_queries": ["Query 1", ..., "Query 15"] }
    `;

    // MIGRATION: Use GeminiClient + ULTRA + 0.0 Temp
    const candidateJson = await gemini.generateJSON<
      { candidate_queries: string[] }
    >(
      strategyPrompt,
      GEMINI_MODELS.ULTRA,
      DRACONIAN_SYSTEM_INSTRUCTION, // Enforce language constraints even here
      undefined,
      { temperature: 0.0 },
    );
    const candidates = candidateJson?.candidate_queries || [];

    // B. CRITIQUE & REFINEMENT PHASE
    console.log(
      `[COMMANDANT] Candidates generated: ${candidates.length}. Refining...`,
    );

    const refinementPrompt = `
    [SYSTEM: KORTEX SNIPER]
    You are a Search Logic Expert.
    
    INPUT: Candidate Queries
    ${JSON.stringify(candidates)}

    MISSION:
    1. CRITIQUE each query: Is it too generic? Will it bring up SEO spam? Is it specific enough?
    2. REWRITE the queries to be "Surgical". Use Boolean operators if needed (site:, "exact match", -keyword).
    3. DISCARD queries that just search for "Top 10 agencies".
    4. KEEP ALL queries that are relevant. Do NOT arbitrarily limit the list.
    
    GOAL: Only keep queries that will reveal a PROSPECT with a PROBLEM.

    OUTPUT JSON: { "final_missions": ["Refined Query 1", "Refined Query 2", "Refined Query 3", ...] }
    `;

    // MIGRATION: Use GeminiClient + ULTRA + 0.0 Temp
    const refinedJson = await gemini.generateJSON<{ final_missions: string[] }>(
      refinementPrompt,
      GEMINI_MODELS.ULTRA,
      undefined, // No need for Draconian here, just Logic
      undefined,
      { temperature: 0.0 },
    );
    const missions = refinedJson?.final_missions || candidates;

    if (missions.length === 0) {
      throw new Error("AI failed to generate search queries.");
    }
    console.log(
      `[COMMANDANT] 🎯 Final Surgical Missions (${missions.length}):`,
      missions,
    );

    // --- 6. THE SWARM: EXECUTION (DISCOVERY ONLY) ---
    console.log("🐝 SWARM: Launching Firecrawl Search (PHASE 1 ONLY)...");

    const allUrls: any[] = []; // Store basic info, not just URLs

    await Promise.all(missions.map(async (q: string) => {
      try {
        const searchResp = await fetch("https://api.firecrawl.dev/v1/search", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${firecrawlKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query: q, limit: 20, lang: "fr" }),
        });
        if (searchResp.ok) {
          const d = await searchResp.json();
          if (d.success && d.data) {
            d.data.forEach((item: any) => {
              if (
                item.url && !item.url.includes("linkedin.com") &&
                !item.url.includes("indeed.com")
              ) {
                allUrls.push({
                  url: item.url,
                  title: item.title,
                  description: item.description,
                  mission: q, // Track which query found it
                });
              }
            });
          }
        }
      } catch (e) {
        console.error(`[SWARM] Search error "${q}":`, e);
      }
    }));

    // Deduplicate by URL
    const seenUrls = new Set();
    const uniqueDiscoveries = allUrls.filter((item) => {
      const duplicate = seenUrls.has(item.url);
      seenUrls.add(item.url);
      return !duplicate;
    });

    if (uniqueDiscoveries.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "No targets found.",
          code: "NO_RESULTS",
        }),
        { headers: corsHeaders },
      );
    }

    console.log(
      `[SWARM] Discovered ${uniqueDiscoveries.length} potential targets.`,
    );

    // --- 7. SAVE PHASE 1 RESULTS (DISCOVERED STATUS) ---
    // Instead of deep scraping, we save them as "discovered"

    await batchProcess(uniqueDiscoveries, 20, async (item: any) => {
      const { data: existing } = await supabase.from("company_analyses")
        .select("id").eq("project_id", projectId).eq(
          "company_url",
          item.url,
        ).maybeSingle();

      const payload = {
        project_id: projectId,
        user_id: userId,
        company_name: item.title || "Unknown Company",
        company_url: item.url,
        match_score: 0, // Placeholder
        match_explanation: `Discovered via query: ${item.mission}`,
        detected_pain_points: [],
        strategic_analysis:
          `Initial discovery by Radar. awaiting Deep Analysis.\nSnippet: ${
            item.description || "N/A"
          }`,
        analysis_status: "discovered", // PHASE 1 STATUS
        analyzed_at: new Date().toISOString(),
        buying_signals: [],
        location: "Unknown",
      };

      if (existing) {
        // Optional: Don't overwrite if already analyzed
        // But if we are running discovery again, maybe we want to update?
        // For now, let's only update if it's NOT 'completed' or 'deduced' to avoid wiping data
        // Actually, 'discovered' should probably be the start state.
        console.log(`[SKIP] Already exists: ${item.url}`);
      } else {
        await supabase.from("company_analyses").insert(payload);
      }
      return item;
    });

    console.log(`✅ Saved ${uniqueDiscoveries.length} discovered prospects.`);

    const responsePayload = {
      success: true,
      companies: uniqueDiscoveries.map((d) => ({
        name: d.title,
        website: d.url,
        analysisStatus: "discovered",
      })),
      synthesis: synthesis,
      searchPhases: {
        queries: missions.length,
        scraped: 0, // No scraping in Phase 1
        validated: uniqueDiscoveries.length,
      },
    };

    return new Response(JSON.stringify(responsePayload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[DISCOVER] FATAL:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        code: "DISCOVER_FAIL",
      }),
      {
        status: 200, // Client handles error parsing
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
