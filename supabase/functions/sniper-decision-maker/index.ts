import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ============================
// ALGORITHME PRECISION CONTACT ENGINE V3
// ============================
// MISSION: Ne JAMAIS proposer un contact générique
// Déduire le contact EXACT via analyse sémantique croisée
import {
  API_KEYS,
  GEMINI_MODELS,
  GeminiClient,
} from "../_shared/api-clients.ts";
import { buildProjectContext } from "../_shared/project-context.ts";

interface SerperResult {
  title: string;
  link: string;
  snippet: string;
  date?: string;
  source?: string;
  imageUrl?: string;
  position?: number;
}

interface SerperResponse {
  organic: SerperResult[];
  searchParameters: any;
  peopleAlsoAsk?: any[];
  relatedSearches?: any[];
}

async function phase1AnalyseIntention(
  geminiClient: GeminiClient,
  projectContext: string,
  companyData: string,
): Promise<IntentionAnalysis> {
  console.log("[PRECISION] 🧠 PHASE 1: Analyse d'Intention...");
  console.log(
    "[PRECISION]    Context Size:",
    projectContext.length,
    "chars",
  );

  const prompt =
    `RÔLE: Tu es le Directeur Commercial le plus stratégique. Tu dois identifier LA PERSONNE EXACTE à contacter.

=== ENTREPRISE À ANALYSER ===
${companyData}

=== MISSION ===
Analyse ce que le vendeur propose (dans le CONTEXTE SYSTÈME) et déduis PRÉCISÉMENT:
1. Le DÉCIDEUR PRINCIPAL (Cible A) - Celui qui a le budget et signe
2. Le CONTACT ALTERNATIF (Cible B) - L'influenceur ou utilisateur final à contacter si A ne répond pas

=== RÈGLES DE DÉDUCTION ===

PHASE 1 - QUEL DÉPARTEMENT ?
- Marketing/Communication/Branding → CMO, Directeur Marketing, Head of Digital
- Tech/IT/SaaS/Logiciel → CTO, DSI, VP Engineering
- RH/Formation/Recrutement → DRH, Head of Talent, Responsable Formation
- Finance/Comptabilité → DAF, CFO, Directeur Financier
- Sales/Commercial → Directeur Commercial, VP Sales, Head of Sales
- Opérations/Achats → COO, Directeur des Opérations, Responsable Achats
- Direction Générale → CEO, DG, Président, Fondateur

PHASE 2 - QUEL NIVEAU HIÉRARCHIQUE ?
- Petite entreprise (< 50 employés): Viser le plus haut (CEO, Fondateur, DG)
- Moyenne entreprise (50-200): Viser le C-Level du département (CMO, CTO, DRH)
- Grande entreprise (> 200): Viser le "Head of" ou "VP" spécifique (Head of Digital Marketing, VP Sales EMEA)

PHASE 3 - CHOISIR L'ALTERNATIVE
- Si Cible A = "DRH" → Cible B = "Responsable Formation" ou "Talent Acquisition Manager"
- Si Cible A = "CMO" → Cible B = "Head of Growth" ou "Responsable Digital"
- Si Cible A = "CTO" → Cible B = "Head of Engineering" ou "Lead Developer"
- Si Cible A = "CEO" → Cible B = "Directeur Général Adjoint" ou "COO"
L'alternative doit être un INFLUENCEUR ou UTILISATEUR FINAL qui peut pousser en interne.

=== SORTIE JSON STRICTE (rien d'autre) ===
{
  "productSold": "Description courte du produit/service vendu",
  "targetDepartment": "Le département concerné (Marketing, IT, RH, Finance, Sales, Operations, Direction)",
  "primaryJobTitle": "Intitulé EXACT du poste du décideur principal à chercher sur LinkedIn",
  "primaryReason": "Sélectionné car [explication stratégique]",
  "alternativeJobTitle": "Intitulé EXACT du poste alternatif à chercher sur LinkedIn",
  "alternativeReason": "Contactez-le en cas de non-réponse car [explication]",
  "companySizeEstimate": "Petite/Moyenne/Grande",
  "confidenceLevel": 85
}`;

  try {
    const parsed = await geminiClient.generateJSON<IntentionAnalysis>(
      prompt,
      GEMINI_MODELS.FLASH,
      // INJECTION DU CONTEXTE GLOBAL ICI ("Omni-Context")
      projectContext,
    );

    console.log(`[PRECISION] ✅ Phase 1 complete:`);
    console.log(`[PRECISION]    👑 Cible A: ${parsed.primaryJobTitle}`);
    console.log(`[PRECISION]    🛡️ Cible B: ${parsed.alternativeJobTitle}`);
    console.log(`[PRECISION]    📊 Confiance: ${parsed.confidenceLevel}%`);

    return parsed;
  } catch (error) {
    console.error("[PRECISION] ❌ Phase 1 error:", error);
    // Fallback intelligent
    return {
      productSold: "Services B2B",
      targetDepartment: "Direction",
      primaryJobTitle: "CEO",
      primaryReason: "Décideur final par défaut",
      alternativeJobTitle: "Directeur Général Adjoint",
      alternativeReason: "Contact alternatif en cas de non-réponse du CEO",
      companySizeEstimate: "Moyenne",
      confidenceLevel: 50,
    };
  }
}

