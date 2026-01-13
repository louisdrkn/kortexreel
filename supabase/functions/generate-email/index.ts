import {
  API_KEYS,
  GEMINI_MODELS,
  GeminiClient,
} from "../_shared/api-clients.ts";
import { serveFunction } from "../_shared/server-utils.ts";

const systemPrompt = `You are Kortex, an Expert B2B Copywriter.
Write high-impact, professional emails.

GUIDELINES:
1. CONCISE & IMPACTFUL
2. Strong Hook
3. Clear CTA
4. Adapt tone to request

OUTPUT JSON ONLY:
{
  "subjects": ["Subject 1", "Subject 2", "Subject 3"],
  "body": "Full email body with greeting and signature"
}`;

serveFunction(async (req) => {
  const { emailType, context, tone, agencyContext } = await req.json();
  console.log("🚀 Kortex Brain: Generating email (Gemini 3.0 Pro)");

  const gemini = new GeminiClient(API_KEYS.GEMINI);

  const userPrompt = `
    TYPE: ${emailType}
    CONTEXT: ${context}
    TONE: ${tone}
    OUR AGENCY: ${agencyContext || "N/A"}
    
    Generate 3 subject lines and the email body.`;

  let emailData;
  try {
    emailData = await gemini.generateJSON(
      userPrompt,
      GEMINI_MODELS.ULTRA,
      systemPrompt,
    );
  } catch (e) {
    console.error("Gemini Failure", e);
    // Fallback response instead of error to keep UI usable
    emailData = {
      subjects: ["Error generating subjects"],
      body: "Content generation failed. Please try again.",
    };
  }

  // Validate structure
  if (!emailData.subjects || !Array.isArray(emailData.subjects)) {
    emailData.subjects = ["Review Subject"];
  }
  if (!emailData.body) emailData.body = "Content unavailable.";

  return new Response(JSON.stringify(emailData), {
    headers: { "Content-Type": "application/json" },
  });
});
