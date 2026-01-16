import { repairJson } from "./json-repair.ts";
import { GeminiGenerationConfig } from "./types.ts";

export const API_KEYS = {
  get FIRECRAWL() {
    const key = Deno.env.get("FIRECRAWL_API_KEY") || Deno.env.get("FIRECRAWL");
    if (!key) throw new Error("Missing FIRECRAWL_API_KEY");
    return key;
  },
  get GEMINI() {
    // STRICT: Only use GEMINI_API_KEY
    const key = Deno.env.get("GEMINI_API_KEY");
    if (!key) throw new Error("Missing GEMINI_API_KEY");
    return key;
  },
  get GOOGLE_SEARCH() {
    const key = Deno.env.get("GOOGLE_SEARCH_API_KEY") ||
      Deno.env.get("GOOGLE_SEARCH");
    // Search is optional for Radar V2
    if (!key) {
      console.warn("Missing GOOGLE_SEARCH_API_KEY - Search features may fail");
    }
    return key || "";
  },
  get UNIPILE() {
    const key = Deno.env.get("UNIPILE_API_KEY") || Deno.env.get("UNIPILE");
    // Unipile might be optional depending on usage, but strictly following rule:
    if (!key) {
      console.warn("Missing UNIPILE_API_KEY - LinkedIn features may fail");
    }
    return key || "";
  },
};

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

export const GEMINI_MODELS = {
  PRO: "gemini-2.5-pro", // Stable High IQ
  FLASH: "gemini-2.5-pro", // Fast & Cost Effective (Forced to 2.5 Pro)
  ULTRA: "gemini-2.5-pro", // Using Pro for "Ultra" tier to ensure stability & high reasoning
};

// ============================================================================
// LE TRIBUNAL IMPÉNÉTRABLE - BANNED LEXICON
// ============================================================================
const BANNED_WORDS = [
  "leads",
  "prospects",
  "pipeline",
  "funnel",
  "tunnel de vente",
  "saas",
  "b2b",
  "b2c",
  "outbound",
  "inbound",
  "growth hacking",
  "boost sales",
  "improve roi",
  "digital transformation",
  "nouveaux contacts",
  "opportunités commerciales",
];

/**
 * LE TRIBUNAL - Validation de la fidélité sémantique
 * Rejette toute réponse contenant du jargon marketing générique
 */
function validateTribunalCompliance(text: string): {
  isValid: boolean;
  score: number;
  violations: string[];
} {
  const lowerText = text.toLowerCase();
  const violations: string[] = [];

  // Scan for banned words
  for (const word of BANNED_WORDS) {
    if (lowerText.includes(word)) {
      violations.push(word);
    }
  }

  // Calculate correlation score (100 = perfect, 0 = polluted)
  const violationPenalty = violations.length * 15; // Each violation = -15 points
  const score = Math.max(0, 100 - violationPenalty);

  // Tribunal threshold: score must be > 65
  const isValid = score > 65;

  return { isValid, score, violations };
}

export class GeminiClient {
  private apiKey: string;
  private baseUrl = "https://generativelanguage.googleapis.com/v1beta/models";

  constructor(apiKey?: string) {
    this.apiKey = apiKey || API_KEYS.GEMINI;
  }

  async generateContent(
    prompt: string,
    model: string = GEMINI_MODELS.FLASH,
    systemInstruction?: string,
    generationConfig?: GeminiGenerationConfig,
  ): Promise<string> {
    const url = `${this.baseUrl}/${model}:generateContent?key=${this.apiKey}`;

    const payload: {
      contents: { parts: { text: string }[] }[];
      generationConfig: GeminiGenerationConfig;
      systemInstruction?: { parts: { text: string }[] };
    } = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        ...generationConfig,
      },
    };

    if (systemInstruction) {
      payload.systemInstruction = { parts: [{ text: systemInstruction }] };
    }

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API Error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        throw new Error("No content generated");
      }

      return text;
    } catch (error) {
      console.error("Gemini Request Failed:", error);
      throw error;
    }
  }

  async generateJSON<T = Record<string, unknown>>(
    prompt: string,
    model: string = GEMINI_MODELS.PRO,
    systemInstruction?: string,
    tools?: unknown[],
    generationConfig?: GeminiGenerationConfig,
  ): Promise<T> {
    const url = `${this.baseUrl}/${model}:generateContent?key=${this.apiKey}`;

    const payload: {
      contents: { parts: { text: string }[] }[];
      generationConfig: GeminiGenerationConfig;
      systemInstruction?: { parts: { text: string }[] };
      tools?: unknown[];
    } = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2, // Default low temp for JSON
        responseMimeType: "application/json",
        ...generationConfig,
      },
    };

    if (systemInstruction) {
      payload.systemInstruction = { parts: [{ text: systemInstruction }] };
    }

    if (tools) {
      payload.tools = tools;
    }

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Gemini JSON API Error (${response.status}): ${errorText}`,
        );
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) throw new Error("No content generated");

      // ============================================================================
      // LE TRIBUNAL - VALIDATION DE SORTIE
      // ============================================================================
      const tribunalResult = validateTribunalCompliance(text);

      if (!tribunalResult.isValid) {
        console.error(
          `[TRIBUNAL REJECTION] ⚖️ Response polluted by marketing jargon!`,
        );
        console.error(
          `[TRIBUNAL] Score: ${tribunalResult.score}/100 (threshold: 65)`,
        );
        console.error(
          `[TRIBUNAL] Violations detected: ${
            tribunalResult.violations.join(", ")
          }`,
        );
        console.error(
          `[TRIBUNAL] Raw response preview: ${text.substring(0, 500)}...`,
        );

        throw new Error(
          `TRIBUNAL REJECTION: Response contains banned words (${
            tribunalResult.violations.join(", ")
          }). Score: ${tribunalResult.score}/100. The AI must use proprietary lexicon from documents only.`,
        );
      }

      // Log successful validation
      console.log(
        `[TRIBUNAL APPROVED] ✅ Response validated. Score: ${tribunalResult.score}/100`,
      );

      // NEW: Use repairJson for robust parsing
      const parsed = repairJson<T>(text);
      if (!parsed) {
        throw new Error("Failed to parse Gemini response as JSON");
      }
      return parsed;
    } catch (error) {
      console.error("Gemini JSON Request Failed:", error);
      throw error;
    }
  }

  async embedContent(
    text: string,
    model: string = "text-embedding-004",
  ): Promise<number[]> {
    const url = `${this.baseUrl}/${model}:embedContent?key=${this.apiKey}`;

    // Cleaning text slightly to avoid potential issues (optional but good practice)
    const cleanText = text.replace(/\x00/g, "").trim();

    const payload = {
      content: { parts: [{ text: cleanText }] },
    };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Gemini Embedding Error (${response.status}): ${errorText}`,
        );
      }

      const data = await response.json();
      const embedding = data.embedding?.values;

      if (!embedding) {
        throw new Error("No embedding generated");
      }

      return embedding;
    } catch (error) {
      console.error("Gemini Embedding Request Failed:", error);
      throw error;
    }
  }
}
