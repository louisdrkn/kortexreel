import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, Loader2, AlertTriangle, Zap, Target, MessageSquare, Users, CheckCircle2, Globe, Briefcase, MapPin, UserSearch, Rocket, Linkedin, Mail, Copy, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useProject } from "@/contexts/ProjectContext";
import { usePOD } from "@/contexts/PODContext";
import { useToast } from "@/hooks/use-toast";

interface CompanyAnalysis {
  id: string;
  company_name: string;
  company_url: string;
  logo_url?: string;
  industry?: string;
  headcount?: string;
  location?: string;
  description_long?: string;
  detected_pain_points?: string[];
  strategic_analysis?: string;
  buying_signals?: string[];
  key_urls?: Record<string, string>;
  custom_hook?: string;
  match_score?: number;
  match_explanation?: string;
  analysis_status: string;
}

interface DecisionMaker {
  first_name: string;
  last_name: string;
  full_name: string;
  email?: string;
  linkedin_url?: string;
  job_title: string;
  company_name: string;
  confidence_score: number;
}

interface CompanyDetailPanelProps {
  company: {
    name: string;
    website?: string;
    industry?: string;
    headcount?: string;
    location?: string;
    score?: number;
  };
  isOpen: boolean;
  onClose: () => void;
  onLaunchCampaign?: (company: any, decisionMaker: DecisionMaker) => void;
}

