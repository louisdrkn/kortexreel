

import { corsHeaders } from "../_shared/api-clients.ts";

// DEPRECATED: Users should prefer Firecrawl OSINT
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  return new Response(JSON.stringify({
    success: false,
    error: "This legacy RapidAPI function is deprecated. Please use 'agent-researcher' for OSINT."
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
