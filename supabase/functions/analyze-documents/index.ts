/**
 * ANALYZE DOCUMENTS - Gemini Document Analysis
 *
 * RESPONSABILITÉ : Analyser les documents uploadés (PDF/DOCX) pour extraire les clients
 * MÉTHODE : Gemini 3.0 Pro avec analyse de texte extrait
 */

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
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documentText, fileName } = await req.json();

    if (!documentText) {
      return new Response(
        JSON.stringify({ success: false, error: "documentText is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(`📄 Analyzing document: ${fileName || "Unknown"}`);
    console.log(`   Text length: ${documentText.length} chars`);

    // Initialize Gemini
    const gemini = new GeminiClient(API_KEYS.GEMINI);

    const systemPrompt =
      `Tu es un expert en analyse de documents d'entreprise. Ton rôle est d'extraire UNIQUEMENT la liste des clients mentionnés dans ce document.

INSTRUCTIONS CRITIQUES :
1. Cherche les sections : "Références", "Nos clients", "Portfolio", "Réalisations", "Ils nous font confiance"
2. Identifie les noms d'entreprises clientes (pas les partenaires technologiques)
3. Pour chaque client, déduis le secteur d'activité si mentionné
4. Note le contexte (projet réalisé, service fourni, etc.)

RÈGLES D'EXCLUSION ABSOLUES :
❌ NE LISTE JAMAIS : YouTube, LinkedIn, Instagram, Facebook, Twitter/X, TikTok
❌ NE LISTE JAMAIS : AWS, Google Cloud, React, WordPress, Stripe, Shopify
❌ NE LISTE JAMAIS : Les technologies, outils, ou fournisseurs

✅ LISTE UNIQUEMENT : Les entreprises clientes réelles pour qui un projet a été réalisé

RÉPONSE ATTENDUE (JSON strict) :
{
  "track_record": [
    {
      "company_name": "Nom du client",
      "industry": "Secteur",
      "context": "Description du projet"
    }
  ]
}

Sois précis et exhaustif.`;

    const userPrompt = `Extrais tous les clients de ce document :\n\n${
      documentText.slice(0, 150000)
    }`; // Limite à 150K chars

    console.log("🧠 Calling Gemini 2.5 Flash for document analysis...");

    const result = await gemini.generateJSON(
      userPrompt,
      "gemini-2.5-flash", // Using 2.5 Flash (confirmed available in API)
      systemPrompt,
    );

    const clients = result.track_record || [];
    console.log(`✅ Analysis complete. Found ${clients.length} clients.`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          track_record: clients,
          source: `Document: ${fileName || "Unknown"}`,
          analyzed_chars: documentText.length,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("❌ Gemini Analysis Error:", error);
    const errorMessage = error instanceof Error
      ? error.message
      : "Unknown error";

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        hint: "Vérifiez que le texte du document est bien formaté",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
