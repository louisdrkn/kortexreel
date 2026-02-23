// ============================================================================
// IMPORTS STANDARDS (NE JAMAIS CHANGER)
// ============================================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
} from "npm:@google/generative-ai@0.12.0";

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
  extracted_case_studies?: string[]; // NEW: For finding clients in PDFs
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
  trackRecord?: {
    pastClients?: { name: string; description?: string }[];
    dreamClients?: string[];
  };
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
const GEMINI_MODEL = "gemini-2.0-flash";

// ============================================================================
// SYSTEM INSTRUCTION (Draconian Truth Mode)
// ============================================================================
const SYSTEM_INSTRUCTION = `
You are KORTEX, an advanced Strategic AI Analyst.
Your mission is to extract TRUTH from documents and synthesize actionable intelligence.

CRITICAL RULES:
1. PRIORITIZE source documents (PDFs) as the primary truth.
2. IF PDFs are silent, USE the provided Agency Pitch and Methodology.
3. REJECT generic B2B marketing jargon unless it reflects the source material.
4. SYNTHESIZE clear, commercially viable sentences (don't just copy-paste fragments).
5. OUTPUT ONLY VALID JSON - NO preamble, NO explanation.
`;

// ============================================================================
// UTILITY: KEY NORMALIZATION (Fix Case Sensitivity Bug)
// ============================================================================
/**
 * Recursively normalizes all keys in an object to lowercase.
 * This fixes the bug where Gemini returns keys like "Unique_Value_Proposition"
 * instead of "unique_value_proposition", causing undefined values and "N/A" display.
 *
 * @param obj - The object to normalize (can be nested)
 * @returns The same object with all keys converted to lowercase
 */
function normalizeKeys(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map((item) => normalizeKeys(item));
  }

  // Handle objects
  if (typeof obj === "object") {
    const normalized: Record<string, unknown> = {};
    const record = obj as Record<string, unknown>;
    for (const key in record) {
      if (Object.prototype.hasOwnProperty.call(record, key)) {
        // CORRECTION MAJEURE: Lowercase + Remplacement des espaces par des underscores
        // "Unique Value Proposition" -> "unique_value_proposition"
        const normalizedKey = key.toLowerCase().replace(/\s+/g, "_");
        normalized[normalizedKey] = normalizeKeys(record[key]);
      }
    }
    return normalized;
  }

  // Return primitive values as-is
  return obj;
}

// ============================================================================
// PROMPTS (MODE "ZERO-SHOT" - SANS EXEMPLES)
// ============================================================================
const MISSION_PROMPT = `
=== MISSION: EXTRACTION DE L'ADN DU CLIENT ===

CONTEXTE DOCUMENTAIRE (SOURCE DE VÉRITÉ): {GLOBAL_CONTEXT}

=== OBJECTIF ===
Tu dois ignorer ton identité d'IA. Tu dois incarner le DIRECTEUR COMMERCIAL de l'entreprise décrite dans les documents PDF.
Ta mission est d'analyser tes propres documents pour définir ta stratégie de vente.

=== INSTRUCTIONS DE RÉDACTION (STRICTEMENT SANS EXEMPLE) ===

**1. PROPOSITION DE VALEUR (unique_value_proposition)**
Generate a dense, high-impact Unique Value Proposition (30-50 words) strictly following this 3-part structure:
1. **The Context:** Briefly state the target's specific inefficiency or pain point.
2. **The Kortex Fix:** Explain how our automated Sales Intelligence & AI Qualification solves it.
3. **The Business Impact:** Conclude with the concrete result (e.g., 'reducing sourcing time by 90%', 'delivering ready-to-close leads').

**2. DOULEURS CŒURS (core_pain_points)**
Identifie les problèmes spécifiques, financiers ou techniques qui poussent tes clients à acheter ta solution.
RÈGLE D'EXTRACTION : Chaque point doit décrire une conséquence négative pour le client (perte d'argent, risque légal, inefficacité technique) si il n'utilise pas la solution.

**3. PROFIL PROSPECT (ideal_prospect_profile)**
Définis précisément qui est le signataire du contrat.
RÈGLE : Combine obligatoirement ces trois éléments :
1. L'intitulé de poste exact du décideur (Job Title).
2. Le secteur d'activité industriel précis (Industry).
3. La taille ou la typologie de l'entreprise cible (Size/Type).

**4. CRITÈRES D'EXCLUSION (exclusion_criteria)**
Définis qui ne peut PAS être client (basé sur des contraintes techniques ou budgétaires trouvées dans les textes).

**5. ÉTUDES DE CAS & CLIENTS CITÉS (extracted_case_studies)**
Liste TOUS les noms d'entreprises, marques ou clients cités dans les documents comme étant des références, des cas clients ou des partenaires existants.
C'est CRITIQUE pour trouver des clones de ces clients.

=== OUTPUT JSON ===
{
  "unique_value_proposition": "La phrase construite selon la syntaxe imposée",
  "core_pain_points": ["Douleur spécifique 1", "Douleur spécifique 2", "Douleur spécifique 3"],
  "ideal_prospect_profile": "Définition précise du décideur cible",
  "exclusion_criteria": "Typologie d'entreprises à ne pas contacter",
  "observable_symptoms": ["Signal externe visible 1", "Signal externe visible 2"],
  "extracted_case_studies": ["Client A", "Client B", "Partenaire C"],
  "verification_citation": "Une citation exacte du PDF qui justifie ton analyse",
  "consciousness_summary": [],
  "strategic_pillars": []
}
`;

