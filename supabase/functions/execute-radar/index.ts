// ============================================================================
// IMPORTS STANDARDS (ALIGNED WITH STRATEGIZE-RADAR)
// ============================================================================

declare global {
  const EdgeRuntime: {
    waitUntil(promise: Promise<unknown>): void;
  };
}

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
} from "npm:@google/generative-ai@0.12.0";

// ============================================================================
// CORS UNIVERSEL
// ============================================================================
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ============================================================================
// TYPES & INTERFACES
// ============================================================================
interface ExecuteRequest {
  projectId: string;
  approved_queries: string[];
  force_refresh?: boolean;
}

interface TargetCriteria {
  industries?: string[];
  headcount?: string[];
  geography?: string[];
  [key: string]: unknown;
}

interface ValidationResult {
  keep: boolean;
  score: number;
  sales_thesis: string;
  trigger_events: string[];
  strategic_category: "PERFECT_MATCH" | "OPPORTUNITY" | "OUT_OF_SCOPE";
  evidence_snippet?: string;
  name?: string;
  location?: string;
  disqualification_reason?: string;
  detected_pain_points?: string[];
}

interface TribunalJudgment {
  name: string;
  match_score: number;
  sales_thesis: string;
  trigger_events: string[];
  disqualification_reason?: string;
  detected_pain_points?: string[];
  evidence_snippet?: string;
  location?: string;
  strategic_category?: "PERFECT_MATCH" | "OPPORTUNITY" | "OUT_OF_SCOPE";
}

interface MapsPlace {
  placeId: string;
  formattedAddress: string;
  rating: number;
  userRatingsTotal: number;
  url: string;
}

interface FirecrawlSearchResponse {
  data?: {
    url?: string;
    title?: string;
    favicon?: string;
  }[];
}

interface FirecrawlScrapeResponse {
  data?: {
    markdown?: string;
    metadata?: Record<string, string>;
  };
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

interface Candidate {
  url: string;
  source_query: string;
  company_name: string;
  logo_url: string;
  status: "pending" | "analyzed" | "failed";
  match_reason?: string; // NEW: Agent Context
  activity?: string; // NEW: Agent Context
  is_agent_verified?: boolean; // NEW: VIP Flag
}

interface StrategicIdentity {
  verification_citation?: string;
  consciousness_summary?: string[];
  strategic_pillars?: unknown[];
  unique_value_proposition?: string;
  core_pain_points?: string[];
  ideal_prospect_profile?: string;
  exclusion_criteria?: string;
  anti_patterns?: string[];
  observable_symptoms?: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================
const GEMINI_MODEL = "gemini-2.0-flash";

// ============================================================================
// SYSTEM INSTRUCTION (STRICT GATEKEEPER MODE)
// ============================================================================
const SYSTEM_INSTRUCTION = `
You are KORTEX JUDGE, the Uncompromising Gatekeeper.
Your mission is to FILTER OUT noise and ONLY pass high-probability corporate targets.

CRITICAL RULES (JUDGE MODE):
1. **IDENTITY VERIFICATION**: If this is a directory, blog, news site, or "list of companies" -> REJECT IMMEDIATELY.
2. **SEGMENTATION ENFORCEMENT**: If the company size or sector is vague -> REJECT. Do not guess.
3. **PAST CLIENT ALIGNMENT**: If the prospect has ZERO similarity to the "Reference Models" -> REJECT.
4. **B2B PURITY**: If it looks like B2C or a public administration (unless explicitly allowed) -> REJECT.
5. **OUTPUT**: VALID JSON ONLY. No mercy for weak signals.
`;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function normalizeKeys(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => normalizeKeys(item));
  }
  if (typeof obj === "object") {
    const normalized: Record<string, unknown> = {};
    const record = obj as Record<string, unknown>;
    for (const key in record) {
      if (Object.prototype.hasOwnProperty.call(record, key)) {
        const normalizedKey = key.toLowerCase().replace(/\s+/g, "_");
        normalized[normalizedKey] = normalizeKeys(record[key]);
      }
    }
    return normalized;
  }
  return obj;
}

async function generateJSONWithRetry<T>(
  gemini: GoogleGenerativeAI,
  prompt: string,
  systemInstruction: string,
  _maxRetries = 3,
): Promise<T> {
  const fullPrompt = `${systemInstruction}\n\n${prompt}`;
  const model = gemini.getGenerativeModel({
    model: GEMINI_MODEL,
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
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.7,
    },
  });

  try {
    console.log("🕵️ Lancement Gemini (Standardized)...");
    const result = await model.generateContent(fullPrompt);
    const response = result.response;
    const text = response.text();
    if (!text) throw new Error("Empty response from Gemini");

    const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const firstBrace = cleanJson.indexOf("{");
    const lastBrace = cleanJson.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace === -1) {
      throw new Error("No JSON structure found");
    }

    const finalJson = cleanJson.substring(firstBrace, lastBrace + 1);
    const parsedJson = JSON.parse(finalJson);
    return normalizeKeys(parsedJson) as T;
  } catch (error) {
    console.error("🚨 Gemini Error:", error);
    throw error;
  }
}

