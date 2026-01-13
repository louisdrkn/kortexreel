

import { API_KEYS, GeminiClient, GEMINI_MODELS } from "../_shared/api-clients.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { target_criteria } = await req.json();
    console.log('🚀 Kortex Brain: Generating Accounts (Gemini 3.0 Pro)');

    const gemini = new GeminiClient(API_KEYS.GEMINI);

    const systemPrompt = `You are Kortex, B2B Prospection Expert.
    Generate a list of 10 REALISTIC but FICTIONAL/REPRESENTATIVE companies matching the targeting criteria.
    This is for simulation/demo purposes.
    
    OUTPUT JSON ONLY:
    {
      "accounts": [
        {
          "id": "uuid",
          "name": "Company Name",
          "industry": "Industry",
          "headcount": "11-50",
          "website": "example.com",
          "signals": ["Signal 1"],
          "score": 85,
          "status": "hot"
        }
      ]
    }`;

    const userPrompt = `Criteria:
    Headcount: ${target_criteria.headcount?.join(', ')}
    Industries: ${target_criteria.industries?.join(', ')}
    Geo: ${target_criteria.geography?.join(', ')}
    
    Generate list.`;

    let parsed;
    try {
      parsed = await gemini.generateJSON(userPrompt, GEMINI_MODELS.ULTRA, systemPrompt);
    } catch (e) {
      console.error("Gemini Error", e);
      parsed = { accounts: [] };
    }

    return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
