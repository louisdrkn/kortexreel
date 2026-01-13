

import { API_KEYS, GeminiClient, GEMINI_MODELS } from "../_shared/api-clients.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Language & Density Configs (kept for logic, simplified for AI)
const LANGUAGE_CONFIG: Record<string, string> = {
  'fr': 'Français (France)',
  'en-us': 'English (US)',
  'en-uk': 'English (UK)',
  'es': 'Español',
  'de': 'Deutsch',
  'it': 'Italiano',
};

const DENSITY_CONFIG = {
  'flash': { name: 'Flash', instructions: 'Concise (1-5 pages), direct, bullet points.' },
  'standard': { name: 'Standard', instructions: 'Detailed (10-20 pages), balanced structure.' },
  'enterprise': { name: 'Enterprise', instructions: 'MASSIVE & EXHAUSTIVE (30-50 pages). Detailed paragraphs. Compliance focus.' }
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      clientNeed, clientName, agencyContext, writingStyle,
      services, basePrice, density = 'standard', language = 'fr'
    } = await req.json();

    if (!clientNeed) {
      return new Response(JSON.stringify({ error: "Missing Brief" }), { status: 400, headers: corsHeaders });
    }

    console.log(`🚀 Kortex Brain: Generating Proposal (Gemini 3.0 Pro) - ${density}`);

    const gemini = new GeminiClient(API_KEYS.GEMINI);
    const langName = LANGUAGE_CONFIG[language] || 'Français';
    const densityInstr = DENSITY_CONFIG[density as keyof typeof DENSITY_CONFIG] || DENSITY_CONFIG.standard;

    const systemPrompt = `You are Kortex, an Expert Sales Engineer.
    Write a high-end B2B Proposal.
    
    LANGUAGE: ${langName}
    MODE: ${densityInstr.name} (${densityInstr.instructions})
    
    OUTPUT JSON ONLY:
    {
      "proposal": {
        "content": "Full markdown content...",
        "gapAnalysis": {
          "currentSituation": "...",
          "missedOpportunity": "...",
          "potentialLoss": "...",
          "urgency": "..."
        }
      },
      "pricing": [
        { "name": "Essential", "tier": "essential", "price": "...", "description": "...", "features": [...] },
        { "name": "Recommended", "tier": "recommended", "price": "...", "description": "...", "features": [...] },
        { "name": "Premium", "tier": "premium", "price": "...", "description": "...", "features": [...] }
      ],
      "emails": {
        "delivery": "Short delivery email",
        "followUp": "Polite follow-up email"
      }
    }`;

    const userPrompt = `
    CLIENT: ${clientName || "Prospect"}
    NEED: ${clientNeed}
    AGENCY: ${agencyContext || "N/A"}
    SERVICES: ${services?.join(', ') || "Custom"}
    BASE PRICE: ${basePrice || 5000}
    STYLE: ${writingStyle || "Professional"}
    
    Generate the full Sales Pack.`;

    let salesPack;
    try {
      salesPack = await gemini.generateJSON(userPrompt, GEMINI_MODELS.ULTRA, systemPrompt);
    } catch (e) {
      console.error('Gemini Failure', e);
      salesPack = {
        proposal: { content: "Generation failed.", gapAnalysis: {} },
        pricing: [],
        emails: {}
      };
    }

    return new Response(JSON.stringify({ salesPack }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Kortex Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
