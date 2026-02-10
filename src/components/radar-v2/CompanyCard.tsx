import { type MouseEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Brain,
  CheckCircle,
  Database,
  ExternalLink,
  Linkedin,
  Loader2,
  MapPin,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  User,
  UserSearch,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useProspects } from "@/hooks/useProspects";
import { Company } from "./types";
import { cn } from "@/lib/utils";
import { MatchInsightBadge } from "./MatchInsightBadge";
import { CompanyLogo } from "@/components/ui/company-logo";

interface CompanyCardProps {
  company: Company;
  onClick: (company: Company) => void;
  onRevealContact?: (company: Company) => Promise<unknown>;
  index?: number;
  isAnalyzing?: boolean;
}

function getScoreColor(score: number) {
  // SCORE IS DEAD: Always return "Hot/Verified" style
  return {
    border: "border-emerald-500/20",
    text: "text-emerald-400",
    bg: "bg-emerald-500/10",
    ring: "ring-emerald-500/20",
    shadow: "shadow-[0_0_15px_-3px_rgba(16,185,129,0.2)]",
  };
}

function ensureUrlProtocol(url: string): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `https://${url}`;
}

// Helper to strictly get the homepage URL (origin only)
// Helper to strictly get the homepage URL (origin only)
function getHomepageUrl(
  url: string | undefined,
  backupDomain?: string,
): string {
  const candidate = url || backupDomain;
  if (!candidate) return "";

  let clean = candidate.trim();
  // Fix specific "https" bug if it occurs
  if (clean === "https" || clean === "http") return "";

  if (!clean.match(/^https?:\/\//)) {
    clean = `https://${clean}`;
  }
  try {
    const urlObj = new URL(clean);
    // Avoid "https://https" edge case
    if (urlObj.hostname === "https") return "";
    return urlObj.origin;
  } catch {
    return clean;
  }
}

// Extract domain from website URL
function extractDomain(url?: string): string | null {
  if (!url) return null;
  try {
    const cleanUrl = url.startsWith("http") ? url : `https://${url}`;
    const domain = new URL(cleanUrl).hostname.replace(/^www\./, "");
    return domain;
  } catch {
    return url.replace(/^(https?:\/\/)?(www\.)?/, "").split("/")[0];
  }
}

function cleanCompanyName(name: string): string {
  if (!name) return "";
  // Removes .com, .fr, .io, etc at the end, and www. at start
  return name
    .replace(/^www\./i, "")
    .replace(/\.[a-z]{2,6}$/i, "") // Remove TLD like .com, .fr
    .replace(/[-_]/g, " ") // Optional: replace dashes with spaces for better read logic? User asked to "remove .com" specifically.
    // Let's stick to user request: "enlevé le .com"
    .replace(/\.com$/i, "") // Strict per user request first, but regex covers general TLDs usually.
  ; // The user said "interchanger le nom avec le liens".
  // Let's assume the name IS the domain for now.
}

export function CompanyCard(
  { company, onClick, onRevealContact, index = 0, isAnalyzing = false }:
    CompanyCardProps,
) {
  const navigate = useNavigate();
  const { addProspect, checkProspectExists } = useProspects();
  const [isRevealing, setIsRevealing] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferredId, setTransferredId] = useState<string | null>(null);
  const [isCheckingExists, setIsCheckingExists] = useState(false);

  const score = company.score || 0;
  const colors = getScoreColor(score);

  // LOGIC SWAP: User implies Name might be the Domain, and Link might be bad.
  // We prioritize constructing the URL from the Name if it looks like a domain,
  // or fall back to website.
  const isNameDomain = company.name.includes(".");
  const effectiveDomain = isNameDomain
    ? company.name
    : (company.website || company.domain);

  const fullUrl = getHomepageUrl(effectiveDomain);
  // Clean name for display: remove TLD if it looks like a domain
  const displayName = isNameDomain ? company.name.split(".")[0] : company.name;

  const domain = extractDomain(effectiveDomain);

  const decisionMaker = company.decisionMaker;
  const canReveal = !!onRevealContact && !decisionMaker;
  const canTransfer = !!decisionMaker?.linkedinUrl;
  const hasPersistedDecisionMaker = !!decisionMaker?.linkedinUrl;

  // Check on mount if prospect already exists (déduplication UX)
  useEffect(() => {
    const checkExists = async () => {
      if (!decisionMaker?.linkedinUrl) return;

      setIsCheckingExists(true);
      try {
        const existingId = await checkProspectExists(decisionMaker.linkedinUrl);
        if (existingId) {
          setTransferredId(existingId);
        }
      } catch (err) {
        console.error("[CompanyCard] Error checking prospect existence:", err);
      } finally {
        setIsCheckingExists(false);
      }
    };

    checkExists();
  }, [decisionMaker?.linkedinUrl, checkProspectExists]);

  // A) handleRevealContact (SCAN) — uniquement enrichissement, AUCUN INSERT CRM
  const handleRevealContact = async (e: MouseEvent) => {
    e.stopPropagation();
    if (!onRevealContact) return;

    setIsRevealing(true);
    try {
      await onRevealContact(company);
    } finally {
      setIsRevealing(false);
    }
  };

  // B) handleTransferToCRM (TRANSFERT) — INSERT CRM + gestion d'erreur stricte
  const handleTransferToCRM = async (e: MouseEvent) => {
    e.stopPropagation();

    if (!decisionMaker?.linkedinUrl) return;

    setIsTransferring(true);
    try {
      const result = await addProspect({
        // Contact
        company_name: company.name,
        contact_name: decisionMaker.fullName,
        first_name: decisionMaker.firstName,
        last_name: decisionMaker.lastName,
        job_title: decisionMaker.jobTitle,
        linkedin_url: decisionMaker.linkedinUrl,
        email: decisionMaker.email,

        // Company
        company_website: company.website,
        company_domain: company.domain,
        company_industry: company.industry,
        company_headcount: company.headcount,
        company_location: company.location,
        company_logo_url: company.logoUrl,

        // AI snapshot
        ai_match_score: company.score,
        match_reason: company.matchReason || company.matchExplanation,
        strategic_analysis: company.strategicAnalysis,
        custom_hook: company.customHook,
        pain_points: company.painPoints,
        buying_signals: company.buyingSignals,
        description_long: company.descriptionLong,
        validated_by_cible: company.validatedByCible,
        validated_by_cerveau: company.validatedByCerveau,
        alternative_contact: company.alternativeContact
          ? {
            full_name: company.alternativeContact.fullName,
            job_title: company.alternativeContact.jobTitle,
            linkedin_url: company.alternativeContact.linkedinUrl,
            email: company.alternativeContact.email,
          }
          : undefined,
      });

      if (result.success) {
        setTransferredId(result.prospectId || null);
      }
    } finally {
      setIsTransferring(false);
    }
  };

  const handleViewFiche = (e: MouseEvent) => {
    e.stopPropagation();
    navigate(
      `/radar/prospects${transferredId ? `?highlight=${transferredId}` : ""}`,
    );
  };

  return (
    <motion.div
      role="button"
      tabIndex={0}
      data-tour={index === 0 ? "company-card" : undefined}
      onClick={(e) => {
        e.stopPropagation();
        onClick(company);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          onClick(company);
        }
      }}
      className={cn(
        "relative w-full text-left",
        "cursor-pointer",
        "rounded-xl",
        // GLASSMORPHISM & DEPTH - As requested
        "bg-zinc-900/40 backdrop-blur-md",
        "border border-white/10",
        "shadow-xl shadow-black/50",
        "transition-all duration-300 ease-out",
        // HOVER EFFECTS
        "hover:shadow-2xl hover:shadow-violet-500/10",
        "hover:border-violet-500/30 hover:bg-zinc-900/60",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40",
        "group overflow-hidden",
        // Persisted decision maker: subtle violet accent override
        hasPersistedDecisionMaker &&
          "ring-1 ring-indigo-500/30 border-indigo-500/30",
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4, delay: index * 0.1, ease: "easeOut" }} // Stagger handled by parent usually, but local delay kept as fallback
      whileHover={{
        y: -4, // Lift effect
        scale: 1.01, // Slight scale
        transition: { duration: 0.2, ease: "easeOut" },
      }}
    >
      {/* Top Right — Scan OR Persisted */}
      <div className="absolute top-2 right-2 z-10">
        {hasPersistedDecisionMaker
          ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="p-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20">
                    <Database className="h-3 w-3 text-violet-400" />
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="left"
                  className="max-w-xs bg-slate-900 border-slate-800 text-slate-200"
                >
                  <p className="text-xs">
                    Décideur sauvegardé • Données persistées H24
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )
          : canReveal
          ? (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={handleRevealContact}
              disabled={isRevealing}
              className="h-8 w-8 rounded-lg bg-slate-800/80 border border-slate-700 hover:bg-slate-700 hover:text-white"
              title="Scanner le décideur"
            >
              {isRevealing
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <UserSearch className="h-4 w-4" />}
            </Button>
          )
          : null}
      </div>

      {/* Header */}
      <div className="bg-zinc-950/30 border-b border-white/5 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Logo with Clearbit + elegant fallback */}
            {company.website
              ? (
                <a
                  href={fullUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="bg-white rounded-lg p-0.5 block hover:ring-2 hover:ring-violet-500/50 transition-all"
                >
                  <CompanyLogo
                    name={company.name}
                    website={company.website}
                    domain={company.domain}
                    size="lg"
                  />
                </a>
              )
              : (
                <div className="bg-white rounded-lg p-0.5">
                  <CompanyLogo
                    name={company.name}
                    website={company.website}
                    domain={company.domain}
                    size="lg"
                  />
                </div>
              )}

            {/* Name */}
            <div className="flex-1 min-w-0">
              {company.website
                ? (
                  <a
                    href={fullUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="block group/link"
                  >
                    <h3 className="font-semibold text-zinc-100 text-base leading-snug group-hover/link:text-indigo-300 transition-colors flex items-center gap-1.5 min-w-0">
                      <span className="break-words line-clamp-2 md:line-clamp-none">
                        {displayName}
                      </span>
                      <ExternalLink className="h-3.5 w-3.5 opacity-0 group-hover/link:opacity-100 transition-opacity text-zinc-500 flex-shrink-0" />
                    </h3>
                  </a>
                )
                : (
                  <h3 className="font-semibold text-zinc-100 text-base leading-snug group-hover:text-indigo-300 transition-colors break-words line-clamp-2 md:line-clamp-none">
                    {displayName}
                  </h3>
                )}
              {company.website && (
                <a
                  href={fullUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 mt-0.5 w-fit hover:bg-slate-800/50 rounded px-1 -ml-1 transition-colors group/url"
                >
                  <ExternalLink className="h-3 w-3 flex-shrink-0 text-slate-500 group-hover/url:text-violet-400" />
                  <span className="text-xs text-slate-500 truncate group-hover/url:text-violet-300 transition-colors">
                    {domain ||
                      company.website?.replace(/^https?:\/\/(www\.)?/, "")
                        .split("/")[0]}
                  </span>
                </a>
              )}
              {company.googleMaps && (
                <div className="mt-1 flex items-center gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <a
                          href={company.googleMaps.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 text-xs text-zinc-500 hover:text-indigo-300 transition-colors group/map font-mono"
                        >
                          <MapPin className="h-3 w-3 text-zinc-600 group-hover/map:text-indigo-400" />
                          <span className="truncate max-w-[150px]">
                            {company.googleMaps.formattedAddress.split(",")[1]
                              ?.trim() || "Voir sur la carte"}
                          </span>
                        </a>
                      </TooltipTrigger>
                      <TooltipContent
                        side="bottom"
                        className="bg-slate-900 border-slate-800 p-3"
                      >
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-slate-200">
                            {company.googleMaps.formattedAddress}
                          </p>
                          {company.googleMaps.rating && (
                            <div className="flex items-center gap-1.5 text-xs text-amber-400">
                              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                              <span className="font-bold">
                                {company.googleMaps.rating}
                              </span>
                              <span className="text-slate-500">
                                ({company.googleMaps.userRatingsTotal} avis)
                              </span>
                            </div>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}
            </div>
          </div>

          {/* Score */}
          {/* Strategic Category or Score */}
          <div className="flex-shrink-0">
            {company.strategicCategory
              ? (
                <Badge
                  variant="outline"
                  className={cn(
                    "px-3 py-1.5 text-xs font-bold uppercase tracking-wide border transition-all font-mono",
                    company.strategicCategory === "PERFECT_MATCH" &&
                      "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.1)]",
                    company.strategicCategory === "OPPORTUNITY" &&
                      "bg-blue-500/10 border-blue-500/20 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.1)]",
                    company.strategicCategory === "OUT_OF_SCOPE" &&
                      "bg-zinc-800/50 border-zinc-700 text-zinc-500",
                  )}
                >
                  {company.strategicCategory === "PERFECT_MATCH" &&
                    "Cœur de Cible"}
                  {company.strategicCategory === "OPPORTUNITY" &&
                    "Opportunité"}
                  {company.strategicCategory === "OUT_OF_SCOPE" &&
                    "Hors Cible"}
                </Badge>
              )
              : (
                <div
                  className={cn(
                    "px-3 py-2 rounded-lg font-bold text-lg backdrop-blur-md font-mono",
                    colors.bg,
                    colors.text,
                    colors.shadow,
                  )}
                >
                  {score}
                </div>
              )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* DISCOVERED STATE PROMPT */}
        {company.analysisStatus === "discovered" && !isAnalyzing && (
          <div className="flex flex-col items-center justify-center py-4 space-y-3 border-2 border-dashed border-slate-700/50 rounded-lg bg-slate-800/20">
            <Brain className="h-8 w-8 text-slate-600 animate-pulse" />
            <div className="text-center">
              <p className="text-sm font-medium text-slate-300">
                Analyse IA Disponible
              </p>
              <p className="text-xs text-slate-500">
                Cliquez pour lancer le deep dive
              </p>
            </div>
            <Button
              size="sm"
              variant="default"
              className="bg-violet-600/80 hover:bg-violet-600 text-white gap-2 shadow-lg shadow-violet-900/40"
              onClick={(e) => {
                e.stopPropagation();
                onClick(company);
              }}
            >
              <Sparkles className="h-3 w-3" />
              Lancer l'analyse
            </Button>
          </div>
        )}

        {/* ANALYZING STATE LOADER */}
        {isAnalyzing && (
          <div className="absolute inset-0 z-20 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 space-y-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Brain className="h-5 w-5 text-violet-400 animate-pulse" />
              </div>
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400 animate-pulse">
                ANALYSE PROFONDE...
              </p>
              <p className="text-xs text-slate-400">
                Scraping du site & Croisement Offre
              </p>
            </div>
          </div>
        )}

        {/* Match Origin Badges (Only show if NOT discovered/analyzing) */}
        {company.analysisStatus !== "discovered" &&
          (company.validatedByCible || company.validatedByCerveau ||
            company.analysisStatus === "deduced") &&
          (
            <TooltipProvider>
              <div className="flex items-center gap-1.5 flex-wrap">
                {company.analysisStatus === "deduced" && (
                  <Badge
                    variant="outline"
                    className="text-xs bg-indigo-500/10 border-indigo-500/20 text-indigo-300 gap-1 animate-pulse font-mono"
                  >
                    <Sparkles className="h-3 w-3" />
                    IA Stratège
                  </Badge>
                )}
                {company.validatedByCible && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="outline"
                        className="text-xs bg-emerald-500/10 border-emerald-500/20 text-emerald-400 gap-1 font-mono"
                      >
                        <Target className="h-3 w-3" />
                        Cible
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      className="max-w-xs bg-zinc-900 border-zinc-800 text-zinc-200"
                    >
                      <p className="text-xs">Validé par Définition Cible</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                {company.validatedByCerveau && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="outline"
                        className="text-xs bg-violet-500/10 border-violet-500/20 text-violet-400 gap-1 font-mono"
                      >
                        <Brain className="h-3 w-3" />
                        Cerveau
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      className="max-w-xs bg-zinc-900 border-zinc-800 text-zinc-200"
                    >
                      <p className="text-xs">Validé par Cerveau Agence</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </TooltipProvider>
          )}

        {/* Enrichment Status Loader */}
        {!company.logoUrl &&
          (company.analysisStatus === "deduced" ||
            company.analysisStatus === "pending") &&
          (
            <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-800/50 p-2 rounded-lg border border-slate-700">
              <Loader2 className="h-3 w-3 animate-spin text-violet-400" />
              <span>Recherche du site web & logo...</span>
            </div>
          )}

        {/* Industry */}
        {company.industry && (
          <Badge
            variant="outline"
            className="text-xs bg-zinc-800/50 border-white/5 text-zinc-400 font-mono"
          >
            {company.industry}
          </Badge>
        )}

        {/* IA INSIGHT - Match Reason with dynamic explanation */}
        {company.matchReason && (
          <div className="space-y-2">
            {company.website
              ? (
                <a
                  href={ensureUrlProtocol(company.website)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="block group/reason"
                >
                  <p className="text-xs text-zinc-300 leading-relaxed bg-gradient-to-r from-violet-500/10 to-transparent p-2 rounded-lg border-l-2 border-violet-500/30 group-hover/reason:bg-violet-500/20 transition-colors">
                    <Sparkles className="inline h-3 w-3 text-violet-400 mr-1" />
                    <span className="group-hover/reason:text-violet-200 transition-colors">
                      {company.matchReason.slice(0, 150)}
                      {company.matchReason.length > 150 ? "..." : ""}
                    </span>
                    <ExternalLink className="inline h-3 w-3 ml-1 opacity-0 group-hover/reason:opacity-100 transition-opacity text-violet-400" />
                  </p>
                </a>
              )
              : (
                <p className="text-xs text-slate-300 leading-relaxed bg-gradient-to-r from-violet-500/10 to-transparent p-2 rounded-lg border-l-2 border-violet-500/30">
                  <Sparkles className="inline h-3 w-3 text-violet-400 mr-1" />
                  {company.matchReason.slice(0, 150)}
                  {company.matchReason.length > 150 ? "..." : ""}
                </p>
              )}
          </div>
        )}

        {/* Signals */}
        {company.signals && company.signals.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {company.signals.slice(0, 2).map((signal, idx) => (
              <Badge
                key={idx}
                variant="outline"
                className="text-xs bg-violet-500/10 border-violet-500/20 text-violet-300"
              >
                <TrendingUp className="h-3 w-3 mr-1" />
                {signal.length > 25 ? signal.slice(0, 25) + "..." : signal}
              </Badge>
            ))}
          </div>
        )}

        {/* Decision Maker */}
        {decisionMaker && (
          <div className="pt-3 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-white flex-shrink-0",
                    hasPersistedDecisionMaker
                      ? "bg-gradient-to-br from-violet-600 to-purple-800 shadow-lg shadow-violet-500/20"
                      : "bg-gradient-to-br from-blue-600 to-blue-800 shadow-lg shadow-blue-500/20",
                  )}
                >
                  <User className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate flex items-center gap-1.5">
                    {decisionMaker.fullName}
                    {hasPersistedDecisionMaker && (
                      <CheckCircle className="h-3 w-3 text-violet-400 flex-shrink-0" />
                    )}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {decisionMaker.jobTitle}
                  </p>
                </div>
              </div>
              {decisionMaker.linkedinUrl && (
                <a
                  href={decisionMaker.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex-shrink-0 p-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 transition-colors border border-blue-500/20"
                  title="Ouvrir LinkedIn"
                >
                  <Linkedin className="h-4 w-4 text-blue-400" />
                </a>
              )}
            </div>

            {/* Transfer CTA */}
            {canTransfer && (
              <div className="flex items-center justify-end">
                {isCheckingExists
                  ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled
                      className="gap-2 border-slate-700 bg-slate-800 text-slate-400"
                    >
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Checking...
                    </Button>
                  )
                  : transferredId
                  ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleViewFiche}
                      className="gap-2 border-violet-500/30 text-violet-300 hover:bg-violet-500/10"
                    >
                      Ouvrir la Fiche
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  )
                  : (
                    <Button
                      type="button"
                      size="sm"
                      data-tour={index === 0 ? "transfer-button" : undefined}
                      onClick={handleTransferToCRM}
                      disabled={isTransferring}
                      className="gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white shadow-lg shadow-violet-900/40 border border-violet-500/20"
                    >
                      {isTransferring
                        ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Sauvegarde...
                          </>
                        )
                        : (
                          <>
                            <Database className="h-4 w-4" />
                            Transférer
                          </>
                        )}
                    </Button>
                  )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hover glow overlay */}
      <div
        className={cn(
          "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-xl ring-2",
          hasPersistedDecisionMaker
            ? "ring-violet-500/40"
            : "ring-violet-500/20",
        )}
      />
    </motion.div>
  );
}
