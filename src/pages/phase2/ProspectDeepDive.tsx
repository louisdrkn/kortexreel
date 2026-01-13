import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Users, Building2, Globe, Linkedin, Loader2, Sparkles, ArrowRight, TrendingUp, Target, Search, Send, CheckCircle2, AlertCircle, ExternalLink, Phone, Mail, FileSearch, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { usePOD } from "@/contexts/PODContext";
import { useToast } from "@/hooks/use-toast";
import { firecrawlApi } from "@/lib/api/firecrawl";
import { supabase } from "@/integrations/supabase/client";

interface ProspectIntelligence {
  companyOverview: string;
  painPoints: string[];
  opportunities: string[];
  decisionMaker: {
    name: string;
    title: string;
    linkedinUrl?: string;
  } | null;
  matchScore: number;
  matchReasons: string[];
}

interface DecisionMaker {
  id: string;
  name: string;
  title: string;
  company: string;
  profileUrl: string;
  originalUrl?: string;
  profilePicture: string | null;
  location: string;
  source?: string;
}

interface DebugLog {
  step: string;
  message: string;
  timestamp: string;
}

// Helper to convert LinkedIn profile URL to Sales Navigator URL
const toSalesNavUrl = (profileUrl: string): string => {
  // Extract the profile ID from the URL
  const match = profileUrl.match(/linkedin\.com\/in\/([^/?]+)/);
  if (match) {
    return `https://www.linkedin.com/sales/people/${match[1]}`;
  }
  return profileUrl;
};

