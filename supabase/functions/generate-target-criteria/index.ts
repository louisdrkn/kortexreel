

import { API_KEYS, GeminiClient, GEMINI_MODELS } from "../_shared/api-clients.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { agency_dna } = await req.json();
    console.log('🚀 Kortex Brain: Generating target criteria (Gemini 3.0 Pro)');

    const gemini = new GeminiClient(API_KEYS.GEMINI);

    const systemPrompt = `You are Kortex, an Expert in ABM & Sales Intelligence.
    Analyze the Agency DNA and suggest precise LinkedIn Sales Navigator filtering criteria.
    
    OUTPUT JSON ONLY:
    {
      "criteria": {
        "headcount": ["11-50", "51-200"],
        "industries": ["technology", "marketing"],
        "seniority": ["cxo", "director"],
        "functions": ["marketing", "sales"],
        "weakSignals": ["hiring_sales", "funding"]
      },
      "reasoning": "Brief explanation of choices"
    }`;

    const userPrompt = `
    AGENCY PITCH: ${agency_dna.pitch || 'N/A'}
    METHODOLOGY: ${agency_dna.methodology || 'N/A'}
    PAST CLIENTS: ${agency_dna.pastClients?.map((c: any) => `${c.name} (${c.description})`).join(', ') || 'None'}
    DREAM CLIENTS: ${agency_dna.dreamClients?.join(', ') || 'None'}
    
    Suggest criteria.`;

    let parsed;
    try {
      parsed = await gemini.generateJSON(userPrompt, GEMINI_MODELS.ULTRA, systemPrompt);
    } catch (e) {
      console.error('Gemini Failure', e);
      parsed = {
        criteria: {
          headcount: ["11-50", "51-200"],
          industries: ["technology"],
          seniority: ["cxo"],
          functions: ["marketing"],
          weakSignals: ["hiring"]
        },
        reasoning: "Fallback default criteria due to AI error."
      };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Kortex Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
