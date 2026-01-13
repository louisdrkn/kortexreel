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
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object") {
      (parsed as any)._raw_text = text;
      return parsed;
    }
    return { value: parsed, _raw_text: text };
  } catch {
    return { raw: text, _raw_text: text };
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

interface SyncRequest {
  org_id: string;
  linkedin_cookie?: string;
  force_refresh?: boolean;
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

    const userAgent = req.headers.get("user-agent") || undefined;

    // Get Unipile API key
    // Prefer env var (managed server-side), fallback to system_secrets vault.
    const unipileApiKeyFromEnv = Deno.env.get("UNIPILE_API_KEY")?.trim();
    let unipileApiKey = unipileApiKeyFromEnv || "";

    if (!unipileApiKey) {
      const { data: secretData, error: secretError } = await supabase
        .from("system_secrets")
        .select("secret_value")
        .ilike("secret_name", "unipile_api_key")
        .single();

      if (secretError || !secretData?.secret_value) {
        console.error("Unipile API key not found:", secretError);
        return new Response(
          JSON.stringify({
            success: false,
            error: "Clé API Unipile non configurée",
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

    const body: SyncRequest = await req.json();

    console.log("Sync request:", {
      org_id: body.org_id,
      has_cookie: !!body.linkedin_cookie,
      force_refresh: body.force_refresh,
      has_user_agent: !!userAgent,
    });

    if (!body.org_id) {
      return new Response(JSON.stringify({ success: false, error: "Organization ID required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get organization's current settings
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("api_settings")
      .eq("id", body.org_id)
      .single();

    if (orgError || !org) {
      return new Response(JSON.stringify({ success: false, error: "Organisation non trouvée" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const currentSettings = (org.api_settings as Record<string, unknown>) || {};
    const existingAccountId = currentSettings.linkedin_account_id as string | undefined;
    const cookieToUse = body.linkedin_cookie?.trim() || (currentSettings.linkedin_cookie as string)?.trim();

    // If no cookie provided and no existing account, error
    if (!cookieToUse && !existingAccountId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Aucun cookie LinkedIn fourni. Entrez votre cookie li_at.",
          error_code: "NO_COOKIE",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 1: If we have an existing account, check its status first
    if (existingAccountId && !body.force_refresh) {
      console.log("[UNIPILE] Checking existing account:", existingAccountId);

      const checkResponse = await fetch(unipileUrl(unipileBaseUrl, `/accounts/${existingAccountId}`), {
        method: "GET",
        headers: unipileHeaders(unipileApiKey, false),
      });

      const accountData = await readJsonSafe(checkResponse);
      console.log("[UNIPILE] Account check:", {
        status: checkResponse.status,
        ok: checkResponse.ok,
        account_status: accountData?.status,
      });

      if (checkResponse.ok && (accountData?.status === "CONNECTED" || accountData?.status === "OK")) {
        const profileInfo = await fetchLinkedInProfile(unipileBaseUrl, unipileApiKey, existingAccountId);

        const updatedSettings = {
          ...currentSettings,
          linkedin_account_id: existingAccountId,
          linkedin_profile_name: profileInfo?.name || accountData?.name || "Profil LinkedIn",
          linkedin_status: "connected",
          linkedin_last_sync: new Date().toISOString(),
        };

        await supabase.from("organizations").update({ api_settings: updatedSettings }).eq("id", body.org_id);

        return new Response(
          JSON.stringify({
            success: true,
            status: "connected",
            account_id: existingAccountId,
            profile_name: profileInfo?.name || accountData?.name || "Profil LinkedIn",
            message: "Compte LinkedIn actif et synchronisé",
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("[UNIPILE] Existing account invalid, will attempt reconnection");
    }

    // Step 2: Create/reconnect account with cookie
    if (!cookieToUse) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Cookie LinkedIn expiré. Veuillez le rafraîchir.",
          error_code: "COOKIE_REQUIRED",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Creating/updating Unipile account with cookie...");

    // Unipile expects access_token (li_at) + (recommended) user_agent
    const createPayload: Record<string, unknown> = {
      provider: "LINKEDIN",
      access_token: cookieToUse,
      ...(userAgent ? { user_agent: userAgent } : {}),
    };

    const createResponse = await fetch(unipileUrl(unipileBaseUrl, "/accounts"), {
      method: "POST",
      headers: unipileHeaders(unipileApiKey, true),
      body: JSON.stringify(createPayload),
    });

    const createResult = await readJsonSafe(createResponse);

    console.log("Unipile create response:", {
      status: createResponse.status,
      ok: createResponse.ok,
      object: createResult?.object,
      has_account_id: !!createResult?.account_id,
      checkpoint_type: createResult?.checkpoint?.type,
      error_type: createResult?.type,
      title: createResult?.title,
    });

    // Check for checkpoints / 2FA
    if (createResponse.status === 202 || createResult?.object === "Checkpoint") {
      const updatedSettings = {
        ...currentSettings,
        linkedin_cookie: cookieToUse,
        linkedin_account_id: createResult.account_id,
        linkedin_status: "2fa_pending",
      };

      await supabase.from("organizations").update({ api_settings: updatedSettings }).eq("id", body.org_id);

      return new Response(
        JSON.stringify({
          success: false,
          status: "2fa_required",
          account_id: createResult.account_id,
          message: "Code de vérification LinkedIn requis",
          error_code: "2FA_REQUIRED",
          details: createResult,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for errors
    if (!createResponse.ok) {
      console.error("[Unipile] Create account failed:", {
        status: createResponse.status,
        body: createResult,
      });

      const status = createResponse.status;
      const rawText = String((createResult as any)?._raw_text ?? (createResult as any)?.raw ?? "");
      const type = String((createResult as any)?.type ?? "");
      const title = String((createResult as any)?.title ?? "");
      const message = String((createResult as any)?.message ?? "");
      const rawLower = rawText.toLowerCase();

      let reason: "api_key" | "cookie" | "other" = "other";
      let errorMessage = message || title;

      if (status === 401) {
        const looksLikeApiKey =
          rawLower.includes("api key") ||
          type.toLowerCase().includes("api_key") ||
          title.toLowerCase().includes("api key") ||
          message.toLowerCase().includes("api key");

        if (looksLikeApiKey) {
          reason = "api_key";
          errorMessage = "La clé API Unipile est refusée. Vérifiez vos secrets.";
        } else {
          reason = "cookie";
          errorMessage = "Le cookie LinkedIn est invalide ou expiré.";
        }
      } else if (status === 400) {
        reason = "cookie";
        errorMessage = "Le cookie LinkedIn est invalide ou expiré.";
      } else if (!errorMessage) {
        errorMessage = rawText ? rawText.slice(0, 500) : "Erreur de connexion Unipile";
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: errorMessage,
          reason,
          error_code: "UNIPILE_ERROR",
          http_status: status,
          unipile_raw: rawText ? rawText.slice(0, 2000) : undefined,
          details: { ...createResult, status },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Success! Account created/connected
    const newAccountId = createResult.account_id;
    console.log("Account connected successfully:", newAccountId);

    const profileInfo = await fetchLinkedInProfile(unipileBaseUrl, unipileApiKey, newAccountId);

    const updatedSettings = {
      ...currentSettings,
      linkedin_cookie: cookieToUse,
      linkedin_account_id: newAccountId,
      linkedin_profile_name: profileInfo?.name || createResult.name || "Profil LinkedIn",
      linkedin_status: "connected",
      linkedin_connected_at: new Date().toISOString(),
      linkedin_last_sync: new Date().toISOString(),
    };

    await supabase.from("organizations").update({ api_settings: updatedSettings }).eq("id", body.org_id);

    return new Response(
      JSON.stringify({
        success: true,
        status: "connected",
        account_id: newAccountId,
        profile_name: profileInfo?.name || createResult.name || "Profil LinkedIn",
        message: `Connecté en tant que ${profileInfo?.name || "LinkedIn"}`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in sync-unipile-account:", error);

    let errorMessage = "Erreur serveur interne";
    let errorCode = "SERVER_ERROR";

    if (error instanceof Error && error.message.includes("Configuration manquante")) {
      errorMessage = error.message;
      errorCode = "CONFIG_ERROR";
    }

    return new Response(JSON.stringify({ success: false, error: errorMessage, error_code: errorCode }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Helper function to fetch LinkedIn profile info via Unipile
async function fetchLinkedInProfile(
  unipileBaseUrl: string,
  apiKey: string,
  accountId: string
): Promise<{ name?: string } | null> {
  try {
    const response = await fetch(unipileUrl(unipileBaseUrl, `/users/me?account_id=${accountId}`), {
      method: "GET",
      headers: unipileHeaders(apiKey, false),
    });

    if (!response.ok) {
      const body = await readJsonSafe(response);
      console.warn("[UNIPILE] Profile fetch failed:", { status: response.status, body });
      return null;
    }

    const data = await readJsonSafe(response);
    console.log("Profile fetched:", { name: data.name || data.first_name });

    return {
      name: data.name || `${data.first_name || ""} ${data.last_name || ""}`.trim() || undefined,
    };
  } catch (error) {
    console.error("Error fetching profile:", error);
    return null;
  }
}
