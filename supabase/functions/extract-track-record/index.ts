import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * EXTRACT TRACK RECORD - Firecrawl Agent API (REST Direct)
 *
 * RESPONSABILITÉ : Analyser l'URL du site web via Firecrawl Agent API
 * MÉTHODE : Appel direct API REST /v2/agent (pas de SDK)
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// JSON Schema pur pour Firecrawl
const agencySchema = {
  type: "object",
  properties: {
    agency_profile: {
      type: "object",
      properties: {
        tagline: {
          type: "string",
          description: "La phrase d'accroche principale",
        },
        value_proposition: {
          type: "string",
          description: "La promesse de valeur unique",
        },
        target_audience: {
          type: "string",
          description: "Leur client cible déduit",
        },
      },
      required: ["tagline", "value_proposition", "target_audience"],
    },
    services_summary: {
      type: "array",
      items: { type: "string" },
      description: "Liste des expertises clés",
    },
    track_record: {
      type: "array",
      items: {
        type: "object",
        properties: {
          company_name: { type: "string" },
          industry: { type: "string" },
          context: { type: "string" },
        },
        required: ["company_name"],
      },
      description: "Liste des clients (EXCLUS réseaux sociaux)",
    },
  },
  required: ["agency_profile", "services_summary", "track_record"],
};

Deno.serve(async (req) => {
  // CONFIG: Timeout global de sécurité (50s pour laisser 10s de marge au timeout Supabase 60s)
  const CONNECTION_TIMEOUT = 50000;

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Initialisation anticipée pour le bloc catch
  let supabaseClient: any = null;
  let requestRecordId: string | null = null;
  let currentStep = 0;

  const logStep = (msg: string) => {
    currentStep++;
    console.log(`[STEP ${currentStep}] ${msg}`);
  };

  try {
    logStep("Starting extraction process...");

    // 1. SETUP ENV & CLIENTS
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");

    if (!supabaseUrl || !supabaseKey || !firecrawlKey) {
      throw new Error("Missing API Keys configuration");
    }

    supabaseClient = createClient(supabaseUrl, supabaseKey);

    // 2. PARSE REQUEST
    const { websiteUrl, jobId, recordId } = await req.json();
    requestRecordId = recordId; // Sauvegarde pour le catch

    if (!websiteUrl && !jobId) {
      throw new Error("Missing websiteUrl or jobId");
    }

    // MODE 1: CHECK JOB STATUS
    if (jobId) {
      logStep(`Checking Firecrawl Job Status: ${jobId}`);

      const statusResponse = await fetch(
        `https://api.firecrawl.dev/v2/agent/${jobId}`,
        {
          headers: { "Authorization": `Bearer ${firecrawlKey}` },
          signal: AbortSignal.timeout(10000), // 10s max pour un check status
        },
      );

      if (!statusResponse.ok) {
        throw new Error(`Firecrawl Check Failed: ${statusResponse.status}`);
      }

      const statusData = await statusResponse.json();
      logStep(`Job Status received: ${statusData.status}`);

      // SUCCESS HANDLING
      if (statusData.status === "completed") {
        logStep("Job completed. Processing results...");

        // Update DB if recordId provided
        if (recordId) {
          logStep("Updating DB record to status: completed");
          await supabaseClient.from("track_records").update({
            status: "completed",
            // On pourrait sauvegarder les résultats ici aussi si besoin
            updated_at: new Date().toISOString(),
          }).eq("id", recordId);
        }

        // Cache Logic (Keep existing but wrapped safe)
        if (websiteUrl) {
          try {
            const normalizedUrl = websiteUrl.replace(/^https?:\/\/(www\.)?/, "")
              .replace(/\/$/, "").toLowerCase();
            await supabaseClient.from("global_url_cache").upsert({
              url_domain: normalizedUrl,
              scraped_data: statusData.data,
              last_scanned_at: new Date().toISOString(),
            }, { onConflict: "url_domain" });
          } catch (e) {
            console.warn("Cache Warning:", e);
          }
        }

        return new Response(
          JSON.stringify({
            success: true,
            status: "completed",
            data: statusData.data,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // ERROR HANDLING FROM FIRECRAWL
      if (statusData.status === "failed") {
        throw new Error(
          `Firecrawl Job Failed: ${statusData.error || "Unknown error"}`,
        );
      }

      // ACTIVE/WAITING STATUS
      return new Response(
        JSON.stringify({ success: true, status: statusData.status }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // MODE 2: START NEW JOB
    if (websiteUrl) {
      logStep(`Initiating New Job for: ${websiteUrl}`);

      // CACHE CHECK
      const normalizedUrl = websiteUrl.replace(/^https?:\/\/(www\.)?/, "")
        .replace(/\/$/, "").toLowerCase();
      const { data: cached } = await supabaseClient
        .from("global_url_cache")
        .select("scraped_data")
        .eq("url_domain", normalizedUrl)
        .single();

      if (cached) {
        logStep("⚡️ CACHE HIT. Returning immediately.");

        if (recordId) {
          await supabaseClient.from("track_records").update({
            status: "completed",
            updated_at: new Date().toISOString(),
          }).eq("id", recordId);
        }

        return new Response(
          JSON.stringify({
            success: true,
            status: "completed",
            data: cached.scraped_data,
            cached: true,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // FIRECRAWL LAUNCH
      logStep("Sending request to Firecrawl Agent...");

      const agentPrompt =
        `Tu es un expert en analyse d'agences web. Ta mission : extraire TOUTES les informations stratégiques de ce site.
OBJECTIF 1: Profil (tagline, value_proposition, target_audience)
OBJECTIF 2: Services (liste expertises)
OBJECTIF 3: Track Record (Clients réels, Logos, Portfolio) - EXCLURE partenaires et technos.`;

      const agentResponse = await fetch("https://api.firecrawl.dev/v2/agent", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${firecrawlKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: agentPrompt,
          urls: [websiteUrl],
          schema: agencySchema,
        }),
        signal: AbortSignal.timeout(CONNECTION_TIMEOUT),
      });

      if (!agentResponse.ok) {
        const errText = await agentResponse.text();
        throw new Error(
          `Firecrawl Launch Failed: ${agentResponse.status} - ${errText}`,
        );
      }

      const agentData = await agentResponse.json();
      if (!agentData.success || !agentData.id) {
        throw new Error("Firecrawl did not return a Job ID");
      }

      logStep(`✅ Job Successfully Started: ${agentData.id}`);

      // Update DB with Job ID
      if (recordId) {
        await supabaseClient.from("track_records").update({
          firecrawl_job_id: agentData.id,
          status: "processing",
          updated_at: new Date().toISOString(),
        }).eq("id", recordId);
      }

      return new Response(
        JSON.stringify({
          success: true,
          jobId: agentData.id,
          status: "started",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    throw new Error("Invalid Request: No websiteUrl or jobId");
  } catch (error: any) {
    console.error(`❌ CRITICAL ERROR at Step ${currentStep}:`, error);

    // ZOMBIE KILLER: Update DB on error
    if (supabaseClient && requestRecordId) {
      console.log(
        `[RECOVERY] Updating record ${requestRecordId} to error status...`,
      );
      try {
        await supabaseClient.from("track_records").update({
          status: "error",
          error_message: error.message || "Unknown Timeout/Error",
          updated_at: new Date().toISOString(),
        }).eq("id", requestRecordId);
        console.log(`[RECOVERY] ✅ Record marked as error.`);
      } catch (dbError) {
        console.error(`[RECOVERY] 🚨 Failed to update DB:`, dbError);
      }
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Internal Server Error",
        step: currentStep,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
