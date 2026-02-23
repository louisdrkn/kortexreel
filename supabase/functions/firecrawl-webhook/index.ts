import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-firecrawl-secret",
};

// ============================================================
// firecrawl-webhook
// Receives Firecrawl agent job results via HTTP push.
// Firecrawl calls this URL when the job is done (success/fail).
// We parse the output and insert companies into radar_catch_all.
// ============================================================

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Verify secret token (optional but recommended for security)
    const secret = req.headers.get("x-firecrawl-secret") ||
      new URL(req.url).searchParams.get("secret");
    const expectedSecret = Deno.env.get("FIRECRAWL_WEBHOOK_SECRET");
    if (expectedSecret && secret !== expectedSecret) {
      console.warn("[WEBHOOK] ❌ Invalid secret, ignoring request.");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await req.json();
    console.log(
      "[WEBHOOK] ✅ Received payload:",
      JSON.stringify(payload).substring(0, 200),
    );

    const { type, data, metadata } = payload;

    // Firecrawl webhook types: "job.completed", "job.failed"
    if (type !== "job.completed") {
      console.log(`[WEBHOOK] ⏩ Ignoring event type: ${type}`);
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // metadata contains project_id and missionBrief we passed when starting the job
    const projectId = metadata?.project_id;
    const missionBrief = metadata?.mission_brief || "";
    const scanId = metadata?.scan_id;

    if (!projectId) {
      console.error("[WEBHOOK] ❌ Missing project_id in metadata");
      return new Response(JSON.stringify({ error: "Missing project_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ================================================================
    // PARSE: Extract companies from Firecrawl agent output
    // ================================================================
    let candidates: any[] = [];

    try {
      // Firecrawl v2 agent output: data.steps[last].output
      let rawOutput = "";

      if (data?.steps && Array.isArray(data.steps) && data.steps.length > 0) {
        rawOutput = data.steps[data.steps.length - 1]?.output || "";
      } else if (typeof data === "string") {
        rawOutput = data;
      } else if (data?.output) {
        rawOutput = data.output;
      }

      console.log("[WEBHOOK] Raw output length:", String(rawOutput).length);

      // Clean markdown code blocks
      let jsonString = typeof rawOutput === "object"
        ? JSON.stringify(rawOutput)
        : String(rawOutput);

      jsonString = jsonString
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/g, "")
        .trim();

      // Try parsing as JSON
      let parsedData: any = null;
      try {
        parsedData = JSON.parse(jsonString);
      } catch {
        // Try extracting JSON array from mixed text
        const arrayMatch = jsonString.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
          parsedData = JSON.parse(arrayMatch[0]);
        } else {
          const objMatch = jsonString.match(/\{[\s\S]*\}/);
          if (objMatch) {
            parsedData = JSON.parse(objMatch[0]);
          }
        }
      }

      if (parsedData) {
        if (parsedData.companies && Array.isArray(parsedData.companies)) {
          candidates = parsedData.companies;
        } else if (parsedData.data && Array.isArray(parsedData.data)) {
          candidates = parsedData.data;
        } else if (Array.isArray(parsedData)) {
          candidates = parsedData;
        } else if (typeof parsedData === "object" && parsedData.company_name) {
          candidates = [parsedData];
        }
      }

      console.log(`[WEBHOOK] ✅ Parsed ${candidates.length} candidates`);
    } catch (parseErr) {
      console.error("[WEBHOOK] ❌ Parse error:", parseErr);
      // Log to system_logs
      await supabase.from("system_logs").insert({
        project_id: projectId,
        function_name: "firecrawl-webhook",
        step_name: "PARSE_ERROR",
        status: "ERROR",
        details: String(parseErr).substring(0, 5000),
      });
    }

    // ================================================================
    // INSERT: Push companies to radar_catch_all
    // ================================================================
    let insertCount = 0;

    if (candidates.length > 0) {
      const rows = candidates
        .map((c: any) => {
          const companyName = c.company_name || c.name || c["Company Name"] ||
            "";
          let websiteUrl = c.url || c.website || c.website_url || c.URL || "";

          if (!companyName && !websiteUrl) return null;
          if (websiteUrl && !websiteUrl.startsWith("http")) {
            websiteUrl = `https://${websiteUrl}`;
          }
          if (!websiteUrl) return null; // Skip entries without URL (required for upsert uniqueness)

          return {
            project_id: projectId,
            company_name: companyName || websiteUrl,
            website_url: websiteUrl,
            activity_sector: c.activity || c.industry || c.sector ||
              c.description || null,
            pain_point_context: c.relevance_reason || c.reason_for_selection ||
              c.context || c.match_reason || null,
            status: "new",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            raw_data: {
              source: "firecrawl_webhook_v2",
              query: missionBrief,
              companies: [c],
            },
          };
        })
        .filter(Boolean);

      console.log(
        `[WEBHOOK] 🚚 Upserting ${rows.length} companies into radar_catch_all...`,
      );

      // Upsert one by one to avoid partial failures blocking the batch
      for (const row of rows) {
        const { error } = await supabase
          .from("radar_catch_all")
          .upsert(row as any, {
            onConflict: "project_id, website_url",
            ignoreDuplicates: false,
          });

        if (error) {
          console.error(
            `[WEBHOOK] ❌ Upsert error (${row?.company_name}):`,
            error.message,
          );
        } else {
          insertCount++;
          console.log(`[WEBHOOK] ✅ Inserted: ${row?.company_name}`);
        }
      }
    }

    // ================================================================
    // FINALIZE: Mark scan as completed in radar_scans
    // ================================================================
    if (scanId) {
      await supabase.from("radar_scans" as any).update({
        status: "completed",
        stage: "done",
        progress: 100,
        updated_at: new Date().toISOString(),
        meta: { companies_found: insertCount, source: "webhook" },
      }).eq("id", scanId);
    } else {
      // Try to find the most recent scan for this project
      await supabase.from("radar_scans" as any).update({
        status: "completed",
        stage: "done",
        progress: 100,
        updated_at: new Date().toISOString(),
        meta: { companies_found: insertCount, source: "webhook" },
      })
        .eq("project_id", projectId)
        .in("status", ["processing", "queued", "searching"]);
    }

    // Log success
    await supabase.from("system_logs").insert({
      project_id: projectId,
      function_name: "firecrawl-webhook",
      step_name: "WEBHOOK_SUCCESS",
      status: "INFO",
      details:
        `Inserted ${insertCount}/${candidates.length} companies into radar_catch_all`,
    });

    console.log(
      `[WEBHOOK] 🎉 Done! Inserted ${insertCount} companies for project ${projectId}`,
    );

    return new Response(
      JSON.stringify({ ok: true, inserted: insertCount }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("[WEBHOOK] 💥 Fatal error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
