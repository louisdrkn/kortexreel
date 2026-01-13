
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Nettoie une chaîne pour en faire un slug email-friendly
 * Supprime accents, espaces, caractères spéciaux
 */
function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprime les accents
    .replace(/[^a-z0-9]/g, '')       // Garde uniquement lettres et chiffres
    .trim();
}

/**
 * Génère un numéro de téléphone mobile français crédible
 */
function generateFrenchMobile(): string {
  const prefixes = ['06', '07'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];

  // Génère 4 paires de chiffres
  const pairs: string[] = [];
  for (let i = 0; i < 4; i++) {
    const pair = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    pairs.push(pair);
  }

  return `${prefix} ${pairs.join(' ')}`;
}

/**
 * Extrait le domaine depuis le nom d'entreprise ou l'URL
 */
function extractDomain(companyName: string, companyUrl?: string): string {
  // Si on a une URL, on l'utilise
  if (companyUrl) {
    try {
      const url = companyUrl.startsWith('http') ? companyUrl : `https://${companyUrl}`;
      const hostname = new URL(url).hostname;
      return hostname.replace('www.', '');
    } catch {
      // Fallback sur le nom d'entreprise
    }
  }

  // Sinon, on génère un domaine à partir du nom d'entreprise
  const slug = slugify(companyName);
  const tlds = ['com', 'fr', 'io', 'co'];
  const tld = tlds[Math.floor(Math.random() * tlds.length)];
  return `${slug}.${tld}`;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { lead_id, first_name, last_name, company_name, company_url } = await req.json();

    if (!lead_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'lead_id est requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[enrich-prospect] Enrichissement du lead ${lead_id}`);
    console.log(`[enrich-prospect] Contact: ${first_name} ${last_name} @ ${company_name}`);

    // ============================================================
    // TODO: SEMAINE PROCHAINE -> Remplacer ce bloc MOCK par l'appel API Dropcontact
    // 
    // const dropcontactApiKey = Deno.env.get('DROPCONTACT_API_KEY');
    // const dropcontactResponse = await fetch('https://api.dropcontact.io/batch', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'X-Access-Token': dropcontactApiKey,
    //   },
    //   body: JSON.stringify({
    //     data: [{
    //       first_name,
    //       last_name,
    //       company: company_name,
    //     }],
    //     siren: true,
    //     language: 'fr',
    //   }),
    // });
    // const dropcontactData = await dropcontactResponse.json();
    // const email = dropcontactData.data[0]?.email;
    // const phone = dropcontactData.data[0]?.phone;
    // ============================================================

    // MOCK: Génération de données de démonstration
    const domain = extractDomain(company_name || 'entreprise', company_url);
    const firstName = slugify(first_name || 'contact');
    const lastName = slugify(last_name || 'demo');

    // Email réaliste: prenom.nom@domaine.com
    const generatedEmail = `${firstName}.${lastName}@${domain}`;

    // Téléphone mobile français
    const generatedPhone = generateFrenchMobile();

    console.log(`[enrich-prospect] Données générées (MOCK): ${generatedEmail}, ${generatedPhone}`);

    // Mise à jour en base de données
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Mise à jour du lead avec les coordonnées enrichies
    const { data: updatedLead, error: updateError } = await supabase
      .from('leads')
      .update({
        contact_info: {
          email: generatedEmail,
          phone: generatedPhone,
          enriched_at: new Date().toISOString(),
          enrichment_source: 'mock_demo', // Sera 'dropcontact' en prod
        },
        pipeline_stage: 'enriched',
        updated_at: new Date().toISOString(),
      })
      .eq('id', lead_id)
      .select()
      .single();

    if (updateError) {
      console.error(`[enrich-prospect] Erreur update:`, updateError);
      return new Response(
        JSON.stringify({ success: false, error: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[enrich-prospect] Lead ${lead_id} enrichi avec succès`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          email: generatedEmail,
          phone: generatedPhone,
          source: 'mock_demo', // Indique que c'est une démo
        },
        message: 'Coordonnées enrichies avec succès',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[enrich-prospect] Erreur:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