export function CompanyDetailPanel({ company, isOpen, onClose, onLaunchCampaign }: CompanyDetailPanelProps) {
  const [analysis, setAnalysis] = useState<CompanyAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [decisionMaker, setDecisionMaker] = useState<DecisionMaker | null>(null);
  const [isFindingDM, setIsFindingDM] = useState(false);
  const [dmError, setDmError] = useState<string | null>(null);
  const { currentProject } = useProject();
  const { agencyDNA, targetCriteria } = usePOD();
  const { toast } = useToast();

  // Load or trigger analysis when panel opens
  useEffect(() => {
    if (isOpen && company.website && currentProject?.id) {
      loadOrTriggerAnalysis();
      // Reset decision maker state
      setDecisionMaker(null);
      setDmError(null);
    }
  }, [isOpen, company.website, currentProject?.id]);

  // Extract root domain from URL
  const extractRootDomain = (url: string): string => {
    try {
      let cleanUrl = url.trim();
      if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
        cleanUrl = `https://${cleanUrl}`;
      }
      const urlObj = new URL(cleanUrl);
      return urlObj.hostname.replace('www.', '');
    } catch {
      // Fallback: extract domain manually
      return url.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0].split('?')[0];
    }
  };

  const loadOrTriggerAnalysis = async () => {
    if (!company.website || !currentProject?.id) return;

    setIsLoading(true);

    try {
      const rootDomain = extractRootDomain(company.website);
      
      // First check if we already have an analysis
      const { data: existing } = await supabase
        .from('company_analyses')
        .select('*')
        .eq('project_id', currentProject.id)
        .ilike('company_url', `%${rootDomain}%`)
        .single();

      if (existing && existing.analysis_status === 'completed') {
        setAnalysis(existing as CompanyAnalysis);
        setIsLoading(false);
        return;
      }

      // Trigger new analysis with cleaned URL
      const agencyContext = agencyDNA ? `
Offre: ${agencyDNA.pitch || ''}
Méthodologie: ${agencyDNA.methodology || ''}
Clients passés: ${agencyDNA.trackRecord?.pastClients?.map(c => c.name).join(', ') || ''}
      `.trim() : '';

      const { data, error } = await supabase.functions.invoke('analyze-company-deep', {
        body: {
          companyName: company.name,
          companyUrl: rootDomain, // Send clean root domain
          projectId: currentProject.id,
          agencyContext,
        },
      });

      if (error) throw error;

      if (data?.analysis) {
        setAnalysis(data.analysis as CompanyAnalysis);
      }
    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: "Erreur d'analyse",
        description: "Impossible d'analyser cette entreprise",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFindDecisionMaker = async () => {
    if (!company.name) return;

    setIsFindingDM(true);
    setDmError(null);

    try {
      const rootDomain = company.website ? extractRootDomain(company.website) : undefined;
      
      // Get persona from target criteria (use functions and seniority arrays)
      const personaFunctions = targetCriteria?.functions?.join(', ') || 'Directeur';
      const seniorityLevels = targetCriteria?.seniority?.join(', ') || 'C-Level';

      const { data, error } = await supabase.functions.invoke('find-decision-maker', {
        body: {
          company_name: company.name,
          domain: rootDomain, // Clean root domain
          job_title_keywords: [...(targetCriteria?.functions || []), ...(targetCriteria?.seniority || [])],
          persona_description: `${personaFunctions} ${seniorityLevels}`,
        },
      });

      if (error) throw error;

      if (data?.success && data?.decision_maker) {
        setDecisionMaker(data.decision_maker);
        toast({
          title: "Décideur trouvé !",
          description: `${data.decision_maker.full_name} - ${data.decision_maker.job_title}`,
        });
      } else {
        // Try fallback: search for CEO
        setDmError("Aucun profil technique trouvé. Recherche du dirigeant...");
        
        const { data: ceoData, error: ceoError } = await supabase.functions.invoke('find-decision-maker', {
          body: {
            company_name: company.name,
            domain: rootDomain,
            job_title_keywords: ['CEO', 'PDG', 'Directeur Général', 'Fondateur', 'Président'],
            persona_description: 'Dirigeant / CEO',
          },
        });

        if (ceoError) throw ceoError;

        if (ceoData?.success && ceoData?.decision_maker) {
          setDecisionMaker(ceoData.decision_maker);
          setDmError(null);
          toast({
            title: "Dirigeant trouvé !",
            description: `${ceoData.decision_maker.full_name} - ${ceoData.decision_maker.job_title}`,
          });
        } else {
          setDmError("Aucun décideur trouvé pour cette entreprise.");
        }
      }
    } catch (error) {
      console.error('Find decision maker error:', error);
      setDmError("Erreur lors de la recherche du décideur.");
      toast({
        title: "Erreur",
        description: "Impossible de trouver le décideur",
        variant: "destructive",
      });
    } finally {
      setIsFindingDM(false);
    }
  };

  const handleLaunchCampaign = () => {
    if (onLaunchCampaign && decisionMaker) {
      onLaunchCampaign({ ...company, analysis }, decisionMaker);
    }
    toast({
      title: "🚀 Campagne en préparation",
      description: `Message personnalisé pour ${decisionMaker?.full_name}`,
    });
    onClose();
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-green-400";
    if (score >= 70) return "text-yellow-400";
    return "text-orange-400";
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 85) return "bg-green-500/20 border-green-500/30";
    if (score >= 70) return "bg-yellow-500/20 border-yellow-500/30";
    return "bg-orange-500/20 border-orange-500/30";
  };

  // Get logo URL with fallback
  const rootDomain = company.website ? extractRootDomain(company.website) : null;
  const logoUrl = analysis?.logo_url || (rootDomain ? `https://logo.clearbit.com/${rootDomain}` : null);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Panel - 40% width as requested */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full md:w-[40%] min-w-[400px] max-w-2xl bg-[#0C0C0E] border-l border-white/10 z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-start justify-between p-6 border-b border-white/10">
              <div className="flex items-center gap-4">
                {logoUrl && (
                  <div className="w-14 h-14 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                    <img
                      src={logoUrl}
                      alt={company.name}
                      className="w-10 h-10 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-semibold text-white">{company.name}</h2>
                  <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                    {company.industry && (
                      <span className="flex items-center gap-1">
                        <Briefcase className="h-3 w-3" />
                        {company.industry}
                      </span>
                    )}
                    {company.headcount && (
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {company.headcount}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {company.website && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`https://${rootDomain}`, '_blank')}
                  >
                    <Globe className="h-4 w-4 mr-1" />
                    Visiter
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Score Badge */}
            {(analysis?.match_score || company.score) && (
              <div className="px-6 py-3 border-b border-white/10">
                <div className={`inline-flex items-center gap-3 px-4 py-2 rounded-lg border ${getScoreBgColor(analysis?.match_score || company.score || 0)}`}>
                  <span className={`text-2xl font-bold ${getScoreColor(analysis?.match_score || company.score || 0)}`}>
                    {analysis?.match_score || company.score}%
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {analysis?.match_explanation || "Score de compatibilité"}
                  </span>
                </div>
              </div>
            )}

            {/* Content */}
            <ScrollArea className="flex-1">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-muted-foreground">Analyse approfondie en cours...</p>
                  <p className="text-xs text-muted-foreground">Scan du site web et génération d'insights</p>
                </div>
              ) : analysis ? (
                <div className="p-6 space-y-6">
                  {/* Section 1: Intelligence IA */}
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <Target className="h-5 w-5 text-primary" />
                      Intelligence IA
                    </h3>

                    {/* Activité Réelle */}
                    {analysis.description_long && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                          Activité Réelle
                        </h4>
                        <p className="text-white leading-relaxed">
                          {analysis.description_long}
                        </p>
                      </div>
                    )}

                    {/* Alignement Stratégique */}
                    {analysis.strategic_analysis && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-400" />
                          Alignement Stratégique
                        </h4>
                        <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                          <p className="text-sm text-white leading-relaxed">
                            {analysis.strategic_analysis}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Pain Points Détectés */}
                    {analysis.detected_pain_points && analysis.detected_pain_points.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-orange-400" />
                          Pain Points Détectés
                        </h4>
                        <div className="space-y-2">
                          {analysis.detected_pain_points.map((point, i) => (
                            <div
                              key={i}
                              className="flex items-start gap-3 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20"
                            >
                              <AlertTriangle className="h-4 w-4 text-orange-400 mt-0.5 shrink-0" />
                              <span className="text-sm text-white">{point}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Signaux d'achat */}
                    {analysis.buying_signals && analysis.buying_signals.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                          <Zap className="h-4 w-4 text-primary" />
                          Signaux d'Achat
                        </h4>
                        <div className="space-y-2">
                          {analysis.buying_signals.map((signal, i) => (
                            <div
                              key={i}
                              className="flex items-start gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20"
                            >
                              <Zap className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                              <span className="text-sm text-white">{signal}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Accroche personnalisée */}
                    {analysis.custom_hook && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-violet-400" />
                          Accroche Spécifique
                        </h4>
                        <div className="p-4 rounded-lg bg-violet-500/10 border border-violet-500/20">
                          <p className="text-white italic">"{analysis.custom_hook}"</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-2"
                            onClick={() => {
                              navigator.clipboard.writeText(analysis.custom_hook || '');
                              toast({ title: "Copié !" });
                            }}
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copier
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Section 2: Sourcing Décideur */}
                  <div className="pt-6 border-t border-white/10 space-y-4">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <UserSearch className="h-5 w-5 text-violet-500" />
                      Sourcing Décideur
                    </h3>

                    {!decisionMaker && !isFindingDM && (
                      <Button
                        size="lg"
                        className="w-full h-14 text-lg bg-violet-600 hover:bg-violet-700"
                        onClick={handleFindDecisionMaker}
                      >
                        <UserSearch className="h-5 w-5 mr-2" />
                        🕵️‍♂️ Trouver le Décideur Clé
                      </Button>
                    )}

                    {isFindingDM && (
                      <div className="p-4 rounded-xl bg-violet-500/10 border border-violet-500/20 space-y-4 animate-pulse">
                        <div className="flex items-center gap-4">
                          <Skeleton className="w-16 h-16 rounded-full bg-violet-500/20" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-5 w-3/4 bg-violet-500/20" />
                            <Skeleton className="h-4 w-1/2 bg-violet-500/20" />
                            <Skeleton className="h-3 w-2/3 bg-violet-500/20" />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Skeleton className="h-8 w-24 bg-violet-500/20" />
                          <Skeleton className="h-8 w-32 bg-violet-500/20" />
                        </div>
                        <div className="flex items-center gap-2 text-sm text-violet-300">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>[MAGILEADS] Recherche dans la base de données...</span>
                        </div>
                      </div>
                    )}

                    {dmError && !isFindingDM && !decisionMaker && (
                      <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
                        <p className="text-amber-400">{dmError}</p>
                      </div>
                    )}

                    {/* Decision Maker Card */}
                    {decisionMaker && (
                      <div className="p-4 rounded-xl bg-gradient-to-br from-violet-500/20 to-primary/10 border border-violet-500/30 space-y-4">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 rounded-full bg-violet-500/20 border-2 border-violet-500/50 flex items-center justify-center">
                            <User className="h-8 w-8 text-violet-400" />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-lg font-semibold text-white">
                              {decisionMaker.full_name}
                            </h4>
                            <p className="text-violet-300">{decisionMaker.job_title}</p>
                            <p className="text-sm text-muted-foreground">{decisionMaker.company_name}</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {decisionMaker.linkedin_url && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(decisionMaker.linkedin_url, '_blank')}
                              className="border-violet-500/30 hover:bg-violet-500/20"
                            >
                              <Linkedin className="h-4 w-4 mr-1 text-[#0A66C2]" />
                              LinkedIn
                            </Button>
                          )}
                          {decisionMaker.email && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(decisionMaker.email || '');
                                toast({ title: "Email copié !" });
                              }}
                              className="border-violet-500/30 hover:bg-violet-500/20"
                            >
                              <Mail className="h-4 w-4 mr-1" />
                              {decisionMaker.email}
                            </Button>
                          )}
                        </div>

                        {/* Confidence Score */}
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">Confiance:</span>
                          <Badge variant="secondary" className="bg-violet-500/20 text-violet-300">
                            {Math.round(decisionMaker.confidence_score * 100)}%
                          </Badge>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 gap-4 text-muted-foreground">
                  <Target className="h-8 w-8 opacity-50" />
                  <p>Aucune analyse disponible</p>
                  <Button onClick={loadOrTriggerAnalysis}>
                    Lancer l'analyse
                  </Button>
                </div>
              )}
            </ScrollArea>

            {/* Footer Actions */}
            <div className="p-6 border-t border-white/10 bg-[#0C0C0E]">
              {decisionMaker ? (
                <Button
                  className="w-full h-14 text-lg bg-gradient-to-r from-primary to-violet-600 hover:from-primary/90 hover:to-violet-700"
                  size="lg"
                  onClick={handleLaunchCampaign}
                >
                  <Rocket className="h-5 w-5 mr-2" />
                  🚀 Lancer la Conquête
                </Button>
              ) : (
                <Button
                  className="w-full"
                  size="lg"
                  variant="outline"
                  onClick={handleFindDecisionMaker}
                  disabled={isLoading || isFindingDM}
                >
                  {isFindingDM ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Recherche...
                    </>
                  ) : (
                    <>
                      <Users className="h-4 w-4 mr-2" />
                      Valider & Trouver le Décideur
                    </>
                  )}
                </Button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
