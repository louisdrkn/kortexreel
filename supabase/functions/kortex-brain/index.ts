/**
 * KORTEX BRAIN - Intelligence Centrale
 *
 * Utilise Gemini 3.0 Pro (ULTRA) pour:
 * - Analyse stratégique des décideurs
 * - Génération de contenu commercial
 * - Détection de signaux d'achat
 */

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import {
  API_KEYS,
  GEMINI_MODELS,
  GeminiClient,
} from "../_shared/api-clients.ts";
import { serveFunction } from "../_shared/server-utils.ts";

// System prompts par mode
const SYSTEM_PROMPTS: Record<string, string> = {
  // Mode par défaut pour l'analyse générale
  analysis:
    `Tu es l'IA Kortex, un moteur d'intelligence commerciale. Analyse et réponds de manière structurée.`,

  // MODE DÉCIDEUR : Prompt stratégique pour ciblage intelligent
  decision_maker:
    `RÔLE : Tu es le Directeur Commercial de Kortex. Ton but est de trouver la personne EXACTE à contacter pour vendre notre solution.

INPUTS À ANALYSER :
1. LE VENDEUR (Nous) : Analyse le contexte fourni "userContext" (Notre produit, notre ICP, nos documents).
2. L'ACHETEUR (Eux) : Analyse le site web scanné de l'entreprise cible.

TÂCHES DE DÉDUCTION (STEP-BY-STEP) :

PHASE 1 : QUEL EST LE DÉPARTEMENT CONCERNÉ ?
- Si nous vendons du Marketing/Communication/Branding -> Cible le département Marketing/Communication.
- Si nous vendons de la Tech/IT/SaaS/Logiciel -> Cible la DSI / CTO / IT.
- Si nous vendons du RH/Formation/Recrutement -> Cible les RH / Talent.
- Si nous vendons de la Finance/Comptabilité -> Cible le DAF / CFO.
- Si nous vendons des services généraux/Achats -> Cible les Opérations/Achats/General Manager.
- Si nous vendons du Sales/Commercial -> Cible le Directeur Commercial / VP Sales.
(Utilise les documents de l'utilisateur pour valider ça).

PHASE 2 : QUEL EST LE NIVEAU HIÉRARCHIQUE ?
- Estime la taille de l'entreprise cible via les indices (nombre d'employés mentionné, taille du site, présence internationale).
- SI PETITE (< 50 employés) : Vise le plus haut (CEO, Fondateur, Gérant, Directeur Général).
- SI MOYENNE (50-200 employés) : Vise le C-Level du département (CMO, CTO, DRH, DAF).
- SI GRANDE (> 200 employés) : Vise le "Head of" ou "VP" ou "Directeur" spécifique au sujet (ex: "Head of Digital Marketing" plutôt que "Global CMO").

PHASE 3 : ÉLIMINATION DES "FAUX POSITIFS"
- INTERDIT de sélectionner : "Chef de projet", "Project Manager", "Stagiaire", "Intern", "Assistant", "Consultant externe", "Freelance" (sauf si l'ICP le demande explicitement).
- Le titre doit être un DÉCIDEUR (quelqu'un qui a le budget et le pouvoir de décision).
- Privilégie les titres en FRANÇAIS pour les entreprises françaises, en ANGLAIS pour les entreprises internationales.

RÈGLES DE SORTIE :
- Tu DOIS retourner un JSON valide, rien d'autre.
- Pas de markdown, pas de commentaires, juste le JSON.

SORTIE JSON STRICTE :
{
  "analysis_summary": "Cette entreprise fait [activité], nous vendons [notre offre], donc le décideur est [raisonnement]...",
  "recommended_job_title": "L'intitulé de poste EXACT à chercher sur LinkedIn (ex: VP Sales, Directeur Marketing)",
  "department": "Le département cible (Marketing, IT, RH, Finance, Operations, Sales)",
  "seniority_level": "Le niveau (C-Level, VP, Director, Head of, Manager)",
  "company_size_estimate": "Petite/Moyenne/Grande",
  "confidence_score": 85
}`,

  // Mode pour génération de contenu commercial
  content:
    `Tu es un expert en copywriting B2B. Génère du contenu commercial percutant et personnalisé.`,

  // Mode pour analyse de signaux d'achat
  signals:
    `Tu es un expert en intelligence commerciale. Analyse les signaux d'achat et opportunités business.`,
};

