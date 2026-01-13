

import { API_KEYS, corsHeaders } from "../_shared/api-clients.ts";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { url, options } = await req.json();
    if (!url) throw new Error("URL Required");

    const apiKey = API_KEYS.FIRECRAWL || Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) throw new Error("Firecrawl Key Missing");

    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http')) formattedUrl = `https://${formattedUrl}`;

    console.log(`[Firecrawl] Scraping ${formattedUrl}`);

    const resp = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: formattedUrl,
        formats: options?.formats || ['markdown'],
        onlyMainContent: options?.onlyMainContent ?? true,
        waitFor: options?.waitFor || 1000
      })
    });

    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || "Scrape Failed");

    return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: String(error) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
