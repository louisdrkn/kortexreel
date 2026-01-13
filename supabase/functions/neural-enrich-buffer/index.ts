import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// CRON JOB: Passive enrichment using learned preferences
// This function runs overnight to fill a buffer of high-quality prospects

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[NEURAL-BUFFER] 🌙 Starting overnight enrichment...');

    // Get all projects with preference weights
    const { data: projectsWithWeights } = await supabase
      .from('project_data')
      .select('project_id, user_id, data')
      .eq('data_type', 'preference_weights');

    if (!projectsWithWeights || projectsWithWeights.length === 0) {
      console.log('[NEURAL-BUFFER] No projects with learned preferences');
      return new Response(
        JSON.stringify({ success: true, message: 'No projects to enrich' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let totalEnriched = 0;

    for (const project of projectsWithWeights) {
      const weights = project.data as any;
      
      // Find positive attributes to search for
      const topSectors = Object.entries(weights.sectors || {})
        .filter(([_, score]) => (score as number) > 10)
        .sort(([_, a], [__, b]) => (b as number) - (a as number))
        .slice(0, 3)
        .map(([sector]) => sector);

      const topKeywords = Object.entries(weights.keywords || {})
        .filter(([_, score]) => (score as number) > 5)
        .sort(([_, a], [__, b]) => (b as number) - (a as number))
        .slice(0, 5)
        .map(([kw]) => kw);

      if (topSectors.length === 0 && topKeywords.length === 0) {
        console.log(`[NEURAL-BUFFER] Project ${project.project_id}: No positive patterns yet`);
        continue;
      }

      console.log(`[NEURAL-BUFFER] Project ${project.project_id}: Searching for ${topSectors.join(', ')}`);

      // Get agency DNA for context
      const { data: agencyData } = await supabase
        .from('project_data')
        .select('data')
        .eq('project_id', project.project_id)
        .eq('data_type', 'agency_dna')
        .single();

      if (!agencyData || !firecrawlKey) {
        continue;
      }

      // Build smart search query from positive patterns
      const searchQuery = [
        ...topSectors,
        ...topKeywords,
        'entreprise',
        'France'
      ].join(' ');

      try {
        // Use Firecrawl search
        const searchResponse = await fetch('https://api.firecrawl.dev/v1/search', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${firecrawlKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: searchQuery,
            limit: 10,
          }),
        });

        if (!searchResponse.ok) {
          console.warn(`[NEURAL-BUFFER] Search failed for project ${project.project_id}`);
          continue;
        }

        const searchData = await searchResponse.json();
        const results = searchData.data || [];

        // Calculate scores with preference boost
        for (const result of results) {
          const companyName = extractCompanyName(result.title || result.url);
          const domain = new URL(result.url).hostname.replace('www.', '');
          
          // Check if already exists
          const { data: existing } = await supabase
            .from('company_analyses')
            .select('id')
            .eq('project_id', project.project_id)
            .eq('company_url', domain)
            .single();

          if (existing) continue;

          // Calculate preference-boosted score
          let score = 65; // Base score for buffer prospects
          
          for (const sector of topSectors) {
            if (result.description?.toLowerCase().includes(sector.toLowerCase())) {
              score += 10;
            }
          }
          
          for (const kw of topKeywords) {
            if (result.description?.toLowerCase().includes(kw.toLowerCase())) {
              score += 5;
            }
          }

          score = Math.min(95, score);

          // Insert as buffer prospect
          const { error: insertError } = await supabase
            .from('company_analyses')
            .insert({
              project_id: project.project_id,
              user_id: project.user_id,
              company_name: companyName,
              company_url: domain,
              description_long: result.description,
              match_score: score,
              match_explanation: `🌙 Découvert pendant votre sommeil. Correspond à vos préférences: ${topSectors.slice(0, 2).join(', ')}`,
              analysis_status: 'buffer',
              buying_signals: ['Découverte IA nocturne'],
            });

          if (!insertError) {
            totalEnriched++;
          }
        }

      } catch (searchErr) {
        console.warn(`[NEURAL-BUFFER] Error for project ${project.project_id}:`, searchErr);
      }
    }

    console.log(`[NEURAL-BUFFER] ✅ Overnight enrichment complete: ${totalEnriched} new prospects`);

    return new Response(
      JSON.stringify({ success: true, enriched: totalEnriched }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[NEURAL-BUFFER] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

function extractCompanyName(input: string): string {
  return input
    .replace(/https?:\/\/(www\.)?/, '')
    .replace(/\.[a-z]{2,}(\/.*)?$/i, '')
    .replace(/[-_]/g, ' ')
    .split(' ')
    .slice(0, 3)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