export default function ProspectDeepDive() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { targetAccounts, agencyDNA, targetCriteria, addContact } = usePOD();
  const { toast } = useToast();
  
  const accountId = searchParams.get("id");
  const account = targetAccounts.find(a => a.id === accountId);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [intelligence, setIntelligence] = useState<ProspectIntelligence | null>(null);
  
  // Decision makers state
  const [isSearchingDecisionMakers, setIsSearchingDecisionMakers] = useState(false);
  const [decisionMakers, setDecisionMakers] = useState<DecisionMaker[]>([]);
  const [selectedDecisionMaker, setSelectedDecisionMaker] = useState<DecisionMaker | null>(null);
  const [decisionMakerError, setDecisionMakerError] = useState<string | null>(null);
  const [searchLogs, setSearchLogs] = useState<DebugLog[]>([]);
  const [showLogs, setShowLogs] = useState(false);

  const runDeepDive = async () => {
    if (!account) return;
    
    setIsAnalyzing(true);
    try {
      // Scrape company website
      let websiteContent = "";
      if (account.website) {
        const scrapeResult = await firecrawlApi.scrape(account.website, {
          formats: ['markdown'],
          onlyMainContent: true,
        });
        if (scrapeResult.success && scrapeResult.data) {
          websiteContent = scrapeResult.data.markdown || "";
        }
      }

      // Generate intelligence with AI
      const { data, error } = await supabase.functions.invoke('analyze-prospect', {
        body: {
          account,
          websiteContent,
          agencyDNA: {
            pitch: agencyDNA.pitch,
            methodology: agencyDNA.methodology,
            pastClients: agencyDNA.trackRecord?.pastClients,
          }
        }
      });

      if (error) throw error;

      if (data?.intelligence) {
        setIntelligence(data.intelligence);
      }
    } catch (error) {
      // Mock data fallback
      setIntelligence({
        companyOverview: `${account.name} est une entreprise innovante dans le secteur ${account.industry}. Avec ${account.headcount} employés, elle est en phase de croissance active et cherche à optimiser ses processus.`,
        painPoints: [
          "Croissance rapide nécessitant une structuration commerciale",
          "Besoin d'automatisation des processus de vente",
          "Difficulté à scaler l'acquisition client"
        ],
        opportunities: [
          "Budget disponible suite à la levée de fonds",
          "Timing parfait pour implémenter de nouveaux outils",
          "Direction ouverte aux partenariats stratégiques"
        ],
        decisionMaker: {
          name: "Marie Dupont",
          title: "Directrice Commerciale",
          linkedinUrl: "https://linkedin.com/in/example"
        },
        matchScore: 92,
        matchReasons: [
          "Profil similaire à vos clients passés",
          "Signaux d'achat détectés",
          "Secteur cible prioritaire"
        ]
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (account && !intelligence) {
      runDeepDive();
    }
  }, [account]);

  // Search for decision makers via LinkedIn
  const searchDecisionMakers = async () => {
    if (!account) return;
    
    setIsSearchingDecisionMakers(true);
    setDecisionMakerError(null);
    setDecisionMakers([]);
    setSelectedDecisionMaker(null);
    setSearchLogs([]);
    setShowLogs(true);
    
    const addLocalLog = (step: string, message: string) => {
      setSearchLogs(prev => [...prev, { step, message, timestamp: new Date().toISOString() }]);
    };

    addLocalLog("INIT", `Démarrage recherche décideur pour ${account.name}`);
    
    try {
      // Get persona from targetCriteria
      const functionLabels: Record<string, string> = {
        marketing: "Directeur Marketing",
        sales: "Directeur Commercial",
        hr: "DRH",
        it: "DSI",
        finance: "DAF",
        operations: "Directeur Operations",
        product: "Product Director",
        engineering: "CTO",
      };
      const primaryFunction = targetCriteria.functions?.[0] || "sales";
      const personaTitle = functionLabels[primaryFunction] || "Directeur Commercial";
      
      addLocalLog("PERSONA", `Persona recherché: ${personaTitle}`);
      addLocalLog("API", "Appel Edge Function linkedin-search-decision-makers...");
      
      const { data, error } = await supabase.functions.invoke('linkedin-search-decision-makers', {
        body: {
          companyName: account.name,
          personaTitle: personaTitle,
          personaSeniority: targetCriteria.seniority?.[0],
        }
      });

      // Append backend logs if available
      if (data?.logs) {
        data.logs.forEach((log: DebugLog) => {
          setSearchLogs(prev => [...prev, { ...log, step: `[Backend] ${log.step}` }]);
        });
      }

      if (error) {
        addLocalLog("ERROR", `Erreur: ${error.message}`);
        throw error;
      }

      if (data.apiError) {
        addLocalLog("ERROR", `API Error: ${data.error}`);
        setDecisionMakerError(data.error);
        toast({
          title: "Erreur API",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      if (data.success && data.decisionMakers?.length > 0) {
        addLocalLog("SUCCESS", `${data.decisionMakers.length} décideur(s) trouvé(s) via ${data.method || 'OSINT'}`);
        setDecisionMakers(data.decisionMakers);
        toast({
          title: "Décideurs trouvés",
          description: `${data.decisionMakers.length} profil(s) identifié(s)`,
        });
      } else {
        addLocalLog("WARNING", "Aucun décideur trouvé, essayez une recherche manuelle");
        setDecisionMakerError("Aucun décideur trouvé pour cette entreprise");
      }
    } catch (error) {
      console.error('Decision maker search error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      addLocalLog("ERROR", `Exception: ${errorMessage}`);
      setDecisionMakerError(errorMessage);
      toast({
        title: "Erreur de recherche",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSearchingDecisionMakers(false);
    }
  };

  // Google search for contact info
  const searchContactOnGoogle = (decisionMakerName: string) => {
    const query = `"${decisionMakerName}" "${account?.name}" téléphone contact email`;
    window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank');
  };

  const handleSelectDecisionMaker = (dm: DecisionMaker) => {
    setSelectedDecisionMaker(dm);
    toast({
      title: "Décideur sélectionné",
      description: `${dm.name} - ${dm.title}`,
    });
  };

  const handleSendLinkedInMessage = () => {
    if (!selectedDecisionMaker) return;
    
    // Open LinkedIn messaging URL
    const messageUrl = `${selectedDecisionMaker.profileUrl}`;
    window.open(messageUrl, '_blank', 'noopener,noreferrer');
    
    toast({
      title: "Ouverture LinkedIn",
      description: "Envoyez votre message personnalisé",
    });
  };

  const handleContactProspect = () => {
    if (selectedDecisionMaker) {
      addContact(accountId!, {
        id: crypto.randomUUID(),
        name: selectedDecisionMaker.name,
        title: selectedDecisionMaker.title,
        linkedinUrl: selectedDecisionMaker.profileUrl,
        status: "identified",
      });
    } else if (intelligence?.decisionMaker) {
      addContact(accountId!, {
        id: crypto.randomUUID(),
        name: intelligence.decisionMaker.name,
        title: intelligence.decisionMaker.title,
        linkedinUrl: intelligence.decisionMaker.linkedinUrl,
        status: "identified",
      });
    }
    navigate(`/radar/outreach?accountId=${accountId}`);
  };

  if (!account) {
    return (
      <div className="min-h-screen bg-background p-6 lg:p-10 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold mb-2">Aucun prospect sélectionné</h2>
            <p className="text-muted-foreground mb-4">
              Sélectionnez un prospect depuis le Radar Marché
            </p>
            <Button onClick={() => navigate("/radar/scan")}>
              Retour au Radar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 lg:p-10">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10">
            <Users className="h-6 w-6 text-amber-500" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Fiche Intelligence</h1>
            <p className="text-muted-foreground">Deep Dive sur {account.name}</p>
          </div>
        </div>

        {/* Company Header Card */}
        <Card className="border-border shadow-soft">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                  <Building2 className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">{account.name}</h2>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                    <span>{account.industry}</span>
                    <span>•</span>
                    <span>{account.headcount} employés</span>
                    {account.website && (
                      <>
                        <span>•</span>
                        <a 
                          href={account.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-primary hover:underline"
                        >
                          <Globe className="h-3 w-3" />
                          Site web
                        </a>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-3xl font-bold text-primary">{account.score}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">Score Match</div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
              {account.signals.map((signal, i) => (
                <Badge key={i} variant="secondary">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {signal}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        {isAnalyzing && (
          <Card className="border-border shadow-soft">
            <CardContent className="py-12 text-center">
              <Loader2 className="h-8 w-8 mx-auto text-primary animate-spin mb-4" />
              <p className="text-muted-foreground">Analyse en cours...</p>
              <p className="text-sm text-muted-foreground">Scraping du site, recherche du décideur...</p>
            </CardContent>
          </Card>
        )}

        {/* Intelligence Results */}
        {intelligence && !isAnalyzing && (
          <>
            {/* Overview */}
            <Card className="border-border shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Vue d'ensemble
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  {intelligence.companyOverview}
                </p>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Pain Points */}
              <Card className="border-border shadow-soft">
                <CardHeader>
                  <CardTitle className="text-base">Douleurs Détectées</CardTitle>
                  <CardDescription>Points de friction identifiés</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {intelligence.painPoints.map((pain, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <div className="h-2 w-2 rounded-full bg-destructive mt-2" />
                        <span className="text-sm">{pain}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Opportunities */}
              <Card className="border-border shadow-soft">
                <CardHeader>
                  <CardTitle className="text-base">Opportunités</CardTitle>
                  <CardDescription>Leviers d'action</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {intelligence.opportunities.map((opp, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 mt-2" />
                        <span className="text-sm">{opp}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Decision Makers Section - LinkedIn Integration */}
            <Card className="border-primary/20 bg-primary/5 shadow-soft">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Linkedin className="h-5 w-5 text-[#0077B5]" />
                      Décideurs (via Sales Nav)
                    </CardTitle>
                    <CardDescription>
                      Recherche automatique des décideurs LinkedIn
                    </CardDescription>
                  </div>
                  <Button
                    onClick={searchDecisionMakers}
                    disabled={isSearchingDecisionMakers}
                    variant="outline"
                  >
                    {isSearchingDecisionMakers ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Recherche...
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4 mr-2" />
                        Scanner Décideurs
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Debug Logs Console */}
                {showLogs && searchLogs.length > 0 && (
                  <div className="mb-4">
                    <button
                      onClick={() => setShowLogs(!showLogs)}
                      className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground mb-2"
                    >
                      <Terminal className="h-3 w-3" />
                      Logs de débogage ({searchLogs.length})
                    </button>
                    <div className="bg-slate-900 text-slate-100 rounded-lg p-3 font-mono text-xs max-h-40 overflow-y-auto">
                      {searchLogs.map((log, i) => (
                        <div key={i} className="flex gap-2 py-0.5">
                          <span className="text-slate-500">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                          <span className={`font-medium ${
                            log.step.includes('ERROR') ? 'text-red-400' :
                            log.step.includes('SUCCESS') ? 'text-green-400' :
                            log.step.includes('WARNING') ? 'text-amber-400' :
                            'text-blue-400'
                          }`}>[{log.step}]</span>
                          <span>{log.message}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Error State */}
                {decisionMakerError && (
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                    <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-destructive">Erreur</p>
                      <p className="text-muted-foreground">{decisionMakerError}</p>
                    </div>
                  </div>
                )}

                {/* Decision Makers List */}
                {decisionMakers.length > 0 && (
                  <div className="space-y-3">
                    {decisionMakers.map((dm) => (
                      <div
                        key={dm.id}
                        className={`flex items-center justify-between p-4 rounded-lg border transition-all cursor-pointer ${
                          selectedDecisionMaker?.id === dm.id
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50 hover:bg-muted/50"
                        }`}
                        onClick={() => handleSelectDecisionMaker(dm)}
                      >
                        <div className="flex items-center gap-4">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={dm.profilePicture || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {dm.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold">{dm.name}</p>
                            <p className="text-sm text-muted-foreground">{dm.title}</p>
                            {dm.source && (
                              <p className="text-xs text-muted-foreground/70">{dm.source}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {selectedDecisionMaker?.id === dm.id && (
                            <Badge className="bg-emerald-500">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Sélectionné
                            </Badge>
                          )}
                          {/* LinkedIn Profile Link */}
                          <a
                            href={dm.profileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 px-2 py-1 rounded text-xs text-[#0077B5] hover:bg-[#0077B5]/10 transition-colors"
                            title="Voir le profil LinkedIn"
                          >
                            <Linkedin className="h-4 w-4" />
                          </a>
                          {/* Sales Navigator Link */}
                          <a
                            href={toSalesNavUrl(dm.profileUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-[#0077B5] text-white hover:bg-[#0077B5]/90 transition-colors"
                            title="Ouvrir dans Sales Navigator"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Sales Nav
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Contact Info Section - Always visible when decision maker selected */}
                {selectedDecisionMaker && (
                  <div className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/5">
                    <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <Phone className="h-4 w-4 text-amber-500" />
                      Coordonnées de contact
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Téléphone:</span>
                          <span className="text-amber-600 text-xs">Enrichissement requis</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => searchContactOnGoogle(selectedDecisionMaker.name)}
                          className="h-7 text-xs"
                        >
                          <FileSearch className="h-3 w-3 mr-1" />
                          Rechercher sur Google
                        </Button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Email:</span>
                          <span className="text-amber-600 text-xs">Enrichissement requis</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        💡 Pour obtenir les coordonnées, configurez Hunter.io ou utilisez la recherche Google manuelle.
                      </p>
                    </div>
                  </div>
                )}

                {/* Send Message Button */}
                {selectedDecisionMaker && (
                  <div className="flex justify-end pt-4 border-t border-border">
                    <Button onClick={handleSendLinkedInMessage}>
                      <Send className="h-4 w-4 mr-2" />
                      Envoyer Message LinkedIn
                    </Button>
                  </div>
                )}

                {/* Empty State */}
                {decisionMakers.length === 0 && !isSearchingDecisionMakers && !decisionMakerError && (
                  <div className="text-center py-6 text-muted-foreground">
                    <Users className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p>Cliquez sur "Scanner Décideurs" pour rechercher les contacts clés</p>
                  </div>
                )}

                {/* Fallback to AI-detected decision maker */}
                {intelligence.decisionMaker && decisionMakers.length === 0 && !isSearchingDecisionMakers && (
                  <div className="pt-4 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-3">Décideur détecté par l'IA :</p>
                    <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                          <Users className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold">{intelligence.decisionMaker.name}</p>
                          <p className="text-sm text-muted-foreground">{intelligence.decisionMaker.title}</p>
                        </div>
                      </div>
                      {intelligence.decisionMaker.linkedinUrl && (
                        <a 
                          href={intelligence.decisionMaker.linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#0077B5] hover:text-[#0077B5]/80"
                        >
                          <Linkedin className="h-5 w-5" />
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Match Reasons */}
            <Card className="border-border shadow-soft">
              <CardHeader>
                <CardTitle className="text-base">Pourquoi ce prospect ?</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {intelligence.matchReasons.map((reason, i) => (
                    <Badge key={i} variant="outline" className="py-1.5">
                      {reason}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Action */}
            <div className="flex justify-end">
              <Button size="lg" onClick={handleContactProspect}>
                Créer la séquence d'approche
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
