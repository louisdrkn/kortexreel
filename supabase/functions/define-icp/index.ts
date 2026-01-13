import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  API_KEYS,
  GEMINI_MODELS,
  GeminiClient,
} from "../_shared/api-clients.ts";
import { buildProjectContext } from "../_shared/project-context.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { projectId } = await req.json();

    if (!projectId) {
      throw new Error("Missing projectId");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    console.log(`🧠 Define ICP: Loading context for project ${projectId}...`);

    // --- OMNI-CONTEXT LOADING ---
    const fullContext = await buildProjectContext(supabase, projectId);

    if (!fullContext || fullContext.length < 100) {
      return new Response(
        JSON.stringify({
          error: "No context found. Upload documents or analyze website first.",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const gemini = new GeminiClient(API_KEYS.GEMINI);

    // STRICT AUDITOR PROMPT
    const prompt = `
      CONTEXTE :
      Tu es un Auditeur de Data. Analyse le texte fourni. Extrais UNIQUEMENT les métriques explicites (Hard Data).

      DOCUMENTS A ANALYSER :
      "${fullContext}"

      TA MISSION :
      Remplir la "Définition Cible" avec des faits.

      INSTRUCTIONS STRICTES :
      1. Revenus/Budget : Cherche '> 10M€', '50k€ budget', 'CA', 'Revenus'.
      2. Effectifs : Cherche '200 salariés', 'taille ETI', '50-100 collaborateurs'.
      3. Stack Technique : Cherche 'Salesforce', 'Magento', 'HubSpot'.
      
      Si tu ne trouves pas de chiffre exact, écris 'Non spécifié', n'invente rien.

      FORMAT DE SORTIE ATTENDU (JSON STRICT) :
      {
        "secteurs_vises": ["Secteur 1", "Secteur 2"],
        "taille_entreprise": "METRIQUE EXACTE OU 'Non spécifié'",
        "decision_makers": ["Role 1", "Role 2"],
        "pain_points": ["Pain 1", "Pain 2"],
        "tech_requirements": ["Tech 1", "Tech 2"]
      }
    `;

    console.log("🧠 Define ICP: Sending to Gemini...");

    const result = await gemini.generateJSON(
      prompt,
      GEMINI_MODELS.FLASH, // High speed, good reasoning
      "Tu es un Auditeur de Data impitoyable. Pas de blabla, que des chiffres.",
    );

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ Define ICP Failure:", error);
    const errorMessage = error instanceof Error
      ? error.message
      : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
