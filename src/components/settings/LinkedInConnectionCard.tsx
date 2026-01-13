import { useState, useEffect } from "react";
import { Linkedin, Loader2, CheckCircle2, XCircle, Cookie, Send, RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type ConnectionStatus = "disconnected" | "connecting" | "2fa_required" | "connected";

interface LinkedInConnectionCardProps {
  orgId: string | null;
  apiSettings: Record<string, string>;
  onConnectionChange: () => void;
}

export const LinkedInConnectionCard = ({
  orgId,
  apiSettings,
  onConnectionChange,
}: LinkedInConnectionCardProps) => {
  const { toast } = useToast();
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [isSyncing, setIsSyncing] = useState(false);
  
  // UN SEUL CHAMP COOKIE
  const [cookie, setCookie] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [accountId, setAccountId] = useState<string | null>(null);
  
  // Error/Debug message
  const [debugMessage, setDebugMessage] = useState<string | null>(null);
  
  // Connected profile info
  const [profileName, setProfileName] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  useEffect(() => {
    if (apiSettings?.linkedin_account_id) {
      setStatus("connected");
      setProfileName(apiSettings.linkedin_profile_name || "Profil LinkedIn");
      setLastSyncTime(apiSettings.linkedin_last_sync || null);
    }
  }, [apiSettings]);

  const handleConnect = async () => {
    setStatus("connecting");
    setDebugMessage(null);

    // Validation stricte côté client
    const trimmedCookie = cookie.trim();
    if (!trimmedCookie) {
      setStatus("disconnected");
      setDebugMessage("❌ Le champ cookie est vide. Collez votre li_at.");
      toast({
        title: "Cookie manquant",
        description: "Collez votre cookie li_at dans le champ.",
        variant: "destructive",
        duration: 5000,
      });
      return;
    }

    if (trimmedCookie.length < 50) {
      setStatus("disconnected");
      setDebugMessage(`❌ Cookie trop court (${trimmedCookie.length} caractères). Un li_at valide fait ~500+ caractères.`);
      toast({
        title: "Cookie invalide",
        description: `Cookie trop court (${trimmedCookie.length} chars). Vérifiez que vous avez copié la valeur complète.`,
        variant: "destructive",
        duration: 5000,
      });
      return;
    }

    console.log("📤 Envoi cookie au backend - Longueur:", trimmedCookie.length);

    try {
      const { data, error } = await supabase.functions.invoke("connect-linkedin-account", {
        body: { cookie: trimmedCookie },
      });

      // Erreur technique (réseau, crash serveur)
      if (error) {
        setStatus("disconnected");
        const msg = `❌ Erreur Technique: ${error.message}`;
        setDebugMessage(msg);
        toast({
          title: "Erreur Technique",
          description: error.message,
          variant: "destructive",
          duration: 5000,
        });
        console.error("Supabase invoke error:", error);
        return;
      }

      // Mode debug: erreur Unipile renvoyée en 200
      if (data && data.success === false) {
        const msg = data.debug_error || data.debug_message || "Erreur Unipile (détails indisponibles)";
        setStatus("disconnected");
        setDebugMessage(`🔴 ${msg}`);
        toast({
          title: "Erreur Unipile",
          description: msg,
          variant: "destructive",
          duration: 8000,
        });
        console.error("Backend debug error:", msg);
        return;
      }

      // Demande 2FA
      if (data?.status === "2fa_required") {
        setStatus("2fa_required");
        setAccountId(data.account_id);
        setDebugMessage("🔐 LinkedIn demande une vérification. Code envoyé sur votre téléphone/email.");
        toast({
          title: "Vérification requise",
          description: data.message || "Entrez le code de vérification LinkedIn.",
        });
        return;
      }

      // Erreur explicite du backend
      if (data?.error) {
        setStatus("disconnected");
        setDebugMessage(`🔴 ${data.error}`);
        toast({
          title: "Échec de connexion",
          description: data.error,
          variant: "destructive",
          duration: 5000,
        });
        return;
      }

      // Succès
      if (data?.success) {
        setStatus("connected");
        setProfileName(data.profile_name || "Profil LinkedIn");
        setDebugMessage(null);
        onConnectionChange();
        toast({
          title: "🟢 Compte Connecté",
          description: `Connecté en tant que ${data.profile_name || "LinkedIn"}`,
        });
      }
    } catch (err) {
      console.error("Connection error:", err);
      setStatus("disconnected");
      const msg = err instanceof Error ? err.message : "Erreur inconnue";
      setDebugMessage(`❌ Exception: ${msg}`);
      toast({
        title: "Erreur",
        description: msg,
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  const handleSubmit2FA = async () => {
    if (!accountId) return;

    setStatus("connecting");
    setDebugMessage(null);

    try {
      const { data, error } = await supabase.functions.invoke("connect-linkedin-account", {
        body: {
          action: "submit_2fa",
          account_id: accountId,
          code: twoFactorCode.trim(),
        },
      });

      if (error) {
        setStatus("2fa_required");
        setDebugMessage(`❌ Erreur Technique: ${error.message}`);
        toast({
          title: "Erreur Technique",
          description: error.message,
          variant: "destructive",
          duration: 5000,
        });
        return;
      }

      // Mode debug
      if (data && data.success === false) {
        const msg = data.debug_error || data.debug_message || "Erreur Unipile";
        setStatus("2fa_required");
        setDebugMessage(`🔴 ${msg}`);
        toast({
          title: "Erreur Unipile",
          description: msg,
          variant: "destructive",
          duration: 8000,
        });
        return;
      }

      if (data?.error) {
        setStatus("2fa_required");
        setDebugMessage(`🔴 ${data.error}`);
        toast({
          title: "Code invalide",
          description: data.error,
          variant: "destructive",
          duration: 5000,
        });
        return;
      }

      if (data?.success) {
        setStatus("connected");
        setProfileName(data.profile_name || "Profil LinkedIn");
        setDebugMessage(null);
        onConnectionChange();
        toast({
          title: "🟢 Compte Connecté",
          description: `Connecté en tant que ${data.profile_name || "LinkedIn"}`,
        });
      }
    } catch (err) {
      console.error("2FA error:", err);
      setStatus("2fa_required");
      const msg = err instanceof Error ? err.message : "Erreur inconnue";
      setDebugMessage(`❌ Exception: ${msg}`);
      toast({
        title: "Erreur",
        description: msg,
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  const handleSync = async () => {
    if (!orgId) return;
    
    setIsSyncing(true);
    setDebugMessage(null);

    try {
      const { data, error } = await supabase.functions.invoke("sync-unipile-account", {
        body: { 
          org_id: orgId,
          linkedin_cookie: cookie.trim() || undefined,
          force_refresh: false
        },
      });

      if (error) {
        setDebugMessage(`❌ Sync error: ${error.message}`);
        toast({
          title: "Erreur",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      if (data?.success) {
        setStatus("connected");
        setProfileName(data.profile_name);
        setLastSyncTime(new Date().toISOString());
        onConnectionChange();
        toast({
          title: "🟢 Synchronisation réussie",
          description: data.message || `Compte actif: ${data.account_id}`,
        });
      } else {
        setDebugMessage(`🔴 ${data?.error || "Erreur de sync"}`);
        toast({
          title: "Erreur de synchronisation",
          description: data?.error || "Échec",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Sync error:", err);
      setDebugMessage("❌ Erreur de connexion au serveur");
      toast({
        title: "Erreur",
        description: "Impossible de synchroniser",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!orgId) return;

    try {
      const { data: org } = await supabase
        .from("organizations")
        .select("api_settings")
        .eq("id", orgId)
        .single();

      const currentSettings = (org?.api_settings || {}) as Record<string, unknown>;
      
      const updatedSettings = { ...currentSettings };
      delete updatedSettings.linkedin_account_id;
      delete updatedSettings.linkedin_profile_name;
      delete updatedSettings.linkedin_connected_at;

      await supabase
        .from("organizations")
        .update({ api_settings: updatedSettings as any })
        .eq("id", orgId);

      setStatus("disconnected");
      setProfileName(null);
      setCookie("");
      setTwoFactorCode("");
      setAccountId(null);
      setDebugMessage(null);
      onConnectionChange();
      
      toast({
        title: "Déconnecté",
        description: "Le compte LinkedIn a été déconnecté",
      });
    } catch (err) {
      console.error("Disconnect error:", err);
      toast({
        title: "Erreur",
        description: "Impossible de déconnecter",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="bg-[#18181B] border border-[#27272A] rounded-xl p-6">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="h-12 w-12 rounded-lg bg-[#0A66C2]/10 flex items-center justify-center flex-shrink-0">
          <Linkedin className="h-6 w-6 text-[#0A66C2]" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="font-semibold text-white">Connecter mon Profil LinkedIn</h3>
            {status === "connected" && (
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Connecté
              </Badge>
            )}
            {status === "connecting" && (
              <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-xs">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Synchronisation...
              </Badge>
            )}
            {status === "2fa_required" && (
              <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Vérification 2FA
              </Badge>
            )}
          </div>
          <p className="text-sm text-[#71717A] mb-4">
            Envoyez des messages aux prospects directement depuis Kortex
          </p>

          {/* Connected State */}
          {status === "connected" && profileName && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{profileName}</p>
                  <p className="text-xs text-[#71717A]">
                    Canal LinkedIn opérationnel
                    {lastSyncTime && (
                      <span className="ml-2">
                        • Synchro: {new Date(lastSyncTime).toLocaleDateString('fr-FR', { 
                          day: '2-digit', 
                          month: 'short', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="flex-1 border-[#3F3F46] bg-transparent text-white hover:bg-white/10"
                >
                  {isSyncing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Synchronisation...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Tester & Synchroniser
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDisconnect}
                  className="border-red-500/30 bg-transparent text-red-400 hover:bg-red-500/10"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Déconnecter
                </Button>
              </div>

              {debugMessage && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-sm text-red-400 font-mono whitespace-pre-wrap">{debugMessage}</p>
                </div>
              )}
            </div>
          )}

          {/* 2FA Input */}
          {status === "2fa_required" && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                <p className="text-sm text-blue-300 mb-3">
                  Un code de sécurité a été envoyé à votre téléphone ou email LinkedIn.
                </p>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value)}
                    placeholder="Code de sécurité"
                    maxLength={8}
                    className="bg-[#121214] border-[#3F3F46] text-white placeholder:text-[#52525B] focus:border-[#8B5CF6] focus:ring-[#8B5CF6]/20 h-11 rounded-lg font-mono text-center text-lg tracking-widest"
                  />
                  <Button
                    onClick={handleSubmit2FA}
                    disabled={!twoFactorCode.trim()}
                    className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white h-11 px-6 rounded-lg"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {debugMessage && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-sm text-red-400 font-mono whitespace-pre-wrap">{debugMessage}</p>
                </div>
              )}
            </div>
          )}

          {/* Connection Form - SINGLE COOKIE INPUT */}
          {(status === "disconnected" || status === "connecting") && !profileName && (
            <div className="space-y-4">
              {/* Cookie Input - UN SEUL CHAMP */}
              <div className="space-y-2">
                <Label className="text-[#A1A1AA] text-sm flex items-center gap-2">
                  <Cookie className="h-4 w-4" />
                  Cookie li_at (obligatoire)
                </Label>
                <Input
                  type="text"
                  value={cookie}
                  onChange={(e) => setCookie(e.target.value)}
                  placeholder="Collez votre cookie li_at ici (commence par AQE...)"
                  className="bg-[#121214] border-[#3F3F46] text-white placeholder:text-[#52525B] focus:border-[#8B5CF6] focus:ring-[#8B5CF6]/20 h-11 rounded-lg font-mono text-sm"
                />
                <p className="text-xs text-[#52525B]">
                  💡 Récupérez votre cookie li_at depuis les DevTools de votre navigateur (Application → Cookies → linkedin.com).
                  <a 
                    href="https://www.google.com/search?q=how+to+get+linkedin+li_at+cookie" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[#8B5CF6] hover:underline ml-1"
                  >
                    Comment l'obtenir ?
                  </a>
                </p>
              </div>

              {/* Debug Message */}
              {debugMessage && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <p className="text-sm text-amber-400 font-mono whitespace-pre-wrap">{debugMessage}</p>
                </div>
              )}

              {/* Connect Button */}
              <Button
                onClick={handleConnect}
                disabled={status === "connecting" || !cookie.trim()}
                className="w-full bg-[#0A66C2] hover:bg-[#004182] text-white h-11 rounded-lg font-medium"
              >
                {status === "connecting" ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Connexion aux serveurs LinkedIn...
                  </>
                ) : (
                  <>
                    <Linkedin className="h-4 w-4 mr-2" />
                    Connecter LinkedIn
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
