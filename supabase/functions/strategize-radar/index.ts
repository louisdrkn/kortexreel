import { createClient } from "jsr:@supabase/supabase-js@2";

import { GEMINI_MODELS, GeminiClient } from "../_shared/api-clients.ts";
import { SYSTEM_INSTRUCTION } from "../_shared/prompts.ts";
import {
  StrategicIdentity,
  StrategicPillar,
  StrategizeRequest,
} from "../_shared/types.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MISSION_PROMPT = `
=== GOAL ===
Become the "avatar" of the documents provided.

=== INPUT CONTEXT ===
{GLOBAL_CONTEXT}

=== MISSION ===
1. **CONSCIOUSNESS SUMMARY (The Proof of Integration)**:
   - Identify 3 specific elements in the docs that CONTRADICT standard market advice.
   - **REQUIRED FORMAT**: "Contradiction: [Specific Concept] found in [Source Doc Name] opposes standard [Generic Practice]."

2. **VERIFICATION (PROOF OF LIFE)**:
   - Copy word-for-word the first sentence of the first paragraph of the very first document you see in the knowledge base.
   - This proves you actually read the file.

2. **EXTRACT 3 STRATEGIC PILLARS**:
   - Quote the exact methodology or proprietary concept from the text.
   - Explain why this is a "Moat".

3. **PORTRAIT-ROBOT (The Perfect Fit)**:
   - Who suffers from the absence of these 3 pillars?
   - Define them using only the technical lexicon of the documents.

=== FAIL CONDITIONS ===
- Any usage of "B2B" or "SaaS" without direct citation -> **FAIL**.
- Vague citations like "in the text" instead of specific document names -> **FAIL**.

=== OUTPUT JSON ===
{
  "verification_citation": "Exact quote from first document...",
  "consciousness_summary": [
     "Contradiction 1: ... (Source: ...)",
     "Contradiction 2: ... (Source: ...)",
     "Contradiction 3: ... (Source: ...)"
  ],
  "strategic_pillars": [
    { "name": "Exact Term from Doc", "description": "Why it matters" },
    { "name": "...", "description": "..." },
    { "name": "...", "description": "..." }
  ],
  "unique_value_proposition": "Synthesized Value Proposition based ONLY on the 3 Pillars.",
  "core_pain_points": ["Pain linked to Pillar 1", "Pain linked to Pillar 2", ...],
  "ideal_prospect_profile": "Detailed Portrait-Robot",
  "exclusion_criteria": "Strict disqualifiers based on methodology compatibility",
  "observable_symptoms": [
     "Symptom 1 (Evidence of missing Pillar 1)", 
     "Symptom 2 (Evidence of missing Pillar 2)",
     "Symptom 3"
  ]
}
`;

// ------------------------------------------------------------------
// PROMPT: THE SIGNAL COMMANDER (Query Generation)
// ------------------------------------------------------------------
const STRATEGY_PROMPT = `
[SYSTEM: KORTEX SIGNAL COMMANDER]
CONTEXT: We have the Master Expert Identity.
GOAL: Generate high-precision Google Search Queries to detect the defined SIGNALS.

=== STRATEGIC IDENTITY ===
{IDENTITY_JSON}

=== MISSION ===
Generate 5 Google Search Queries.
Constraint: Do NOT search for the solution. Search for the PROBLEM (Symptoms).
UNLEASHED MODE: We need volume. Think broad but precise symptoms.

Examples:
- "inurl:admin.php detected" OR "filetype:cfm"
- "intitle:'We are hiring' AND 'Cobol developer'"
- "site:trustpilot.com 'scam' AND [Competitor]"

