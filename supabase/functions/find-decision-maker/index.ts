

import { API_KEYS, corsHeaders } from "../_shared/api-clients.ts";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { company_name, domain, job_title_keywords, persona_description } = await req.json();

    // Config Check
    const serperKey = API_KEYS.SERPER || Deno.env.get('SERPER_API_KEY');
    if (!serperKey) throw new Error("Missing SERPER_API_KEY");

    // Logic remains: Search Google for LinkedIn profile
    let q = `site:linkedin.com/in "${company_name || domain}"`;
    if (job_title_keywords?.[0]) q += ` "${job_title_keywords[0]}"`;
    else if (persona_description) q += ` "${persona_description}"`;
    else q += ` (CEO OR "Directeur Général")`;

    const resp = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: { "X-API-KEY": serperKey, "Content-Type": "application/json" },
      body: JSON.stringify({ q, num: 5, gl: "fr", hl: "fr" })
    });

    const data = await resp.json();
    if (!data.organic?.length) return new Response(JSON.stringify({ success: false, error: "No results" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Parse best result
    const best = data.organic.find((r: any) => r.link.includes("/in/")) || data.organic[0];
    const parts = best.title.split("-")[0].split("|")[0].trim().split(" ");

    const result = {
      success: true,
      decision_maker: {
        first_name: parts[0],
        last_name: parts.slice(1).join(" "),
        full_name: parts.join(" "),
        linkedin_url: best.link,
        job_title: best.title.split("-")[1]?.trim() || "Decision Maker",
        company_name: company_name || domain,
        confidence_score: 80
      }
    };

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: String(error) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
