import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  API_KEYS,
  corsHeaders,
  GEMINI_MODELS,
  GeminiClient,
} from "../_shared/api-clients.ts";

interface ValidationRequest {
  projectId: string;
  companyUrl: string;
  companyContent?: string; // Optional: Provide pre-scraped content
}

interface ValidationResult {
  company_name: string;
  match_score: number;
  industry_relevance: string;
  pain_point_detected: string;
  evidence_snippet: string;
  why_match: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { projectId, companyUrl, companyContent } = await req
      .json() as ValidationRequest;

    if (!projectId || !companyUrl) {
      throw new Error("Missing projectId or companyUrl");
    }

    // 1. Init Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 2. Fetch Agency DNA
    const { data: dnaRecord, error: dnaError } = await supabase
      .from("project_data")
      .select("data")
      .eq("project_id", projectId)
      .eq("data_type", "agency_dna")
      .single();

    if (dnaError || !dnaRecord) {
      throw new Error("Agency DNA not found for this project");
    }

    const agencyDna = dnaRecord.data;
    const agencyPitch = agencyDna.pitch || "Proposition de valeur non définie";
    // Construct track record string
    let agencyTrackRecord = "";
    if (agencyDna.trackRecord) {
      agencyTrackRecord = `Clients passés: ${
        (agencyDna.trackRecord.pastClients || []).map((c: any) => c.name).join(
          ", ",
        )
      }.`;
    }

    // 3. Get Company Content (Scrape if needed)
    let finalContent = companyContent || "";

    if (!finalContent) {
      console.log(`[validate-company] Scraping ${companyUrl}...`);
      const firecrawlKey = API_KEYS.FIRECRAWL;

      try {
        const scrapeResp = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${firecrawlKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: companyUrl,
            formats: ["markdown"],
            onlyMainContent: true,
            timeout: 30000,
          }),
        });

        if (scrapeResp.ok) {
          const data = await scrapeResp.json();
          finalContent = data.data?.markdown || "";
        } else {
          console.error(
            `[validate-company] Scrape failed: ${scrapeResp.status}`,
          );
        }
      } catch (e) {
        console.error(`[validate-company] Scrape error:`, e);
      }
    }

    if (!finalContent || finalContent.length < 50) {
      throw new Error(
        "Could not retrieve sufficient content from company website.",
      );
    }

    // 4. Gemini Analysis (Analyste Croisé)
    const gemini = new GeminiClient(API_KEYS.GEMINI);

    const systemPrompt = `
ANALYSTE CROISÉ" (Validation du Besoin Entreprise)
[SYSTÈME : KORTEX ANALYST - ENGINE: GEMINI 1.5 PRO]

CONTEXTE DE MISSION : Tu es le Gardien de la Qualité. Tu interviens APRÈS le scraping. Ta seule fonction est de vérifier si l'entreprise trouvée a réellement besoin de la solution du client. RÈGLE D'OR : Ne cherche pas de contacts humains. Concentre-toi uniquement sur la structure, la douleur et le contexte de l'entreprise.

LES DONNÉES À COMPARER :

SOURCE A (L'Offre) : ${agencyPitch}
PREUVES (Track Record) : ${agencyTrackRecord}

SOURCE B (Le Terrain - Contenu Site Web) : 
"${finalContent.slice(0, 20000)}"

TA MISSION (AUDIT DE COMPATIBILITÉ) : Analyse la SOURCE B à la recherche de preuves factuelles qu'ils ont le problème résolu par la SOURCE A.

CRITÈRES DE SCORING (0 à 100) :

0-40 (Rejet) : Le site n'a rien à voir, ou le problème est déjà résolu (ex: Ils ont déjà un outil similaire visible).

41-70 (Intéressant) : Ils sont dans la bonne cible, mais pas de "douleur" visible immédiate.

71-100 (Cible Parfaite) : Tu as trouvé une preuve explicite (ex: "Page erreur", "Offre d'emploi non pourvue", "Techno obsolète", "Demande d'aide").

EXTRACTION DE PREUVES (SANS HALLUCINATION) : Si tu mets un score haut, tu dois citer une phrase ou un élément technique trouvé textuellement dans la SOURCE B qui justifie ce besoin.

FORMAT DE SORTIE (JSON STRICT) : { "company_name": "Nom de l'entreprise identifié", "match_score": 85, "industry_relevance": "Secteur d'activité (ex: SaaS Fintech)", "pain_point_detected": "Description courte du problème trouvé (ex: Site non responsive)", "evidence_snippet": "La citation exacte ou l'élément technique du site qui prouve le problème (ex: 'Copyright 2018' ou 'Looking for SEO expert')", "why_match": "Une phrase synthétique expliquant pourquoi l'Offre A est la solution parfaite pour ce problème précis." }
`;

    const userPrompt = `Analyse ce site et valide la compatibilité.`;

    const analysisResult = await gemini.generateJSON<ValidationResult>(
      userPrompt,
      GEMINI_MODELS.PRO,
      systemPrompt,
      undefined,
      { temperature: 0.1 },
    );

    return new Response(
      JSON.stringify(analysisResult),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error(`[validate-company] Error:`, error);
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
