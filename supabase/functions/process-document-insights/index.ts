import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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

interface DocumentInsight {
  extracted_prospects: Array<{ name: string; context: string }>;
  specific_pain_points: Array<{ problem: string; technical_detail: string }>;
  success_metrics: Array<{ metric: string; value: string }>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Validate Input
    const { documentId, projectId } = await req.json();
    if (!documentId || !projectId) {
      throw new Error("Missing documentId or projectId");
    }

    console.log(
      `[INSIGHTS] 🕵️ Processing Doc: ${documentId} (Project: ${projectId})`,
    );

    // 2. Init Clients
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const gemini = new GeminiClient(API_KEYS.GEMINI);

    // 3. Fetch Document Content
    const { data: doc, error: docError } = await supabase
      .from("company_documents")
      .select("file_name, extracted_content")
      .eq("id", documentId)
      .single();

    if (docError || !doc || !doc.extracted_content) {
      throw new Error(`Document not found or empty: ${docError?.message}`);
    }

    // 4. The "Gold Mining" Prompt
    const systemPrompt = `
      You are an EXPERT TECHNICAL AUDITOR. Your job is to read internal company documents and extract HIGH-VALUE INTELLIGENCE.
      Ignore generic marketing fluff. Hunt for specific names, problems, and numbers.

      your goal is to populate this JSON structure:
      {
        "extracted_prospects": [
          { "name": "Company Name", "context": "Why are they mentioned? (Client, Partner, Competitor)" }
        ],
        "specific_pain_points": [
          { "problem": "High-level problem", "technical_detail": "Exact technical quote or detail (e.g., 'leaking valve 3' instead of 'maintenance issue')" }
        ],
        "success_metrics": [
          { "metric": "What was measured", "value": "The specific number/percentage" }
        ]
      }

      RULES:
      1. Be SPECIFIC. "Maintenance issues" is bad. "Vibration alarms on turbine B" is good.
      2. Extract ENTITIES. If a company name is capitalized, grab it.
      3. Extract NUMBERS. Savings, ROI, efficiency gains.
      4. If nothing relevant is found in a category, return an empty array for that category.
    `;

    const userPrompt = `
      DOCUMENT: ${doc.file_name}
      CONTENT:
      ${doc.extracted_content.slice(0, 100000)} -- Limit context window
    `;

    console.log(`[INSIGHTS] 🧠 Mining intelligence...`);
    const insights = await gemini.generateJSON<DocumentInsight>(
      userPrompt,
      GEMINI_MODELS.PRO,
      systemPrompt,
    );

    console.log(
      `[INSIGHTS] ✅ Found: ${insights.extracted_prospects.length} prospects, ${insights.specific_pain_points.length} pains`,
    );

    // 5. Store Insights
    const { error: upsertError } = await supabase
      .from("document_insights")
      .upsert({
        project_id: projectId,
        document_id: documentId,
        extracted_prospects: insights.extracted_prospects,
        specific_pain_points: insights.specific_pain_points,
        success_metrics: insights.success_metrics,
        analysis_version: "gemini-1.5-pro",
      }, { onConflict: "document_id" });

    if (upsertError) throw upsertError;

    return new Response(JSON.stringify({ success: true, insights }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`[INSIGHTS] 🚨 Error:`, error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
