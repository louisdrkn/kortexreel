// ============================================================================
// IMPORTS STANDARDS (NE JAMAIS CHANGER)
// ============================================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.3";

// ============================================================================
// CORS UNIVERSEL (Le "Passe-Partout")
// ============================================================================
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ============================================================================
// TYPES & INTERFACES
// ============================================================================
interface StrategizeRequest {
  projectId: string;
  force_analyze?: boolean;
}

interface StrategicIdentity {
  verification_citation?: string;
  consciousness_summary?: string[];
  strategic_pillars?: StrategicPillar[];
  unique_value_proposition?: string;
  core_pain_points?: string[];
  ideal_prospect_profile?: string;
  exclusion_criteria?: string;
  observable_symptoms?: string[];
}

interface StrategicPillar {
  name: string;
  description: string;
}

interface ProjectDataRow {
  data_type: string;
  data: Record<string, unknown>;
}

interface AgencyDNA {
  companyName?: string;
  website?: string;
  pitch?: string;
  methodology?: string;
  extractedContent?: {
    websiteContent?: string;
  };
}

interface DocumentRow {
  file_name: string;
  extracted_content?: string;
}

// ============================================================================
// CONSTANTS - GEMINI MODEL
// ============================================================================
const GEMINI_MODEL = "gemini-2.0-flash-exp";

// ============================================================================
// SYSTEM INSTRUCTION (Draconian Truth Mode)
// ============================================================================
const SYSTEM_INSTRUCTION = `
You are KORTEX, the Strategic Brain of Axole.
Your mission is to extract TRUTH from documents and synthesize actionable intelligence.

CRITICAL RULES:
1. NEVER invent information not present in the source documents
2. ALWAYS cite exact quotes when making claims
3. REJECT generic B2B marketing jargon
4. USE technical lexicon from the provided PDFs
5. OUTPUT ONLY VALID JSON - NO preamble, NO explanation
`;

// ============================================================================
// PROMPTS
// ============================================================================
const MISSION_PROMPT = `
=== MISSION: EXPERT DÉBRIDÉ - WAR MACHINE CONSTRUCTION ===
Utilise le [GLOBAL_CONTEXT] (PDFs + Scrape) pour construire l'ADN de la War Machine de prospection.

=== INPUT CONTEXT ===
{GLOBAL_CONTEXT}

=== PHASE 0: EXTRACTION DE L'INTELLIGENCE ===

1. **SYNTHÈSE DE CONSCIENCE (Proof of Integration)** :
   - Trouve 3 éléments dans les docs qui CONTREDISENT les pratiques marketing standard.
   - Format : "Contradiction: [Concept Spécifique] trouvé dans [Nom du Doc Source] s'oppose à [Pratique Générique Standard]."

2. **VÉRIFICATION (PROOF OF LIFE)** :
   - Copie mot-à-mot la première phrase du premier paragraphe du tout premier document de la base de connaissances.

3. **EXTRACTION DES 3 PILIERS STRATÉGIQUES (LE MOAT)** :
   - Identifie les 3 concepts propriétaires qui rendent cette méthodologie IMPÉNÉTRABLE par la concurrence.
   - Citation exacte de la méthodologie ou du concept propriétaire depuis le texte.
   - Explique pourquoi ce pilier crée une barrière à l'entrée.

4. **PORTRAIT-ROBOT TECHNIQUE (The Perfect Fit)** :
   - Qui souffre de l'ABSENCE de ces 3 piliers ?
   - Définis-les avec le lexique technique des documents.

5. **IDENTIFICATION DES SYMPTÔMES TECHNIQUES (ANTI-PATTERNS)** :
   - Selon la Section II des PDF (si présente), quels sont les 3 signaux d'erreurs RÉELS à traquer ?
   - Ces symptômes doivent être observables, mesurables et techniques.

=== OUTPUT JSON STRUCTURE ===
{
  "verification_citation": "Citation exacte mot-à-mot de la première phrase du premier document...",
  "consciousness_summary": [
     "Contradiction 1: [Concept] trouvé dans [Doc X] s'oppose à [Pratique Standard]",
     "Contradiction 2: ...",
     "Contradiction 3: ..."
  ],
  "strategic_pillars": [
    { 
      "name": "Terme Exact du Doc", 
      "description": "Analyse du MOAT: Pourquoi ce pilier est une barrière à l'entrée"
    },
    { "name": "...", "description": "..." },
    { "name": "...", "description": "..." }
  ],
  "unique_value_proposition": "Proposition de valeur synthétisée basée sur les 3 Piliers.",
  "core_pain_points": [
    "Douleur liée au Pilier 1", 
    "Douleur liée au Pilier 2", 
    "Douleur liée au Pilier 3"
  ],
  "ideal_prospect_profile": "Portrait-Robot détaillé utilisant le lexique technique des documents",
  "exclusion_criteria": "Critères de disqualification basés sur la compatibilité méthodologique",
  "observable_symptoms": [
     "Symptôme 1 (Anti-Pattern observable)", 
     "Symptôme 2 (Anti-Pattern mesurable)",
     "Symptôme 3 (Anti-Pattern technique)"
  ]
}

=== CRITICAL FORMATTING RULES (DO NOT IGNORE) ===
FOR THE FIELD 'unique_value_proposition':

STRICTLY FORBIDDEN: You must NEVER start with "🧠", "CONSCIOUSNESS SUMMARY", "Analysis", or "Source:".

STRICTLY FORBIDDEN: Do not explain how you found the answer. Do not cite the PDF sections.

STRICTLY FORBIDDEN: Do not include the consciousness_summary content in this field.

REQUIRED FORMAT: Output ONLY the final client-facing marketing pitch.

LENGTH LIMIT: Maximum 2 powerful sentences.

Example of BAD output: "🧠 Analysis: The PDF mentions X, so we should do Y..."
Example of GOOD output: "Nous transformons votre cycle de vente imprévisible en une machine d'acquisition systémique qui cible exclusivement les décideurs."
`;