const GLOBAL_KILL_SWITCH = "";

const STRATEGY_PROMPT = `
[SYSTEM: KORTEX COMMANDER - "SINGLE REQUEST AGENT PROTOCOL" ACTIVATED]

*** OBJECTIVE: SPEED OPTIMIZATION (MASTER PROMPT) ***
Running multiple small queries takes too long.
You must UNIFY the strategy into ONE comprehensive "Master Mission" per Key Client.

CONTEXT (OFFER):
{IDENTITY_JSON}

SOURCES (PAST CLIENTS):
{PAST_CLIENTS}

**STEP 0: SELECT THE "SOURCE OF TRUTH" (3 LEADERS)**
Analyze the past clients. Pick the TOP 3 most relevant "Leaders" that represent the Perfect Target.


**STEP 1: GENERATE THE MASTER PROMPT (1 PER LEADER)**
For EACH selected Leader, write A SINGLE, RICH INSTRUCTION in FRENCH (Français) using "OR" logic to cover all angles at once.
Focus on the *types* of companies to find (Competitors, Peers, Ecosystem Partners).
Do NOT include instructions about "navigation", "pagination", or "quantity" (e.g., "Find 35 companies"). The Agent handles that automatically.
Your job is purely to describe the **Target Persona**.

**TEMPLATE (Semantic Only - IN FRENCH):**
"Trouver des entreprises en [Région] qui sont SOIT des concurrents directs de [Leader], SOIT des pairs opérationnels partageant des installations industrielles similaires (comme [Atout Spécifique]), SOIT des entreprises ayant des besoins similaires pour [Solution]. Elles DOIVENT être des entités commerciales actives. Priorité aux entreprises ressemblant à [Leader] en structure et taille."

**STEP 2: RULES OF ENGAGEMENT**
*   **LANGUAGE**: FRENCH ONLY (FRANÇAIS).
*   **LOGIC**: Use "OR" to combine the [Direct], [Technical], and [Mirror] vectors.
*   **NO MICRO-MANAGEMENT**: Do not tell the agent *how* to search (e.g. "go to page 2"), just tell it *what* to find.

=== OUTPUT JSON ===
{
  "value_proposition": "Concentration sur des cibles opérationnelles à haute valeur",
  "identified_clusters": [
    { "name": "Master Strategy", "description": "Approche unifiée par leader", "representative_clients": ["Sanofi"] }
  ],
  "queries": [
    // Sanofi Master Prompt (French)
    "Trouver des entreprises en Europe de l'Ouest qui sont SOIT des concurrents pharmaceutiques directs de Sanofi, SOIT des CDMO avec des lignes de fabrication d'injectables stériles, SOIT de grands sites industriels nécessitant une conformité CVC stricte. Priorité aux usines similaires aux sites de production de Sanofi.",
    
    // SNCF Master Prompt (French)
    "Trouver des entreprises en France qui sont SOIT des prestataires de maintenance ferroviaire concurrents de la SNCF, SOIT des industries lourdes avec des ateliers MRO de matériel roulant, SOIT des opérateurs de transports publics lançant des appels d'offres de maintenance prédictive."
  ],
  "synthesis_proof": "J'ai sélectionné 3 Leaders. J'ai généré 1 Master Prompt concaténé pour chacun."
}
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

async function generateJSONWithRetry<T>(
  gemini: GoogleGenerativeAI,
  prompt: string,
  systemInstruction: string,
  _maxRetries = 3,
): Promise<T> {
  // 2. CONFIGURATION "FORCE BRUTE" (Safety OFF)
  // Adapting user code to keep functionality:
  // Prepending system instruction as 0.12.0 might not support it in config
  // and removing responseMimeType as it is likely not supported in 0.12.0
  const fullPrompt = `${systemInstruction}\n\n${prompt}`;

  const model = gemini.getGenerativeModel({
    model: GEMINI_MODEL, // gemini-2.0-flash
    safetySettings: [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
    ],
  });

  try {
    console.log("🕵️ Lancement Gemini (Force Brute)...");
    const result = await model.generateContent(fullPrompt);
    const response = result.response;

    // 3. LE MOUCHARD (Loggue la raison exacte du stop)
    // CORRECT structure for @google/generative-ai@0.12.0
    const candidate = response.candidates?.[0];
    console.log("🕵️ Finish Reason:", candidate?.finishReason || "UNKNOWN");
    console.log(
      "🕵️ Safety Ratings:",
      JSON.stringify(candidate?.safetyRatings || []),
    );
    console.log(
      "🕵️ Block Reason:",
      response.promptFeedback?.blockReason || "NONE",
    );

    // Log full response for debugging
    console.log(
      "🕵️ Full Response Structure:",
      JSON.stringify({
        finishReason: candidate?.finishReason,
        blockReason: response.promptFeedback?.blockReason,
        hasText: !!candidate?.content?.parts?.[0]?.text,
      }),
    );

    const text = response.text();
    if (!text) {
      console.error("🚨 ERREUR: Réponse vide");
      console.error("🚨 Finish Reason:", candidate?.finishReason);
      console.error(
        "🚨 Safety Ratings:",
        JSON.stringify(candidate?.safetyRatings),
      );
      throw new Error(
        `Réponse vide - Finish Reason: ${candidate?.finishReason || "UNKNOWN"}`,
      );
    }

    // Nettoyage JSON standard (Keeping robust cleaning)
    const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();

    // 4. PARSING FINAL
    const firstBrace = cleanJson.indexOf("{");
    const lastBrace = cleanJson.lastIndexOf("}");

    if (firstBrace === -1 || lastBrace === -1) {
      throw new Error("No JSON structure ({...}) found in response");
    }

    const finalJson = cleanJson.substring(firstBrace, lastBrace + 1);
    const parsedJson = JSON.parse(finalJson);

    // CRITICAL FIX: Normalize all keys to lowercase
    // This fixes the bug where Gemini returns "Unique_Value_Proposition"
    // instead of "unique_value_proposition", causing N/A display
    const normalizedJson = normalizeKeys(parsedJson);

    console.log("🔧 JSON keys normalized to lowercase");
    return normalizedJson as T;
  } catch (error) {
    // 4. RAPPORT D'AUTOPSIE - DIAGNOSTIC COMPLET
    console.error("🚨 ERREUR DÉTAILLÉE:", error);

    // Extract error message for analysis
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorString = JSON.stringify(error);

    // CAS A: [400] API key not valid
    if (
      errorMessage.includes("400") ||
      errorMessage.includes("API key not valid") ||
      errorMessage.includes("invalid")
    ) {
      console.error("🚨 CAS A DÉTECTÉ: [400] API key not valid");
      console.error(
        "🚨 SOLUTION: Vérifier GEMINI_API_KEY dans les secrets Supabase",
      );
      console.error("🚨 Commande: npx supabase secrets set --env-file .env");
    }

    // CAS B: [429] Quota exceeded
    if (
      errorMessage.includes("429") || errorMessage.includes("quota") ||
      errorMessage.includes("RESOURCE_EXHAUSTED")
    ) {
      console.error("🚨 CAS B DÉTECTÉ: [429] Quota exceeded");
      console.error("🚨 SOLUTION: Attendre ou changer de clé Google API");
    }

    // CAS C: Finish Reason: SAFETY
    if (errorMessage.includes("SAFETY") || errorString.includes("SAFETY")) {
      console.error(
        "🚨 CAS C DÉTECTÉ: Finish Reason: SAFETY (Blocage sécurité)",
      );
      console.error(
        "🚨 SOLUTION: Adoucir le prompt (éviter mots agressifs comme 'Chasse', 'Tuer')",
      );
    }

    // CAS D: User location is not supported
    if (
      errorMessage.includes("location") ||
      errorMessage.includes("not supported") || errorMessage.includes("region")
    ) {
      console.error("🚨 CAS D DÉTECTÉ: User location is not supported");
      console.error("🚨 SOLUTION: Changer la région du serveur Supabase");
    }

    // Log the full error for any other cases
    console.error("🚨 Message d'erreur complet:", errorMessage);
    console.error("🚨 Erreur stringifiée:", errorString);

    throw error;
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
    const { projectId, force_analyze: _force_analyze } = requestData;

    if (!projectId) {
      throw new Error("Missing projectId");
    }

    console.log(`[STRATEGIZE] 🚀 Starting for Project: ${projectId}`);

    // 3. INITIALISATION CLIENTS (Supabase & Gemini)
    // 3. INITIALISATION CLIENTS (Supabase & Gemini)
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    // STRICT: Only use GEMINI_API_KEY
    let geminiApiKey = Deno.env.get("GEMINI_API_KEY") || "";
    // Sanitize: Remove quotes if present and trim
    geminiApiKey = geminiApiKey.replace(/^["']|["']$/g, "").trim();

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase credentials");
    }
    if (!geminiApiKey) {
      console.error("[CRITICAL] GEMINI_API_KEY is missing or empty.");
      throw new Error("Missing GEMINI_API_KEY");
    }

    // Debug Log (Safety Masked)
    console.log(
      `[DEBUG] Loaded GEMINI_API_KEY: ${
        geminiApiKey.substring(0, 6)
      }... (Length: ${geminiApiKey.length})`,
    );

    const supabase = createClient(supabaseUrl, supabaseKey);
    const gemini = new GoogleGenerativeAI(geminiApiKey);

    // 4. FETCH CONTEXT (Now with DEEP MEMORY)
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

    const targetCriteria = (projectData?.find((d: ProjectDataRow) =>
      d.data_type === "target_criteria"
    )?.data) || {};

    // DEEP MEMORY FETCH
    const { data: documentsData, error: docsError } = await supabase
      .from("company_documents")
      .select(`
        file_name, 
        extracted_content,
        document_insights (
          extracted_prospects,
          specific_pain_points,
          success_metrics
        )
      `)
      .eq("project_id", projectId)
      .eq("extraction_status", "completed");

    if (docsError) {
      console.warn("Docs fetch warning:", docsError);
    }

    const pitch = agencyDNA.pitch || "";
    const methodology = agencyDNA.methodology || "";
    const websiteContent = agencyDNA.extractedContent?.websiteContent || "";

    // DEEP MEMORY AGGREGATION
    let deepMemoryHighlights = "";
    const extractedProspects: string[] = [];
    const technicalPainPoints: string[] = [];

    const docsText = documentsData?.map((d: any) => {
      // Aggregate Deep Memory
      if (d.document_insights && d.document_insights.length > 0) {
        const insights = d.document_insights[0]; // 1-to-1 relation

        if (insights.extracted_prospects?.length) {
          insights.extracted_prospects.forEach((p: any) =>
            extractedProspects.push(`${p.name} (${p.context})`)
          );
        }
        if (insights.specific_pain_points?.length) {
          insights.specific_pain_points.forEach((pp: any) =>
            technicalPainPoints.push(`${pp.problem}: ${pp.technical_detail}`)
          );
        }
      }

      return `--- DOCUMENT: ${d.file_name} ---\n${
        d.extracted_content?.substring(0, 500000) || ""
      }`;
    }).join("\n\n") || "";

    // Format Deep Memory for Prompt
    if (extractedProspects.length > 0 || technicalPainPoints.length > 0) {
      deepMemoryHighlights = `
      === 💎 DEEP MEMORY (INTELLIGENCE OR PUR) ===
      Ceci est la vérité terrain extraite des documents techniques. C'est plus important que le pitch.
      
      [CLIENTS & MODÈLES CITÉS]
      ${extractedProspects.join("\n")}
      
      [PROBLÈMES TECHNIQUES EXACTS (PAIN POINTS)]
      ${technicalPainPoints.join("\n")}
      `;
    }

    let fullText = `
    === KNOWLEDGE BASE (PRIMARY SOURCE OF TRUTH) ===
    ${docsText}

    ${deepMemoryHighlights}

    === AGENCY PITCH ===
    ${pitch}

    === AGENCY METHODOLOGY ===
    ${methodology}

    === WEBSITE CONTENT ===
    ${websiteContent.substring(0, 20000)}
    `;

    console.log(`[STRATEGIZE] 📏 Context length: ${fullText.length} chars`);
    console.log(`[STRATEGIZE] 📄 Documents: ${documentsData?.length || 0}`);

    // --- LEAKAGE DIAGNOSTICS START ---
    const contextPreview = fullText.substring(0, 500);
    console.log(
      `[DIAGNOSTIC] Context Preview (First 500 chars):\n${contextPreview}`,
    );

    if (
      fullText.toLowerCase().includes("axole") ||
      pitch.toLowerCase().includes("axole") ||
      websiteContent.toLowerCase().includes("axole")
    ) {
      console.warn(
        `[DIAGNOSTIC] ⚠️ CRITICAL: 'Axole' keyword detected in context for project ${projectId}`,
      );
    } else {
      console.log(`[DIAGNOSTIC] ✅ Context appears clean of 'Axole'`);
    }
    // --- LEAKAGE DIAGNOSTICS END ---

    // BLACK HOLE CHECK (Relaxe: Allow Pitch/Website if Docs are missing)
    const hasDocuments = docsText && docsText.trim().length > 0;
    const hasPitch = pitch && pitch.trim().length > 0;
    const hasWebsite = websiteContent && websiteContent.trim().length > 0;

    if (!hasDocuments && !hasPitch && !hasWebsite) {
      throw new Error(
        "ABORT: No context found (Docs, Pitch, or Website). Please upload PDFs or complete Agency DNA.",
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
    if (false) { // FORCE ANALYZE ALWAYS ACTIVE FOR DEBUG
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

      const identityJson = await generateJSONWithRetry<StrategicIdentity>(
        gemini,
        finalMissionPrompt,
        SYSTEM_INSTRUCTION,
      );

      // if (!identityJson) handled by throw in retry function

      console.log(
        `[STRATEGIZE] 🕵️ Verification: "${identityJson.verification_citation}"`,
      );

      // NETTOYAGE TOTAL - Plus de pollution philosophique
      const dbPayload = {
        project_id: projectId,
        unique_value_proposition: identityJson.unique_value_proposition, // Plus de concaténation
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
    const pastClientsList = agencyDNA.trackRecord?.pastClients?.map((c) =>
      c.name
    ) || [];

    // AUTO-INJECT: Clients found in PDFs
    if (
      identity?.extracted_case_studies &&
      Array.isArray(identity.extracted_case_studies)
    ) {
      console.log(
        `[STRATEGIZE] 💉 Injecting ${identity.extracted_case_studies.length} clients found in PDFs`,
      );
      pastClientsList.push(...identity.extracted_case_studies);
    }
    const pastClientsStr = pastClientsList.length > 0
      ? pastClientsList.join(", ")
      : "None provided (Use broad industry knowledge)";

    const finalStrategyPrompt = STRATEGY_PROMPT
      .replace("{IDENTITY_JSON}", JSON.stringify(identity, null, 2))
      .replace("{PAST_CLIENTS}", pastClientsStr)
      .replace("{TARGET_CRITERIA}", JSON.stringify(targetCriteria, null, 2))
      .replace("{DEEP_MEMORY}", deepMemoryHighlights); // INJECTING GOLD NUGGETS

    const strategyJson = await generateJSONWithRetry<{
      value_proposition?: string;
      core_pain_points?: string[];
      queries?: string[];
      synthesis_proof?: string;
    }>(gemini, finalStrategyPrompt, SYSTEM_INSTRUCTION);

    // if (!strategyJson) handled by throw in retry function

    if (!strategyJson.queries || !Array.isArray(strategyJson.queries)) {
      throw new Error("Strategy response missing 'queries' field");
    }

    // ========================================================================
    // GLOBAL KILL SWITCH ENFORCEMENT
    // ========================================================================
    console.log(
      `[STRATEGIZE] 🛡️ Applying GLOBAL KILL SWITCH to ${strategyJson.queries.length} queries...`,
    );

    strategyJson.queries = strategyJson.queries.map((q) => {
      // 1. Remove any existing overlapping exclusion to avoid double-negative mess
      let cleanQ = q.replace(/-site:linkedin\.com/g, "")
        .replace(/-emploi/g, "")
        .trim();

      // 2. Append the HARDCODED Kill Switch
      return `${cleanQ}${GLOBAL_KILL_SWITCH}`;
    });

    console.log(
      `[STRATEGIZE] ✅ Success - ${strategyJson.queries.length} queries generated`,
    );

    // 8. RÉPONSE STANDARDISÉE (Succès)
    return new Response(
      JSON.stringify({
        success: true,
        identity: identity,
        strategy: strategyJson,
        diagnostics: {
          pdf_char_count: docsText.length,
          pitch_char_count: pitch.length,
          website_char_count: websiteContent.length,
          doc_files: documentsData?.map((d) => d.file_name) || [],
          // --- LEAKAGE DIAGNOSTICS ---
          used_context_preview: fullText.substring(0, 1000) + "...",
          agency_dna_snapshot: {
            pitch_preview: pitch.substring(0, 200),
            website_url: agencyDNA.website,
            website_content_preview: websiteContent.substring(0, 200),
          },
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error: unknown) {
    // 9. ERROR HANDLING (Fail Explicitly)
    console.error("[STRATEGIZE] 🚨 Critical Error:", error);
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
