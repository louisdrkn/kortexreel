

import { API_KEYS, corsHeaders } from "../_shared/api-clients.ts";

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { companyName, personaTitle } = await req.json();
    if (!companyName || !personaTitle) throw new Error("Missing params");

    const fcKey = API_KEYS.FIRECRAWL || Deno.env.get('FIRECRAWL_API_KEY');
    if (!fcKey) throw new Error("Missing Firecrawl Key");

    const query = `site:linkedin.com/in/ "${personaTitle}" "${companyName}"`;

    // Use Firecrawl Search
    const resp = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${fcKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, limit: 5, lang: 'fr' })
    });

    const data = await resp.json();
    const results = (data.data || []).map((r: any) => ({
      name: r.title.split("-")[0].split("|")[0].trim(),
      title: personaTitle,
      company: companyName,
      profileUrl: r.url,
      description: r.description
    }));

    return new Response(JSON.stringify({ success: true, decisionMakers: results }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: String(error) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});