const STRATEGY_PROMPT = `
[SYSTEM: KORTEX STRATÈGE SENIOR AXOLE]
MODE: GÉNÉRATION DE STRATÉGIE DE PROSPECTION B2B

=== RÔLE ===
Tu es le Stratège Senior Axole. Ton but est de générer une stratégie de prospection pour cibler des DÉCIDEURS et des ENTREPRISES, pas des exécutants ni des offres d'emploi.

=== STRATEGIC IDENTITY (TARGET COMPANY) ===
{IDENTITY_JSON}

=== RÈGLES LOGIQUES STRICTES ===

**RÈGLE 1 : CIBLAGE (Plan de Chasse - queries)**

INTERDIT ABSOLU : Les termes suivants sont BANNIS de toutes les requêtes :
- "Glassdoor"
- "Indeed"
- "Recrutement"
- "Offre d'emploi"
- "Candidat"
- "Business Developer"
- "Sales Representative"
- "Poste à pourvoir"
- Tout terme lié aux RH ou à l'emploi

OBLIGATOIRE : Cible les TITRES DE DÉCISION uniquement :
- CEO, Founder, Co-Founder
- DG, Directeur Général
- VP Sales, VP Marketing, VP Operations
- Directeur Industriel, Directeur Commercial
- C-Level executives

STRUCTURE DES REQUÊTES : Utilise des opérateurs Google précis pour trouver des ENTREPRISES et des DÉCIDEURS.

FORMAT CORRECT (exemples de structure) :
- site:linkedin.com/in/ intitle:"CEO" AND "secteur du client"
- site:societe.com "secteur activité" AND "chiffre d'affaires"
- site:linkedin.com/company/ "industrie cible" AND "nombre employés"
- "Directeur Général" AND "secteur" AND "problème identifié"
- intitle:"Founder" site:crunchbase.com "industrie"

OBJECTIF : Trouve des ENTREPRISES qui correspondent au profil, pas des avis d'employés ou des offres d'emploi.

**RÈGLE 2 : DOULEUR (Pain Points)**

EXTRACTION : Extrais les problèmes structurels du PDF uniquement.

EXEMPLES DE BONNES DOULEURS :
- "Perte de marge opérationnelle"
- "Processus manuel inefficace"
- "Dépendance à des systèmes obsolètes"
- "Fragmentation des données"

INTERDIT : Douleurs génériques comme "manque de temps", "besoin de croissance", "recherche de talents".

FORMAT : Chaque pain point doit être un problème observable et mesurable que le PDF dénonce explicitement.

**RÈGLE 3 : SORTIE (Value Proposition)**

INTERDIT : Pas de méta-commentaires internes (Consciousness Summary, Analysis, Source, etc.).

FORMAT OBLIGATOIRE : Une phrase choc structurée ainsi :
"Nous aidons [CIBLE PRÉCISE] à [RÉSULTAT MESURABLE] en supprimant [DOULEUR SPÉCIFIQUE]."

VOCABULAIRE : Utilise uniquement les termes techniques présents dans les PDF Axole.

=== OUTPUT JSON STRUCTURE ===
{
  "value_proposition": "Phrase choc sans méta-commentaire",
  "core_pain_points": [
    "Problème structurel 1 extrait du PDF",
    "Problème structurel 2 extrait du PDF",
    "Problème structurel 3 extrait du PDF"
  ],
  "queries": [
    "Requête 1 ciblant entreprises/décideurs (pas de job boards)",
    "Requête 2 ciblant entreprises/décideurs (pas de job boards)",
    "Requête 3 ciblant entreprises/décideurs (pas de job boards)",
    "Requête 4 ciblant entreprises/décideurs (pas de job boards)",
    "Requête 5 ciblant entreprises/décideurs (pas de job boards)"
  ],
  "synthesis_proof": "Explication de la synthèse entre PDF et Identity"
}

=== CRITICAL FORMATTING RULES (DO NOT IGNORE) ===
FOR THE FIELD 'unique_value_proposition':

STRICTLY FORBIDDEN: You must NEVER start with "🧠", "CONSCIOUSNESS SUMMARY", "Analysis", or "Source:".

STRICTLY FORBIDDEN: Do not explain how you found the answer. Do not cite the PDF sections.

REQUIRED FORMAT: Output ONLY the final client-facing marketing pitch.

LENGTH LIMIT: Maximum 2 powerful sentences.

Example of BAD output: "🧠 Analysis: The PDF mentions X, so we should do Y..."
Example of GOOD output: "Nous transformons votre cycle de vente imprévisible en une machine d'acquisition systémique qui cible exclusivement les décideurs."
`;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
async function scrapeClientSite(url: string, apiKey: string): Promise<string> {
  if (!url || !apiKey) return "";
  console.log(`[STRATEGIZE] 🕵️ Scraping client site ${url}...`);
  try {
    const resp = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["markdown"],
        onlyMainContent: true,
      }),
    });

    if (resp.ok) {
      const data = await resp.json();
      return data.data?.markdown || "";
    }
  } catch (e) {
    console.error("Scrape failed:", e);
  }
  return "";
}

