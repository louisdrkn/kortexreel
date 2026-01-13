

import { API_KEYS, GeminiClient, GEMINI_MODELS } from "../_shared/api-clients.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documentContent, targetDescription, agencyPitch, industries } = await req.json();
    console.log('🚀 Kortex Brain: Generating weak signals (Gemini 3.0 Pro)');

    const gemini = new GeminiClient(API_KEYS.GEMINI);

    const systemPrompt = `You are Kortex, Elite Sales Director.
    Mission: Identify BUYING SIGNALS that indicate a prospect needs our services.
    
    AVAILABLE SIGNALS:
    - "hiring": Active recruitment
    - "funding": Recent fundraising
    - "expansion": New offices/locations
    - "new_exec": New leadership
    - "acquisition": M&A activity
    - "tech_adoption": New tech stack
    - "compliance": Regulatory changes
    - "crisis": PR crisis
    
    OUTPUT JSON ONLY:
    {
      "selectedSignals": ["hiring", "funding"],
      "customKeywords": ["Key event 1", "Key event 2"],
      "reasoning": "Logic explanation"
    }`;

    const userPrompt = `
    AGENCY PITCH: ${agencyPitch || "N/A"}
    TARGET: ${targetDescription || "N/A"}
    SECTORS: ${industries?.join(', ') || "N/A"}
    DOCUMENTS: ${documentContent ? documentContent.slice(0, 10000) : "N/A"}
    
    Determine signals.`;

    let result;
    try {
      result = await gemini.generateJSON(userPrompt, GEMINI_MODELS.ULTRA, systemPrompt);
    } catch (e) {
      console.error('Gemini Failure', e);
      result = {
        selectedSignals: ["hiring", "expansion"],
        customKeywords: ["Croissance", "Nouveau projet"],
        reasoning: "Fallback signals due to AI error."
      };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Kortex Error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
