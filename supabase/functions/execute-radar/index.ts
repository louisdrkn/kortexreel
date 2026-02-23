// ============================================================================
// IMPORTS STANDARDS (ALIGNED WITH STRATEGIZE-RADAR)
// ============================================================================

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

interface RawCandidate {
  url?: string;
  website?: string;
  name?: string;
  company_name?: string;
  description?: string;
  activity?: string;
  reason_for_selection?: string;
  match_reason?: string;
  context?: string;
  relevance_reason?: string; // New field
  logo_url?: string; // New field
  status?: "new" | "analyzed" | "pending" | "failed"; // New field
}

interface Candidate {
  url: string;
  source_query: string;
  company_name: string;
  logo_url: string;
  status: "new" | "pending" | "analyzed" | "failed";
  match_reason?: string; // NEW: Agent Context
  activity?: string; // NEW: Agent Context
  is_agent_verified?: boolean; // NEW: VIP Flag
  relevance_reason?: string; // Raw Firecrawl Field
  reason_for_selection?: string; // Raw Firecrawl Field
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

    const backgroundTask = async () => {
      let userId: string | undefined;
      let scanId: string | undefined;
      const allScanCandidates: Candidate[] = []; // Moved to top-level scope to fix visibility issues

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

        // ====================================================================
        // 1.5 STATUS SYNC INITIALIZATION (The "Magic Slate")
        // ====================================================================

        try {
          const { data: scanData, error: scanErr } = await supabase
            .from("radar_scans")
            .insert({
              project_id: projectId,
              status: "processing",
              stage: "starting",
              progress: 0,
              meta: { approved_queries },
            })
            .select("id")
            .single();

          if (scanData) {
            scanId = scanData.id;
            console.log(`[SYNC] Scan Record Created: ${scanId}`);

            // 🧹 PURGE STALE DATA: Delete old radar_catch_all entries for this project
            // so the frontend always sees only results from the current scan.
            const { error: purgeErr } = await supabase
              .from("radar_catch_all")
              .delete()
              .eq("project_id", projectId);
            if (purgeErr) {
              console.warn(
                "[SYNC] Could not purge old radar_catch_all data:",
                purgeErr.message,
              );
            } else {
              console.log(
                "[SYNC] 🧹 Old radar_catch_all data purged for project.",
              );
            }
          }
          if (scanErr) {
            console.error("[SYNC] Failed to create scan record:", scanErr);
          }
        } catch (e) {
          console.error("[SYNC] Error creating scan record:", e);
        }

        const updateScanStatus = async (
          stage: string,
          progress?: number,
          metaUpdates?: any,
        ) => {
          if (!scanId) return;
          try {
            const updatePayload: any = {
              stage,
              updated_at: new Date().toISOString(),
            };
            if (progress !== undefined) updatePayload.progress = progress;
            if (metaUpdates) {
              if (metaUpdates.firecrawl_job_id) {
                updatePayload.firecrawl_job_id = metaUpdates.firecrawl_job_id;
              }
            }
            await supabase.from("radar_scans").update(updatePayload).eq(
              "id",
              scanId,
            );
          } catch (e) {
            console.warn("[SYNC] Update failed:", e);
          }
        };

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

        await logToDB(
          "STEP_3_DEDUP",
          "Fetching Existing URLs for Deduplication...",
        );
        // DEDUPLICATION DISABLED BY USER REQUEST
        // const { data: existingRows } = await supabase.from("company_analyses")
        //   .select("company_url").eq("project_id", projectId);
        // const existingUrls = new Set(
        //   existingRows?.map((r) =>
        //     normalizeUrlForDedup(r.company_url)
        //   ),
        // );

        // SEARCH & COLLECT (AGENT-TO-AGENT MODE)
        // allScanCandidates definition moved to top of function
        const _BATCH_SIZE_SEARCH = 2; // Reduce parallelism for Agents (expensive)

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
        await updateScanStatus("searching", 5);
        for (const missionBrief of approved_queries) {
          if (controller.signal.aborted) {
            break;
          }
          console.log(
            `[AGENT] Dispatching Mission: ${missionBrief.substring(0, 50)}...`,
          );

          try {
            // NEW: DYNAMIC VARIABLES FOR UNIVERSAL PROMPT (STRICT MODE)
            // const target_quantity = "20"; // REMOVED (Implicit in Agent V2)
            const target_location = targetCriteria.geography?.join(", ") ||
              "Global";
            // const target_size = ... // REMOVED (Agent V2 handles this)
            const target_industry = targetCriteria.industries?.join(", ") ||
              "B2B Generaliste";

            const project_solution_description = agencyDNA.pitch ||
              "Solutions B2B pour la croissance.";

            // PRIORITY: Use Identity Pain Point if available, else fall back to Mission Brief
            const target_pain_point = identity?.core_pain_points?.[0] ||
              missionBrief || "Inefficacité opérationnelle";

            // OPTIMIZED VARIABLES
            const project_name = agencyDNA.companyName || "Notre Agence";
            const past_clients = agencyDNA.trackRecord?.pastClients?.map((c) =>
              c.name
            ).join(
              ", ",
            ) || "Aucun client de référence fourni";

            // ENFORCED NAMING CONVENTION FOR DASHBOARD VISIBILITY
            const job_title =
              `[${project_name.toUpperCase()}] - [${target_industry}] - [${target_location}]`;

            const enhancedPrompt = `
${job_title}

[IDENTITÉ]
Tu agis pour le compte de l'agence "${project_name}".
Notre métier : "${project_solution_description}".
[TA MISSION] Trouve des entreprises similaires à nos clients existants : [${past_clients}].

[PROFIL CIBLE]

Zone : ${target_location}

Secteur : ${target_industry}

Le Signe à détecter : "${target_pain_point}" (Cherche ce problème spécifique).

[FORMAT JSON STRICT] { "companies": [ { "company_name": "Nom", "url": "https://...", "relevance_reason": "Pourquoi cette entreprise ressemble à nos clients passés ou a le problème cité ?" } ] }
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
              `[AGENT] ✅ Job Launched: ${jobId}. Polling mode active.`,
            );
            await logToDB(
              `FIRECRAWL_STARTED`,
              `Job ID: ${jobId} | Mode: polling`,
            );

            // CRITICAL: Persist jobId to DB immediately so check-firecrawl can
            // pick it up even if this Edge Function gets killed by Supabase timeout.
            if (scanId) {
              await supabase.from("radar_scans").update({
                firecrawl_job_id: jobId,
                stage: "searching",
                progress: 10,
                updated_at: new Date().toISOString(),
              }).eq("id", scanId);
            } else {
              // No scanId (insert failed earlier) — upsert a fresh row
              const { data: newScan } = await supabase.from("radar_scans")
                .upsert({
                  project_id: projectId,
                  firecrawl_job_id: jobId,
                  status: "processing",
                  stage: "searching",
                  progress: 10,
                  meta: { mission: missionBrief.substring(0, 100) },
                }, { onConflict: "project_id", ignoreDuplicates: false })
                .select("id")
                .maybeSingle();
              if (newScan?.id) {
                scanId = newScan.id;
              }
            }
            console.log(
              `[SYNC] firecrawl_job_id ${jobId} stored in radar_scans.`,
            );

            // ✅ POLLING MODE: Poll Firecrawl every 15s until completed, then insert data directly.
            // NOTE: Firecrawl v2 /agent does NOT support webhookUrl — polling is the only option.
            const POLL_INTERVAL_MS = 15000;
            const POLL_MAX_MS = 10 * 60 * 1000; // 10 min max
            const pollStart = Date.now();
            let pollCount = 0;
            let jobDone = false;

            while (!jobDone && Date.now() - pollStart < POLL_MAX_MS) {
              if (controller.signal.aborted) {
                break;
              }

              await new Promise((r) =>
                setTimeout(r, POLL_INTERVAL_MS)
              );
              pollCount++;

              // Update UX progress bar
              const prog = Math.min(10 + pollCount * 4, 85);
              await updateScanStatus("searching", prog);

              try {
                const statusResp = await fetch(
                  `https://api.firecrawl.dev/v2/agent/${jobId}`,
                  {
                    headers: {
                      "Authorization": `Bearer ${firecrawlKey}`,
                    },
                    signal: controller.signal,
                  },
                );
                if (!statusResp.ok) {
                  console.warn(
                    `[POLL] Non-OK status from Firecrawl for job ${jobId}: ${statusResp.status}`,
                  );
                  continue;
                }

                const statusData = await statusResp.json();
                console.log(
                  `[POLL] Job ${jobId} status: ${statusData.status} (t+${
                    pollCount * 15
                  }s)`,
                );

                if (statusData.status === "completed") {
                  jobDone = true;
                  await logToDB(
                    "FIRECRAWL_DONE",
                    `Job ${jobId} completed after ${pollCount * 15}s`,
                  );

                  // ── Parse the raw output ──────────────────────────────────
                  const rawOutput = statusData.data;
                  let jsonStr = typeof rawOutput === "object"
                    ? JSON.stringify(rawOutput)
                    : String(rawOutput || "");
                  jsonStr = jsonStr
                    .replace(/```json\s*/gi, "")
                    .replace(/```\s*/g, "")
                    .trim();

                  let candidates: {
                    company_name?: string;
                    name?: string;
                    url?: string;
                    website?: string;
                    website_url?: string;
                    activity?: string;
                    industry?: string;
                    sector?: string;
                    relevance_reason?: string;
                    reason_for_selection?: string;
                    [key: string]: unknown;
                  }[] = [];

                  try {
                    let parsed: unknown = null;
                    try {
                      parsed = JSON.parse(jsonStr);
                    } catch {
                      const arr = jsonStr.match(/\[[\s\S]*\]/);
                      if (arr) {
                        parsed = JSON.parse(arr[0]);
                      } else {
                        const obj = jsonStr.match(/\{[\s\S]*\}/);
                        if (obj) parsed = JSON.parse(obj[0]);
                      }
                    }

                    if (parsed !== null && typeof parsed === "object") {
                      const p = parsed as Record<string, unknown>;
                      if (p.companies && Array.isArray(p.companies)) {
                        candidates = p.companies;
                      } else if (p.data && Array.isArray(p.data)) {
                        candidates = p.data;
                      } else if (Array.isArray(parsed)) {
                        candidates = parsed;
                      }
                    }
                  } catch (pe) {
                    await logToDB("PARSE_ERROR", String(pe));
                  }

                  console.log(
                    `[POLL] Parsed ${candidates.length} candidates from job ${jobId}`,
                  );

                  // ── Insert into radar_catch_all ───────────────────────────
                  let inserted = 0;
                  for (const c of candidates) {
                    const companyName = c.company_name || c.name || "";
                    let websiteUrl = c.url || c.website || c.website_url || "";
                    if (!websiteUrl) continue;
                    if (!String(websiteUrl).startsWith("http")) {
                      websiteUrl = `https://${websiteUrl}`;
                    }

                    const { error: upsertErr } = await supabase
                      .from("radar_catch_all")
                      .upsert({
                        project_id: projectId,
                        company_name: companyName || websiteUrl,
                        website_url: websiteUrl,
                        activity_sector: c.activity || c.industry ||
                          c.sector || null,
                        pain_point_context: c.relevance_reason ||
                          c.reason_for_selection || null,
                        status: "new",
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        raw_data: {
                          source: "firecrawl_poll_v2",
                          query: missionBrief,
                          raw: c,
                        },
                      }, {
                        onConflict: "project_id,website_url",
                        ignoreDuplicates: false,
                      });

                    if (!upsertErr) {
                      inserted++;
                      console.log(`[POLL] ✅ Inserted: ${companyName}`);
                    } else {
                      console.error(
                        `[POLL] ❌ Upsert error (${companyName}):`,
                        upsertErr.message,
                      );
                    }
                  }

                  await logToDB(
                    "INSERT_DONE",
                    `Inserted ${inserted}/${candidates.length} companies into radar_catch_all`,
                  );
                  allScanCandidates.push(...candidates.map((c) => ({
                    url: String(c.url || c.website || c.website_url || ""),
                    source_query: missionBrief,
                    company_name: String(c.company_name || c.name || ""),
                    logo_url: "",
                    status: "new" as const,
                    relevance_reason: c.relevance_reason as string | undefined,
                    reason_for_selection: c.reason_for_selection as
                      | string
                      | undefined,
                  })));
                } else if (statusData.status === "failed") {
                  jobDone = true;
                  await logToDB(
                    "FIRECRAWL_FAILED",
                    `Job ${jobId} failed: ${statusData.error || "Unknown"}`,
                  );
                }
              } catch (pollErr) {
                if ((pollErr as Error)?.name === "AbortError") break;
                console.error(
                  `[POLL] Error polling job ${jobId}:`,
                  pollErr,
                );
              }
            }

            if (!jobDone) {
              await logToDB(
                "POLL_TIMEOUT",
                `Job ${jobId} did not complete within ${
                  POLL_MAX_MS / 60000
                } min`,
              );
            }

            console.log(`[AGENT] ⏱️ Polling complete for job ${jobId}.`);
          } catch (e) {
            console.error(`[AGENT] Mission Error:`, e);
          }
        } // End of approved_queries loop

        // 3. LA FERMETURE OBLIGATOIRE (Le "Kill Switch")
        console.log("🏁 FIN DU PROCESSUS : Arrêt du spinner.");
        await supabase
          .from("radar_scans") // CHANGED from project_scans to radar_scans
          .update({
            status: "completed",
            progress: 100,
            updated_at: new Date().toISOString(),
            meta: {
              total_candidates: allScanCandidates.length,
              message: "Scan completed via Ultra-Robust Block",
            },
          })
          .eq("id", scanId);
      } catch (globalError) {
        console.error("🔥 CRASH CRITIQUE DU SCAN :", globalError);
        await supabase.from("radar_scans").update({
          status: "failed",
          meta: { error: String(globalError) },
        }).eq("id", scanId);
      } finally {
        // Double security
        // console.log("Final cleanup (if needed)");
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
