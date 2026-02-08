import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertTriangle,
  Brain,
  Building2,
  CheckCircle2,
  ChevronDown,
  Database,
  ExternalLink,
  Linkedin,
  Loader2,
  Mail,
  MapPin,
  RefreshCw,
  Rocket,
  Sparkles,
  Target,
  TrendingUp,
  User,
  Users,
  UserSearch,
} from "lucide-react";
import {
  AnalysisResult,
  Company,
  DecisionMaker,
  FindDecisionMakerResult,
  TargetingAnalysis,
} from "./types";
import { cn } from "@/lib/utils";
import { useProspects } from "@/hooks/useProspects";
import { useToast } from "@/hooks/use-toast";
import { Crown, Shield } from "lucide-react";

interface CompanyDetailSheetProps {
  company: Company | null;
  isOpen: boolean;
  onClose: () => void;
  onAnalyze: (company: Company) => Promise<AnalysisResult | null>;
  onFindDecisionMaker: (
    company: Company,
  ) => Promise<FindDecisionMakerResult | null>;
  isAnalyzing: boolean;
  isFindingDecisionMaker: boolean;
}

// Collapsible section component
function DataSection({
  title,
  icon: Icon,
  children,
  defaultOpen = true,
  color = "violet",
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
  color?: "violet" | "amber" | "emerald";
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const colorClasses = {
    violet: "text-violet-600 bg-violet-50",
    amber: "text-amber-600 bg-amber-50",
    emerald: "text-emerald-600 bg-emerald-50",
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger
        className={cn(
          "flex items-center justify-between w-full p-3 rounded-xl",
          "bg-zinc-900/50 border border-white/5",
          "hover:bg-zinc-800/50 transition-colors",
          "group",
        )}
      >
        <div className="flex items-center gap-2">
          <div className={cn("p-1.5 rounded-lg", colorClasses[color])}>
            <Icon className="h-4 w-4" />
          </div>
          <span className="font-medium text-zinc-300 text-sm">
            {title}
          </span>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-slate-400 transition-transform",
            isOpen && "rotate-180",
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-3">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

// Helper to strictly get the homepage URL (origin only)
function getHomepageUrl(url: string | undefined): string {
  if (!url) return "";
  let clean = url.trim();
  if (!clean.match(/^https?:\/\//)) {
    clean = `https://${clean}`;
  }
  try {
    const urlObj = new URL(clean);
    return urlObj.origin;
  } catch {
    return clean;
  }
}

export function CompanyDetailSheet({
  company,
  isOpen,
  onClose,
  onAnalyze,
  onFindDecisionMaker,
  isAnalyzing,
  isFindingDecisionMaker,
}: CompanyDetailSheetProps) {
  // Auto-analyze when opening if not analyzed yet
  // Auto-analyze removed per user request to prevent loop
  // useEffect(() => {
  //   if (
  //     isOpen && company && company.analysisStatus !== "completed" &&
  //     !isAnalyzing
  //   ) {
  //     onAnalyze(company);
  //   }
  // }, [isOpen, company?.id]);

  if (!company) return null;

  const logoUrl = company.logoUrl ||
    (company.domain ? `https://logo.clearbit.com/${company.domain}` : null);

  const hasDecisionMaker = !!company.decisionMaker;
  const score = company.score || 0;

  const getScoreStyle = (score: number) => {
    if (score >= 85) return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (score >= 70) return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-blue-50 text-blue-700 border-blue-200";
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        className={cn(
          "w-full sm:max-w-lg p-0 flex flex-col h-full",
          "bg-zinc-950/95 backdrop-blur-md border-l border-white/10",
          "shadow-[-20px_0_60px_rgba(0,0,0,0.5)]",
          // Floating effect - slight margin from edge
          "sm:mr-3 sm:my-3 sm:rounded-2xl sm:h-[calc(100%-24px)]",
        )}
      >
        {/* Header with blurred background image effect */}
        <div className="relative overflow-hidden rounded-t-2xl">
          {/* Gradient background */}
          <div className="h-28 bg-gradient-to-br from-indigo-900/50 via-zinc-900 to-purple-900/50" />

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent" />

          {/* Logo overlay - Adjusted for better visibility */}
          <div className="absolute -bottom-6 left-6 z-10">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900 border-2 border-zinc-800 shadow-xl flex items-center justify-center overflow-hidden">
              {logoUrl
                ? (
                  <img
                    src={logoUrl}
                    alt={company.name}
                    className="w-full h-full object-contain p-2"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      e.currentTarget.nextElementSibling?.classList.remove(
                        "hidden",
                      );
                    }}
                  />
                )
                : null}
              <Building2
                className={cn("h-7 w-7 text-slate-400", logoUrl && "hidden")}
              />
            </div>
          </div>

          {/* Score badge */}
          <div className="absolute top-4 right-4">
            <div
              className={cn(
                "px-3 py-1.5 rounded-lg font-bold text-sm border",
                getScoreStyle(score),
              )}
            >
              Score: {score}
            </div>
          </div>
        </div>

        <SheetHeader className="px-6 pt-10 pb-4">
          <SheetTitle className="text-xl font-semibold text-zinc-100 mt-2">
            {company.name}
          </SheetTitle>
          <SheetDescription className="flex items-center gap-2 flex-wrap">
            {company.website && (
              <a
                href={getHomepageUrl(company.website)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-600 hover:text-violet-700 flex items-center gap-1 text-sm font-medium"
              >
                <ExternalLink className="h-3 w-3" />
                {/* Robust display logic: Domain > Clean Website > "Site Web" fallback */}
                {(company.domain && !company.domain.includes("/") &&
                    company.domain !== "https")
                  ? company.domain
                  : (company.website && company.website.length > 8)
                  ? company.website.replace(/^https?:\/\/(www\.)?/, "").split(
                    "/",
                  )[0]
                  : "Site Web"}
              </a>
            )}
            {company.industry && (
              <Badge
                variant="outline"
                className="bg-slate-50 border-slate-200 text-slate-600 text-xs"
              >
                {company.industry}
              </Badge>
            )}
            {company.location && (
              <Badge
                variant="outline"
                className="bg-zinc-800/50 border-zinc-700 text-zinc-400 text-xs"
              >
                <MapPin className="h-3 w-3 mr-1" />
                {company.location}
              </Badge>
            )}
            {company.headcount && (
              <Badge
                variant="outline"
                className="bg-slate-50 border-slate-200 text-slate-500 text-xs"
              >
                <Users className="h-3 w-3 mr-1" />
                {company.headcount}
              </Badge>
            )}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 px-6 py-4">
          <div className="space-y-4">
            {isAnalyzing && (!company.descriptionLong && !company.context) && (
              <AnalysisSkeleton />
            )}
            <>
              {/* ZERO-DÉCHET: Origine du Match Section */}
              {(company.validatedByCible || company.validatedByCerveau ||
                company.matchReason) && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span className="text-sm font-medium text-emerald-400">
                      Origine du Match
                    </span>
                  </div>
                  <div className="space-y-2">
                    {company.validatedByCible && (
                      <div className="flex items-center gap-2 text-sm">
                        <Target className="h-4 w-4 text-emerald-500" />
                        <span className="text-zinc-400">
                          Validé par{" "}
                          <span className="font-medium text-emerald-400">
                            "Définition Cible"
                          </span>{" "}
                          (Secteur, taille, géographie OK)
                        </span>
                      </div>
                    )}
                    {company.validatedByCerveau && (
                      <div className="flex items-center gap-2 text-sm">
                        <Brain className="h-4 w-4 text-violet-500" />
                        <span className="text-zinc-400">
                          Validé par{" "}
                          <span className="font-medium text-violet-400">
                            "Cerveau Agence"
                          </span>{" "}
                          (Correspond aux documents)
                        </span>
                      </div>
                    )}
                    {company.matchReason && (
                      <p className="text-sm text-slate-600 mt-2 pt-2 border-t border-emerald-100 italic">
                        → {company.matchReason}
                      </p>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Analysis Section */}
              {(company.descriptionLong || company.context) && (
                <DataSection
                  title="Analyse Stratégique"
                  icon={Brain}
                  defaultOpen={true}
                >
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    {company.descriptionLong || company.context}
                  </p>
                </DataSection>
              )}

              {/* Activity Section - NEW */}
              {company.activity && (
                <DataSection
                  title="Activité Détectée"
                  icon={Building2}
                  defaultOpen={true}
                >
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    {company.activity}
                  </p>
                </DataSection>
              )}

              {/* Custom Hook */}
              {company.customHook && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-xl bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-violet-400" />
                    <span className="text-sm font-medium text-violet-300">
                      Accroche personnalisée
                    </span>
                  </div>
                  <p className="text-sm text-zinc-300 italic">
                    "{company.customHook}"
                  </p>
                </motion.div>
              )}

              {/* Strategic Fit */}
              {company.strategicAnalysis && (
                <DataSection
                  title="Pourquoi eux ?"
                  icon={Target}
                  defaultOpen={true}
                >
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    {company.strategicAnalysis}
                  </p>
                </DataSection>
              )}

              {/* Pain Points */}
              {company.painPoints && company.painPoints.length > 0 && (
                <DataSection
                  title="Points de Douleur"
                  icon={AlertTriangle}
                  defaultOpen={true}
                  color="amber"
                >
                  <ul className="space-y-2">
                    {company.painPoints.map((pain, idx) => (
                      <motion.li
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="flex items-start gap-2 text-sm text-zinc-400 bg-zinc-900/50 p-3 rounded-lg border border-white/5 shadow-sm"
                      >
                        <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        {pain}
                      </motion.li>
                    ))}
                  </ul>
                </DataSection>
              )}

              {/* Buying Signals */}
              {company.buyingSignals && company.buyingSignals.length > 0 &&
                (
                  <DataSection
                    title="Signaux d'Achat"
                    icon={TrendingUp}
                    defaultOpen={false}
                    color="emerald"
                  >
                    <div className="flex flex-wrap gap-2">
                      {company.buyingSignals.map((signal, idx) => (
                        <Badge
                          key={idx}
                          variant="outline"
                          className="bg-emerald-50 border-emerald-200 text-emerald-700 text-xs"
                        >
                          <TrendingUp className="h-3 w-3 mr-1" />
                          {signal}
                        </Badge>
                      ))}
                    </div>
                  </DataSection>
                )}

              {/* Decision Makers Section - PRECISION ENGINE V3 */}
              <DataSection
                title="Décideurs Identifiés"
                icon={User}
                defaultOpen={true}
              >
                {hasDecisionMaker
                  ? (
                    <div className="space-y-4">
                      {/* PERSISTED INDICATOR - H24 */}
                      {company.decisionMaker?.linkedinUrl && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="flex items-center gap-2 p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20"
                        >
                          <div className="p-1 rounded bg-indigo-500/20">
                            <Database className="h-3.5 w-3.5 text-indigo-400" />
                          </div>
                          <span className="text-xs text-indigo-300 font-medium">
                            Données persistées • Sauvegardé H24
                          </span>
                          <CheckCircle2 className="h-3.5 w-3.5 text-indigo-400 ml-auto" />
                        </motion.div>
                      )}

                      {/* 👑 CONTACT PRINCIPAL (Le Décideur) */}
                      <PrimaryContactCard
                        decisionMaker={company.decisionMaker!}
                        companyName={company.name}
                        targetingAnalysis={company.targetingAnalysis}
                      />

                      {/* 🛡️ ALTERNATIVE SUGGÉRÉE (Le Relais) */}
                      {company.alternativeContact && (
                        <AlternativeContactCard
                          decisionMaker={company.alternativeContact}
                          companyName={company.name}
                        />
                      )}
                    </div>
                  )
                  : (
                    <div className="text-center py-8 bg-zinc-900/50 rounded-xl border border-white/5">
                      <div className="w-12 h-12 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center mx-auto mb-3 shadow-sm">
                        <User className="h-6 w-6 text-zinc-500" />
                      </div>
                      <p className="text-zinc-500 text-sm mb-4">
                        Aucun contact identifié
                      </p>
                      <Button
                        onClick={() => onFindDecisionMaker(company)}
                        disabled={isFindingDecisionMaker}
                        className="gap-2 bg-violet-600 hover:bg-violet-700 text-white"
                      >
                        {isFindingDecisionMaker
                          ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Analyse en cours...
                            </>
                          )
                          : (
                            <>
                              <UserSearch className="h-4 w-4" />
                              Identifier les Décideurs
                            </>
                          )}
                      </Button>
                    </div>
                  )}
              </DataSection>
            </>

            {/* Refresh Analysis Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAnalyze(company)}
              disabled={isAnalyzing}
              className="w-full bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 mt-4"
            >
              <RefreshCw
                className={cn(
                  "h-3 w-3 mr-2",
                  isAnalyzing && "animate-spin",
                )}
              />
              {(company.analysisStatus === "completed" ||
                  company.analysisStatus === "analyzed")
                ? "Re-analyser"
                : "Lancer l'analyse IA"}
            </Button>
          </div>
        </ScrollArea>

        {/* Footer Action - Engager le contact */}
        {hasDecisionMaker && (
          <EngagerContactFooter
            company={company}
            decisionMaker={company.decisionMaker!}
            onClose={onClose}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

// Engager Contact Footer Component
function EngagerContactFooter({
  company,
  decisionMaker,
  onClose,
}: {
  company: Company;
  decisionMaker: DecisionMaker;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const { addProspect, checkProspectExists } = useProspects();
  const { toast } = useToast();
  const [isAdding, setIsAdding] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const [prospectId, setProspectId] = useState<string | null>(null);

  // Check if prospect already exists on mount
  useEffect(() => {
    const checkExisting = async () => {
      if (decisionMaker.linkedinUrl) {
        const existingId = await checkProspectExists(decisionMaker.linkedinUrl);
        if (existingId) {
          setIsAdded(true);
          setProspectId(existingId);
        }
      }
    };
    checkExisting();
  }, [decisionMaker.linkedinUrl, checkProspectExists]);

  const handleEngager = async () => {
    setIsAdding(true);

    // THE SNAPSHOT - Capture complete state of the Radar card
    const result = await addProspect({
      // Contact info
      company_name: company.name,
      contact_name: decisionMaker.fullName,
      first_name: decisionMaker.firstName,
      last_name: decisionMaker.lastName,
      job_title: decisionMaker.jobTitle,
      linkedin_url: decisionMaker.linkedinUrl || "",
      email: decisionMaker.email,
      // Company metadata
      company_website: company.website,
      company_domain: company.domain,
      company_industry: company.industry,
      company_headcount: company.headcount,
      company_location: company.location,
      company_logo_url: company.logoUrl,
      // AI Analysis metadata (CRITICAL - DO NOT LOSE)
      ai_match_score: company.score,
      match_reason: company.matchReason || company.matchExplanation,
      strategic_analysis: company.strategicAnalysis,
      custom_hook: company.customHook,
      pain_points: company.painPoints,
      buying_signals: company.buyingSignals,
      description_long: company.descriptionLong,
      // ZERO-DÉCHET validation badges
      validated_by_cible: company.validatedByCible,
      validated_by_cerveau: company.validatedByCerveau,
      // Alternative contact for backup
      alternative_contact: company.alternativeContact
        ? {
          full_name: company.alternativeContact.fullName,
          job_title: company.alternativeContact.jobTitle,
          linkedin_url: company.alternativeContact.linkedinUrl,
          email: company.alternativeContact.email,
        }
        : undefined,
    });

    setIsAdding(false);

    if (result.success) {
      setIsAdded(true);
      setProspectId(result.prospectId || null);
    }
  };

  const handleViewFiche = () => {
    onClose();
    navigate(
      "/radar/prospects" + (prospectId ? `?highlight=${prospectId}` : ""),
    );
  };

  return (
    <div className="p-4 border-t border-zinc-800 bg-zinc-900 space-y-2">
      {isAdded
        ? (
          <>
            <Button
              onClick={handleViewFiche}
              className="w-full gap-2 shadow-lg text-white bg-violet-600 hover:bg-violet-700"
              size="lg"
            >
              <ExternalLink className="h-4 w-4" />
              Voir la Fiche Prospect
            </Button>
            <p className="text-xs text-emerald-400 text-center flex items-center justify-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Prospect déjà transféré dans la Tour de Contrôle
            </p>
          </>
        )
        : (
          <>
            <Button
              onClick={handleEngager}
              disabled={isAdding || !decisionMaker.linkedinUrl}
              className="w-full gap-2 shadow-lg text-white bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200/50"
              size="lg"
            >
              {isAdding
                ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Transfert en cours...
                  </>
                )
                : (
                  <>
                    <Rocket className="h-4 w-4" />
                    Engager le contact
                  </>
                )}
            </Button>
            {!decisionMaker.linkedinUrl && (
              <p className="text-xs text-slate-400 text-center">
                URL LinkedIn manquante
              </p>
            )}
          </>
        )}
    </div>
  );
}

// Skeleton loader
function AnalysisSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.1 }}
          className="p-4 rounded-xl bg-zinc-900/50 border border-white/5 space-y-3"
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 animate-pulse" />
            <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse" />
          </div>
          <div className="space-y-2">
            <div className="h-3 bg-zinc-800 rounded animate-pulse" />
            <div className="h-3 bg-zinc-800 rounded w-5/6 animate-pulse" />
            <div className="h-3 bg-zinc-800 rounded w-4/6 animate-pulse" />
          </div>
        </motion.div>
      ))}
      <div className="flex items-center justify-center py-4">
        <motion.div
          className="flex items-center gap-2 text-zinc-500 text-sm"
          animate={{ opacity: [1, 0.5, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <Loader2 className="h-4 w-4 animate-spin" />
          Analyse en cours...
        </motion.div>
      </div>
    </div>
  );
}

// 👑 PRIMARY CONTACT CARD (Le Décideur Principal)
function PrimaryContactCard({
  decisionMaker,
  companyName,
  targetingAnalysis,
}: {
  decisionMaker: DecisionMaker;
  companyName: string;
  targetingAnalysis?: TargetingAnalysis;
}) {
  const score = decisionMaker.matchScore || decisionMaker.confidenceScore || 0;

  const getScoreColor = (s: number) => {
    if (s >= 85) return "bg-emerald-100 text-emerald-700 border-emerald-200";
    if (s >= 70) return "bg-amber-100 text-amber-700 border-amber-200";
    return "bg-slate-100 text-slate-600 border-slate-200";
  };

  return (
    <div className="space-y-3">
      {/* Header Badge */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <Crown className="h-3.5 w-3.5 text-amber-500" />
          <span className="text-xs font-semibold text-amber-500">
            CONTACT PRINCIPAL
          </span>
        </div>
        <span className="text-xs text-zinc-500">Le Décideur</span>
      </div>

      {/* Main Card */}
      <div className="relative p-4 rounded-xl bg-gradient-to-br from-amber-500/5 to-zinc-900 border border-amber-500/20 shadow-sm overflow-hidden">
        {/* Score Badge */}
        {score > 0 && (
          <div
            className={cn(
              "absolute top-3 right-3 px-2 py-1 rounded-md text-xs font-bold border",
              getScoreColor(score),
            )}
          >
            Match {score}%
          </div>
        )}

        <div className="flex items-start gap-4">
          {/* Avatar with Crown */}
          <div className="relative">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center text-lg font-semibold text-amber-500 border-2 border-amber-500/20">
              {decisionMaker.fullName.charAt(0).toUpperCase()}
            </div>
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center">
              <Crown className="h-3 w-3 text-white" />
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 space-y-1 pr-16">
            <h4 className="font-semibold text-slate-900">
              {decisionMaker.fullName}
            </h4>
            <p className="text-sm text-slate-600">{decisionMaker.jobTitle}</p>
            <p className="text-xs text-slate-400">{companyName}</p>
          </div>
        </div>

        {/* WHY THIS ROLE - Strategic Tooltip */}
        {(decisionMaker.whyThisRole || targetingAnalysis?.primaryReason) && (
          <div className="mt-4 pt-3 border-t border-amber-100">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50/50">
              <Target className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-medium text-amber-700 mb-1">
                  Pourquoi ce profil ?
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {decisionMaker.whyThisRole ||
                    targetingAnalysis?.primaryReason}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Score Breakdown */}
        {decisionMaker.scoreBreakdown && (
          <div className="mt-3 pt-3 border-t border-amber-100">
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-2 rounded-lg bg-white border border-slate-100">
                <div className="text-xs text-slate-400">Titre</div>
                <div className="text-sm font-semibold text-slate-700">
                  {decisionMaker.scoreBreakdown.titleMatch} pts
                </div>
              </div>
              <div className="text-center p-2 rounded-lg bg-white border border-slate-100">
                <div className="text-xs text-slate-400">Ancienneté</div>
                <div className="text-sm font-semibold text-slate-700">
                  {decisionMaker.scoreBreakdown.tenureBonus} pts
                </div>
              </div>
              <div className="text-center p-2 rounded-lg bg-white border border-slate-100">
                <div className="text-xs text-slate-400">Activité</div>
                <div className="text-sm font-semibold text-slate-700">
                  {decisionMaker.scoreBreakdown.activityBonus} pts
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Contact Actions */}
      <div className="space-y-2">
        {decisionMaker.email && (
          <a
            href={`mailto:${decisionMaker.email}`}
            className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-100 hover:border-violet-200 hover:bg-violet-50/50 transition-all group"
          >
            <div className="p-2 rounded-lg bg-violet-50 group-hover:bg-violet-100 transition-colors">
              <Mail className="h-4 w-4 text-violet-600" />
            </div>
            <span className="text-sm text-slate-600 group-hover:text-slate-900 truncate flex-1">
              {decisionMaker.email}
            </span>
            <ExternalLink className="h-3 w-3 text-slate-300 group-hover:text-violet-500 transition-colors" />
          </a>
        )}

        {decisionMaker.linkedinUrl && (
          <a
            href={decisionMaker.linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all group"
          >
            <div className="p-2 rounded-lg bg-blue-50 group-hover:bg-blue-100 transition-colors">
              <Linkedin className="h-4 w-4 text-blue-600" />
            </div>
            <span className="text-sm text-slate-600 group-hover:text-slate-900">
              Voir le profil LinkedIn
            </span>
            <ExternalLink className="h-3 w-3 text-slate-300 group-hover:text-blue-500 transition-colors" />
          </a>
        )}
      </div>
    </div>
  );
}

// 🛡️ ALTERNATIVE CONTACT CARD (Le Relais)
function AlternativeContactCard({
  decisionMaker,
  companyName,
}: {
  decisionMaker: DecisionMaker;
  companyName: string;
}) {
  const score = decisionMaker.matchScore || decisionMaker.confidenceScore || 0;

  return (
    <div className="space-y-3">
      {/* Header Badge */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-100 border border-slate-200">
          <Shield className="h-3.5 w-3.5 text-slate-500" />
          <span className="text-xs font-semibold text-slate-600">
            ALTERNATIVE SUGGÉRÉE
          </span>
        </div>
        <span className="text-xs text-slate-400">Le Relais</span>
      </div>

      {/* Main Card */}
      <div className="relative p-4 rounded-xl bg-slate-50 border border-slate-200 overflow-hidden">
        <div className="flex items-start gap-4">
          {/* Avatar with Shield */}
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-base font-semibold text-slate-600 border border-slate-200">
              {decisionMaker.fullName.charAt(0).toUpperCase()}
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-slate-400 flex items-center justify-center">
              <Shield className="h-2.5 w-2.5 text-white" />
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 space-y-1">
            <h4 className="font-medium text-slate-800">
              {decisionMaker.fullName}
            </h4>
            <p className="text-sm text-slate-500">{decisionMaker.jobTitle}</p>
            {score > 0 && (
              <span className="inline-block px-2 py-0.5 text-xs rounded bg-slate-200 text-slate-600">
                Match {score}%
              </span>
            )}
          </div>
        </div>

        {/* WHY THIS ALTERNATIVE */}
        {decisionMaker.whyThisRole && (
          <div className="mt-3 p-2 rounded-lg bg-white border border-slate-100">
            <p className="text-xs text-slate-500 italic">
              💡 {decisionMaker.whyThisRole}
            </p>
          </div>
        )}

        {/* LinkedIn Link */}
        {decisionMaker.linkedinUrl && (
          <a
            href={decisionMaker.linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
          >
            <Linkedin className="h-4 w-4" />
            Voir le profil
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>
  );
}

// Legacy Decision Maker Card (for backward compatibility)
function DecisionMakerCard({
  decisionMaker,
  companyName,
}: {
  decisionMaker: DecisionMaker;
  companyName: string;
}) {
  return (
    <PrimaryContactCard
      decisionMaker={decisionMaker}
      companyName={companyName}
    />
  );
}