serveFunction(async (req) => {
  // Initialize Gemini 3.0 Pro client
  const gemini = new GeminiClient(API_KEYS.GEMINI);
  const body = await req.json();
  const { mode } = body;

  // MISSION 1: DÉDUCTION CLIENTS DE RÊVE
  if (mode === "dream_clients_deduction") {
    const { pastClients } = body;
    console.log(
      `🧠 Brain: Deducing Dream Clients based on ${
        pastClients?.length || 0
      } past clients...`,
    );

    const prompt = `
    CONTEXTE :
    Voici la liste des clients passés de l'agence : 
    ${JSON.stringify(pastClients, null, 2)}

    TA MISSION :
    Analyse cette typologie (Secteur, Taille, Prestige, Stack Tech probable).
    Par déduction logique (Lookalike), génère une liste de 5 "Clients de Rêve" (Dream Clients) que cette agence devrait chasser.
    Ce doivent être des entreprises cohérentes (même niveau ou +1).
    
    RÈGLES :
    - Ne cite PAS les clients déjà présents dans la liste.
    - Sois pertinent (Si l'agence fait du Luxe, cite du Luxe. Si Tech, cite de la Tech).
    - Format JSON strict : tableau de strings uniquement.
    `;

    // MIGRATION: ULTRA + 0.0 Temp
    const result = await gemini.generateJSON(
      prompt,
      GEMINI_MODELS.ULTRA,
      "Tu es un stratège commercial expert.",
      undefined,
      { temperature: 0.0 },
    );

    return new Response(JSON.stringify({ dreamClients: result }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // MISSION 2: INGESTION TOTALE (STRATÉGIE)
  if (mode === "strategic_ingestion") {
    const { documentsContent, pastClients, websiteContent } = body;
    console.log(
      `🧠 Brain: Strategic Ingestion (Docs: ${
        documentsContent?.length || 0
      } chars, Web: ${
        websiteContent?.length || 0
      } chars, Clients: ${pastClients?.length})`,
    );

    // Combine contents
    const fullContext = `
    --- WEBSITE CONTENT ---
    ${websiteContent || "No website content provided."}
    
    --- UPLOADED DOCUMENTS ---
    ${documentsContent || "No documents provided."}
    `.trim();

    const prompt = `
    SOURCE 1 (PRIORITÉ ABSOLUE - DOCUMENTS UPLOADÉS + SITE WEB) :
    "${fullContext.slice(0, 500000)}" 
    
    SOURCE 2 (VALIDATION - CLIENTS PASSÉS) :
    ${JSON.stringify(pastClients?.slice(0, 50), null, 2)}

    TA MISSION :
    Fusionne ces connaissances pour profiler l'agence.
    
    1. PAGE "DÉFINITION CIBLE" :
    - Qui est l'ICP (Ideal Customer Profile) ?
    - Secteurs (ex: Retail, Industrie...)
    - Taille (PME, ETI, Grand Compte ?)
    - Géographie
    
    2. CONTEXTE ADDITIONNEL :
    - Pitch : La proposition de valeur unique (extraite des docs).
    - Méthodologie : Comment ils travaillent (extraite des docs).

    3. CRITÈRES DE QUALIFICATION :
    - Définis 3 à 5 règles d'or pour qualifier un prospect (ex: "CA > 50M€", "Utilise Shopify", "Recrute des commerciaux").
    
    FORMAT DE SORTIE JSON ATTENDU :
    {
      "target_definition": {
         "industries": ["..."],
         "company_size": ["..."],
         "geography": ["..."],
         "seniority_level": ["..."]
      },
      "additional_context": {
         "pitch": "...",
         "methodology": "..."
      },
      "qualification_criteria_rules": ["Règle 1", "Règle 2", "Règle 3"]
    }
    `;

    // MIGRATION: ULTRA + 0.0 Temp
    const result = await gemini.generateJSON(
      prompt,
      GEMINI_MODELS.ULTRA,
      "Tu es le Directeur de la Stratégie Kortex. Analyse chirurgicale.",
      undefined,
      { temperature: 0.0 },
    );

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // ANCIENS MODES (Legacy but kept for compatibility)
  const {
    context = "",
    userContext = "",
    companyData = "", // keeping generic param usage
    userQuery = "",
    systemInstruction = "",
  } = body;

  console.log(`   Mode: ${mode}, Query length: ${userQuery.length}`);

  const systemPrompt = systemInstruction || SYSTEM_PROMPTS[mode] ||
    SYSTEM_PROMPTS.analysis;
  const fullPrompt =
    `SYSTEM: ${systemPrompt}\n\nCONTEXTE:\n${context}\n\nQUERY:\n${userQuery}`;

  // MIGRATION: ULTRA + 0.0 Temp
  const result = await gemini.generateContent(
    fullPrompt,
    GEMINI_MODELS.ULTRA,
    undefined,
    { temperature: 0.0 },
  );

  return new Response(
    JSON.stringify({ result, model: GEMINI_MODELS.ULTRA, mode }),
    { headers: { "Content-Type": "application/json" } },
  );
});
