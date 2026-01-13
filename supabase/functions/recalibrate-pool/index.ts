import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PreferenceWeights {
  sectors: Record<string, number>;
  sizes: Record<string, number>;
  keywords: Record<string, number>;
  locations: Record<string, number>;
  lastUpdated: string;
}

interface RippleResult {
  action: 'exclude' | 'validate';
  affectedAttributes: string[];
  adjustedWeights: Record<string, number>;
  companiesRemoved: number;
  companiesAffected: string[];
  newSearchSuggestion?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId, companyId, action, userId } = await req.json();

    if (!projectId || !companyId || !action || !userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required parameters' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`[NEURAL-LOOP] 🧠 Recalibrating for action: ${action} on company ${companyId}`);

    // STEP 1: Get the company being excluded/validated
    const { data: targetCompany, error: companyError } = await supabase
      .from('company_analyses')
      .select('*')
      .eq('id', companyId)
      .single();

    if (companyError || !targetCompany) {
      return new Response(
        JSON.stringify({ success: false, error: 'Company not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // STEP 2: Get or create preference weights
    const { data: existingWeights } = await supabase
      .from('project_data')
      .select('*')
      .eq('project_id', projectId)
      .eq('data_type', 'preference_weights')
      .single();

    let weights: PreferenceWeights = existingWeights?.data as PreferenceWeights || {
      sectors: {},
      sizes: {},
      keywords: {},
      locations: {},
      lastUpdated: new Date().toISOString(),
    };

    // STEP 3: THE AUTOPSY - Extract company attributes
    const companyAttributes = {
      sector: targetCompany.industry || 'unknown',
      size: targetCompany.headcount || 'unknown',
      location: targetCompany.location || 'unknown',
      keywords: extractKeywords(targetCompany),
    };

    console.log(`[NEURAL-LOOP] 📊 Analyzing attributes:`, companyAttributes);

    // STEP 4: Adjust weights based on action
    const adjustment = action === 'exclude' ? -15 : +10;
    const affectedAttributes: string[] = [];
    const adjustedWeights: Record<string, number> = {};

    // Adjust sector weight
    if (companyAttributes.sector !== 'unknown') {
      weights.sectors[companyAttributes.sector] = (weights.sectors[companyAttributes.sector] || 0) + adjustment;
      weights.sectors[companyAttributes.sector] = Math.max(-100, Math.min(100, weights.sectors[companyAttributes.sector]));
      affectedAttributes.push(`Secteur: ${companyAttributes.sector}`);
      adjustedWeights[companyAttributes.sector] = weights.sectors[companyAttributes.sector];
    }

    // Adjust size weight
    if (companyAttributes.size !== 'unknown') {
      weights.sizes[companyAttributes.size] = (weights.sizes[companyAttributes.size] || 0) + adjustment;
      weights.sizes[companyAttributes.size] = Math.max(-100, Math.min(100, weights.sizes[companyAttributes.size]));
      affectedAttributes.push(`Taille: ${companyAttributes.size}`);
      adjustedWeights[companyAttributes.size] = weights.sizes[companyAttributes.size];
    }

    // Adjust keyword weights
    for (const keyword of companyAttributes.keywords) {
      weights.keywords[keyword] = (weights.keywords[keyword] || 0) + adjustment;
      weights.keywords[keyword] = Math.max(-100, Math.min(100, weights.keywords[keyword]));
      adjustedWeights[keyword] = weights.keywords[keyword];
    }

    // Adjust location weight
    if (companyAttributes.location !== 'unknown') {
      weights.locations[companyAttributes.location] = (weights.locations[companyAttributes.location] || 0) + adjustment;
      weights.locations[companyAttributes.location] = Math.max(-100, Math.min(100, weights.locations[companyAttributes.location]));
    }

    weights.lastUpdated = new Date().toISOString();

    // STEP 5: Save updated weights
    await supabase
      .from('project_data')
      .upsert({
        project_id: projectId,
        user_id: userId,
        data_type: 'preference_weights',
        data: weights,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'project_id,data_type',
      });

    console.log(`[NEURAL-LOOP] 💾 Weights saved`);

    // STEP 6: BACKGROUND SANITATION - Re-score all pending companies
    const { data: allCompanies } = await supabase
      .from('company_analyses')
      .select('*')
      .eq('project_id', projectId)
      .neq('id', companyId);

    const companiesRemoved: string[] = [];
    const companiesAffected: string[] = [];
    const RELEVANCE_THRESHOLD = 60;

    for (const company of allCompanies || []) {
      const oldScore = company.match_score || 0;
      const newScore = recalculateScore(company, weights);
      
      if (newScore !== oldScore) {
        companiesAffected.push(company.company_name);
        
        if (newScore < RELEVANCE_THRESHOLD && oldScore >= RELEVANCE_THRESHOLD) {
          // Archive this company silently
          companiesRemoved.push(company.company_name);
          await supabase
            .from('company_analyses')
            .update({ 
              match_score: newScore,
              analysis_status: 'archived',
              match_explanation: `Auto-archivé: score ${newScore}% (< ${RELEVANCE_THRESHOLD}% seuil)` 
            })
            .eq('id', company.id);
        } else {
          // Just update the score
          await supabase
            .from('company_analyses')
            .update({ match_score: newScore })
            .eq('id', company.id);
        }
      }
    }

    console.log(`[NEURAL-LOOP] 🧹 Cleaned ${companiesRemoved.length} companies, affected ${companiesAffected.length}`);

    // STEP 7: Generate anti-model search suggestion if excluding
    let newSearchSuggestion: string | undefined;
    if (action === 'exclude' && companyAttributes.sector !== 'unknown') {
      // Find positive sectors
      const positiveSectors = Object.entries(weights.sectors)
        .filter(([_, score]) => score > 0)
        .sort(([_, a], [__, b]) => b - a)
        .slice(0, 3)
        .map(([sector]) => sector);
      
      if (positiveSectors.length > 0) {
        newSearchSuggestion = positiveSectors.join(', ');
      }
    }

    // Update the excluded/validated company status
    await supabase
      .from('company_analyses')
      .update({ 
        analysis_status: action === 'exclude' ? 'excluded' : 'validated',
        updated_at: new Date().toISOString(),
      })
      .eq('id', companyId);

    const result: RippleResult = {
      action,
      affectedAttributes,
      adjustedWeights,
      companiesRemoved: companiesRemoved.length,
      companiesAffected: companiesRemoved,
      newSearchSuggestion,
    };

    console.log(`[NEURAL-LOOP] ✅ Ripple effect complete:`, result);

    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[NEURAL-LOOP] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

// Extract meaningful keywords from company data
function extractKeywords(company: any): string[] {
  const keywords: string[] = [];
  
  // From buying signals
  if (Array.isArray(company.buying_signals)) {
    for (const signal of company.buying_signals) {
      const words = signal.toLowerCase().split(/\s+/).filter((w: string) => w.length > 4);
      keywords.push(...words.slice(0, 3));
    }
  }
  
  // From description
  if (company.description_long) {
    const importantWords = company.description_long
      .toLowerCase()
      .split(/\s+/)
      .filter((w: string) => w.length > 5 && !['entreprise', 'société', 'service', 'solution'].includes(w))
      .slice(0, 5);
    keywords.push(...importantWords);
  }
  
  return [...new Set(keywords)].slice(0, 10);
}

// Recalculate company score based on current weights
function recalculateScore(company: any, weights: PreferenceWeights): number {
  let baseScore = company.match_score || 50;
  let adjustment = 0;
  
  // Sector adjustment
  if (company.industry && weights.sectors[company.industry]) {
    adjustment += weights.sectors[company.industry] * 0.3;
  }
  
  // Size adjustment
  if (company.headcount && weights.sizes[company.headcount]) {
    adjustment += weights.sizes[company.headcount] * 0.2;
  }
  
  // Location adjustment
  if (company.location && weights.locations[company.location]) {
    adjustment += weights.locations[company.location] * 0.1;
  }
  
  // Keywords adjustment
  const companyKeywords = extractKeywords(company);
  for (const keyword of companyKeywords) {
    if (weights.keywords[keyword]) {
      adjustment += weights.keywords[keyword] * 0.05;
    }
  }
  
  const finalScore = Math.round(Math.max(0, Math.min(100, baseScore + adjustment)));
  return finalScore;
}
