import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  API_KEYS,
  GEMINI_MODELS,
  GeminiClient,
} from "../_shared/api-clients.ts";
import { buildProjectContext } from "../_shared/project-context.ts";

// ============================================================
// check-firecrawl v3
// • Polls Firecrawl for completed jobs
// • Inserts results into radar_catch_all (purges old data first)
// • Calls Gemini Flash to generate a "Pourquoi ce prospect ?"
//   paragraph per company using the full client project context
// ============================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { projectId } = await req.json();
    if (!projectId) {
      return new Response(JSON.stringify({ error: "Missing projectId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY") ||
      Deno.env.get("FIRECRAWL");
    if (!firecrawlKey) {
      return new Response(
        JSON.stringify({ error: "Missing FIRECRAWL_API_KEY" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Find pending scans with a firecrawl_job_id
    const { data: scans } = await supabase
      .from("radar_scans")
      .select("id, firecrawl_job_id, status")
      .eq("project_id", projectId)
      .in("status", ["processing", "queued", "searching"])
      .not("firecrawl_job_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(10);

    if (!scans || scans.length === 0) {
      return new Response(
        JSON.stringify({ done: false, message: "No pending jobs found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Load project context ONCE for all companies (expensive call — do it once)
    let projectContext = "";
    try {
      projectContext = await buildProjectContext(supabase, projectId);
      console.log(
        `[CHECK] Project context loaded: ${projectContext.length} chars`,
      );
    } catch (ctxErr) {
      console.warn("[CHECK] Could not load project context:", ctxErr);
    }

    // Initialize Gemini (used for match analysis paragraph)
    let gemini: GeminiClient | null = null;
    try {
      gemini = new GeminiClient(API_KEYS.GEMINI);
    } catch {
      console.warn("[CHECK] No GEMINI_API_KEY — AI analysis will be skipped");
    }

    let totalInserted = 0;
    let anyCompleted = false;

    for (const scan of scans) {
      // deno-lint-ignore no-explicit-any
      const s = scan as any;
      const jobId: string = s.firecrawl_job_id;
      const scanId: string = s.id;

      try {
        const resp = await fetch(
          `https://api.firecrawl.dev/v2/agent/${jobId}`,
          { headers: { "Authorization": `Bearer ${firecrawlKey}` } },
        );

        if (!resp.ok) {
          console.warn(`[CHECK] Job ${jobId} HTTP ${resp.status}`);
          continue;
        }

        // deno-lint-ignore no-explicit-any
        const jobData: any = await resp.json();
        console.log(`[CHECK] Job ${jobId} => ${jobData.status}`);

        if (jobData.status === "completed") {
          anyCompleted = true;

          // ── Parse Firecrawl output ───────────────────────────────────────
          const rawOutput = jobData.data;
          let jsonStr = typeof rawOutput === "object"
            ? JSON.stringify(rawOutput)
            : String(rawOutput || "");
          jsonStr = jsonStr.replace(/```json\s*/gi, "").replace(/```\s*/g, "")
            .trim();

          // deno-lint-ignore no-explicit-any
          let candidates: any[] = [];
          try {
            let parsed: unknown = null;
            try {
              parsed = JSON.parse(jsonStr);
            } catch {
              const arr = jsonStr.match(/\[[\s\S]*\]/);
              if (arr) parsed = JSON.parse(arr[0]);
              else {
                const obj = jsonStr.match(/\{[\s\S]*\}/);
                if (obj) parsed = JSON.parse(obj[0]);
              }
            }

            if (parsed !== null && typeof parsed === "object") {
              const p = parsed as Record<string, unknown>;
              if (p.companies && Array.isArray(p.companies)) {
                candidates = p.companies;
              } else if (p.data && Array.isArray(p.data)) candidates = p.data;
              else if (Array.isArray(parsed)) candidates = parsed;
            }
          } catch (pe) {
            console.error(`[CHECK] Parse error for job ${jobId}:`, pe);
          }

          console.log(
            `[CHECK] ${candidates.length} candidates from job ${jobId}`,
          );

          // 🧹 PURGE old radar_catch_all data before inserting fresh results
          await supabase.from("radar_catch_all").delete().eq(
            "project_id",
            projectId,
          );
          console.log("[CHECK] 🧹 Old radar_catch_all purged before insert.");

          // ── Insert + AI analysis per company ─────────────────────────────
          let inserted = 0;
          for (const c of candidates) {
            const companyName = c.company_name || c.name || "";
            let websiteUrl = c.url || c.website || c.website_url || "";
            if (!websiteUrl) continue;
            if (!String(websiteUrl).startsWith("http")) {
              websiteUrl = `https://${websiteUrl}`;
            }

            // Raw relevance from Firecrawl
            const firecrawlReason = c.relevance_reason ||
              c.reason_for_selection || c.analysis || "";

            // 🤖 GENERATE "POURQUOI CE PROSPECT ?" with Gemini
            let matchAnalysis = firecrawlReason; // fallback = Firecrawl reason
            if (gemini && projectContext) {
              try {
                const aiPrompt =
                  `Tu es Kortex, l'expert métier de l'agence. Tu connais parfaitement l'offre, les clients passés et la stratégie commerciale de l'agence.

CONTEXTE COMPLET DE L'AGENCE :
${projectContext.slice(0, 6000)}

L'agent de détection a identifié ce prospect :
- Nom : ${companyName}
- Site web : ${websiteUrl}
- Raison de sélection initiale : "${firecrawlReason}"

Rédige en 3-4 phrases en français, en tant qu'expert métier, un paragraphe précis et factuel expliquant POURQUOI cette entreprise rentre dans la cible de l'agence. Cite des correspondances spécifiques avec l'offre. Sois chirurgical, pas générique.`;

                matchAnalysis = await gemini.generateContent(
                  aiPrompt,
                  GEMINI_MODELS.FLASH,
                  `Tu es Kortex, un expert commercial B2B ultra-précis. Tu identifies pourquoi un prospect correspond exactement à la cible d'un client. Tu parles en français, tu es factuel, concis (3-4 phrases max), jamais générique. Tu ne dis jamais "Nos prospects" ou "Nos leads".`,
                  { temperature: 0.4, maxOutputTokens: 300 },
                );
                console.log(
                  `[CHECK] 🤖 AI analysis generated for: ${companyName}`,
                );
              } catch (aiErr) {
                console.warn(
                  `[CHECK] Gemini failed for ${companyName}:`,
                  aiErr,
                );
                matchAnalysis = firecrawlReason; // fallback
              }
            }

            const { error: upsertErr } = await supabase
              .from("radar_catch_all")
              .upsert({
                project_id: projectId,
                company_name: companyName || websiteUrl,
                website_url: websiteUrl,
                activity_sector: c.activity || c.industry || c.sector || null,
                pain_point_context: matchAnalysis, // ← AI paragraph HERE
                status: "new",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                raw_data: {
                  source: "check_firecrawl_v3",
                  job_id: jobId,
                  raw: c,
                  firecrawl_reason: firecrawlReason,
                  ai_match_analysis: matchAnalysis,
                },
              }, {
                onConflict: "project_id,website_url",
                ignoreDuplicates: false,
              });

            if (!upsertErr) {
              inserted++;
              console.log(`[CHECK] ✅ Inserted + AI analyzed: ${companyName}`);
            } else {
              console.error(
                `[CHECK] ❌ (${companyName}):`,
                upsertErr.message,
              );
            }
          }

          totalInserted += inserted;

          // Mark scan completed
          await supabase.from("radar_scans").update({
            status: "completed",
            stage: "done",
            progress: 100,
            updated_at: new Date().toISOString(),
            meta: { companies_found: inserted, source: "check_firecrawl_v3" },
          }).eq("id", scanId);

          // Log best-effort
          try {
            await supabase.from("system_logs").insert({
              project_id: projectId,
              function_name: "check-firecrawl",
              step_name: "INSERT_DONE",
              status: "INFO",
              details:
                `Inserted ${inserted}/${candidates.length} from job ${jobId} (with AI analysis)`,
            });
          } catch { /* non-blocking */ }
        } else if (jobData.status === "failed") {
          await supabase.from("radar_scans").update({
            status: "failed",
            updated_at: new Date().toISOString(),
          }).eq("id", scanId);
        }
      } catch (jobErr) {
        console.error(`[CHECK] Error for job ${jobId}:`, jobErr);
      }
    }

    return new Response(
      JSON.stringify({
        done: anyCompleted,
        inserted: totalInserted,
        jobs_checked: scans.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[CHECK] Fatal error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
