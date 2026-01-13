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
    Agis comme un Consultant en Stratégie Senior.
    Lis intégralement les documents suivants (PDFs, Offres, Brand Book de l'agence) et le contenu du site web:
    
    "${fullContext.slice(0, 300000)}"

    TA MISSION :
    Rédige deux paragraphes parfaits pour le 'Contexte Additionnel' de l'agence.
    Le ton doit être professionnel, persuasif et fidèle aux documents sources.

    1. Paragraphe 1 (Pitch) : 
    Une proposition de valeur percutante qui explique le 'Pourquoi nous' (USP). 
    Doit donner envie de signer tout de suite.

    2. Paragraphe 2 (Méthodologie) : 
    Une explication claire et rassurante de l'approche unique de l'agence. 
    Comment ils délivrent le résultat.

    FORMAT DE SORTIE JSON STRICT :
    {
      "pitch": "Le texte du pitch ici...",
      "methodology": "Le texte de la méthodologie ici..."
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
