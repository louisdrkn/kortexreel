import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizeUnipileBaseUrl(raw: string): string {
  const base = raw.startsWith("http://") || raw.startsWith("https://") ? raw : `https://${raw}`;
  const cleaned = base.replace(/\/+$/, "");
  return cleaned.endsWith("/api/v1") ? cleaned : `${cleaned}/api/v1`;
}

function unipileUrl(baseUrl: string, path: string): string {
  const cleanBase = baseUrl.replace(/\/+$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${cleanBase}${cleanPath}`;
}

function getUnipileBaseUrl(): string {
  // Priorité: UNIPILE_DSN puis UNIPILE_BASE_URL
  const dsnRaw = Deno.env.get("UNIPILE_DSN")?.trim();
  if (dsnRaw) {
    if (/^https?:\/\//i.test(dsnRaw)) {
      const normalized = normalizeUnipileBaseUrl(dsnRaw);
      console.log(`[Unipile] Using UNIPILE_DSN as URL: ${new URL(normalized).host}`);
      return normalized;
    }

    const hostPort = dsnRaw.match(/^([a-zA-Z0-9.-]+):(\d+)$/);
    if (hostPort) {
      const [, hostMaybe, port] = hostPort;
      const host = hostMaybe.includes(".") ? hostMaybe : `${hostMaybe}.unipile.com`;
      const normalized = normalizeUnipileBaseUrl(`https://${host}:${port}`);
      console.log(`[Unipile] Using UNIPILE_DSN host: ${new URL(normalized).host}`);
      return normalized;
    }

    if (/^[a-zA-Z0-9.-]+$/.test(dsnRaw)) {
      const host = dsnRaw.includes(".") ? dsnRaw : `${dsnRaw}.unipile.com`;
      const normalized = normalizeUnipileBaseUrl(`https://${host}:13443`);
      console.log(`[Unipile] Using UNIPILE_DSN host (default port): ${new URL(normalized).host}`);
      return normalized;
    }
  }

  const rawBase = Deno.env.get("UNIPILE_BASE_URL")?.trim();
  if (rawBase) {
    const normalized = normalizeUnipileBaseUrl(rawBase);
    console.log(`[Unipile] Using UNIPILE_BASE_URL: ${new URL(normalized).host}`);
    return normalized;
  }

  throw new Error("Configuration manquante : UNIPILE_DSN ou UNIPILE_BASE_URL introuvable.");
}

async function readJsonSafe(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function unipileHeaders(apiKey: string, withJson = false): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "X-API-KEY": apiKey,
  };
  if (withJson) headers["Content-Type"] = "application/json";
  return headers;
}

interface SendConnectionRequest {
  lead_id: string;
  linkedin_url: string;
  message?: string;
  org_id: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: SendConnectionRequest = await req.json();
    const { lead_id, linkedin_url, message, org_id } = body;

    console.log("📤 Send connection request:", { lead_id, linkedin_url, org_id });

