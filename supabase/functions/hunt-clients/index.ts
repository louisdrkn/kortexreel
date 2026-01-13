

import { API_KEYS, GeminiClient, GEMINI_MODELS } from "../_shared/api-clients.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FIRECRAWL_API_URL = "https://api.firecrawl.dev/v1";

// Helper: Extract clients from text/logos using Gemini
async function extractClientsWithGemini(gemini: GeminiClient, content: string, logos: string[]) {
  const prompt = `You are a B2B Data Expert.
    Extract client names from website content and detected logos.
    
    CONTENT: ${content.slice(0, 20000)}
    LOGOS DETECTED: ${logos.join(', ')}
    
    OUTPUT JSON ONLY:
    {
      "pastClients": [{"name": "Client Name", "description": "What they did (if found)"}],
      "dreamClients": ["Big Company 1", "Big Company 2"]
    }`;

  try {
    return await gemini.generateJSON(prompt, GEMINI_MODELS.ULTRA);
  } catch (e) {
    console.error("Gemini Extract Error", e);
    return { pastClients: logos.map(l => ({ name: l, description: "Logo detected" })), dreamClients: [] };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { websiteUrl } = await req.json();
    if (!websiteUrl) throw new Error("Missing URL");

    const firecrawlKey = API_KEYS.FIRECRAWL;
    const gemini = new GeminiClient(API_KEYS.GEMINI);

    // 1. Scrape Homepage & 'References' pages (Simplified Logic)
    // For speed/stability, we'll start with a Map or Search for reference pages
    const mapResp = await fetch(`${FIRECRAWL_API_URL}/map`, {
      method: "POST", headers: { "Authorization": `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url: websiteUrl, limit: 50 }) // fast map
    });
    const mapData = await mapResp.json();
    const links = mapData.links || [];

    const refKeywords = ["client", "reference", "portfolio", "case-study", "projet"];
    const refPages = links.filter((l: string) => refKeywords.some(k => l.includes(k))).slice(0, 3);
    if (!refPages.includes(websiteUrl)) refPages.push(websiteUrl);

    let fullContent = "";
    let allLogos: string[] = [];

    for (const p of refPages) {
      const scr = await fetch(`${FIRECRAWL_API_URL}/scrape`, {
        method: "POST", headers: { "Authorization": `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ url: p, formats: ["markdown", "rawHtml"] })
      });
      const d = await scr.json();
      fullContent += `\nSOURCE: ${p}\n` + (d.data?.markdown || "");

      // Extract logos from HTML (Regex)
      const html = d.data?.rawHtml || "";
      const matches = [...html.matchAll(/alt=["']([^"']+)["']/g)];
      allLogos.push(...matches.map(m => m[1]).filter(t => t.length < 30 && !t.includes("icon")));
    }

    const result = await extractClientsWithGemini(gemini, fullContent, [...new Set(allLogos)]);

    return new Response(JSON.stringify({ success: true, data: result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});