=== OUTPUT JSON ===
{
  "queries": ["Query 1", "Query 2", "Query 3", "Query 4", "Query 5"],
  "rationale": "Brief explanation"
}
`;

// Helper: Scrape Client Site if missing context
async function scrapeClientSite(url: string, apiKey: string) {
  if (!url || !apiKey) return "";
  console.log(
    `[STRATEGIZE] 🕵️ Unidentified Logic: Scraping client site ${url} for Realism...`,
  );
  try {
    const resp = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["markdown"],
        onlyMainContent: true,
      }),
    });

    if (resp.ok) {
      const data = await resp.json();
      return data.data?.markdown || "";
    }
  } catch (e) {
    console.error("Scrape failed or timed out:", e);
  }
  return "";
}

console.log("[STRATEGIZE] 🚀 Function script loaded!");

Deno.serve(async (req: Request): Promise<Response> => {
  // 0. CORS - Handle immediate for OPTIONS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log(`[STRATEGIZE] 🟢 Request received: ${req.method} ${req.url}`);

    // 1. Parsing Body
    let body: StrategizeRequest;
    try {
      body = await req.json();
    } catch (e) {
      console.error("[STRATEGIZE] ❌ Failed to parse JSON body:", e);
      return new Response(
        JSON.stringify({ success: false, error: "Invalid JSON body" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    const { projectId, force_analyze } = body;
    if (!projectId) throw new Error("Missing projectId");

    console.log(`[STRATEGIZE] 🏁 Starting Phase 1 for Project: ${projectId}`);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 2. Get Context (INLINED)
    console.log(`[STRATEGIZE] 🧩 Aggregating Context (Inlined)...`);

    const { data: projectData, error: projectError } = await supabase
      .from("project_data")
      .select("data_type, data")
      .eq("project_id", projectId);

    if (projectError) {
      throw new Error(`Failed to fetch project data: ${projectError.message}`);
    }

    const agencyDNA = (projectData?.find((d) =>
      d.data_type === "agency_dna"
    )?.data as any) || {};

    const { data: documentsData, error: docsError } = await supabase
      .from("company_documents")
      .select("file_name, extracted_content")
      .eq("project_id", projectId)
      .eq("extraction_status", "completed");

    if (docsError) console.warn("Docs fetch warning:", docsError);

    const pitch = agencyDNA.pitch || "";
    const methodology = agencyDNA.methodology || "";
    const websiteContent = agencyDNA.extractedContent?.websiteContent || "";

    const docsText = documentsData?.map((d: any) =>
      `--- DOCUMENT: ${d.file_name} ---\n${
        d.extracted_content?.substring(0, 500000) || ""
      }`
    ).join("\n\n") || "";

    const fullText = `
    === KNOWLEDGE BASE (PRIMARY SOURCE OF TRUTH) ===
    ${docsText}

    === AGENCY PITCH ===
    ${pitch}

    === AGENCY METHODOLOGY ===
    ${methodology}

    === WEBSITE CONTENT ===
    ${websiteContent.substring(0, 20000)}
    `;

    const context = {
      projectId,
      agencyName: agencyDNA.companyName || "Unknown",
      websiteContent,
      documentsContent: docsText,
      fullText,
    };

    // DIAGNOSTIC LOGS
    console.log(
      `[DIAGNOSTIC] 📏 Context Stats for Project ${projectId}:`,
    );
    console.log(
      `[DIAGNOSTIC] - Website Content Length: ${
        context.websiteContent?.length || 0
      }`,
    );
    console.log(
      `[DIAGNOSTIC] - Documents Content Length: ${
        context.documentsContent?.length || 0
      }`,
    );
    console.log(
      `[DIAGNOSTIC] - Full Text Context Length: ${
        context.fullText?.length || 0
      }`,
    );

    // PROOF OF LIFE: Log the actual documents found
    if (context.documentsContent) {
      console.log("[DIAGNOSTIC] 📄 DOCUMENTS INTEGRATED:");
      // Extract document names from the formatted string if possible, or just log the header
      const docHeaders = context.documentsContent.match(
        /--- DOCUMENT: .+ ---/g,
      );
      if (docHeaders) {
        docHeaders.forEach((header) =>
          console.log(`[DIAGNOSTIC]   ✅ Found: ${header}`)
        );
      } else {
        console.log(
          "[DIAGNOSTIC]   (No structured headers found, but content exists)",
        );
      }
      console.log(
        `[DIAGNOSTIC] 🔍 PREVIEW (first 500 chars): \n${
          context.documentsContent.substring(0, 500)
        }...`,
      );
    } else {
      console.warn("[DIAGNOSTIC] ⚠️ NO DOCUMENTS CONTENT FOUND IN CONTEXT!");
    }

    // 3. Check Existing Identity (if not forcing)
    let identity: StrategicIdentity | null = null;
    if (!force_analyze) {
      const { data: existing } = await supabase
        .from("strategic_identities")
        .select("*")
        .eq("project_id", projectId)
        .maybeSingle();
      if (existing) {
        console.log(`[STRATEGIZE] Found existing identity for ${projectId}`);
        identity = existing as StrategicIdentity;
      }
    }
 
    // 4. Generate Identity if needed
    const googleApiKey = Deno.env.get("GOOGLE_API_KEY") ||
      Deno.env.get("GEMINI_API_KEY")!;
    if (!googleApiKey) {
      throw new Error("Missing GEMINI_API_KEY");
    }

    const gemini = new GeminiClient(googleApiKey);

    if (!identity) {
      console.log(`[STRATEGIZE] 🧠 Generating NEW Strategic Identity...`);

      // BLACK HOLE CHECK: Ensure we actually have documents
      if (
        !context.documentsContent ||
        context.documentsContent.trim().length === 0
      ) {
        console.error(
          "[STRATEGIZE] 🔴 CRITICAL: No documents found in context!",
        );
        throw new Error(
          "ABORT: Kortex Brain is empty. Please upload PDF documents to the Knowledge Base before running the radar.",
        );
      }

      // 🔍 AUTO-ENRICHMENT: If website content is empty, SCRAPE IT.
      if (!context.websiteContent || context.websiteContent.length < 200) {
        console.log(
          "[STRATEGIZE] 🕵️ Context empty, attempting fallback scrape...",
        );
        const { data: projectData } = await supabase.from("project_data")
          .select("data").eq("project_id", projectId).eq(
            "data_type",
            "agency_dna",
          ).single();
        const siteUrl = projectData?.data?.website;

        if (siteUrl) {
          // Safe call for API Key
          const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY") || "";
          if (firecrawlKey) {
            const scraped = await scrapeClientSite(siteUrl, firecrawlKey);
            if (scraped) {
              console.log(
                `[STRATEGIZE] ✅ Injected Real Client Data (${scraped.length} chars)`,
              );
              context.fullText += `\n\n=== FRESH SCRAPE OF CLIENT SITE ===\n${
                scraped.substring(0, 20000)
              }`;
            }
          } else {
            console.warn(
              "[STRATEGIZE] ⚠️ Missing FIRECRAWL_API_KEY, skipping fallback scrape",
            );
          }
        }
      }

      // SAFETY TRUNCATION: Limit context to 500k chars (Pro handles 2M tokens, so 500k chars is safe)
      const safeContext = context.fullText.substring(0, 500000);

      const finalMissionPrompt = MISSION_PROMPT.replace(
        "{GLOBAL_CONTEXT}",
        safeContext,
      );

      // --- AUDIT LOGS (DATA DUMP) ---
      console.log("==========================================");
      console.log("[AUDIT] 🚨 SYSTEM INSTRUCTION DUMP:");
      console.log(SYSTEM_INSTRUCTION);
      console.log("------------------------------------------");
      console.log(
        "[AUDIT] 🥩 FULL CONTEXT DUMP (" + context.fullText.length + " chars):",
      );
      if (context.fullText.length > 500) {
        console.log(
          `[AUDIT] PREVIEW START: ${context.fullText.substring(0, 500)}...`,
        );
      }
      console.log("==========================================");

      const identityJson = await gemini.generateJSON<StrategicIdentity>(
        finalMissionPrompt,
        GEMINI_MODELS.FLASH, // UPGRADE: Using PRO for deeper reading comprehension
        SYSTEM_INSTRUCTION, // System prompt separated
        undefined,
        { temperature: 0.0 }, // ABSOLUTE ZERO TEMPERATURE
      );

      if (!identityJson) {
        throw new Error("Gemini returned empty identity");
      }

      console.log(
        `[DIAGNOSTIC] 🕵️ VERIFICATION CITATION: "${identityJson.verification_citation}"`,
      );

      // Save to DB
      const consciousnessLog = identityJson.consciousness_summary
        ? identityJson.consciousness_summary.join("\n- ")
        : "No consciousness summary";

      const pillarsSummary = identityJson.strategic_pillars
        ? identityJson.strategic_pillars.map((p: StrategicPillar) =>
          `[${p.name}]`
        ).join(
          " + ",
        )
        : "";

      const expertValueProp =
        `🧠 CONSCIOUSNESS SUMMARY (Anti-B2B Proof):\n- ${consciousnessLog}\n\n🔥 STRATEGY PROOF:\n${pillarsSummary}\n\n${identityJson.unique_value_proposition}`;

      const dbPayload = {
        project_id: projectId,
        unique_value_proposition: expertValueProp,
        core_pain_points: identityJson.core_pain_points,
        symptom_profile: identityJson.symptom_profile, // This might need to match schema, assuming jsonb
        ideal_prospect_profile: identityJson.ideal_prospect_profile,
        exclusion_criteria: identityJson.exclusion_criteria,
        anti_patterns: identityJson.observable_symptoms || [],
        updated_at: new Date().toISOString(),
      };

      const { data: saved, error: saveErr } = await supabase
        .from("strategic_identities")
        .upsert(dbPayload, { onConflict: "project_id" })
        .select()
        .single();

      if (saveErr) console.error("Identity Save Error:", saveErr);
      identity = saved || identityJson;
    }

    // 5. Generate Strategy
    console.log(`[STRATEGIZE] ⚔️ Generating Queries...`);
    const finalStrategyPrompt = STRATEGY_PROMPT.replace(
      "{IDENTITY_JSON}",
      JSON.stringify(identity, null, 2),
    );

    const strategyJson = await gemini.generateJSON(
      finalStrategyPrompt,
      GEMINI_MODELS.FLASH,
      undefined,
      undefined,
      { temperature: 0.5 },
    );

    console.log(`[STRATEGIZE] ✅ Success`);

    return new Response(
      JSON.stringify({
        success: true,
        identity: identity,
        strategy: strategyJson,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    console.error("[STRATEGIZE] 🔥 FATAL ERROR:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage || "Unknown fatal error",
      }),
      {
        status: 200, // Return 200 to prevent Supabase 500 generic error
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