// ======================
// PHASE 2: RECHERCHE STRICTE (PRINCIPAL + BACKUP)
// ======================
interface Candidate {
  fullName: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  linkedinUrl: string;
  snippet: string;
  isCurrentPosition: boolean;
  searchType: "primary" | "alternative";
  rejectionReason?: string;
}

async function phase2RechercheDouble(
  serperApiKey: string,
  companyName: string,
  primaryJobTitle: string,
  alternativeJobTitle: string,
): Promise<{
  primaryCandidates: Candidate[];
  alternativeCandidates: Candidate[];
  rejected: number;
}> {
  console.log("[PRECISION] 🔎 PHASE 2: Recherche Double...");

  const primaryCandidates: Candidate[] = [];
  const alternativeCandidates: Candidate[] = [];
  let totalRejected = 0;

  // Nettoyage du nom d'entreprise
  const cleanCompany = companyName
    .replace(/\s+(SAS|SA|SARL|EURL|SNC|LLC|LTD|INC|CORP|GROUP|GROUPE)\s*$/i, "")
    .trim();

  // Recherche pour le CONTACT PRINCIPAL
  console.log(`[PRECISION]    👑 Recherche Principal: ${primaryJobTitle}`);
  const primaryResults = await searchLinkedIn(
    serperApiKey,
    cleanCompany,
    primaryJobTitle,
  );

  for (const result of primaryResults) {
    const candidate = parseCandidate(result, cleanCompany, "primary");
    if (candidate.isCurrentPosition) {
      primaryCandidates.push(candidate);
      console.log(`[PRECISION]       ✅ VALIDÉ: ${candidate.fullName}`);
    } else {
      totalRejected++;
      console.log(
        `[PRECISION]       ❌ REJETÉ: ${candidate.fullName} - ${candidate.rejectionReason}`,
      );
    }
  }

  // Recherche pour le CONTACT ALTERNATIF
  console.log(
    `[PRECISION]    🛡️ Recherche Alternative: ${alternativeJobTitle}`,
  );
  const alternativeResults = await searchLinkedIn(
    serperApiKey,
    cleanCompany,
    alternativeJobTitle,
  );

  for (const result of alternativeResults) {
    const candidate = parseCandidate(result, cleanCompany, "alternative");
    // Éviter les doublons avec le principal
    if (
      primaryCandidates.some((p) => p.linkedinUrl === candidate.linkedinUrl)
    ) {
      continue;
    }
    if (candidate.isCurrentPosition) {
      alternativeCandidates.push(candidate);
      console.log(`[PRECISION]       ✅ VALIDÉ: ${candidate.fullName}`);
    } else {
      totalRejected++;
      console.log(
        `[PRECISION]       ❌ REJETÉ: ${candidate.fullName} - ${candidate.rejectionReason}`,
      );
    }
  }

  console.log(
    `[PRECISION] ✅ Phase 2 complete: ${primaryCandidates.length} principal, ${alternativeCandidates.length} alternatif, ${totalRejected} rejetés`,
  );
  return { primaryCandidates, alternativeCandidates, rejected: totalRejected };
}

async function searchLinkedIn(
  serperApiKey: string,
  companyName: string,
  jobTitle: string,
): Promise<SerperResult[]> {
  const query = `site:linkedin.com/in "${companyName}" "${jobTitle}"`;

  try {
    const response = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": serperApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: query,
        num: 5,
        gl: "fr",
        hl: "fr",
      }),
    });

    if (!response.ok) return [];

    const data: SerperResponse = await response.json();
    return (data.organic || []).filter((r) => r.link.includes("/in/"));
  } catch (e) {
    console.warn(`[PRECISION]    Search error:`, e);
    return [];
  }
}

