import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import {
  API_KEYS,
  GEMINI_MODELS,
  GeminiClient,
} from "../_shared/api-clients.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId, force_refresh, strategy } = await req.json();

    if (!projectId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "ProjectId is required for Deep Reasoning context.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const gemini = new GeminiClient(API_KEYS.GEMINI);

    // 1. INGESTION: Fetch all Project Context
    const { data: projectDataRecords, error: dbError } = await supabase
      .from("project_data")
      .select("data_type, data")
      .eq("project_id", projectId)
      .in("data_type", ["agency_dna", "target_criteria"]);

    if (dbError) {
      console.error("Database Error:", dbError);
      throw new Error("Failed to fetch project context");
    }

    const agency_dna = projectDataRecords?.find((r) =>
      r.data_type === "agency_dna"
    )?.data || {};
    const target_criteria = projectDataRecords?.find((r) =>
      r.data_type === "target_criteria"
    )?.data || {};

    if (!agency_dna.pitch && !target_criteria.industry) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "Context Missing: Please configure Agency DNA and Target Criteria first.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(
      "Context Loaded. Starting Deep Reasoning with Gemini 1.5 Pro...",
    );

    // 2. DEDUCTION: Gemini "Zero-Search" Logic
    // Flags extracted at top

    // If TABULA RASA (Recalibration), we force a fresh perspective
    const isTabulaRasa = force_refresh === true;

    const deepReasoningPrompt = `
    ROLE: You are Kortex, an Elite B2B Strategist AI. NOT a search engine.
    MISSION: Deduce specific company targets based on the provided Strategy Context.
    ${
      isTabulaRasa
        ? "URGENT: IGNORE previous lists. ACT AS A SENIOR STRATEGIST. We need a completely FRESH perspective."
        : ""
    }
    
    STRATEGY CONTEXT:
    1. AGENCY PITCH (The Solution):
    "${agency_dna.pitch || "N/A"}"
    
    2. TARGET DEFINITION (The Ideal Client Profile):
    - Industry: ${target_criteria.industry || "Any"}
    - Company Size: ${target_criteria.headcount || "Any"}
    - Geography: ${target_criteria.location || "Any"}
    - Key Pain Points: ${JSON.stringify(target_criteria.pain_points || [])}
    
    TASK:
    Based strictly on this context, DEDUCE 15 specific companies that perfectly fit this profile.
    Focus on "Pain Point" matching. If the context implies logistics challenges, find companies with huge fleets (Stef, XPO). If it implies compliance struggles, find heavy regulated industries.
    
    OUTPUT JSON ONLY:
    {
      "companies": [
        {
          "name": "Exact Company Name",
          "website": "likely-domain.com",
          "reasoning": "Specifically why they have this pain point based on their size/sector. (Must be unique/insightful)"
        }
      ]
    }
    
    CONSTRAINTS:
    - NO generic searches. Use your internal knowledge base.
    - NO "Example Corp". Real companies only.
    - If specific geography is set (e.g. France), prioritize local leaders.
    `;

    // Use Gemini 3.0 Pro for elite reasoning
    let companies = [];
    try {
      const result = await gemini.generateJSON(
        deepReasoningPrompt,
        GEMINI_MODELS.ULTRA,
        "You are Kortex. Deep B2B Strategist. Output JSON only.",
      );
      companies = result.companies || [];
    } catch (e) {
      console.error("Gemini Deduction Failed", e);
      throw new Error("AI Deduction failed to return valid targets.");
    }

    // 3. RETURN: Send deduced list to Frontend
    const processedCompanies = companies.map((c: any) => ({
      id: crypto.randomUUID(),
      name: c.name,
      website: c.website,
      score: 85,
      reasoning: c.reasoning,
      status: "deduced",
    }));

    return new Response(
      JSON.stringify({
        success: true,
        mode: "deep_reasoning",
        companies: processedCompanies,
        count: processedCompanies.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Deep Reasoning Error:", error);
    // RETURN 200 even on error so Frontend can read the JSON body
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown Error",
        details: error instanceof Error ? error.stack : undefined,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
