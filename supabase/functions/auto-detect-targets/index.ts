

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { API_KEYS, GeminiClient, GEMINI_MODELS } from "../_shared/api-clients.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId, agency_dna, target_criteria } = await req.json();

    console.log('[KORTEX] 🎯 Auto-detecting targets (Gemini 3.0 Pro)');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const gemini = new GeminiClient(API_KEYS.GEMINI);

    // 1. Fetch Context
    let documentContent = '';
    if (projectId) {
      const { data: documents } = await supabase
        .from('company_documents')
        .select('file_name, extracted_content')
        .eq('project_id', projectId)
        .eq('extraction_status', 'completed');

      if (documents && documents.length > 0) {
        documentContent = documents
          .filter(doc => doc.extracted_content)
          .map(doc => `=== DOC: ${doc.file_name} ===\n${doc.extracted_content}`)
          .join('\n\n');
      }
    }

    // 2. Prepare Context for AI
    const agencyContext = [];
    if (agency_dna?.pitch) agencyContext.push(`PITCH: ${agency_dna.pitch}`);
    if (agency_dna?.methodology) agencyContext.push(`METHODOLOGY: ${agency_dna.methodology}`);
    if (agency_dna?.trackRecord?.pastClients?.length) {
      agencyContext.push(`PAST CLIENTS: ${agency_dna.trackRecord.pastClients.map((c: any) => c.name).join(', ')}`);
    }

    const targetContext = [];
    if (target_criteria?.industries?.length) targetContext.push(`INDUSTRIES: ${target_criteria.industries.join(', ')}`);
    if (target_criteria?.headcountRanges?.length) targetContext.push(`SIZE: ${target_criteria.headcountRanges.join(', ')}`);
    if (target_criteria?.geography) targetContext.push(`GEO: ${target_criteria.geography}`);

    const systemPrompt = `You are Kortex, an Elite Sales Director.
    Mission: Analyze agency documents and determine the Ideal Customer Profile (ICP).
    Generate ONE optimal Google search query to find these companies.
    
    OUTPUT JSON ONLY:
    {
      "reasoning": "Strategy explanation (2-3 sentences)",
      "icpDescription": "ICP description (1 sentence)",
      "searchQuery": "Optimized French search query (e.g. 'Usines agroalimentaires Nouvelle-Aquitaine')"
    }`;

    // 3. AI Execution
    const userPrompt = `
    DOCUMENTS:\n${documentContent.slice(0, 50000)}\n\n
    AGENCY DNA:\n${agencyContext.join('\n')}\n\n
    TARGETING:\n${targetContext.join('\n')}
    
    Generate the search query.`;

    let result;
    try {
      result = await gemini.generateJSON(userPrompt, GEMINI_MODELS.ULTRA, systemPrompt);
    } catch (e) {
      console.error('Gemini Failure', e);
      result = {
        reasoning: "AI Analysis failed, falling back to default criteria.",
        icpDescription: "Companies matching provided criteria.",
        searchQuery: target_criteria?.industries?.[0] || "PME France"
      };
    }

    console.log('[KORTEX] ✅ Result:', result);

    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Fatal Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