function parseCandidate(
  result: SerperResult,
  companyName: string,
  searchType: "primary" | "alternative",
): Candidate {
  const { firstName, lastName, fullName } = extractNameFromTitle(result.title);
  const jobTitle = extractJobTitleFromSnippet(result.snippet || result.title);
  const { isCurrentPosition, rejectionReason } = checkCurrentPosition(
    result.snippet || "",
    result.title,
    companyName,
  );

  return {
    fullName,
    firstName,
    lastName,
    jobTitle: jobTitle || "Non spécifié",
    linkedinUrl: result.link,
    snippet: result.snippet || "",
    isCurrentPosition,
    searchType,
    rejectionReason,
  };
}

// Vérifie si c'est une position ACTUELLE
function checkCurrentPosition(
  snippet: string,
  title: string,
  companyName: string,
): { isCurrentPosition: boolean; rejectionReason?: string } {
  const fullText = `${title} ${snippet}`.toLowerCase();
  const companyLower = companyName.toLowerCase();

  // Indicateurs d'emploi PASSÉ (à rejeter)
  const pastIndicators = [
    "formerly",
    "former",
    "ex-",
    "ancien",
    "ancienne",
    "was at",
    "était chez",
    "left",
    "quitté",
  ];

  for (const indicator of pastIndicators) {
    if (
      fullText.includes(indicator) && !fullText.includes("present") &&
      !fullText.includes("aujourd'hui")
    ) {
      return {
        isCurrentPosition: false,
        rejectionReason: `Indicateur d'emploi passé: "${indicator}"`,
      };
    }
  }

  // Vérifier si l'entreprise est mentionnée
  const currentIndicators = [
    "chez " + companyLower,
    "at " + companyLower,
    "present",
    "aujourd'hui",
    "actuel",
    "currently",
    companyLower,
  ];

  const hasCompanyMention = currentIndicators.some((ind) =>
    fullText.includes(ind)
  );

  if (!hasCompanyMention) {
    return {
      isCurrentPosition: false,
      rejectionReason: `Entreprise "${companyName}" non trouvée`,
    };
  }

  return { isCurrentPosition: true };
}

// ======================
// PHASE 3: SCORING DE PERTINENCE
// ======================
interface ScoredCandidate extends Candidate {
  matchScore: number;
  matchReason: string;
  whyThisRole: string;
  scoreBreakdown: {
    titleMatch: number;
    tenureBonus: number;
    activityBonus: number;
    total: number;
  };
}

function phase3Scoring(
  candidates: Candidate[],
  targetJobTitle: string,
  companyName: string,
  roleReason: string,
): ScoredCandidate[] {
  const scoredCandidates: ScoredCandidate[] = [];

  for (const candidate of candidates) {
    let titleMatch = 0;
    let tenureBonus = 10; // Default
    let activityBonus = 15; // Default

    // CORRESPONDANCE JOB TITLE (50 pts max)
    const candidateTitleLower = candidate.jobTitle.toLowerCase();
    const targetLower = targetJobTitle.toLowerCase();

    if (
      candidateTitleLower.includes(targetLower) ||
      targetLower.includes(candidateTitleLower)
    ) {
      titleMatch = 50;
    } else {
      // Check for C-Level keywords
      const cLevelKeywords = [
        "ceo",
        "cto",
        "cmo",
        "cfo",
        "dg",
        "directeur",
        "pdg",
        "president",
        "fondateur",
        "founder",
        "vp",
        "head of",
        "responsable",
      ];
      if (cLevelKeywords.some((k) => candidateTitleLower.includes(k))) {
        titleMatch = 35;
      }
    }

    // ANCIENNETÉ (20 pts max)
    const snippetLower = candidate.snippet.toLowerCase();
    if (snippetLower.includes("depuis") || snippetLower.includes("since")) {
      const yearMatch = snippetLower.match(/\b(202[0-4]|201\d)\b/);
      if (yearMatch) {
        const year = parseInt(yearMatch[1]);
        const yearsInRole = new Date().getFullYear() - year;
        if (yearsInRole >= 2) tenureBonus = 20;
        else if (yearsInRole >= 1) tenureBonus = 15;
      }
    }

    const total = titleMatch + tenureBonus + activityBonus;

    scoredCandidates.push({
      ...candidate,
      matchScore: total,
      matchReason:
        `${candidate.fullName} est ${candidate.jobTitle} chez ${companyName}. ${roleReason}`,
      whyThisRole: roleReason,
      scoreBreakdown: {
        titleMatch,
        tenureBonus,
        activityBonus,
        total,
      },
    });
  }

  scoredCandidates.sort((a, b) => b.matchScore - a.matchScore);
  return scoredCandidates;
}