    if (!lead_id || !linkedin_url || !org_id) {
      return new Response(JSON.stringify({ success: false, error: "lead_id, linkedin_url et org_id sont requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get Unipile API key
    const unipileApiKeyFromEnv = Deno.env.get("UNIPILE_API_KEY")?.trim();
    let unipileApiKey = unipileApiKeyFromEnv || "";

    if (!unipileApiKey) {
      const { data: secretData, error: secretError } = await supabase
        .from("system_secrets")
        .select("secret_value")
        .ilike("secret_name", "unipile_api_key")
        .single();

      if (secretError || !secretData?.secret_value) {
        console.error("❌ Unipile API key not found:", secretError);
        return new Response(
          JSON.stringify({
            success: false,
            error: "Clé API Unipile non configurée. Configurez la connexion LinkedIn dans les paramètres.",
            error_code: "UNIPILE_KEY_MISSING",
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      unipileApiKey = String(secretData.secret_value).trim();
      console.log("[Unipile] API key source: system_secrets");
    } else {
      console.log("[Unipile] API key source: env");
    }

    const unipileBaseUrl = getUnipileBaseUrl();

    const { data: orgData, error: orgError } = await supabase
      .from("organizations")
      .select("api_settings")
      .eq("id", org_id)
      .single();

    if (orgError || !orgData?.api_settings) {
      console.error("❌ Organization not found:", orgError);
      return new Response(
        JSON.stringify({ success: false, error: "Organisation non trouvée", error_code: "ORG_NOT_FOUND" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiSettings = orgData.api_settings as Record<string, unknown>;
    const unipileAccountId =
      (apiSettings?.linkedin_account_id as string | undefined) ??
      (apiSettings?.unipile_account_id as string | undefined);

    if (!unipileAccountId) {
      console.error("❌ No Unipile account linked to this org");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Aucun compte LinkedIn connecté. Allez dans Paramètres > Infrastructure pour lier votre compte LinkedIn.",
          error_code: "NO_LINKEDIN_ACCOUNT",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("🔗 Using Unipile account:", unipileAccountId);

    // Extract LinkedIn profile ID from URL
    const linkedinMatch = linkedin_url.match(/linkedin\.com\/in\/([^/?]+)/);
    if (!linkedinMatch) {
      return new Response(
        JSON.stringify({ success: false, error: "URL LinkedIn invalide", error_code: "INVALID_LINKEDIN_URL" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const profileId = linkedinMatch[1];

    // Step 1: Resolve provider_id
    console.log("🔍 Resolving LinkedIn profile...");
    const profileResponse = await fetch(unipileUrl(unipileBaseUrl, `/users/${profileId}?account_id=${unipileAccountId}`), {
      method: "GET",
      headers: unipileHeaders(unipileApiKey, false),
    });

    const profileData = await readJsonSafe(profileResponse);
    let recipientId = profileId;

    if (profileResponse.ok && profileData?.provider_id) {
      recipientId = profileData.provider_id;
      console.log("✅ Resolved provider_id:", recipientId);
    } else if (!profileResponse.ok) {
      console.warn("⚠️ Could not resolve profile:", { status: profileResponse.status, body: profileData });
    }

    // Step 2: Send connection invitation
    console.log("📨 Sending connection invitation...");

    const invitationBody: Record<string, unknown> = {
      account_id: unipileAccountId,
      provider_id: recipientId,
    };

    if (message && message.trim()) {
      invitationBody.message = message.trim().substring(0, 300);
    }

    const inviteResponse = await fetch(unipileUrl(unipileBaseUrl, "/users/invite"), {
      method: "POST",
      headers: unipileHeaders(unipileApiKey, true),
      body: JSON.stringify(invitationBody),
    });

    const inviteResult = await readJsonSafe(inviteResponse);
    console.log("📬 Invitation response:", { status: inviteResponse.status, ok: inviteResponse.ok, body: inviteResult });

    if (!inviteResponse.ok) {
      if (inviteResult?.error?.includes("already") || inviteResult?.message?.includes("already")) {
        await supabase
          .from("leads")
          .update({ pipeline_stage: "contacted", notes: `[${new Date().toISOString()}] Déjà connecté sur LinkedIn` })
          .eq("id", lead_id);

        return new Response(
          JSON.stringify({ success: true, message: "Déjà connecté avec ce contact", status: "already_connected" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (inviteResult?.error?.includes("pending") || inviteResult?.message?.includes("pending")) {
        await supabase
          .from("leads")
          .update({ pipeline_stage: "contacted", notes: `[${new Date().toISOString()}] Invitation déjà en attente` })
          .eq("id", lead_id);

        return new Response(
          JSON.stringify({ success: true, message: "Invitation déjà envoyée (en attente)", status: "invitation_pending" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: inviteResult?.error || inviteResult?.message || "Erreur lors de l'envoi de l'invitation",
          error_code: "INVITATION_FAILED",
          details: { ...inviteResult, status: inviteResponse.status },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 3: Update lead status
    const { error: updateError } = await supabase
      .from("leads")
      .update({ pipeline_stage: "contacted", notes: `[${new Date().toISOString()}] Invitation LinkedIn envoyée via Unipile` })
      .eq("id", lead_id);

    if (updateError) console.warn("⚠️ Failed to update lead status:", updateError);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Invitation LinkedIn envoyée avec succès!",
        status: "invitation_sent",
        invitation_id: inviteResult?.id || null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("❌ Error in send-connection-request:", error);

    let errorMessage = error instanceof Error ? error.message : "Erreur serveur";
    let errorCode = "SERVER_ERROR";

    if (error instanceof Error && error.message.includes("Configuration manquante")) {
      errorCode = "CONFIG_ERROR";
    }

    return new Response(JSON.stringify({ success: false, error: errorMessage, error_code: errorCode }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
