import {
  API_KEYS,
  GEMINI_MODELS,
  GeminiClient,
} from "../_shared/api-clients.ts";
import { serveFunction } from "../_shared/server-utils.ts";

const systemPrompt = `You are Kortex, Elite Sales Intelligence.
Analyze this prospect to find collaboration opportunities.
Cross reference prospect pains with agency value prop.

OUTPUT JSON ONLY:
{
  "intelligence": {
    "companyOverview": "Brief overview",
    "painPoints": ["Pain 1", "Pain 2"],
    "opportunities": ["Opp 1", "Opp 2"],
    "matchScore": 85,
    "matchReasons": ["Reason 1"]
  }
}`;

serveFunction(async (req) => {
  const { account, websiteContent, agency_dna } = await req.json();
  console.log("🚀 Kortex Brain: Analyzing prospect (Gemini 3.0 Pro)");

  const gemini = new GeminiClient(API_KEYS.GEMINI);

  const userPrompt = `
    PROSPECT: ${account.name} (${account.industry})
    WEB CONTENT: ${websiteContent?.slice(0, 10000)}
    AGENCY PITCH: ${agency_dna?.pitch}
    
    Analyze.`;

  let parsed;
  try {
    parsed = await gemini.generateJSON(
      userPrompt,
      GEMINI_MODELS.ULTRA,
      systemPrompt,
    );
  } catch (e) {
    console.error("Gemini Error", e);
    parsed = {
      intelligence: { companyOverview: "Analysis failed", matchScore: 0 },
    };
  }

  return new Response(JSON.stringify(parsed), {
    headers: { "Content-Type": "application/json" },
  });
});
