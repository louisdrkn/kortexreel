import { repairJson } from "./json-repair.ts";

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
  PRO: "gemini-1.5-pro", // Stable High IQ - Version alias toujours à jour
  FLASH: "gemini-1.5-pro", // FORCED STABILITY: Use Pro everywhere to avoid 404s
  ULTRA: "gemini-1.5-pro", // Fallback to Pro for stability
};

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
    generationConfig?: {
      temperature?: number;
      topP?: number;
      topK?: number;
      maxOutputTokens?: number;
      stopSequences?: string[];
    },
  ): Promise<string> {
    const url = `${this.baseUrl}/${model}:generateContent?key=${this.apiKey}`;

    const payload: {
      contents: { parts: { text: string }[] }[];
      generationConfig: any;
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

  async generateJSON<T = any>(
    prompt: string,
    model: string = GEMINI_MODELS.PRO,
    systemInstruction?: string,
    tools?: any[],
    generationConfig?: {
      temperature?: number;
      topP?: number;
      topK?: number;
      maxOutputTokens?: number;
      responseMimeType?: string;
    },
  ): Promise<T> {
    const url = `${this.baseUrl}/${model}:generateContent?key=${this.apiKey}`;

    const payload: {
      contents: { parts: { text: string }[] }[];
      generationConfig: any;
      systemInstruction?: { parts: { text: string }[] };
      tools?: any[];
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
}
