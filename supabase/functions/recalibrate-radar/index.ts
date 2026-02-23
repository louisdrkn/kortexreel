/**
 * RECALIBRATE RADAR - Recalibration Intelligente
 *
 * Utilise Gemini 3.0 Pro (ULTRA) pour:
 * - Analyse stratégique des entreprises validées/rejetées
 * - Détection des pain points réels
 * - Génération de requêtes nominatives B2B
 * - Filtrage anti-bruit (gouv, médias, etc.)
 */

import {
  createClient,
  SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2.39.7";
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
// ============================================================================
// ANTI-NOISE PATTERNS: Filter out non-prospect URLs and titles
// ============================================================================
const ANTI_NOISE_URL_PATTERNS = [
  ".gouv.fr",
  ".gouv",
  "gov.",
  "wikipedia",
  "service-public",
  "legifrance",
  "senat.fr",
  "assemblee-nationale",
  "prefecture",
  "ademe.fr",
  "bpifrance",
  "pole-Íemploi",
  "urssaf",
  "lefigaro.fr",
  "lemonde.fr",
  "leparisien.fr",
  "bfmtv",
  "lesechos.fr",
  "latribune.fr",
  "usinenouvelle",
  "challenges.fr",
  "capital.fr",
  "journaldunet",
  "maddyness",
  "frenchweb",
];

const ANTI_NOISE_TITLE_PATTERNS = [
  "loi",
  "décret",
  "article",
  "définition",
  "guide complet",
  "qu'est-ce que",
  "comment faire",
  "actualité",
  "news",
  "wikipedia",
  "ministère",
  "préfecture",
  "administration",
];

interface RecalibrationStep {
  step: string;
  message: string;
  progress: number;
}

interface LearnedWeights {
  sectors: Record<string, number>;
  sizes: Record<string, number>;
  technologies: Record<string, number>;
  keywords: Record<string, number>;
  locations: Record<string, number>;
  painPoints: Record<string, number>;
}

interface RecalibrationResult {
  success: boolean;
  mode: "expansion" | "pivot";
  modeReason: string;
  steps: RecalibrationStep[];
  newCompanies: Company[];
  updatedScores: number;
  trendVector: string[];
  learnedInsights: string[];
  excludedCount: number; // NEW: Number of excluded noise results
  painPointAnalysis?: {
    coreProblems: string[];
    targetProfiles: string[];
    searchQueries: string[];
  };
}

interface Company {
  id?: string;
  company_name: string;
  industry?: string;
  headcount?: string;
  location?: string;
  match_score?: number;
  buying_signals?: string[];
  analysis_status?: string;
  company_url?: string;
  match_explanation?: string;
}

interface LeadInteraction {
  action: string;
  duration_ms?: number;
  company_analyses?: Company;
}

// ============================================================================
// TABULA RASA: Clean excluded/noise companies from the pool
// ============================================================================
async function cleanNoiseCompanies(
  supabase: SupabaseClient,
  projectId: string,
): Promise<number> {
  let excludedCount = 0;

  // Fetch all companies for this project
  const { data: allCompanies } = await supabase
    .from("company_analyses")
    .select("id, company_name, company_url")
    .eq("project_id", projectId)
    .neq("analysis_status", "excluded");

  if (!allCompanies || allCompanies.length === 0) {
    return 0;
  }

  for (const company of allCompanies) {
    const url = (company.company_url || "").toLowerCase();
    const name = (company.company_name || "").toLowerCase();

    // Check URL against anti-noise patterns
    const isUrlNoise = ANTI_NOISE_URL_PATTERNS.some((pattern) =>
      url.includes(pattern)
    );

    // Check name against anti-noise patterns
    const isTitleNoise = ANTI_NOISE_TITLE_PATTERNS.some((pattern) =>
      name.includes(pattern)
    );

    if (isUrlNoise || isTitleNoise) {
      console.log(
        `[RECALIBRATE] 🗑️ Excluding noise: ${company.company_name} (${url})`,
      );

      await supabase
        .from("company_analyses")
        .update({ analysis_status: "excluded", match_score: 0 })
        .eq("id", company.id);

      excludedCount++;
    }
  }

  console.log(`[RECALIBRATE] 🧹 Cleaned ${excludedCount} noise companies`);
  return excludedCount;
}

// ============================================================================
// BRAIN PHASE: Strategic Analysis using AI
// ============================================================================
interface StrategicBrainResponse {
  coreProblems: string[];
  targetProfiles: string[];
  targetSectors: string[];
  nominativeSearchQueries: string[];
}

async function runStrategicBrain(
  agencyContext: string,
  validatedCompanies: Company[],
  rejectedCompanies: Company[],
): Promise<{
  coreProblems: string[];
  targetProfiles: string[];
  targetSectors: string[];
  nominativeSearchQueries: string[];
}> {
  const prompt =
    `Tu es un CHASSEUR DE PROSPECTS B2B, pas un moteur de recherche documentaire.

CONTEXTE DE L'AGENCE (ce qu'elle vend):
${agencyContext}

${
      validatedCompanies.length > 0
        ? `ENTREPRISES VALIDÉES (bonnes pistes - Historique + Live Feed):
${
          validatedCompanies.map((c) =>
            `- ${c.company_name}: ${c.industry || "N/A"}, ${
              c.headcount || "N/A"
            } employés`
          ).join("\n")
        }`
        : ""
    }

${
      rejectedCompanies.length > 0
        ? `ENTREPRISES REJETÉES (mauvaises pistes - À ÉVITER ABSOLUMENT - Historique + Live Feed):
${
          rejectedCompanies.map((c) =>
            `- ${c.company_name}: ${c.industry || "N/A"} (${
              c.match_explanation || "Rejeté par l'utilisateur"
            })`
          ).join("\n")
        }`
        : ""
    }

INSTRUCTIONS CRITIQUES:
1. N'analyse PAS la solution vendue. Analyse QUI PAYE pour cette solution.
2. Identifie les SECTEURS PRIVÉS qui consomment ce que l'agence optimise.
3. Génère des requêtes de recherche NOMINATIVES (pas de concepts abstraits).

EXEMPLE DE RAISONNEMENT CORRECT:
- Solution: "Efficacité énergétique"
- MAUVAIS: Chercher "économie énergie" → retourne des ministères et des articles de loi
- BON: Chercher "Liste entreprises transport routier France" → retourne des transporteurs énergivores

EXCLUSIONS STRICTES (ne jamais suggérer):
- Ministères, Préfectures, Administrations (.gouv.fr)
- Syndicats professionnels, Associations
- Sites d'actualité, Blogs, Wikipedia
- Concurrents directs de l'agence

Réponds en JSON strict:
{
  "coreProblems": ["La douleur principale (ex: coûts de carburant élevés)", "Douleur secondaire"],
  "targetProfiles": ["Profil type qui paye (ex: Directeur de Flotte)", "Profil 2"],
  "targetSectors": ["Secteur privé précis 1 (ex: Transport Routier de Marchandises)", "Secteur 2", "Secteur 3"],
  "nominativeSearchQueries": [
    "Liste entreprises transport routier France",
    "Top 50 sociétés logistique frigorifique",
    "Annuaire entreprises BTP terrassement",
    "PME industrielles Auvergne Rhône-Alpes",
    "Groupes agroalimentaires France"
  ]
}`;

  try {
    // Utiliser Gemini 3.0 Pro (ULTRA) pour analyse stratégique de haute précision
    const gemini = new GeminiClient(API_KEYS.GEMINI);

    console.log(
      "[RECALIBRATE] 🧠 Strategic Brain: Using Gemini 3.0 Pro (ULTRA)",
    );

    const responseText = await gemini.generateJSON<StrategicBrainResponse>(
      prompt,
      GEMINI_MODELS.ULTRA, // Utiliser ULTRA pour l'analyse stratégique critique
      "Tu es un expert en ciblage B2B. Réponds UNIQUEMENT en JSON valide.",
    );

    console.log("[RECALIBRATE] 🧠 Brain analysis:", responseText);

    return {
      coreProblems: responseText.coreProblems || [],
      targetProfiles: responseText.targetProfiles || [],
      targetSectors: responseText.targetSectors || [],
      nominativeSearchQueries: responseText.nominativeSearchQueries || [],
    };
  } catch (error) {
    console.error("[RECALIBRATE] Brain analysis error:", error);
    return {
      coreProblems: [],
      targetProfiles: [],
      targetSectors: [],
      nominativeSearchQueries: [],
    };
  }
}

// Determine recalibration mode: EXPANSION or PIVOT
function determineRecalibrationMode(
  totalCompanies: number,
  validatedCount: number,
  rejectedCount: number,
  averageScore: number,
  forceFreshStart: boolean,
): { mode: "expansion" | "pivot"; reason: string } {
  console.log("[RECALIBRATE] Mode detection:", {
    totalCompanies,
    validatedCount,
    rejectedCount,
    averageScore,
    forceFreshStart,
  });

  // TABULA RASA: Force pivot if fresh start requested
  if (forceFreshStart) {
    return {
      mode: "pivot",
      reason: "Recalibration forcée: nouvelle stratégie de ciblage B2B.",
    };
  }

  // EXPANSION MODE: User likes what they see, find more like it
  if (totalCompanies < 10) {
    return {
      mode: "expansion",
      reason:
        `Peu de résultats (${totalCompanies}). Élargissement du spectre pour trouver des profils similaires.`,
    };
  }

  if (rejectedCount === 0 && validatedCount > 0) {
    return {
      mode: "expansion",
      reason:
        `Tous les profils sont pertinents (${validatedCount} validés, 0 rejetés). Recherche de jumeaux.`,
    };
  }

  const validationRate = validatedCount /
    Math.max(1, validatedCount + rejectedCount);
  if (validationRate >= 0.7) {
    return {
      mode: "expansion",
      reason: `Taux de validation élevé (${
        Math.round(validationRate * 100)
      }%). Recherche de profils similaires.`,
    };
  }

  // PIVOT MODE: User is rejecting leads, try different approach
  if (rejectedCount > validatedCount) {
    return {
      mode: "pivot",
      reason:
        `Trop de rejets (${rejectedCount} vs ${validatedCount} validés). Changement d'approche stratégique.`,
    };
  }

  if (averageScore < 50) {
    return {
      mode: "pivot",
      reason: `Scores moyens faibles (${
        Math.round(averageScore)
      }%). Exploration d'un autre segment.`,
    };
  }

  return {
    mode: "expansion",
    reason: "Optimisation progressive du ciblage.",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId, userId, force_fresh_start } = await req.json();

    if (!projectId || !userId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "projectId and userId required",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!; // SERVICE ROLE: Bypass RLS
    const supabase = createClient(supabaseUrl, supabaseKey);

    const steps: RecalibrationStep[] = [];
    const learnedInsights: string[] = [];

    // STEP 0: TABULA RASA - Clean noise immediately
    if (force_fresh_start) {
      steps.push({
        step: "tabula_rasa",
        message: "Nettoyage des résultats parasites...",
        progress: 5,
      });
    }

    const excludedCount = await cleanNoiseCompanies(supabase, projectId);
    if (excludedCount > 0) {
      learnedInsights.push(
        `${excludedCount} résultats hors-cible supprimés (ministères, articles, etc.)`,
      );
    }

    // STEP 1: Fetch current state
    steps.push({
      step: "analysis",
      message: "Analyse de l'état actuel...",
      progress: 10,
    });

    const { data: allCompanies } = await supabase
      .from("company_analyses")
      .select(
        "id, company_name, industry, headcount, location, match_score, buying_signals, analysis_status",
      )
      .eq("project_id", projectId)
      .neq("analysis_status", "excluded");

    const totalCompanies = allCompanies?.length || 0;
    const averageScore = totalCompanies > 0
      ? (allCompanies?.reduce((sum, c) => sum + (c.match_score || 50), 0) ||
        0) / totalCompanies
      : 50;

    // STEP 2: Analyze interactions (HISTORY + LIVE FEED)
    steps.push({
      step: "interactions",
      message: "Analyse hybride (Historique + Live Feed)...",
      progress: 20,
    });

    // 2A. HISTORY: Fetch verified interactions
    const { data: interactions } = await supabase
      .from("lead_interactions")
      .select(
        "*, company_analyses(id, company_name, industry, headcount, location, buying_signals)",
      )
      .eq("project_id", projectId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);

    const validatedCompanies: Company[] = [];
    const rejectedCompanies: Company[] = [];
    const viewedCompanies: Company[] = [];

    // Process History
    (interactions || []).forEach((interaction: LeadInteraction) => {
      const company = interaction.company_analyses;
      if (!company) return;

      if (
        interaction.action === "validated" ||
        interaction.action === "shortlisted"
      ) {
        validatedCompanies.push(company);
      } else if (interaction.action === "rejected") {
        rejectedCompanies.push(company);
      } else if (
        interaction.action === "viewed" &&
        interaction.duration_ms !== undefined && interaction.duration_ms > 30000
      ) {
        viewedCompanies.push(company);
      }
    });

    // 2B. LIVE FEED: Fetch immediate reactions (radar_catch_all)
    // We look for items marked as 'trash', 'rejected', 'qualified', 'shortlisted'
    // directly in the raw feed.
    const { data: liveFeedActions } = await supabase
      .from("radar_catch_all")
      .select("raw_data, status")
      .eq("project_id", projectId)
      .in("status", ["trash", "rejected", "qualified", "shortlisted"])
      .order("created_at", { ascending: false })
      .limit(50);

    let liveFeedRejectedCount = 0;
    let liveFeedValidatedCount = 0;

    if (liveFeedActions && liveFeedActions.length > 0) {
      console.log(
        `[RECALIBRATE] Found ${liveFeedActions.length} actions in Live Feed.`,
      );

      liveFeedActions.forEach((item: any) => {
        const raw = item.raw_data;
        // Normalize raw data to Company interface
        // raw_data structures vary, we try to extract common fields
        let companyData: any = {};

        // Check if it's the new 1-row-per-company format
        if (
          raw.companies && Array.isArray(raw.companies) &&
          raw.companies.length > 0
        ) {
          companyData = raw.companies[0];
        } else {
          // Fallback for older format or direct object
          companyData = raw;
        }

        const normalizedCompany: Company = {
          company_name: companyData.company_name || companyData.name ||
            "Unknown",
          industry: companyData.activity || companyData.industry || "N/A",
          location: companyData.location || "N/A",
          match_score: 50, // Default for raw feed
          company_url: companyData.url || companyData.website,
        };

        // Determine if Positive or Negative based on STATUS column
        const status = item.status; // 'trash', 'rejected', 'qualified', 'shortlisted'

        if (status === "trash" || status === "rejected") {
          // Enrich with reason if available in raw_data
          (normalizedCompany as any).match_explanation =
            "Rejeté depuis le Live Feed (Trash)";
          rejectedCompanies.push(normalizedCompany);
          liveFeedRejectedCount++;
        } else if (status === "qualified" || status === "shortlisted") {
          validatedCompanies.push(normalizedCompany);
          liveFeedValidatedCount++;
        }
      });

      console.log(
        `[RECALIBRATE] Integrated Live Feed: ${liveFeedValidatedCount} validated, ${liveFeedRejectedCount} rejected.`,
      );
    }

    // STEP 3: Determine mode
    steps.push({
      step: "mode_detection",
      message: "Détection du mode de recalibration...",
      progress: 30,
    });

    const { mode, reason } = determineRecalibrationMode(
      totalCompanies,
      validatedCompanies.length,
      rejectedCompanies.length,
      averageScore,
      force_fresh_start === true,
    );

    console.log("[RECALIBRATE] Mode selected:", mode, reason);
    learnedInsights.push(reason);

    // STEP 4: Build behavioral weights
    steps.push({
      step: "weights",
      message: "Calcul du vecteur comportemental...",
      progress: 40,
    });

    const weights: LearnedWeights = {
      sectors: {},
      sizes: {},
      technologies: {},
      keywords: {},
      locations: {},
      painPoints: {},
    };

    [...validatedCompanies, ...viewedCompanies].forEach((company: Company) => {
      const multiplier = validatedCompanies.includes(company) ? 2.0 : 0.5;

      if (company.industry) {
        weights.sectors[company.industry] =
          (weights.sectors[company.industry] || 0) + multiplier;
      }
      if (company.headcount) {
        weights.sizes[company.headcount] =
          (weights.sizes[company.headcount] || 0) + multiplier;
      }
      if (company.location) {
        weights.locations[company.location] =
          (weights.locations[company.location] || 0) + multiplier;
      }
      if (company.buying_signals && Array.isArray(company.buying_signals)) {
        company.buying_signals.forEach((signal: string) => {
          weights.painPoints[signal] = (weights.painPoints[signal] || 0) +
            multiplier;
        });
      }
    });

    rejectedCompanies.forEach((company: Company) => {
      if (company.industry) {
        weights.sectors[company.industry] =
          (weights.sectors[company.industry] || 0) - 1.5;
      }
      if (company.headcount) {
        weights.sizes[company.headcount] =
          (weights.sizes[company.headcount] || 0) - 0.5;
      }
    });

    // STEP 5: Strategic Brain Analysis (BRAIN THEN MUSCLE)
    let painPointAnalysis: RecalibrationResult["painPointAnalysis"];
    const trendVector: string[] = [];

    // Check if Gemini API key is available in shared config
    if (API_KEYS.GEMINI) {
      steps.push({
        step: "brain_analysis",
        message: "Le Cerveau identifie les VRAIES cibles B2B...",
        progress: 50,
      });

      const { data: projectData } = await supabase
        .from("project_data")
        .select("data")
        .eq("project_id", projectId)
        .in("data_type", ["agency_dna", "target_criteria"])
        .limit(2);

      const agencyContext = projectData?.map((d) =>
        JSON.stringify(d.data)
      ).join("\n") || "";

      const brainAnalysis = await runStrategicBrain(
        agencyContext,
        validatedCompanies.slice(0, 5),
        rejectedCompanies.slice(0, 5),
      );

      painPointAnalysis = {
        coreProblems: brainAnalysis.coreProblems,
        targetProfiles: brainAnalysis.targetProfiles,
        searchQueries: brainAnalysis.nominativeSearchQueries,
      };

      // Add sectors to trend vector
      brainAnalysis.targetSectors.forEach((sector) => {
        trendVector.push(`sector:${sector}`);
      });

      // Add nominative queries to trend vector (for discover-companies to use)
      brainAnalysis.nominativeSearchQueries.forEach((query) => {
        trendVector.push(`query:${query}`);
      });

      if (brainAnalysis.coreProblems.length > 0) {
        learnedInsights.push(
          `Douleur identifiée: ${brainAnalysis.coreProblems[0]}`,
        );
      }
      if (brainAnalysis.targetSectors.length > 0) {
        learnedInsights.push(
          `Secteurs cibles: ${
            brainAnalysis.targetSectors.slice(0, 3).join(", ")
          }`,
        );
      }
    }

    // STEP 6: Apply mode-specific logic
    if (mode === "expansion") {
      steps.push({
        step: "expansion",
        message: "MODE EXPANSION: Recherche de jumeaux...",
        progress: 60,
      });

      const topSectors = Object.entries(weights.sectors)
        .filter(([_, v]) => v > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

      const topSizes = Object.entries(weights.sizes)
        .filter(([_, v]) => v > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2);

      topSectors.forEach(([sector]) => {
        if (!trendVector.includes(`sector:${sector}`)) {
          trendVector.push(`sector:${sector}`);
        }
      });
      topSizes.forEach(([size]) => trendVector.push(`size:${size}`));

      if (validatedCompanies.length > 0) {
        learnedInsights.push(
          `Profil type: similaire à ${validatedCompanies[0].company_name}`,
        );
      }
    } else {
      // PIVOT MODE
      steps.push({
        step: "pivot",
        message: "MODE PIVOT: Changement de stratégie B2B...",
        progress: 60,
      });

      const avoidSectors = Object.entries(weights.sectors)
        .filter(([_, v]) => v < 0)
        .map(([sector]) => sector);

      if (avoidSectors.length > 0) {
        learnedInsights.push(`Évitement: ${avoidSectors.join(", ")}`);
      }
    }

    // STEP 7: Save learned preferences
    steps.push({
      step: "save",
      message: "Mémorisation des préférences...",
      progress: 75,
    });

    const { error: prefError } = await supabase
      .from("learned_preferences")
      .upsert({
        project_id: projectId,
        user_id: userId,
        sector_weights: weights.sectors,
        size_weights: weights.sizes,
        technology_weights: weights.technologies,
        keyword_boosts: weights.keywords,
        pain_point_analysis: painPointAnalysis,
        excluded_patterns: [
          ...rejectedCompanies.map((c) => c.industry).filter(Boolean),
          ...ANTI_NOISE_URL_PATTERNS.slice(0, 10), // Store anti-noise patterns
        ],
        last_calibrated_at: new Date().toISOString(),
      }, { onConflict: "project_id" });

    if (prefError) {
      console.error("[RECALIBRATE] Error saving preferences:", prefError);
    }

    // STEP 8: Re-score existing companies with new weights
    steps.push({
      step: "rescore",
      message: "Recalcul des scores...",
      progress: 90,
    });

    let updatedScores = 0;

    const updatePromises = (allCompanies || []).map(async (company) => {
      let scoreAdjustment = 0;

      if (company.industry && weights.sectors[company.industry]) {
        scoreAdjustment += weights.sectors[company.industry] * 8;
      }

      if (company.headcount && weights.sizes[company.headcount]) {
        scoreAdjustment += weights.sizes[company.headcount] * 5;
      }

      if (company.location && weights.locations[company.location]) {
        scoreAdjustment += weights.locations[company.location] * 3;
      }

      if (company.buying_signals && Array.isArray(company.buying_signals)) {
        company.buying_signals.forEach((signal: string) => {
          if (weights.painPoints[signal]) {
            scoreAdjustment += weights.painPoints[signal] * 4;
          }
        });
      }

      if (Math.abs(scoreAdjustment) > 0) {
        const currentScore = company.match_score || 50;
        const newScore = Math.max(
          0,
          Math.min(100, currentScore + scoreAdjustment),
        );

        await supabase
          .from("company_analyses")
          .update({
            match_score: Math.round(newScore),
            match_explanation: mode === "expansion"
              ? `Score ajusté par expansion (+${Math.round(scoreAdjustment)})`
              : `Score recalculé après pivot stratégique`,
          })
          .eq("id", company.id);

        return 1; // Count as updated
      }
      return 0; // No update
    });

    const results = await Promise.all(updatePromises);
    updatedScores = results.reduce((sum: number, val) => sum + val, 0);

    // STEP 9: Complete
    steps.push({
      step: "complete",
      message: "Recalibration terminée",
      progress: 100,
    });

    if (updatedScores > 0) {
      learnedInsights.push(`${updatedScores} scores recalculés`);
    }

    const result: RecalibrationResult = {
      success: true,
      mode,
      modeReason: reason,
      steps,
      newCompanies: [],
      updatedScores,
      trendVector,
      learnedInsights,
      excludedCount,
      painPointAnalysis,
    };

    console.log("[RECALIBRATE] ✅ TABULA RASA Complete:", {
      mode,
      updatedScores,
      excludedCount,
      trendVector: trendVector.length,
      insights: learnedInsights.length,
    });

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[RECALIBRATE] Error:", error);
    const errorMessage = error instanceof Error
      ? error.message
      : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
