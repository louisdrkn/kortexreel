/**
 * KORTEX AGENT RESEARCHER PROCESS
 *
 * Architecture Intelligente en 3 Phases:
 *
 * PHASE 1: STRATÉGIE (Gemini 3.0 Pro)
 *   - Analyse des documents clients + contexte projet
 *   - Génération de l'ICP (Ideal Customer Profile)
 *   - Création de requêtes de recherche ciblées
 *
 * PHASE 2: DÉCOUVERTE (Google Custom Search API)
 *   - Recherche d'entreprises avec les requêtes générées
 *   - Collecte d'URLs, titres et descriptions
 *   - Filtrage des résultats pertinents
 *
 * PHASE 3: VALIDATION (Firecrawl + Gemini 3.0 Pro)
 *   - Scraping des sites web (Firecrawl)
 *   - Analyse profonde du contenu (Gemini)
 *   - Scoring + Enrichissement + Validation finale
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import {
  createClient,
  SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2";
import {
  API_KEYS,
  GEMINI_MODELS,
  GeminiClient,
} from "../_shared/api-clients.ts";
import { corsHeaders } from "../_shared/cors.ts";

// --- TYPES & INTERFACES ---

interface IcpData {
  icp: string;
  searchQueries: string[];
}

interface SearchCandidate {
  url: string;
  title: string;
  description: string;
}

interface ValidationResult {
  isValidCompany: boolean;
  companyName?: string;
  score: number;
  reason: string;
  description: string;
}

interface ResearchJobUpdate {
  status?: "pending" | "running" | "completed" | "failed";
  progress?: number;
  current_step?: string;
  step_details?: any;
  results?: any[];
  error_message?: string;
  completed_at?: string;
}

declare const EdgeRuntime: { waitUntil: (promise: Promise<unknown>) => void };

const FIRECRAWL_API_URL = "https://api.firecrawl.dev/v1";

// --- HELPERS ---

async function updateJobStatus(
  supabase: SupabaseClient,
  jobId: string,
  updates: ResearchJobUpdate,
) {
  const { error } = await supabase
    .from("research_jobs")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  if (error) {
    console.error(`[RESEARCHER] Error updating job ${jobId}:`, error.message);
  }
}

// --- CORE PROCESS ---

async function runDiscoveryProcess(
  supabase: SupabaseClient,
  jobId: string,
  projectId: string,
  userId: string,
  batchSize: number,
  targetCount: number,
  firecrawlApiKey: string,
) {
  try {
    console.log(
      `[RESEARCHER] [JOB ${jobId}] 🚀 Starting Discovery (Gemini 3.0 Pro)`,
    );
    const gemini = new GeminiClient(API_KEYS.GEMINI);

    // 1. STRATEGIE: CONTEXT & ICP
    await updateJobStatus(supabase, jobId, {
      status: "running",
      progress: 5,
      current_step: "Analyse Stratégique (Gemini 3.0)...",
    });

    // Fetch Project Data
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("name")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      throw new Error(`Project not found: ${projectError?.message}`);
    }

    const { data: docs } = await supabase
      .from("company_documents")
      .select("file_name, extracted_content")
      .eq("project_id", projectId);

    const docSummary = docs?.map((d) =>
      `[DOC] ${d.file_name}: ${d.extracted_content?.slice(0, 3000)}`
    ).join("\n") || "";

    const { data: pData } = await supabase
      .from("project_data")
      .select("data_type, data")
      .eq("project_id", projectId);

    const agency_dna = pData?.find((r) =>
      r.data_type === "agency_dna"
    )?.data || {};

    const contextStr = `
    AGENCY PITCH: ${agency_dna.pitch || ""}
    DOCUMENTS: ${docSummary}
    PROJECT: ${project.name}
    `;

    const icpPrompt = `You are Kortex, Elite B2B Lead Gen Agent.
    mission: Define Ideal Customer Profile (ICP) and generating search queries.
    
    OUTPUT JSON ONLY:
    {
      "icp": "Detailed ICP description (3-4 sentences)",
      "searchQueries": ["query 1", "query 2"... (20 queries)]
    }`;

    let icpData: IcpData;
    try {
      icpData = await gemini.generateJSON(
        contextStr,
        GEMINI_MODELS.ULTRA,
        icpPrompt,
      );
    } catch (e) {
      console.error("[RESEARCHER] ICP Gen Error", e);
      icpData = {
        icp: "Generic B2B Companies",
        searchQueries: [`${project.name} potential clients`],
      };
    }

    if (!icpData.searchQueries || icpData.searchQueries.length === 0) {
      icpData.searchQueries = [`${project.name} target companies`];
    }

    await updateJobStatus(supabase, jobId, {
      progress: 15,
      current_step: `Scan Web (${icpData.searchQueries.length} requêtes)...`,
      step_details: {
        icp: icpData.icp,
        queriesGenerated: icpData.searchQueries.length,
      },
    });

    // 2. DECOUVERTE: SEARCH (Google Custom Search API)
    const allUrls = new Set<string>();
    const searchResults: SearchCandidate[] = [];
    const queries = icpData.searchQueries.slice(0, 10);

    const GOOGLE_SEARCH_API_KEY = API_KEYS.GOOGLE_SEARCH ||
      Deno.env.get("GOOGLE_SEARCH_API_KEY");
    const GOOGLE_SEARCH_ENGINE_ID = Deno.env.get("GOOGLE_SEARCH_ENGINE_ID") ||
      "017576662512468239146:omuauf_lfve";
    const GOOGLE_SEARCH_URL = "https://www.googleapis.com/customsearch/v1";

    if (!GOOGLE_SEARCH_API_KEY) {
      throw new Error("Missing Google Search API Key");
    }

    for (let i = 0; i < queries.length; i++) {
      const q = queries[i];
      try {
        const searchParams = new URLSearchParams({
          key: GOOGLE_SEARCH_API_KEY,
          cx: GOOGLE_SEARCH_ENGINE_ID,
          q: q,
          num: "10",
          gl: "fr",
          lr: "lang_fr",
        });

        const resp = await fetch(
          `${GOOGLE_SEARCH_URL}?${searchParams.toString()}`,
        );
        if (!resp.ok) {
          console.error(
            `[RESEARCHER] [SEARCH] Google API error (${resp.status}) for query: ${q}`,
          );
          continue;
        }

        const data = await resp.json();
        (data.items || []).forEach((item: any) => {
          if (item.link && !allUrls.has(item.link)) {
            allUrls.add(item.link);
            searchResults.push({
              url: item.link,
              title: item.title,
              description: item.snippet || item.htmlSnippet || "",
            });
          }
        });

        await updateJobStatus(supabase, jobId, {
          progress: 15 + Math.round(((i + 1) / queries.length) * 15),
        });
      } catch (e) {
        console.error(`[RESEARCHER] [SEARCH] Error for query "${q}":`, e);
      }
    }

    // 3. VALIDATION: SCRAPING & CROSS-POLLINATION (Firecrawl + Gemini 2.5)
    await updateJobStatus(supabase, jobId, {
      progress: 40,
      current_step:
        "Data Fusion: Scraping & Cross-Pollination (Gemini 2.5 Flash)...",
    });

    const validated = [];
    const candidates = searchResults.slice(0, 50);

    // Prepare Clients List for Cross-Pollination (Beast Mode)
    const trackRecordList = agency_dna.trackRecord?.pastClients
      ?.map((c: any) => `${c.name} (${c.description || c.industry || ""})`)
      .slice(0, 20)
      .join(", ") || "Aucun client historique disponible.";

    for (let i = 0; i < candidates.length; i += batchSize) {
      const batch = candidates.slice(i, i + batchSize);
      const batchPromises = batch.map(async (cand) => {
        try {
          const sResp = await fetch(`${FIRECRAWL_API_URL}/scrape`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${firecrawlApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              url: cand.url,
              formats: ["markdown"],
              onlyMainContent: true,
            }),
          });

          if (!sResp.ok) return null;

          const sData = await sResp.json();
          const content = sData.data?.markdown || "";
          if (content.length < 50) return null; // Keep almost everything

          // --- BEAST MODE PROMPT (CROSS-POLLINATION) ---
          const valPrompt = `
          Tu es le Directeur de la Stratégie Kortex.
          
          CONTEXTE AGENCE (NOUS) :
          Pitch: "${agency_dna.pitch || "Agence B2B Expert"}"
          Clients Passés (Reference/Lookalike): [${trackRecordList}]
           ICP: ${icpData.icp}

          PROSPECT À ANALYSER (EUX) :
          URL: ${cand.url}
          Contenu: ${content.slice(0, 20000)}

          TA MISSION (DATA FUSION) :
          Génère la CARTE D'IDENTITÉ STRATÉGIQUE de ce prospect.
          Ne filtre rien. Analyse tout.

          POINTS D'ANALYSE :
          1. MATURITÉ (0-100) : Sont-ils éduqués sur notre sujet ? (Site pro = mature, Site amateur = opportunité de refonte mais budget faible ? À toi de juger selon l'ICP).
          2. ANGLE D'ATTAQUE : Phrase d'accroche psychologique ultra-ciblée.
          3. CONNEXION (Lookalike) : Ressemblent-ils à un de nos clients passés ? Si oui, lequel ?
          4. SIGNAUX FAIBLES : Stack technique détectée, Recrutements, Actualités récentes.

          FORMAT SORTIE JSON STRICT :
          {
            "maturity_score": number, // 0-100
            "angle": "String court",
            "connection": "Liaison avec client X ou 'Aucune'",
            "signals": ["Signal 1", "Signal 2"],
            "description": "Synthèse activité (max 1 phrase)"
          }`;

          // Use FLASH for speed and large context
          const analysisResult = await gemini.generateJSON(
            `ANALYSE STRATÉGIQUE DE ${cand.url}`,
            GEMINI_MODELS.FLASH,
            valPrompt,
          );

          // DATA FUSION MAPPING -> DB
          // We map 'maturity_score' to 'match_score' (user wants to sort by maturity)
          // We map the whole rich object to 'match_explanation' (JSON string)

          return {
            name: cand.title, // or extract from content if preferred
            website: cand.url,
            description: analysisResult.description || cand.description,
            score: analysisResult.maturity_score || 50,
            reason: JSON.stringify({
              angle: analysisResult.angle,
              connection: analysisResult.connection,
              signals: analysisResult.signals,
              maturity: analysisResult.maturity_score,
            }),
            status: "analyzed", // Explicit status
          };
        } catch (e) {
          console.error(`[RESEARCHER] [VALIDATION] Error for ${cand.url}:`, e);
          // Fallback: Save anyway with error note (No Data Loss policy)
          return {
            name: cand.title,
            website: cand.url,
            description: "Erreur analyse IA - Sauvegardé quand même.",
            score: 0,
            reason: JSON.stringify({ error: String(e) }),
            status: "error",
          };
        }
      });

      const results = await Promise.all(batchPromises);
      const filteredResults = results.filter((r) => r !== null);

      // AUTO-FEED: Persist validated leads to database
      if (filteredResults.length > 0) {
        console.log(
          `[RESEARCHER] [FEED] Persisting ${filteredResults.length} leads (BEAST MODE)...`,
        );
        const { error: feedError } = await supabase
          .from("company_analyses")
          .upsert(
            filteredResults.map((r) => ({
              project_id: projectId,
              user_id: userId,
              company_name: r!.name,
              company_url: r!.website,
              description_long: r!.description,
              match_score: r!.score, // Represents Maturity
              match_explanation: r!.reason, // Contains Angle, Connection, Signals
              analysis_status: r!.status || "validated",
              analyzed_at: new Date().toISOString(),
            })),
            { onConflict: "project_id,company_url" },
          );

        if (feedError) {
          console.error("[RESEARCHER] [FEED] Sync error:", feedError.message);
        }
      }

      validated.push(...filteredResults);

      await updateJobStatus(supabase, jobId, {
        progress: 40 + Math.round(((i + batchSize) / candidates.length) * 40),
        results: validated,
      });

      if (validated.length >= targetCount) break;
    }

    // 4. FIN
    await updateJobStatus(supabase, jobId, {
      status: "completed",
      progress: 100,
      current_step: "Terminé",
      results: validated,
      completed_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[RESEARCHER] Job Failed:", error);
    await updateJobStatus(supabase, jobId, {
      status: "failed",
      error_message: String(error),
    });
  }
}

// --- SERVE ---

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId, jobId, userId, batchSize = 5, targetCount = 20 } =
      await req.json();
    if (!projectId || !userId) {
      throw new Error("Missing required parameters: projectId, userId");
    }

    const firecrawlApiKey = API_KEYS.FIRECRAWL ||
      Deno.env.get("FIRECRAWL_API_KEY");
    if (!firecrawlApiKey) throw new Error("Missing Firecrawl API Key");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let jId = jobId;
    if (!jId) {
      const { data, error: insertError } = await supabase
        .from("research_jobs")
        .insert({
          project_id: projectId,
          user_id: userId,
          status: "pending",
          progress: 0,
        })
        .select("id")
        .single();

      if (insertError) {
        throw new Error(
          `Failed to create research job: ${insertError.message}`,
        );
      }
      jId = data.id;
    }

    // Kick off background process
    EdgeRuntime.waitUntil(
      runDiscoveryProcess(
        supabase,
        jId,
        projectId,
        userId,
        batchSize,
        targetCount,
        firecrawlApiKey,
      ),
    );

    return new Response(
      JSON.stringify({ success: true, jobId: jId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[RESEARCHER] Request Error:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