async function generateJSON<T>(
  gemini: GoogleGenerativeAI,
  prompt: string,
  systemInstruction: string,
): Promise<T | null> {
  try {
    const model = gemini.getGenerativeModel({
      model: GEMINI_MODEL,
      systemInstruction,
      generationConfig: {
        temperature: 0.0,
        responseMimeType: "application/json",
      },
    });

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    if (!text) {
      console.error("[GEMINI] Empty response");
      return null;
    }

    return JSON.parse(text) as T;
  } catch (error) {
    console.error("[GEMINI] Generation failed:", error);
    return null;
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================
serve(async (req: Request): Promise<Response> => {
  // 1. GESTION DU PRE-FLIGHT (OPTIONS) - PRIORITÉ ABSOLUE
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 2. RÉCUPÉRATION SÉCURISÉE DU BODY
    const requestData = await req.json() as StrategizeRequest;
    const { projectId, force_analyze } = requestData;

    if (!projectId) {
      throw new Error("Missing projectId");
    }

    console.log(`[STRATEGIZE] 🚀 Starting for Project: ${projectId}`);

    // 3. INITIALISATION CLIENTS (Supabase & Gemini)
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const geminiApiKey = Deno.env.get("GOOGLE_API_KEY") ||
      Deno.env.get("GEMINI_API_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase credentials");
    }
    if (!geminiApiKey) {
      throw new Error("Missing GEMINI_API_KEY");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const gemini = new GoogleGenerativeAI(geminiApiKey);

    // 4. FETCH CONTEXT
    console.log(`[STRATEGIZE] 🧩 Aggregating Context...`);

    const { data: projectData, error: projectError } = await supabase
      .from("project_data")
      .select("data_type, data")
      .eq("project_id", projectId);

    if (projectError) {
      throw new Error(`Failed to fetch project data: ${projectError.message}`);
    }

    const agencyDNA = (projectData?.find((d: ProjectDataRow) =>
      d.data_type === "agency_dna"
    )?.data as AgencyDNA) || ({} as AgencyDNA);

    const { data: documentsData, error: docsError } = await supabase
      .from("company_documents")
      .select("file_name, extracted_content")
      .eq("project_id", projectId)
      .eq("extraction_status", "completed");

    if (docsError) console.warn("Docs fetch warning:", docsError);

    const pitch = agencyDNA.pitch || "";
    const methodology = agencyDNA.methodology || "";
    const websiteContent = agencyDNA.extractedContent?.websiteContent || "";

    const docsText = documentsData?.map((d: DocumentRow) =>
      `--- DOCUMENT: ${d.file_name} ---\n${
        d.extracted_content?.substring(0, 500000) || ""
      }`
    ).join("\n\n") || "";

    let fullText = `
    === KNOWLEDGE BASE (PRIMARY SOURCE OF TRUTH) ===
    ${docsText}

    === AGENCY PITCH ===
    ${pitch}

    === AGENCY METHODOLOGY ===
    ${methodology}

    === WEBSITE CONTENT ===
    ${websiteContent.substring(0, 20000)}
    `;

    console.log(`[STRATEGIZE] 📏 Context length: ${fullText.length} chars`);
    console.log(`[STRATEGIZE] 📄 Documents: ${documentsData?.length || 0}`);

    // BLACK HOLE CHECK
    if (!docsText || docsText.trim().length === 0) {
      throw new Error(
        "ABORT: No documents found. Please upload PDFs to Knowledge Base.",
      );
    }

    // AUTO-ENRICHMENT: Scrape if needed
    if (!websiteContent || websiteContent.length < 200) {
      console.log("[STRATEGIZE] 🕵️ Attempting fallback scrape...");
      const siteUrl = agencyDNA.website;
      const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");

      if (siteUrl && firecrawlKey) {
        const scraped = await scrapeClientSite(siteUrl, firecrawlKey);
        if (scraped) {
          console.log(`[STRATEGIZE] ✅ Scraped ${scraped.length} chars`);
          fullText += `\n\n=== FRESH SCRAPE ===\n${
            scraped.substring(0, 20000)
          }`;
        }
      }
    }

    // 5. CHECK EXISTING IDENTITY
    let identity: StrategicIdentity | null = null;
    if (!force_analyze) {
      const { data: existing } = await supabase
        .from("strategic_identities")
        .select("*")
        .eq("project_id", projectId)
        .maybeSingle();

      if (existing) {
        console.log(`[STRATEGIZE] ✅ Found existing identity`);
        identity = existing as StrategicIdentity;
      }
    }

    // 6. GENERATE IDENTITY IF NEEDED
    if (!identity) {
      console.log(`[STRATEGIZE] 🧠 Generating NEW Strategic Identity...`);

      const safeContext = fullText.substring(0, 500000);
      const finalMissionPrompt = MISSION_PROMPT.replace(
        "{GLOBAL_CONTEXT}",
        safeContext,
      );

      const identityJson = await generateJSON<StrategicIdentity>(
        gemini,
        finalMissionPrompt,
        SYSTEM_INSTRUCTION,
      );

      if (!identityJson) {
        throw new Error("Gemini returned empty identity");
      }

      console.log(
        `[STRATEGIZE] 🕵️ Verification: "${identityJson.verification_citation}"`,
      );

      // Save to DB
      const consciousnessLog =
        identityJson.consciousness_summary?.join("\n- ") || "No summary";
      const pillarsSummary =
        identityJson.strategic_pillars?.map((p: StrategicPillar) =>
          `[${p.name}]`
        ).join(" + ") || "";

      const expertValueProp =
        `🧠 CONSCIOUSNESS SUMMARY:\n- ${consciousnessLog}\n\n🔥 PILLARS:\n${pillarsSummary}\n\n${identityJson.unique_value_proposition}`;

      const dbPayload = {
        project_id: projectId,
        unique_value_proposition: expertValueProp,
        core_pain_points: identityJson.core_pain_points,
        ideal_prospect_profile: identityJson.ideal_prospect_profile,
        exclusion_criteria: identityJson.exclusion_criteria,
        anti_patterns: identityJson.observable_symptoms || [],
        updated_at: new Date().toISOString(),
      };

      const { data: saved, error: saveErr } = await supabase
        .from("strategic_identities")
        .upsert(dbPayload, { onConflict: "project_id" })
        .select()
        .single();

      if (saveErr) {
        console.error("Identity Save Error:", saveErr);
      }
      identity = saved || identityJson;
    }

    // 7. GENERATE STRATEGY
    console.log(`[STRATEGIZE] ⚔️ Generating Queries...`);
    const finalStrategyPrompt = STRATEGY_PROMPT.replace(
      "{IDENTITY_JSON}",
      JSON.stringify(identity, null, 2),
    );

    const strategyJson = await generateJSON<{
      value_proposition?: string;
      core_pain_points?: string[];
      queries?: string[];
      synthesis_proof?: string;
    }>(gemini, finalStrategyPrompt, SYSTEM_INSTRUCTION);

    if (!strategyJson) {
      throw new Error("Strategy generation returned null");
    }

    if (!strategyJson.queries || !Array.isArray(strategyJson.queries)) {
      throw new Error("Strategy response missing 'queries' field");
    }

    console.log(
      `[STRATEGIZE] ✅ Success - ${strategyJson.queries.length} queries generated`,
    );

    // 8. RÉPONSE STANDARDISÉE (Succès)
    return new Response(
      JSON.stringify({
        success: true,
        identity: identity,
        strategy: strategyJson,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error: unknown) {
    // 9. FILET DE SÉCURITÉ (Catch-All)
    console.error("[STRATEGIZE] 🔥 CRITICAL ERROR:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
