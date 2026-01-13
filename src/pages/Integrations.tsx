import { useState, useEffect } from "react";
import { Linkedin, Settings2, CheckCircle2, XCircle, Loader2, Eye, EyeOff, Shield, Activity, Database, Globe, Brain, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useProject } from "@/contexts/ProjectContext";
import { CRMIntegrationHub } from "@/components/integrations";
import { useAuth } from "@/contexts/AuthContext";

interface LinkedInCredentials {
  liAtCookie: string;
  salesNavTeamId: string;
}

interface TestResult {
  service: string;
  status: 'OK' | 'ERROR' | 'SKIPPED';
  message: string;
  duration: number;
}

interface DiagnosticReport {
  success: boolean;
  summary?: { total: number; ok: number; errors: number };
  results?: TestResult[];
  report?: string;
  logs?: string[];
  error?: string;
}

export default function Integrations() {
  const { toast } = useToast();
  const { currentProject } = useProject();
  const { user } = useAuth();
  const [credentials, setCredentials] = useState<LinkedInCredentials>({
    liAtCookie: "",
    salesNavTeamId: "",
  });
  const [showCookie, setShowCookie] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "connected" | "error">("idle");
  
  // Diagnostic state
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagnosticReport, setDiagnosticReport] = useState<DiagnosticReport | null>(null);

  // SECURITY: Removed localStorage usage for LinkedIn credentials
  // Users should use the proper OAuth implementation via Settings > Infrastructure > LinkedIn Connection Card
  // which stores credentials server-side in organizations.api_settings

  const handleSaveCredentials = async () => {
    if (!credentials.liAtCookie.trim()) {
      toast({
        title: "Cookie requis",
        description: "Le cookie li_at est nécessaire pour la connexion LinkedIn",
        variant: "destructive",
      });
      return;
    }

    // Redirect users to use the secure LinkedIn connection method
    toast({
      title: "Méthode dépréciée",
      description: "Veuillez utiliser Paramètres > Infrastructure > Connexion LinkedIn pour une connexion sécurisée",
      variant: "destructive",
    });
  };

  const handleTestConnection = async () => {
    // Redirect users to use the secure LinkedIn connection method
    toast({
      title: "Méthode dépréciée",
      description: "Veuillez utiliser Paramètres > Infrastructure > Connexion LinkedIn pour tester la connexion de manière sécurisée",
      variant: "destructive",
    });
  };

  const handleDisconnect = () => {
    // Clear any legacy localStorage data if present (migration cleanup)
    localStorage.removeItem("linkedin_credentials");
    setCredentials({ liAtCookie: "", salesNavTeamId: "" });
    setConnectionStatus("idle");
    toast({
      title: "Données locales supprimées",
      description: "Veuillez gérer votre connexion LinkedIn via Paramètres > Infrastructure",
    });
  };

  const runDiagnostic = async () => {
    setIsDiagnosing(true);
    setDiagnosticReport(null);

    try {
      const { data, error } = await supabase.functions.invoke('system-health-check', {
        body: {
          projectId: currentProject?.id,
          userId: user?.id,
          liAtCookie: credentials.liAtCookie,
        },
      });

      if (error) {
        throw error;
      }

      setDiagnosticReport(data as DiagnosticReport);
      
      if (data.success) {
        toast({
          title: "Diagnostic terminé",
          description: `${data.summary.ok}/${data.summary.total} services opérationnels`,
          variant: data.summary.errors > 0 ? "destructive" : "default",
        });
      }
    } catch (err) {
      console.error('Diagnostic error:', err);
      setDiagnosticReport({
        success: false,
        error: err instanceof Error ? err.message : 'Erreur inconnue',
      });
      toast({
        title: "Échec du diagnostic",
        description: err instanceof Error ? err.message : 'Erreur inconnue',
        variant: "destructive",
      });
    } finally {
      setIsDiagnosing(false);
    }
  };

  const getServiceIcon = (service: string) => {
    switch (service) {
      case 'DATABASE':
      case 'STORAGE':
        return <Database className="h-4 w-4" />;
      case 'FIRECRAWL':
        return <Globe className="h-4 w-4" />;
      case 'AI':
        return <Brain className="h-4 w-4" />;
      case 'LINKEDIN_OSINT':
        return <Linkedin className="h-4 w-4" />;
      case 'HUNTER':
        return <Mail className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-background p-6 lg:p-10">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
            <Settings2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Intégrations</h1>
            <p className="text-muted-foreground">Connectez votre LinkedIn — l'IA, le scraping et l'enrichissement email sont fournis par la plateforme</p>
          </div>
        </div>

        {/* LinkedIn Sales Navigator Card */}
        <Card className="border-border shadow-soft">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0077B5]/10">
                  <Linkedin className="h-6 w-6 text-[#0077B5]" />
                </div>
                <div>
                  <CardTitle className="flex items-center gap-2">
                    LinkedIn Sales Navigator
                    {connectionStatus === "connected" && (
                      <Badge variant="default" className="bg-emerald-500">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Connecté
                      </Badge>
                    )}
                    {connectionStatus === "error" && (
                      <Badge variant="destructive">
                        <XCircle className="h-3 w-3 mr-1" />
                        Erreur
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Recherche automatique de décideurs et envoi de messages
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Security Notice */}
            <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <Shield className="h-5 w-5 text-amber-500 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-500">Sécurité</p>
                <p className="text-muted-foreground">
                  Vos identifiants sont stockés localement dans votre navigateur et ne sont jamais envoyés à nos serveurs.
                </p>
              </div>
            </div>

            {/* Cookie Input */}
            <div className="space-y-2">
              <Label htmlFor="li_at">Cookie de session (li_at) *</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="li_at"
                    type={showCookie ? "text" : "password"}
                    value={credentials.liAtCookie}
                    onChange={(e) => setCredentials(prev => ({ ...prev, liAtCookie: e.target.value }))}
                    placeholder="AQEDAQNyZmVy..."
                    className="pr-10 font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCookie(!showCookie)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showCookie ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Trouvez ce cookie dans Chrome DevTools → Application → Cookies → linkedin.com → li_at
              </p>
            </div>

            {/* Team ID Input */}
            <div className="space-y-2">
              <Label htmlFor="team_id">Sales Nav Team ID (optionnel)</Label>
              <Input
                id="team_id"
                value={credentials.salesNavTeamId}
                onChange={(e) => setCredentials(prev => ({ ...prev, salesNavTeamId: e.target.value }))}
                placeholder="123456789"
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Nécessaire uniquement si vous utilisez Sales Navigator Team
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4 border-t border-border">
              <Button
                onClick={handleTestConnection}
                disabled={isTesting || !credentials.liAtCookie.trim()}
                variant="outline"
              >
                {isTesting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Test en cours...
                  </>
                ) : (
                  "Tester la connexion"
                )}
              </Button>
              
              <Button
                onClick={handleSaveCredentials}
                disabled={!credentials.liAtCookie.trim()}
              >
                Sauvegarder
              </Button>

              {connectionStatus === "connected" && (
                <Button
                  variant="ghost"
                  onClick={handleDisconnect}
                  className="text-destructive hover:text-destructive"
                >
                  Déconnecter
                </Button>
              )}
            </div>

            {/* Help Section */}
            <div className="pt-4 border-t border-border">
              <p className="text-sm font-medium mb-2">Comment obtenir le cookie li_at :</p>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Connectez-vous à LinkedIn dans Chrome</li>
                <li>Ouvrez DevTools (F12)</li>
                <li>Allez dans Application → Cookies → linkedin.com</li>
                <li>Copiez la valeur du cookie "li_at"</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        {/* DIAGNOSTIC API CARD */}
        <Card className="border-2 border-primary/50 shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Activity className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  🏥 Diagnostic Système
                </CardTitle>
                <CardDescription>
                  Vérifiez la connectivité de tous les services API
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={runDiagnostic}
              disabled={isDiagnosing}
              size="lg"
              className="w-full"
            >
              {isDiagnosing ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Test en cours...
                </>
              ) : (
                <>
                  <Activity className="h-5 w-5 mr-2" />
                  🏥 LANCER DIAGNOSTIC API
                </>
              )}
            </Button>

            {/* Results Grid */}
            {diagnosticReport?.results && (
              <div className="grid gap-2 mt-4">
                {diagnosticReport.results.map((result, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      result.status === 'OK' 
                        ? 'bg-emerald-500/10 border-emerald-500/30' 
                        : 'bg-destructive/10 border-destructive/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={result.status === 'OK' ? 'text-emerald-500' : 'text-destructive'}>
                        {getServiceIcon(result.service)}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{result.service}</p>
                        <p className="text-xs text-muted-foreground">{result.message}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{result.duration}ms</span>
                      {result.status === 'OK' ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-destructive" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Summary */}
            {diagnosticReport?.summary && (
              <div className="flex items-center justify-center gap-4 p-4 rounded-lg bg-muted/50 mt-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-emerald-500">{diagnosticReport.summary.ok}</p>
                  <p className="text-xs text-muted-foreground">OK</p>
                </div>
                <div className="h-8 w-px bg-border" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-destructive">{diagnosticReport.summary.errors}</p>
                  <p className="text-xs text-muted-foreground">Erreurs</p>
                </div>
                <div className="h-8 w-px bg-border" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{diagnosticReport.summary.total}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>
            )}

            {/* Console Log Output */}
            {diagnosticReport?.report && (
              <div className="mt-4">
                <Label className="mb-2 block">Rapport Complet (copier-coller)</Label>
                <pre className="bg-slate-900 text-emerald-400 p-4 rounded-lg text-xs font-mono overflow-auto max-h-60 whitespace-pre-wrap">
{diagnosticReport.report}
                </pre>
              </div>
            )}

            {/* Logs */}
            {diagnosticReport?.logs && diagnosticReport.logs.length > 0 && (
              <div className="mt-4">
                <Label className="mb-2 block">Logs de Debug</Label>
                <pre className="bg-slate-800 text-slate-300 p-4 rounded-lg text-xs font-mono overflow-auto max-h-40 whitespace-pre-wrap">
{diagnosticReport.logs.join('\n')}
                </pre>
              </div>
            )}

            {/* Error */}
            {diagnosticReport?.error && (
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 mt-4">
                <p className="text-sm text-destructive font-medium">Erreur critique</p>
                <p className="text-xs text-destructive/80">{diagnosticReport.error}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* SaaS Info Card */}
        <Card className="border-border bg-primary/5">
          <CardContent className="py-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground mb-1">Plateforme clés en main</p>
                <p className="text-sm text-muted-foreground">
                  L'IA (génération de contenu), le scraping web (Firecrawl) et l'enrichissement email (Hunter) sont inclus dans votre abonnement. Vous n'avez aucune clé API à configurer.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Separator */}
        <Separator className="my-8" />

        {/* CRM Integration Hub */}
        <CRMIntegrationHub />
      </div>
    </div>
  );
}