// Helpers
function extractNameFromTitle(
  title: string,
): { firstName: string; lastName: string; fullName: string } {
  if (!title) return { firstName: "", lastName: "", fullName: "" };

  let cleanTitle = title
    .replace(/\s*\|\s*LinkedIn.*$/i, "")
    .replace(/\s*-\s*LinkedIn.*$/i, "")
    .trim();

  const namePart = cleanTitle.split(" - ")[0].trim();

  if (!namePart) return { firstName: "", lastName: "", fullName: "" };

  const parts = namePart.split(" ").filter((p) => p.length > 0);

  if (parts.length === 0) return { firstName: "", lastName: "", fullName: "" };
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "", fullName: parts[0] };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
    fullName: namePart,
  };
}

function extractJobTitleFromSnippet(text: string): string {
  const patterns = [
    /(?:est|is)\s+([^.]+?)(?:\s+chez|\s+at|\s+@)/i,
    /([A-Z][a-zA-Zéèêëàâäôöùûüç\s]+)\s+(?:chez|at|@)\s+/i,
    /^([^-|]+)\s*[-|]/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1] && match[1].length < 50) {
      return match[1].trim();
    }
  }

  const titlePart = text.split(" - ")[1];
  if (titlePart) {
    return titlePart.split("|")[0].trim().substring(0, 50);
  }

  return "";
}

