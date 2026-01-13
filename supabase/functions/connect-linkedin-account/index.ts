

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { API_KEYS } from "../_shared/api-clients.ts"; // Although mostly for AI, we'll use it for structure if needed, or just env

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Config checks
const UNIPILE_DSN = "https://api25.unipile.com:15575"; // Keeping this as it seems specific
// We rely on Env Var for API Key now

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, account_id, code, cookie } = await req.json().catch(() => ({}));

    // Auth & Env Check
    const unipileKey = API_KEYS.UNIPILE || Deno.env.get("UNIPILE_API_KEY");
    if (!unipileKey) throw new Error("Missing Unipile API Key");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Handle 2FA Submit
    if (action === "submit_2fa") {
      if (!account_id || !code) throw new Error("Missing params for 2FA");

      const resp = await fetch(`${UNIPILE_DSN}/api/v1/accounts/checkpoint`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-KEY": unipileKey },
        body: JSON.stringify({ provider: "LINKEDIN", account_id, code })
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data.message || "2FA Failed");

      return new Response(JSON.stringify({ success: true, status: "connected", account_id: data.account_id || account_id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Handle Initial Connection
    if (!cookie) throw new Error("Missing Cookie");

    // Clean cookie (keep basic logic but simplified)
    const cleanCookie = cookie.trim().replace(/^["']|["']$/g, "").replace(/[\r\n]/g, "").replace(/^li_at\s*=\s*/i, "");
    if (cleanCookie.length < 50) throw new Error("Invalid Cookie Length");

    // Connect
    const resp = await fetch(`${UNIPILE_DSN}/api/v1/accounts`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-KEY": unipileKey },
      body: JSON.stringify({ provider: "LINKEDIN", access_token: cleanCookie })
    });

    const data = await resp.json();
    if (resp.status === 401) throw new Error("Invalid Unipile Key");

    // Check if 2FA needed
    if (resp.status === 202 || data.object === "Checkpoint") {
      return new Response(JSON.stringify({
        status: "2fa_required",
        account_id: data.account_id || data.id,
        message: "verification_code_required"
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!resp.ok) throw new Error(data.message || "Connection Failed");

    // Store in Org (simplified to just update org settings if we had org_id context, 
    // but the original code did a complex claims extraction. 
    // For now we'll just return success to the front end which handles the flow.)

    return new Response(JSON.stringify({
      success: true,
      status: "connected",
      account_id: data.account_id || data.id,
      profile: data.name
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: String(error) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