async function batchProcess<T, R>(
  items: T[],
  batchSize: number,
  processFn: (item: T) => Promise<R | null>,
  delayMs = 0,
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    console.log(
      `[BATCH] Processing items ${i + 1} to ${
        Math.min(i + batchSize, items.length)
      } of ${items.length}...`,
    );
    const batchResults = await Promise.all(
      batch.map(async (item) => {
        try {
          return await processFn(item);
        } catch (e) {
          console.error(`[BATCH] Error processing item:`, e);
          return null;
        }
      }),
    );
    batchResults.forEach((res) => {
      if (res !== null) results.push(res);
    });
    if (delayMs > 0 && i + batchSize < items.length) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return results;
}

function extractDomainName(url: string): string {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace(/^www\./, "");
    const parts = domain.split(".");
    if (parts.length > 0) {
      return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    }
    return domain;
  } catch {
    return url;
  }
}

function getGoogleFavicon(url: string): string {
  try {
    const urlObj = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=128`;
  } catch {
    return "";
  }
}

function isValidUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return ["http:", "https:"].includes(u.protocol) && !!u.hostname;
  } catch {
    return false;
  }
}

async function isUrlReachable(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const resp = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36...",
      },
    });
    clearTimeout(timeoutId);
    return resp.ok || resp.status === 403;
  } catch {
    return false;
  }
}

function normalizeUrlForDedup(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return url.toLowerCase().replace(/^www\./, "");
  }
}

async function searchCompanyOnMaps(
  companyName: string,
  apiKey: string,
): Promise<MapsPlace | null> {
  try {
    const resp = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask":
            "places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.googleMapsUri,places.id",
        },
        body: JSON.stringify({ textQuery: companyName }),
      },
    );
    if (!resp.ok) return null;
    const data = await resp.json();
    const place = data.places?.[0];
    if (!place) return null;
    return {
      placeId: place.name,
      formattedAddress: place.formattedAddress,
      rating: place.rating,
      userRatingsTotal: place.userRatingCount,
      url: place.googleMapsUri,
    };
  } catch (e) {
    console.error(`[MAPS] Error searching for ${companyName}:`, e);
    return null;
  }
}

async function validateSingleCandidate(
  candidate: Candidate,
  gemini: GoogleGenerativeAI,
  context: {
    solution: string;
    target: string;
    pastClients: { name: string; description?: string }[];
    targetCriteria?: TargetCriteria;
  },
  scrapedContent: string,
): Promise<ValidationResult | null> {
  const pastClientsString = context.pastClients.map((c) =>
    `- Name: ${c.name}\n  Context: ${c.description || "N/A"}`
  ).join("\n");
  const pastClientsCombined = context.pastClients.map((c) =>
    (c.name + " " + (c.description || "")).toLowerCase()
  ).join(" ");

  const criteria = context.targetCriteria;
  const authorizedSectors = criteria?.industries?.length
    ? JSON.stringify(criteria.industries)
    : "ANY (B2B)";
  const headcountRange = criteria?.headcount?.length
    ? JSON.stringify(criteria.headcount)
    : "ANY SIZE";
  const geoZone = criteria?.geography?.length
    ? JSON.stringify(criteria.geography)
    : "ANY LOCATION";

  const hardFiltersBlock = `
  🛡️ MANDATORY GATES (STRICT ENFORCEMENT):
  1. **IDENTITY CHECK (The "Is it a Company?" Test)**
     - Is this a **Single Company Homepage**? (YES/NO)
     - Is it a Directory/Listing/Top 10? -> REJECT (Reason: Directory).
     - Is it a Blog/Article? -> REJECT (Reason: Content Page).
     - Is it a Government/Public Entity? -> Check exclusions. If banned -> REJECT.

  2. **SEGMENTATION CHECK (The "Fit" Test)**
     - **Sector**: Does it match: ${authorizedSectors}?
     - **Size**: Does it match: ${headcountRange}?
     - **Location**: Does it match: ${geoZone}?
     - **RULE**: If you cannot determine Size/Sector with >80% confidence -> REJECT (Reason: Insufficient Data).

  3. **SIMILARITY CHECK (The "Twin" Test)**
     - Compare candidates to **Reference Models** (Past Clients).
     - **Question**: "Could this company be a peer/competitor to the Reference Models?"
     - If the gap is too wide (e.g., selling to "Google" vs "Local Bakery") -> REJECT (Reason: Bad Strategic Fit).
  `;

  // VIP OVERRIDE FOR AGENT CANDIDATES
  const isVip = candidate.is_agent_verified;
  const systemInstruction = isVip
    ? "You are Kortex Analyzer. This candidate was PRE-VERIFIED by a Specialist Agent. DO NOT REJECT IT unless it is a dead link. Your job is purely to ENRICH the profile with Sales Arguments. Force a high match score."
    : SYSTEM_INSTRUCTION;

  const vipPromptAddon = isVip
    ? `
    *** VIP CANDIDATE (PRE-VERIFIED) ***
    This company was actively selected by the Firecrawl Agent as a perfect match.
    IGNORE strict segmentation checks. TRUST the Agent.
    FOCUS ONLY on:
    1. Finding the specific "Trigger Event" or "Pain Point".
    2. Drafting a killer Sales Thesis.
    3. Categorizing as "PERFECT_MATCH" or "OPPORTUNITY".
    `
    : "";

  const prompt = `
    ${hardFiltersBlock}
    ${vipPromptAddon}
    
    **CONTEXT (The Agency & Target):**
    - Solution Pitch: ${context.solution.substring(0, 500)}
    - Target Profile: ${context.target.substring(0, 300)}
    
    **REFERENCE MODELS (The Truth):**
    ${pastClientsString}
    
    **CANDIDATE TO JUDGE:**
    - URL: ${candidate.url}
    - Company Name: ${candidate.company_name}
    
    **EVIDENCE (Scraped Content):**
    ${scrapedContent.substring(0, 25000)}
    
    **JUDGMENT PROTOCOL:**
    1. Run **Identity Check**. If fail -> REJECT.
    2. Run **Anti-Cannibalism Check**. Is this ALREADY a Reference Client? If yes -> REJECT (Reason: Existing Client).
    3. Run **Segmentation Check**. If fail -> REJECT.
    4. Run **Similarity Check**. If fail -> REJECT.
    5. Search for **Pain Points**.
    
    **Output JSON:**
    { 
      "keep": boolean, 
      "score": number (0-100), 
      "sales_thesis": "Why this specific company needs us", 
      "trigger_events": ["Event 1", "Event 2"], 
      "strategic_category": "PERFECT_MATCH" | "OPPORTUNITY" | "OUT_OF_SCOPE", 
      "evidence_snippet": "Quote from site", 
      "name": "Corrected Company Name", 
      "location": "HQ Location", 
      "disqualification_reason": "Specific Reason (e.g., 'Is a Directory', 'Sector Mismatch', 'Low Similarity')", 
      "detected_pain_points": ["Pain 1", "Pain 2"] 
    }
    
    **SCORING GUIDE:**
    - **90-100**: Perfect Clone of a Past Client + Visible Pain.
    - **75-89**: Strong Fit (Sector/Size) + Visible Pain.
    - **<75**: REJECT. (We only want the best).
    `;

  try {
    const result = await generateJSONWithRetry<TribunalJudgment>(
      gemini,
      prompt,
      systemInstruction, // Use dynamic instruction
    );

    // FORCE KEEP IF VIP
    const shouldKeep = isVip ? true : (result.match_score || 0) > 65;

    return {
      keep: shouldKeep,
      score: isVip
        ? Math.max(result.match_score || 85, 80)
        : (result.match_score || 0), // Boost score if VIP
      sales_thesis: result.sales_thesis || "Detected by Agent Strategy",
      trigger_events: result.trigger_events || [],
      strategic_category: isVip
        ? "PERFECT_MATCH"
        : (result.strategic_category || "OUT_OF_SCOPE"),
      evidence_snippet: result.evidence_snippet,
      name: result.name,
      location: result.location,
      disqualification_reason: result.disqualification_reason,
      detected_pain_points: result.detected_pain_points,
    };
  } catch (e) {
    console.error(`Validation error for ${candidate.url}:`, e);
    return null;
  }
}

async function extractCandidatesFromRawOutput(
  rawText: string,
  gemini: GoogleGenerativeAI,
  query: string,
): Promise<Candidate[]> {
  const extractionPrompt = `
  You are a Data Miner. Your goal is to extract a structured list of companies from the raw text provided below.
  
  CONTEXT: The user was searching for: "${query}".
  RAW TEXT:
  """
  ${rawText.substring(0, 30000)}
  """
  
  INSTRUCTIONS:
  1. Identify every unique company mentioned that seems to be a search result.
  2. Extract their Name, URL (if present, otherwise guess based on name), and a brief reason why they match.
  3. Ignore generic platforms (LinkedIn, Facebook, etc.) unless they are the specific target.
  4. IGNORE directories or "Top 10" listicles themselves, but extract the companies LISTED in them.
  
  OUTPUT JSON FORMAT:
  [
    {
      "company_name": "Name",
      "url": "https://...",
      "reason_for_matching": "Why it fits"
    }
  ]
  `;

  try {
    const extracted = await generateJSONWithRetry<
      {
        company_name: string;
        url: string;
        reason_for_matching: string;
      }[]
    >(
      gemini,
      extractionPrompt,
      "You are a precise JSON extractor.",
    );

    if (!Array.isArray(extracted)) return [];

    return extracted.map((c) => ({
      url: c.url,
      source_query: query,
      company_name: c.company_name,
      logo_url: "",
      status: "pending",
      is_agent_verified: true, // It came from the Agent, so we treat it as VIP
    }));
  } catch (e) {
    console.warn("Gemini Extraction Failed:", e);
    return [];
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================
Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const requestData = await req.json() as ExecuteRequest;
    const { projectId, approved_queries, force_refresh } = requestData;
    if (!projectId) throw new Error("Missing projectId");
    if (!approved_queries || approved_queries.length === 0) {
      throw new Error("No queries provided");
    }

    const GLOBAL_TIMEOUT_MS = 12 * 60 * 1000; // 12 Minutes (Safe margin for 10m polling)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GLOBAL_TIMEOUT_MS);

    console.log(
      `[SYNC] 🚀 Start Project: ${projectId} [VERSION 2.0 - FORCE FIX]`,
    );

    // SETUP
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    let geminiApiKey = Deno.env.get("GEMINI_API_KEY") || "";
    // Sanitize: Remove quotes if present and trim
    geminiApiKey = geminiApiKey.replace(/^["']|["']$/g, "").trim();

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

    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY") ||
      Deno.env.get("FIRECRAWL");
    if (!firecrawlKey) throw new Error("Missing FIRECRAWL_API_KEY");

    const gemini = new GoogleGenerativeAI(geminiApiKey);

    // ========================================================================
    // 1. SMART RECOVERY (SYNCHRONOUS CHECK)
    // ========================================================================
    // Check if we already have fresh results (< 24h) to save credits/time
    // This MUST be done synchronously to notify the frontend immediately.

    if (!force_refresh) {
      console.log(`[SYNC] Checking for existing fresh data to recover...`);

      // Check radar_catch_all for recent entries
      const { data: existingData } = await supabase
        .from("radar_catch_all")
        .select("created_at")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (existingData) {
        const lastScan = new Date(existingData.created_at).getTime();
        const now = Date.now();
        const hoursSince = (now - lastScan) / (1000 * 60 * 60);

        if (hoursSince < 24) {
          console.log(
            `[CACHE] Found recent scan in radar_catch_all (${
              hoursSince.toFixed(1)
            }h ago). Recovering.`,
          );

          return new Response(
            JSON.stringify({
              success: true,
              recovered: true,
              message: "Recovered recent scan from cache",
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 200,
            },
          );
        }
      }

      // FALLBACK: Check company_analyses for recent activity (Legacy Support)
      const { data: latestAnalysis } = await supabase
        .from("company_analyses")
        .select("updated_at")
        .eq("project_id", projectId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .single();

      if (latestAnalysis) {
        const lastUpdate = new Date(latestAnalysis.updated_at).getTime();
        const hoursSinceAnalysis = (Date.now() - lastUpdate) /
          (1000 * 60 * 60);
        if (hoursSinceAnalysis < 24) {
          console.log(
            `[CACHE] Found recent analyses in company_analyses (${
              hoursSinceAnalysis.toFixed(1)
            }h ago). Recovering.`,
          );

          return new Response(
            JSON.stringify({
              success: true,
              recovered: true,
              message: "Recovered recent analyses from legacy cache",
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 200,
            },
          );
        }
      }
    }

    // ========================================================================
    // BACKGROUND TASK WRAPPER
    // ========================================================================
    const backgroundTask = async () => {
      let userId: string | undefined;
      const rawCandidates: Candidate[] = []; // Moved to top-level scope to fix visibility issues

      // HELPER: Universal System Logger (Long Term Memory)
      const logToDB = async (title: string, content: string) => {
        const isError = title.includes("FAIL") || title.includes("ERROR") ||
          title.includes("CRITICAL");
        const status = isError ? "ERROR" : "INFO";
        console.log(`[SYSTEM_LOG] [${status}] ${title}`);

        // Write to system_logs
        try {
          await supabase.from("system_logs").insert({
            project_id: projectId,
            function_name: "execute-radar",
            step_name: title,
            status: status,
            details: content ? content.substring(0, 10000) : "No details",
            created_at: new Date().toISOString(),
          });
        } catch (e) {
          console.warn("[SYSTEM_LOG] Failed to write log:", e);
        }
      };

      try {
        console.log(`[BACKGROUND] 🚀 Started for Project: ${projectId}`);

        // 1. ROBUST IDENTITY FETCH (CRITICAL FIX)
        // Background tasks often lack Auth Headers. We MUST find the project owner.
        const { data: projectOwner, error: ownerError } = await supabase
          .from("projects")
          .select("user_id")
          .eq("id", projectId)
          .single();

        if (ownerError || !projectOwner?.user_id) {
          console.error(
            "[CRITICAL] FATAL: Could not determine Project Owner.",
            ownerError,
          );
          // We cannot proceed without User ID (DB Constraint)
          throw new Error("Missing User ID for Project " + projectId);
        }

        userId = projectOwner.user_id;
        console.log(`[AUTH] Identity Secured: ${userId}`);

        // 2. FETCH PROJECT DATA
        await logToDB("STEP_1_IDENTITY", "Fetching Strategic Identity...");
        const { data: identityData } = await supabase.from(
          "strategic_identities",
        )
          .select("*").eq("project_id", projectId).maybeSingle();
        const identity = identityData as StrategicIdentity | null;

        await logToDB("STEP_2_PROJECT_DATA", "Fetching Project Data...");
        const { data: projectData } = await supabase.from("project_data")
          .select(
            "data_type, data",
          ).eq("project_id", projectId);

        const agencyDNA = (projectData?.find((d: ProjectDataRow) =>
          d.data_type === "agency_dna"
        )?.data as AgencyDNA) || {};
        const targetCriteria = (projectData?.find((d: ProjectDataRow) =>
          d.data_type === "target_criteria"
        )?.data as unknown as TargetCriteria) || {};
        const pastClientsList = agencyDNA.trackRecord?.pastClients || [];

        // DEDUPLICATION
        await logToDB(
          "STEP_3_DEDUP",
          "Fetching Existing URLs for Deduplication...",
        );
        const { data: existingRows } = await supabase.from("company_analyses")
          .select("company_url").eq("project_id", projectId);
        const existingUrls = new Set(
          existingRows?.map((r) =>
            normalizeUrlForDedup(r.company_url)
          ),
        );

        // SEARCH & COLLECT (AGENT-TO-AGENT MODE)
        // rawCandidates definition moved to top of function
        const BATCH_SIZE_SEARCH = 2; // Reduce parallelism for Agents (expensive)

        await logToDB(
          "STEP_4_PRE_LOOP",
          `Approved Queries: ${approved_queries.length} | Type: ${typeof approved_queries}`,
        );
        if (approved_queries.length > 0) {
          await logToDB(
            "STEP_4_QUERY_SAMPLE",
            `Sample: ${JSON.stringify(approved_queries[0]).substring(0, 50)}`,
          );
        }

        // SERIAL EXECUTION (SAFER & CLEANER)
        for (const missionBrief of approved_queries) {
          if (controller.signal.aborted) break;
          console.log(
            `[AGENT] Dispatching Mission: ${missionBrief.substring(0, 50)}...`,
          );

          try {
            // NEW: DYNAMIC VARIABLES
            const mission_instruction = missionBrief; // missionBrief is a full instruction from Strategizer
            const past_clients_list = pastClientsList.length > 0
              ? pastClientsList.map((c) =>
                `- ${c.name} (${c.description || "N/A"})`
              ).join("\n")
              : "Aucun historique disponible pour le moment.";

            const enhancedPrompt = `
[RÔLE]
Tu es le Moteur d'Intelligence Artificielle de Kortex, un expert en stratégie de croissance B2B.

[MISSION PRIORITAIRE]
${mission_instruction}

[MÉMOIRE & APPRENTISSAGE (DO NOT DUPLICATE)] Voici les clients existants ou déjà traités (NE PAS LES RESSORTIR, mais analyse leur profil pour trouver des "Lookalikes" similaires) : 
[ ${past_clients_list} ]

[INSTRUCTIONS DE RECHERCHE SUPPLÉMENTAIRES]

OBJECTIF GLOBAL : Trouve 10 nouvelles entreprises pertinentes.

ANALYSE : Pour chaque entreprise, demande-toi : "Est-ce un bon fit par rapport à la Mission ?".

FILTRAGE :
IGNORE les annuaires, les offres d'emploi, et les articles de presse (déjà géré par le kill switch).
IGNORE les entreprises déjà listées dans la section [MÉMOIRE].
Cherche le site web officiel de l'entreprise.

[CONTRAINTES DE LANGUE & FORMAT]
FORMAT DE SORTIE : JSON strict.
CLÉS JSON (TECHNIQUE) : Garde impérativement les clés en ANGLAIS pour le code ('company_name', 'url', 'activity', 'relevance_score', 'usage_examples').
VALEURS (CONTENU) : Tout le texte visible doit être en FRANÇAIS professionnel et vendeur.

[STRUCTURE JSON ATTENDUE] { "companies": [ { "company_name": "Nom Exact", "url": "https://site-officiel.com", "activity": "Description courte et percutante de leur métier.", "relevance_score": 85, // Note de 0 à 100 selon le fit avec la cible "context": "Pourquoi c'est une cible parfaite (ex: Croissance détectée, Technologie compatible...)", "usage_examples": "1. Idée concrète d'automatisation ou d'approche..." } ] } 
            `;

            await logToDB(
              `MISSION_START`,
              `Dispatching mission: ${missionBrief.substring(0, 100)}`,
            );

            const startResp = await fetch(
              "https://api.firecrawl.dev/v2/agent",
              {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${firecrawlKey}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  prompt: enhancedPrompt,
                  // schema: agentSchema, // REMOVED
                }),
                signal: controller.signal,
              },
            );

            if (!startResp.ok) {
              const err = await startResp.text();
              console.error(`[AGENT] Launch Failed: ${err}`);
              await logToDB(`FIRECRAWL_LAUNCH_FAIL`, `Error: ${err}`);
              continue;
            }

            const startData = await startResp.json();
            const jobId = startData.id;
            if (!jobId) {
              console.error("No Job ID returned from Firecrawl");
              continue;
            }

            console.log(
              `[AGENT] Job Started: ${jobId}. Polling for up to 1500s...`,
            );
            await logToDB(`FIRECRAWL_STARTED`, `Job ID: ${jobId}`);

            // B. ASYNC POLLING LOOP
            let pollAttempts = 0;
            const MAX_RETRIES = 120; // 120 * 5s = 600s (10 minutes)

            while (pollAttempts < MAX_RETRIES) {
              await new Promise((r) => setTimeout(r, 5000)); // 5s Patient Polling
              if (controller.signal.aborted) break;

              pollAttempts++;
              if (pollAttempts === 1) {
                await logToDB(
                  `POLL_START`,
                  `Starting polling loop for Job ${jobId}`,
                );
              }

              // HEARTBEAT (Visible Logs)
              console.log(
                `⏳ [Polling] L'Agent réfléchit depuis ${
                  pollAttempts * 5
                } secondes... (Tentative ${pollAttempts}/${MAX_RETRIES})`,
              );

              // HEARTBEAT (Every 4 attempts = 20s)
              if (pollAttempts % 4 === 0) {
                console.log(
                  `[AGENT] Heartbeat... (${pollAttempts}/${MAX_RETRIES})`,
                );
                await supabase.from("company_analyses").upsert({
                  project_id: projectId,
                  company_url: "http://system.heartbeat",
                  company_name: "SYSTEM_HEARTBEAT",
                  analysis_status: "processing",
                  match_explanation:
                    `Scanning... Attempt ${pollAttempts}/${MAX_RETRIES}`,
                  updated_at: new Date().toISOString(),
                }, { onConflict: "project_id, company_url" });
              }

              const pollController = new AbortController();
              const pollTimeout = setTimeout(
                () => pollController.abort(),
                10000,
              ); // 10s Timeout for poll request

              let checkResp;
              try {
                checkResp = await fetch(
                  `https://api.firecrawl.dev/v2/agent/${jobId}`,
                  {
                    headers: { "Authorization": `Bearer ${firecrawlKey}` },
                    signal: pollController.signal,
                  },
                );
              } catch (fetchErr) {
                clearTimeout(pollTimeout);
                console.warn(`[AGENT] Poll Network Error: ${fetchErr}`);
                await logToDB(`POLL_NET_ERROR`, String(fetchErr));
                continue;
              } finally {
                clearTimeout(pollTimeout);
              }

              if (!checkResp.ok) {
                console.warn(
                  `[AGENT] Poll failed (${checkResp.status}). Retrying...`,
                );
                // pollAttempts++;
                continue;
              }

              const statusData = await checkResp.json();
              const currentStatus = statusData.status;

              console.log(
                `[AGENT] Job ${jobId} Status: ${currentStatus} (Attempt ${
                  pollAttempts + 1
                }/${MAX_RETRIES})`,
              );

              if (currentStatus === "completed") {
                // 0. SAFETY NET: DUMP RAW DATA TO CATCH-ALL TABLE
                // This ensures we have the data even if parsing or valid insertion fails later.
                try {
                  await supabase.from("radar_catch_all").insert({
                    project_id: projectId,
                    raw_data: statusData,
                    error_log: "Raw Dump from Agent",
                  });
                  console.log(
                    "[SAFETY_NET] Raw data dumped to radar_catch_all",
                  );
                } catch (dumpErr) {
                  console.error(
                    "[SAFETY_NET] Failed to dump raw data:",
                    dumpErr,
                  );
                }

                // 0.1 IMMEDIATE RECOVERY (AUTO-INGEST via SQL)
                // We use the SQL function that we PROVED works.
                // This bypasses Edge Runtime complexity and potential RLS issues.
                try {
                  console.log("[RECOVERY] Triggering SQL Recovery Function...");
                  const { data: rpcData, error: rpcError } = await supabase
                    .rpc("recover_latest_radar_dump");

                  if (rpcError) {
                    console.error("[RECOVERY] RPC Failed:", rpcError);
                    await supabase.from("radar_catch_all").insert({
                      project_id: projectId,
                      error_log: `RPC_FAIL: ${JSON.stringify(rpcError)}`,
                    });
                  } else {
                    console.log(`[RECOVERY] RPC Success: ${rpcData}`);
                  }
                } catch (recErr) {
                  console.error("[RECOVERY] Logic Error:", recErr);
                }

                // 1. LOG RAW RESPONSE AS REQUESTED
                await logToDB(
                  `AGENT_COMPLETE_${jobId}`,
                  JSON.stringify(statusData, null, 2),
                );
                console.log(
                  `[AGENT] Job ${jobId} COMPLETED. RAW PAYLOAD DUMP:`,
                  JSON.stringify(statusData),
                );

                // DEBUG: Inspect structure
                if (statusData.data) {
                  console.log(
                    "[DEBUG] statusData.data Keys:",
                    Object.keys(statusData.data),
                  );
                  if (typeof statusData.data === "object") {
                    console.log(
                      "[DEBUG] statusData.data Sample:",
                      JSON.stringify(statusData.data).substring(0, 200),
                    );
                  }
                }

                let candidates: any[] = [];
                // SIMPLIFIED PARSING LOGIC (v2.2)

                // 1. Direct Array Check (Firecrawl often returns { data: [...] })
                if (statusData.data && Array.isArray(statusData.data)) {
                  console.log("✅ PARSING: Found 'data' array.");
                  candidates = statusData.data;
                } // 2. Prospects/Companies Keys (Legacy/Alternative)
                else if (
                  statusData.data && statusData.data.prospects &&
                  Array.isArray(statusData.data.prospects)
                ) {
                  candidates = statusData.data.prospects;
                } else if (
                  statusData.data && statusData.data.companies &&
                  Array.isArray(statusData.data.companies)
                ) {
                  candidates = statusData.data.companies;
                } // 3. Root Level Checks (Fallback)
                else if (
                  statusData.prospects && Array.isArray(statusData.prospects)
                ) {
                  candidates = statusData.prospects;
                } else if (
                  statusData.companies && Array.isArray(statusData.companies)
                ) {
                  candidates = statusData.companies;
                } // 4. Raw Array (Rare)
                else if (Array.isArray(statusData)) {
                  candidates = statusData;
                }

                // Set d for text fallback if needed
                const d = statusData.data || statusData;

                // Strategy B: Text Fallback (Markdown JSON)
                if (candidates.length === 0 && d) {
                  let text = "";
                  // 1. Cas simple : Propriété directe
                  if (d.markdown) text = d.markdown;
                  else if (d.text) text = d.text;
                  // 2. Cas "Tableau" (Souvent Firecrawl renvoie data: [{ markdown: ... }])
                  else if (Array.isArray(d) && d[0]?.markdown) {
                    text = d.map((i: any) => i.markdown).join("\n\n");
                  } // 3. Cas "Imbriqué"
                  else if (d.data?.markdown) text = d.data.markdown;
                  // 4. Fallback ultime : Stringify
                  else text = typeof d === "string" ? d : JSON.stringify(d);

                  // 🧹 CLEANING UTILS (CRITICAL FIX)
                  const cleanText = text.replace(/```json/g, "").replace(
                    /```/g,
                    "",
                  ).trim();

                  // DEBUG: Log Raw Output before parsing
                  console.log(
                    "RAW FIRECRAWL OUTPUT (Cleaned):",
                    cleanText.substring(0, 500) + "...",
                  );

                  try {
                    const parsed = JSON.parse(cleanText);

                    // 1. Check for { companies: [...] } (New Prompt Structure)
                    if (parsed.companies && Array.isArray(parsed.companies)) {
                      console.log(
                        `[PARSER] Found 'companies' key with ${parsed.companies.length} items.`,
                      );
                      candidates = parsed.companies;
                    } // 2. Check for direct array
                    else if (Array.isArray(parsed)) {
                      console.log(
                        `[PARSER] Found direct array with ${parsed.length} items.`,
                      );
                      candidates = parsed;
                    } // 3. Check for 'candidates' or 'prospects'
                    else if (
                      parsed.candidates && Array.isArray(parsed.candidates)
                    ) {
                      candidates = parsed.candidates;
                    } else if (
                      parsed.prospects && Array.isArray(parsed.prospects)
                    ) {
                      candidates = parsed.prospects;
                    }
                  } catch (e) {
                    console.warn(
                      "[PARSER] JSON Parse failed on direct text. Falling back to Gemini Extraction.",
                      e,
                    );
                  }

                  if (candidates.length > 0) {
                    console.log(
                      `[PARSER] SUCCESSFULLY EXTRACTED ${candidates.length} CANDIDATES FROM TEXT.`,
                    );
                    // Map to rawCandidates immediately to avoid breaking the flow
                    for (const c of candidates) {
                      // RELAXED MAPPING DUPLICATED HERE FOR SAFETY
                      let finalUrl = c.url || c.website || c.URL ||
                        "http://unknown.com";
                      const finalName = c.company_name || c.name ||
                        c["Company Name"] || "Unknown";
                      if (
                        finalUrl !== "http://unknown.com" &&
                        !finalUrl.startsWith("http")
                      ) finalUrl = `https://${finalUrl}`;

                      const normalizedUrl = normalizeUrlForDedup(finalUrl);
                      if (!existingUrls.has(normalizedUrl)) {
                        rawCandidates.push({
                          url: finalUrl,
                          source_query: missionBrief,
                          company_name: finalName,
                          logo_url: "",
                          status: "analyzed",
                          is_agent_verified: true,
                          match_reason: c.match_reason ||
                            c.reason_for_matching || c.context ||
                            "Identified by Agent",
                          activity: c.activity || c.description,
                        });
                        existingUrls.add(normalizedUrl);
                        console.log(`[DEDUP] Added New Candidate: ${finalUrl}`);
                      } else {
                        console.log(`[DEDUP] Skipped Duplicate: ${finalUrl}`);
                      }
                    }
                    break; // Mission Saved via Direct Parse
                  }

                  // NEW: BRAIN DRAIN STRATEGY (GEMINI EXTRACTION) if clean parse failed
                  console.log(
                    "[AGENT] Structured Parse Failed. Activating BRAIN DRAIN (Gemini Extraction)...",
                  );
                  const extracted = await extractCandidatesFromRawOutput(
                    text,
                    gemini,
                    missionBrief,
                  );

                  if (extracted.length > 0) {
                    console.log(
                      `[AGENT] BRAIN DRAIN SUCCESS. Recovered ${extracted.length} candidates.`,
                    );
                    rawCandidates.push(...extracted);
                    // Add to existingUrls to prevent dupes in same batch
                    extracted.forEach((c) => {
                      const nUrl = normalizeUrlForDedup(c.url);
                      if (!existingUrls.has(nUrl)) {
                        existingUrls.add(nUrl);
                      }
                    });
                    break; // Mission Saved
                  }
                }

                if (candidates.length === 0) {
                  await logToDB(
                    `PARSE_FAIL_${jobId}`,
                    "No candidates found after parsing strategies A, B and Brain Drain.",
                  );
                  console.error(
                    "[AGENT] CRITICAL: NO CANDIDATES FOUND even after Brain Drain.",
                  );
                  break;
                }

                console.log(
                  `[AGENT] PARSING SUCCESS. Extracted ${candidates.length} candidates.`,
                );

                for (const c of candidates) {
                  // RELAXED MAPPING: Accept whatever the Agent gives us
                  // Handle Capitalized Keys from Agent (e.g. "URL", "Company Name")
                  let finalUrl = c.url || c.website || c.URL ||
                    "http://unknown.com";
                  const finalName = c.company_name || c.name ||
                    c["Company Name"] ||
                    "Unknown Company";

                  // Fix obvious URL issues without being draconian
                  if (
                    finalUrl !== "http://unknown.com" &&
                    !finalUrl.startsWith("http")
                  ) {
                    finalUrl = `https://${finalUrl}`;
                  }

                  const normalizedUrl = normalizeUrlForDedup(finalUrl);
                  if (existingUrls.has(normalizedUrl)) {
                    console.log(`[DEDUP] Skipped Duplicate: ${finalUrl}`);
                    continue;
                  }

                  rawCandidates.push({
                    url: finalUrl,
                    source_query: missionBrief,
                    company_name: finalName,
                    logo_url: "",
                    status: "analyzed", // DIRECTLY MARK AS ANALYZED (TRUST THE AGENT)
                    is_agent_verified: true,
                    // Store extra metadata from Agent if available
                    match_reason: c.match_reason || c.reason_for_matching ||
                      c.context || "Identified by Agent",
                    activity: c.activity || c.description,
                  });
                  existingUrls.add(normalizedUrl);
                  console.log(`[DEDUP] Added New Candidate: ${finalUrl}`);
                }
                break; // Mission Complete
              }

              if (statusData.status === "failed") {
                console.error(
                  `[AGENT] Job ${jobId} FAILED: ${statusData.error}`,
                );
                break;
              }
              pollAttempts++;
            } // End While Loop
          } catch (e) {
            console.error("Process error in loop", e);
            await logToDB("LOOP_CRASH", String(e));
          }
        }

        console.log(
          `[BACKGROUND] Found ${rawCandidates.length} candidates.`,
        );

        // DIRECT INSERTION (SKIP SECONDARY VALIDATION)
        // The user trusts the Agent's filtering. We insert directly.

        if (rawCandidates.length > 0) {
          const batchResults = rawCandidates.map((c) => ({
            project_id: projectId,
            user_id: userId,
            company_name: c.company_name,
            company_url: c.url,
            logo_url: c.logo_url,
            match_score: 95, // FORCE HIGH SCORE to ensure visibility
            match_explanation: `[AGENT VERIFIED] ${c.match_reason}`,
            strategic_category: "PERFECT_MATCH", // Trust the matrix fit
            analysis_status: "analyzed", // Ready for display
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            sales_thesis: `Agent Context: ${c.match_reason}\nActivity: ${
              c.activity || "N/A"
            }`,
            trigger_events: [],
            detected_pain_points: [],
            strategic_analysis:
              `Identified via Agent Deep Research. Activity: ${
                c.activity || "N/A"
              }`,
            location: "Unknown",
            custom_hook: JSON.stringify({
              source: "agent_v2_direct",
              original_activity: c.activity,
            }),
          }));

          console.log(
            `[BACKGROUND] Performing DIRECT BATCH UPSERT of ${batchResults.length} records...`,
          );
          const { error: batchErr } = await supabase.from("company_analyses")
            .upsert(
              batchResults,
              { onConflict: "project_id, company_url" },
            );

          if (batchErr) {
            console.error("[BACKGROUND] Upsert error:", batchErr);
            await logToDB("UPSERT_FAIL", JSON.stringify(batchErr));
          }
          if (batchErr) {
            console.error("[BACKGROUND] Batch Upsert Failed:", batchErr);
            await logToDB("UPSERT_FAIL", JSON.stringify(batchErr));
          } else {
            console.log("[BACKGROUND] Batch Upsert SUCCESS.");
            await logToDB(
              "UPSERT_SUCCESS",
              `Inserted ${batchResults.length} records.`,
            );
          }
        } else {
          await logToDB(
            "NO_CANDIDATES_TO_INSERT",
            "rawCandidates array was empty.",
          );
        }

        console.log("[BACKGROUND] Batch Process Done via FAST TRACK");
      } catch (err) {
        // CATCH-ALL LOGGER
        const errMsg = err instanceof Error ? err.message : String(err);
        const errStack = err instanceof Error ? err.stack : "";
        await logToDB("CRITICAL_CRASH", `${errMsg}\n${errStack}`);
        console.error("[BACKGROUND] CRITICAL ERROR:", err);
      } finally {
        clearTimeout(timeoutId);
      }
    };

    // ========================================================================
    // IMMEDIATE RESPONSE & LAUNCH
    // ========================================================================

    // Launch background task
    EdgeRuntime.waitUntil(backgroundTask());

    // Return immediate success
    return new Response(
      JSON.stringify({
        success: true,
        message: "Scan started in background",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
