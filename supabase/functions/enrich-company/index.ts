

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { API_KEYS, GeminiClient, GEMINI_MODELS } from "../_shared/api-clients.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FIRECRAWL_API_URL = "https://api.firecrawl.dev/v1";

interface EnrichRequest {
    companyName: string;
    companyUrl?: string;
    projectId: string;
}

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const { companyName, companyUrl, projectId } = await req.json() as EnrichRequest; // Strict definition

        if (!companyName || !projectId) {
            throw new Error('Missing required fields: companyName, projectId');
        }

        // Use shared keys or env vars
        const firecrawlKey = API_KEYS.FIRECRAWL || Deno.env.get('FIRECRAWL_API_KEY');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!firecrawlKey || !supabaseUrl || !supabaseKey) {
            throw new Error('System configuration incomplete (missing API keys)');
        }

        const supabase = createClient(supabaseUrl, supabaseKey);
        const gemini = new GeminiClient(API_KEYS.GEMINI);

        console.log(`[ENRICH] Starting full analysis for: ${companyName}`);

        // --- 1. Find/Verify URL ---
        let finalUrl = companyUrl;
        let logoUrl = '';

        const needsSearch = !finalUrl || finalUrl.includes('likely-domain') || !finalUrl.includes('.');

        if (needsSearch) {
            console.log('[ENRICH] URL uncertain, searching...');
            const searchResp = await fetch(`${FIRECRAWL_API_URL}/search`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${firecrawlKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: `${companyName} official website`,
                    limit: 1,
                    scrapeOptions: { formats: ['markdown'] }
                }),
            });
            const searchData = await searchResp.json();
            if (searchData.success && searchData.data?.[0]?.url) {
                finalUrl = searchData.data[0].url;
                console.log(`[ENRICH] Found URL: ${finalUrl}`);
            } else {
                throw new Error(`Could not find website for ${companyName}`);
            }
        }

        // --- 2. Scrape Content ---
        console.log('[ENRICH] Scraping content...');
        const scrapeResp = await fetch(`${FIRECRAWL_API_URL}/scrape`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${firecrawlKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url: finalUrl,
                formats: ['markdown'],
                onlyMainContent: true
            }),
        });

        // Fallback logo
        logoUrl = `https://logo.clearbit.com/${new URL(finalUrl!).hostname}`;

        let markdown = '';
        let metadata: any = {};

        const scrapeData = await scrapeResp.json();
        if (scrapeData.success) {
            markdown = scrapeData.data?.markdown || '';
            metadata = scrapeData.data?.metadata || {};
            if (metadata.ogImage) logoUrl = metadata.ogImage;
        } else {
            console.warn('[ENRICH] Scrape failed, proceeding with minimal info');
        }

        // 5. Analysis Phase (Gemini Deep Reasoning)
        console.log('[ENRICH] Analyzing with Gemini 3.0 Pro...');

        const systemPrompt = `You are Kortex, an elite B2B Sales Strategist. 
    Analyze the website content and extract key intelligence for a CRM.
    
    OUTPUT JSON ONLY:
    {
       "description_long": "2 sentences describing what they do and who they serve.",
       "industry": "Specific industry",
       "detected_pain_points": ["Pain 1 (with proof)", "Pain 2"],
       "buying_signals": ["Signal 1", "Signal 2"],
       "strategic_analysis": "Why they need our services (brief)",
       "match_score": 75
    }`;

        // Limit context
        const contentContext = markdown.slice(0, 30000);

        let analysis: any = {};
        try {
            analysis = await gemini.generateJSON(
                `Analyze this website content for ${companyName} (${finalUrl}):\n\n${contentContext}`,
                GEMINI_MODELS.ULTRA,
                systemPrompt
            );
        } catch (e) {
            console.error('Gemini Analysis Failed', e);
            analysis = { description_long: markdown.slice(0, 150) + "..." };
        }

        // --- 4. Save to Database ---
        console.log('[ENRICH] Saving results...');

        const payload = {
            company_url: new URL(finalUrl!).hostname,
            logo_url: logoUrl,
            description_long: analysis.description_long || metadata?.description || '',
            industry: analysis.industry,
            detected_pain_points: analysis.detected_pain_points || [],
            buying_signals: analysis.buying_signals || [],
            strategic_analysis: analysis.strategic_analysis,
            match_score: analysis.match_score,
            analysis_status: 'enriched',
            updated_at: new Date().toISOString()
        };

        const { error: dbError } = await supabase
            .from('company_analyses')
            .update(payload)
            .eq('project_id', projectId)
            .eq('company_name', companyName);

        if (dbError) throw dbError;

        return new Response(
            JSON.stringify({ success: true, company: { name: companyName, ...payload } }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('[ENRICH] Error:', error);
        return new Response(
            JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown Error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
