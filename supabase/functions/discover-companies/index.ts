import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { GoogleGenerativeAI } from "npm:@google/generative-ai";
import FirecrawlApp from "npm:@mendable/firecrawl-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { inputClient, agencyProfile } = await req.json();
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    
    // --- 1. VÉRIFICATION DU CACHE (La demande Axole) ---
    // On nettoie l'input pour chercher dans la base
    const signature = inputClient ? inputClient.toLowerCase().trim() : "";
    
    if (signature) {
        const { data: cachedProspects } = await supabase
          .from('kortex_prospects')
          .select('match_data')
          .eq('query_signature', signature)
          .limit(20);

        // SI TROUVÉ -> ON RENVOIE TOUT DE SUITE (0 délai)
        if (cachedProspects && cachedProspects.length > 0) {
            console.log("🚀 CACHE HIT: Prospects trouvés en base !");
            const formattedResults = cachedProspects.map(p => p.match_data);
            return new Response(JSON.stringify(formattedResults), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
    }

    // --- 2. CONFIGURATION IA (VERROUILLÉE SUR 1.5 PRO) ---
    const genAI = new GoogleGenerativeAI(Deno.env.get("GOOGLE_API_KEY") || "");
    const firecrawl = new FirecrawlApp({ apiKey: Deno.env.get("FIRECRAWL_API_KEY") });
    
    // ICI : On reste strictement sur la version stable
    const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-pro", 
        generationConfig: { responseMimeType: "application/json", temperature: 0.3 } 
    });

    // --- 3. LE COMMANDANT (Stratégie de recherche) ---
    console.log("🫡 COMMANDANT: Nouvelle recherche pour", inputClient);
    const strategyResult = await model.generateContent(`
    [SYSTEM: KORTEX COMMANDER]
    CONTEXTE: Traduis le besoin utilisateur en ordres de recherche pour l'agent Firecrawl.
    
    INPUTS:
    - OFFRE AGENCE: "${agencyProfile?.pitch || "Service B2B"}"
    - CIBLE VISÉE: "${inputClient}"
    
    MISSION: Génère 4 requêtes Google (Queries) pour trouver des ENTREPRISES.
    ANGLES: 1. Douleur, 2. Recrutement, 3. Obsolescence, 4. Actu.

    JSON STRICT: { "firecrawl_missions": ["Query 1", "Query 2", "Query 3", "Query 4"] }
    `);
    
    const missions = JSON.parse(strategyResult.response.text()).firecrawl_missions || [];

    // --- 4. LE SWARM (Exécution Firecrawl) ---
    console.log("🐝 SWARM: Lancement des agents...");
    let allUrls: string[] = [];
    
    // Recherche des URLs
    await Promise.all(missions.map(async (q: string) => {
        try {
            const search = await firecrawl.search(q, { pageOptions: { fetchPageContent: false }, limit: 2 });
            if(search.data) search.data.forEach((i: any) => allUrls.push(i.url));
        } catch (e) { console.error("Skip query", q); }
    }));
    
    const uniqueUrls = [...new Set(allUrls)]
        .filter(u => !u.includes("linkedin") && !u.includes("indeed") && !u.includes("facebook"))
        .slice(0, 5); 

    // Scraping du contenu
    const scrapeResults = await Promise.all(uniqueUrls.map(url => 
        firecrawl.scrapeUrl(url, { formats: ["markdown"] })
        .then(res => ({ url, content: res.markdown, status: "success" }))
        .catch(() => ({ url, content: "", status: "failed" }))
    ));

    const validSites = scrapeResults.filter(s => s.status === "success" && s.content.length > 200);
    if (validSites.length === 0) throw new Error("Aucun site accessible trouvé.");

    // --- 5. L'ANALYSTE (Validation & Scoring) ---
    console.log("⚖️ ANALYSTE: Verdict sur", validSites.length, "sites...");
    const finalResult = await model.generateContent(`
    [SYSTEM: KORTEX ANALYST]
    ADN AGENCE: ${JSON.stringify(agencyProfile)}
    SITES PROSPECTS: ${JSON.stringify(validSites.map(s => ({url: s.url, txt: s.content.substring(0, 4000)})))}

    MISSION: Garde uniquement ceux qui ont un BESOIN réel.
    FORMAT SORTIE (Liste JSON):
    [{
        "company_name": "Nom",
        "url": "URL",
        "match_score": 0-100,
        "pain_point_detected": "Problème précis",
        "evidence_snippet": "Preuve trouvée dans le texte",
        "why_match": "Argumentaire court"
    }]
    `);

    const jsonResponse = JSON.parse(finalResult.response.text());

    // --- 6. SAUVEGARDE EN CACHE (Pour la prochaine fois) ---
    if (jsonResponse.length > 0 && signature) {
        await supabase.from('kortex_prospects').insert(
            jsonResponse.map((item: any) => ({
                query_signature: signature,
                company_name: item.company_name,
                website_url: item.url,
                match_data: item
            }))
        );
    }

    return new Response(JSON.stringify(jsonResponse), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});
