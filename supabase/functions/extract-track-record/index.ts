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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { websiteUrl, jobId } = await req.json();

    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!firecrawlKey) {
      throw new Error("FIRECRAWL_API_KEY not configured");
    }

    // MODE 1: CHECK STATUS
    if (jobId) {
      console.log(`📡 Checking Job Status: ${jobId}`);
      const statusResponse = await fetch(
        `https://api.firecrawl.dev/v2/agent/${jobId}`,
        {
          headers: { "Authorization": `Bearer ${firecrawlKey}` },
        },
      );

      if (!statusResponse.ok) {
        throw new Error(`Failed to check status: ${statusResponse.status}`);
      }

      const statusData = await statusResponse.json();
      console.log(`✅ Job Status: ${statusData.status}`);

      // CACHE ON COMPLETION
      if (statusData.status === "completed" && websiteUrl) {
        try {
          const normalizedUrl = websiteUrl.replace(/^https?:\/\/(www\.)?/, "")
            .replace(/\/$/, "").toLowerCase();
          console.log(
            `💾 Caching result for ${normalizedUrl} to Global Knowledge...`,
          );

          // Connect to Supabase using Service Role
          const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
          const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
          const supabase = createClient(supabaseUrl, supabaseKey);

          const cachePayload = {
            agency_profile: statusData.data.agency_profile,
            services_summary: statusData.data.services_summary,
            track_record: statusData.data.track_record,
          };

          const { error: cacheError } = await supabase.from("global_url_cache")
            .upsert({
              url_domain: normalizedUrl,
              scraped_data: cachePayload,
              last_scanned_at: new Date().toISOString(),
            }, { onConflict: "url_domain" });

          if (cacheError) console.error("Cache Insert DB Error:", cacheError);
          else console.log("✅ Cached successfully.");
        } catch (e) {
          console.error("Cache Write Error (Ignoring):", e);
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          status: statusData.status, // "active", "completed", "failed"
          data: statusData.status === "completed"
            ? {
              agency_profile: statusData.data.agency_profile,
              services_summary: statusData.data.services_summary,
              track_record: statusData.data.track_record,
            }
            : null,
          error: statusData.error,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // MODE 2: START NEW JOB
    if (websiteUrl) {
      const normalizedUrl = websiteUrl.replace(/^https?:\/\/(www\.)?/, "")
        .replace(/\/$/, "").toLowerCase();
      console.log(`🤖 Global Knowledge Check for: ${normalizedUrl}`);

      // 1. CHECK CACHE
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      try {
        const { data: cached } = await supabase
          .from("global_url_cache")
          .select("scraped_data")
          .eq("url_domain", normalizedUrl)
          .single();

        if (cached) {
          console.log(
            `⚡️ CACHE HIT: Returning data from Global Knowledge for ${normalizedUrl}`,
          );
          return new Response(
            JSON.stringify({
              success: true,
              status: "completed", // Fake completed status
              data: cached.scraped_data,
              cached: true,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      } catch (err) {
        console.warn("Cache Check Failed (Proceeding to Scrape):", err);
      }

      console.log(`🤖 Starting New Agent Job for: ${websiteUrl}`);

      const agentPrompt =
        `Tu es un expert en analyse d'agences web. Ta mission : extraire TOUTES les informations stratégiques de ce site.
  
  OBJECTIF 1 - PROFIL DE L'AGENCE :
  - Trouve leur tagline/slogan principal
  - Identifie leur promesse de valeur unique
  - Déduis leur client cible
  
  OBJECTIF 2 - SERVICES :
  - Liste leurs expertises principales
  
  OBJECTIF 3 - TRACK RECORD (CLIENTS) :
  - Cherche "Références", "Portfolio", "Clients"
  - Repère les logos et études de cas
  
  RÈGLES D'EXCLUSION :
  ❌ PAS de réseaux sociaux (YouTube, LinkedIn...)
  ❌ PAS de technologies (AWS, React, Stripe...)
  ❌ PAS de partenaires
  
  ✅ LISTE UNIQUEMENT : Les entreprises clientes réelles.`;

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
      });

      if (!agentResponse.ok) {
        const errorText = await agentResponse.text();
        throw new Error(
          `Firecrawl API Error: ${agentResponse.status} - ${errorText}`,
        );
      }

      const agentData = await agentResponse.json();

      if (!agentData.success || !agentData.id) {
        throw new Error("Agent job creation failed");
      }

      console.log(`✅ Job Started: ${agentData.id}`);

      return new Response(
        JSON.stringify({
          success: true,
          jobId: agentData.id,
          status: "started",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "Missing websiteUrl or jobId" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("❌ Error:", error);
    const errorMessage = error instanceof Error
      ? error.message
      : "Unknown error";

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