// ======================
// MAIN HANDLER
// ======================
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("");
  console.log(
    "╔══════════════════════════════════════════════════════════════╗",
  );
  console.log(
    "║   🎯 PRECISION CONTACT ENGINE V3 - PRINCIPAL + BACKUP       ║",
  );
  console.log(
    "╚══════════════════════════════════════════════════════════════╝",
  );

  try {
    const serperApiKey = Deno.env.get("SERPER_API_KEY");
    // const googleApiKey = Deno.env.get("GOOGLE_API_KEY"); // REMOVED

    if (!serperApiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "API key manquante (SERPER_API_KEY)",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { companyName, companyUrl, projectId } = await req.json();

    if (!companyName) {
      return new Response(
        JSON.stringify({ success: false, error: "companyName requis" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(`[PRECISION] 🏢 Cible: ${companyName}`);

    // INIT CLIENTS
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseKey);
    const geminiClient = new GeminiClient(); // Uses GEMINI_API_KEY strictly

    // BUILD CONTEXT
    let projectContext = "";
    if (projectId) {
      projectContext = await buildProjectContext(supabase, projectId);
    } else {
      projectContext = "Contexte par défaut: Service B2B générique.";
    }

    let companyData = `Entreprise: ${companyName}`;
    if (companyUrl) {
      companyData += `\nSite web: ${companyUrl}`;
    }

    // ========================
    // EXÉCUTION DES 3 PHASES
    // ========================

    // PHASE 1: Analyse d'Intention (DÉDUCTION STRATÉGIQUE)
    const intentionAnalysis = await phase1AnalyseIntention(
      geminiClient,
      projectContext,
      companyData,
    );

    // PHASE 2: Recherche Double (Principal + Alternative)
    const { primaryCandidates, alternativeCandidates, rejected } =
      await phase2RechercheDouble(
        serperApiKey,
        companyName,
        intentionAnalysis.primaryJobTitle,
        intentionAnalysis.alternativeJobTitle,
      );

    // PHASE 3: Scoring
    const scoredPrimary = phase3Scoring(
      primaryCandidates,
      intentionAnalysis.primaryJobTitle,
      companyName,
      intentionAnalysis.primaryReason,
    );
    const scoredAlternative = phase3Scoring(
      alternativeCandidates,
      intentionAnalysis.alternativeJobTitle,
      companyName,
      intentionAnalysis.alternativeReason,
    );

    // Filtrer les scores < 50%
    const qualifiedPrimary = scoredPrimary.filter((c) => c.matchScore >= 50);
    const qualifiedAlternative = scoredAlternative.filter((c) =>
      c.matchScore >= 50
    );

    const bestPrimary = qualifiedPrimary[0];
    const bestAlternative = qualifiedAlternative[0];

    // Construire la réponse
    const result: PrecisionContactResult = {
      success: !!bestPrimary || !!bestAlternative,
      targetingAnalysis: intentionAnalysis,
      searchPhases: {
        phase1: {
          status: "completed",
          reasoning:
            `Produit: ${intentionAnalysis.productSold} → Département: ${intentionAnalysis.targetDepartment}`,
        },
        phase2: {
          status: "completed",
          primaryFound: !!bestPrimary,
          alternativeFound: !!bestAlternative,
          candidatesRejected: rejected,
        },
        phase3: {
          status: "completed",
          scoredCandidates: scoredPrimary.length + scoredAlternative.length,
        },
      },
    };

    // 👑 CONTACT PRINCIPAL
    if (bestPrimary) {
      result.primaryContact = {
        fullName: bestPrimary.fullName,
        firstName: bestPrimary.firstName,
        lastName: bestPrimary.lastName,
        jobTitle: bestPrimary.jobTitle,
        linkedinUrl: bestPrimary.linkedinUrl,
        companyName: companyName,
        matchScore: bestPrimary.matchScore,
        matchReason: bestPrimary.matchReason,
        whyThisRole: intentionAnalysis.primaryReason,
        scoreBreakdown: bestPrimary.scoreBreakdown,
      };
    }

    // 🛡️ ALTERNATIVE SUGGÉRÉE
    if (bestAlternative) {
      result.alternativeContact = {
        fullName: bestAlternative.fullName,
        firstName: bestAlternative.firstName,
        lastName: bestAlternative.lastName,
        jobTitle: bestAlternative.jobTitle,
        linkedinUrl: bestAlternative.linkedinUrl,
        companyName: companyName,
        matchScore: bestAlternative.matchScore,
        matchReason: bestAlternative.matchReason,
        whyThisRole: intentionAnalysis.alternativeReason,
        scoreBreakdown: bestAlternative.scoreBreakdown,
      };
    }

    if (!bestPrimary && !bestAlternative) {
      result.error =
        "Aucun profil qualifié trouvé. Essayez avec plus de contexte dans le Cerveau Agence.";
    }

    console.log("");
    console.log(
      "╔══════════════════════════════════════════════════════════════╗",
    );
    console.log(`║  👑 Principal: ${bestPrimary?.fullName || "Non trouvé"}`);
    console.log(
      `║  🛡️ Alternative: ${bestAlternative?.fullName || "Non trouvé"}`,
    );
    console.log(
      "╚══════════════════════════════════════════════════════════════╝",
    );

    // COMPATIBILITÉ: Mapper vers l'ancien format pour le frontend existant
    const legacyResponse = {
      success: result.success,
      decisionMaker: result.primaryContact
        ? {
          fullName: result.primaryContact.fullName,
          firstName: result.primaryContact.firstName,
          lastName: result.primaryContact.lastName,
          jobTitle: result.primaryContact.jobTitle,
          linkedinUrl: result.primaryContact.linkedinUrl,
          companyName: result.primaryContact.companyName,
          matchScore: result.primaryContact.matchScore,
          matchReason: result.primaryContact.matchReason,
          scoreBreakdown: result.primaryContact.scoreBreakdown,
        }
        : undefined,
      // NOUVEAU: Ajouter les données du Precision Engine
      primaryContact: result.primaryContact,
      alternativeContact: result.alternativeContact,
      targetingAnalysis: result.targetingAnalysis,
      targetJobTitles: [
        intentionAnalysis.primaryJobTitle,
        intentionAnalysis.alternativeJobTitle,
      ],
      searchPhases: result.searchPhases,
      alternatives: bestAlternative
        ? [{
          fullName: bestAlternative.fullName,
          jobTitle: bestAlternative.jobTitle,
          linkedinUrl: bestAlternative.linkedinUrl,
          matchScore: bestAlternative.matchScore,
          matchReason: bestAlternative.matchReason,
        }]
        : undefined,
      error: result.error,
    };

    return new Response(JSON.stringify(legacyResponse), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[PRECISION] ❌ Fatal Error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
