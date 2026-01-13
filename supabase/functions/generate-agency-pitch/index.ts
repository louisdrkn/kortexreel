import "https://deno.land/x/xhr@0.1.0/mod.ts";
import {
  API_KEYS,
  GEMINI_MODELS,
  GeminiClient,
} from "../_shared/api-clients.ts";

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
    const gemini = new GeminiClient(API_KEYS.GEMINI);
    const { documentsContent, websiteContent } = await req.json();

    if (!documentsContent && !websiteContent) {
      throw new Error(
        "Missing documentsContent and websiteContent - at least one is required",
      );
    }

    // Combine contents
    const fullContext = `
    --- WEBSITE CONTENT ---
    ${websiteContent || "No website content provided."}
    
    --- UPLOADED DOCUMENTS ---
    ${documentsContent || "No documents provided."}
    `.trim();

    console.log(
      `🎤 Generating Agency Pitch (Docs: ${
        documentsContent?.length || 0
      }, Web: ${websiteContent?.length || 0})`,
    );

    const prompt = `
    ANALYSE CE SITE D'AGENCE : ${websiteContent || "URL non fournie"}
    CONTENU DU SITE : ${fullContext.substring(0, 10000)}

    TA MISSION :
    Extrais l'ADN de cette agence pour remplir son cerveau commercial.

    FORMAT JSON STRICT ATTENDU :
    {
      "pitch": "Une phrase percutante qui résume leur proposition de valeur unique (pour qui ? quel résultat ?)",
      "methodology": "Leur façon de travailler, leurs étapes clés ou leur 'secret sauce' (résumé en 2-3 phrases)",
      "track_record": [] 
    }
    `;

    const result = await gemini.generateJSON<
      { pitch: string; methodology: string }
    >(
      prompt,
      GEMINI_MODELS.PRO, // High quality reasoning needed
      "Tu es un expert en stratégie de marque et copywriting B2B.",
    );

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ Pitch Generation Failure:", error);
    const errorMessage = error instanceof Error
      ? error.message
      : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
