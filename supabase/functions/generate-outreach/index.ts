import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  API_KEYS,
  corsHeaders,
  GEMINI_MODELS,
  GeminiClient,
} from "../_shared/api-clients.ts";
import { buildProjectContext } from "../_shared/project-context.ts";

interface OutreachResponse {
  messages: {
    type: "linkedin_note" | "linkedin_message" | "email";
    subject?: string;
    body: string;
    icebreaker: string;
  }[];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prospect, projectId } = await req.json();

    if (!projectId) {
      throw new Error("Missing projectId");
    }

    // INIT CLIENTS
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseKey);
    const geminiClient = new GeminiClient(); // Uses GEMINI_API_KEY from environment

    console.log(
      "🚀 Kortex Brain: Generating outreach for",
      prospect?.companyName,
    );

    // 1. BUILD COMPLETE CONTEXT
    const projectContext = await buildProjectContext(supabase, projectId);

    const systemInstruction =
      `Tu es Kortex, expert en copywriting B2B et outreach personnalisé.
Tu génères des messages de prospection ultra-personnalisés basés sur les informations du prospect ET le contexte complet du vendeur.

RÈGLES D'OR:
- Ton: Humain, conversationnel, direct. Pas de "J'espère que vous allez bien".
- Icebreaker: Doit être ultra-spécifique au prospect (basé sur un signal ou une info web).
- Call to Action: Toujours proposer un call court (15 min) avec une raison valable (audit, idée, démo).
- Langue: Français (sauf si le context indique autrement).

Tu dois générer 3 messages:
1. "linkedin_note": Note d'invitation (max 300 chars, poli mais intriguant).
2. "linkedin_message": Message de suivi après connexion (plus de valeur, lien avec leur douleur).
3. "email": Email froid (Sujet percutant, corps court, focus sur la douleur et la solution).

Format de réponse JSON STRICT:
{
  "messages": [
    { "type": "linkedin_note", "body": "...", "icebreaker": "..." },
    { "type": "linkedin_message", "body": "...", "icebreaker": "..." },
    { "type": "email", "subject": "...", "body": "...", "icebreaker": "..." }
  ]
}`;

    const userPrompt = `Génère une séquence d'approche pour ce prospect:

PROSPECT:
- Entreprise: ${prospect?.companyName || "Entreprise cible"}
- Contact: ${prospect?.contactName || "Décideur"}
- Poste: ${prospect?.contactTitle || "Directeur"}
- Pourquoi ça match: ${
      prospect?.matchReason || "Profil correspondant à notre cible"
    }
- Signaux/Pain points: ${
      JSON.stringify(
        prospect?.painPoints || prospect?.signals || [
          "Croissance",
          "Besoin d'optimisation",
        ],
      )
    }

À TOI DE JOUER. Utilise le CONTEXTE GLOBAL pour personnaliser l'offre.`;

    // 2. GENERATE CONTENT
    const messages = await geminiClient.generateJSON<OutreachResponse>(
      userPrompt,
      GEMINI_MODELS.FLASH,
      // 3. INJECT FULL CONTEXT
      systemInstruction + "\n\n=== CONTEXTE VENDEUR COMPLET ===\n" +
        projectContext,
    );

    console.log(
      "✅ Kortex Brain: Outreach generated with",
      messages?.messages?.length || 0,
      "items",
    );

    return new Response(JSON.stringify(messages), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ Kortex Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
