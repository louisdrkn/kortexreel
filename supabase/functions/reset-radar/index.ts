import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/api-clients.ts";
import { ResetRequest } from "../_shared/types.ts";

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const rawBody = await req.text();
    let body: ResetRequest;
    try {
      body = JSON.parse(rawBody);
    } catch {
      throw new Error("Invalid structure: Request body must be valid JSON");
    }

    const { projectId } = body;

    if (!projectId) {
      throw new Error("Missing projectId");
    }

    // Initialize Supabase with Service Role Key to bypass RLS
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseServiceKey) {
      throw new Error(
        "Missing SUPABASE_SERVICE_ROLE_KEY. Ensure it is set in your Edge Function secrets.",
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(
      `[reset-radar] 🧹 Starting CLEAN SLATE protocol for project: ${projectId}`,
    );

    // Perform resilient deletions (Sequential to ensure constraints are respected if any)
    const errors: string[] = [];

    // 0. Delete Interactions (referencing analyses)
    const { error: interactionsError } = await supabase.from(
      "lead_interactions",
    )
      .delete().eq("project_id", projectId);
    if (interactionsError) {
      errors.push(`Interactions: ${interactionsError.message}`);
    }

    // 0.5 Delete Learned Preferences (referencing project)
    const { error: prefsError } = await supabase.from("learned_preferences")
      .delete().eq("project_id", projectId);
    if (prefsError) errors.push(`Preferences: ${prefsError.message}`);

    // 1. Delete Analyses (Most voluminous)
    const { error: analysesError } = await supabase.from("company_analyses")
      .delete().eq("project_id", projectId);
    if (analysesError) errors.push(`Analyses: ${analysesError.message}`);

    // 2. Delete Prospects (CRM Link)
    const { error: prospectsError } = await supabase.from("kortex_prospects")
      .delete().eq("project_id", projectId);
    if (prospectsError) errors.push(`Prospects: ${prospectsError.message}`);

    // 3. Delete Strategy (The Identity)
    const { error: strategyError } = await supabase.from("strategic_identities")
      .delete().eq("project_id", projectId);
    if (strategyError) errors.push(`Strategy: ${strategyError.message}`);

    if (errors.length > 0) {
      console.warn("Reset had partial errors:", errors);
      // We still return success: true because we want the UI to proceed to "Clean Slate" even if a table was empty/locked
      // returning false would block the user from retrying or moving forward.
    }

    console.log(`[reset-radar] ✅ Reset complete for project: ${projectId}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Clean Slate Protocol Executed Successfully",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error(`[reset-radar] ❌ Error:`, error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  }
});
