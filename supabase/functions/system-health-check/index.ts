

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// We import our shared client to test it directly
import { API_KEYS, GeminiClient, GEMINI_MODELS } from "../_shared/api-clients.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestResult {
  service: string;
  status: 'OK' | 'ERROR' | 'SKIPPED';
  message: string;
  duration: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const results: TestResult[] = [];
  const log = (msg: string) => console.log(`[HEALTH] ${msg}`);

  try {
    const { projectId, userId } = await req.json();
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // A. DB
    const dbStart = Date.now();
    try {
      const { data, error } = await supabase.from('projects').select('count', { count: 'exact', head: true });
      if (error) throw error;
      results.push({ service: 'DATABASE', status: 'OK', message: 'Connection OK', duration: Date.now() - dbStart });
    } catch (e) {
      results.push({ service: 'DATABASE', status: 'ERROR', message: String(e), duration: Date.now() - dbStart });
    }

    // B. FIRECRAWL
    const fcStart = Date.now();
    try {
      const fcKey = API_KEYS.FIRECRAWL || Deno.env.get('FIRECRAWL_API_KEY');
      if (!fcKey) throw new Error("No Key");
      const r = await fetch('https://api.firecrawl.dev/v1/search', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${fcKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'test', limit: 1 })
      });
      if (!r.ok) throw new Error("HTTP " + r.status);
      results.push({ service: 'FIRECRAWL', status: 'OK', message: 'API OK', duration: Date.now() - fcStart });
    } catch (e) {
      results.push({ service: 'FIRECRAWL', status: 'ERROR', message: String(e), duration: Date.now() - fcStart });
    }

    // C. GEMINI 3.0 PRO (Replacing Lovable)
    const aiStart = Date.now();
    try {
      const gemini = new GeminiClient(API_KEYS.GEMINI);
      // Test simple generation
      const reply = await gemini.generateContent("Ping", GEMINI_MODELS.FLASH); // Use Flash for quick health check
      results.push({ service: 'GEMINI_AI', status: 'OK', message: `Response: ${reply.slice(0, 20)}...`, duration: Date.now() - aiStart });
    } catch (e) {
      results.push({ service: 'GEMINI_AI', status: 'ERROR', message: String(e), duration: Date.now() - aiStart });
    }

    // D. LINKEDIN OSINT (via Firecrawl)
    // ... skipped for brevity in this refactor, relies on Firecrawl anyway ...

    const okCount = results.filter(r => r.status === 'OK').length;
    return new Response(JSON.stringify({ success: true, summary: { ok: okCount, total: results.length }, results }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: String(error) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
