import { useState, useEffect, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ExternalLink,
  TrendingUp,
  Linkedin,
  User,
  Target,
  Brain,
  CheckCircle,
  Database,
  UserSearch,
  Loader2,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useProspects } from '@/hooks/useProspects';
import { Company } from './types';
import { cn } from '@/lib/utils';
import { MatchInsightBadge } from './MatchInsightBadge';
import { CompanyLogo } from '@/components/ui/company-logo';

interface CompanyCardProps {
  company: Company;
  onClick: (company: Company) => void;
  onRevealContact?: (company: Company) => Promise<unknown>;
  index?: number;
}

function getScoreColor(score: number) {
  if (score >= 85)
    return {
      border: 'border-emerald-400',
      text: 'text-emerald-600',
      bg: 'bg-emerald-50',
      ring: 'ring-emerald-100',
    };
  if (score >= 70)
    return {
      border: 'border-amber-400',
      text: 'text-amber-600',
      bg: 'bg-amber-50',
      ring: 'ring-amber-100',
    };
  if (score >= 50)
    return {
      border: 'border-blue-400',
      text: 'text-blue-600',
      bg: 'bg-blue-50',
      ring: 'ring-blue-100',
    };
  return {
    border: 'border-slate-300',
    text: 'text-slate-500',
    bg: 'bg-slate-50',
    ring: 'ring-slate-100',
  };
}

// Extract domain from website URL
function extractDomain(url?: string): string | null {
  if (!url) return null;
  try {
    const cleanUrl = url.startsWith('http') ? url : `https://${url}`;
    const domain = new URL(cleanUrl).hostname.replace(/^www\./, '');
    return domain;
  } catch {
    return url.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
  }
}

export function CompanyCard({ company, onClick, onRevealContact, index = 0 }: CompanyCardProps) {
  const navigate = useNavigate();
  const { addProspect, checkProspectExists } = useProspects();
  const [isRevealing, setIsRevealing] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferredId, setTransferredId] = useState<string | null>(null);
  const [isCheckingExists, setIsCheckingExists] = useState(false);

  const score = company.score || 0;
  const colors = getScoreColor(score);
  const domain = company.domain || extractDomain(company.website);

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
        console.error('[CompanyCard] Error checking prospect existence:', err);
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
    navigate(`/radar/prospects${transferredId ? `?highlight=${transferredId}` : ''}`);
  };

  return (
    <motion.div
      role="button"
      tabIndex={0}
      data-tour={index === 0 ? 'company-card' : undefined}
      onClick={(e) => {
        e.stopPropagation();
        onClick(company);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          onClick(company);
        }
      }}
      className={cn(
        'relative w-full text-left',
        'cursor-pointer',
        'rounded-xl',
        'bg-white',
        'border border-slate-100',
        'shadow-sm shadow-slate-100/50',
        'transition-all duration-300 ease-out',
        // Premium hover shadow with violet/indigo glow
        'hover:shadow-[0_20px_50px_-12px_rgba(124,58,237,0.25)]',
        'hover:border-violet-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40',
        'group overflow-hidden',
        // Persisted decision maker: subtle violet accent
        hasPersistedDecisionMaker && 'ring-2 ring-violet-100 border-violet-200'
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={{
        y: -6,
        transition: { duration: 0.25, ease: 'easeOut' },
      }}
    >
      {/* Top Right — Scan OR Persisted */}
      <div className="absolute top-2 right-2 z-10">
        {hasPersistedDecisionMaker ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="p-1.5 rounded-lg bg-violet-100 border border-violet-200">
                  <Database className="h-3 w-3 text-violet-600" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs">
                <p className="text-xs">Décideur sauvegardé • Données persistées H24</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : canReveal ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={handleRevealContact}
            disabled={isRevealing}
            className="h-8 w-8 rounded-lg bg-white/80 border border-slate-200 hover:bg-slate-50"
            title="Scanner le décideur"
          >
            {isRevealing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserSearch className="h-4 w-4" />
            )}
          </Button>
        ) : null}
      </div>

      {/* Header */}
      <div className="bg-slate-50/80 border-b border-slate-100 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Logo with Clearbit + elegant fallback */}
            <CompanyLogo
              name={company.name}
              website={company.website}
              domain={company.domain}
              size="lg"
            />

            {/* Name */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-900 truncate text-base leading-tight">{company.name}</h3>
              {company.website && (
                <p className="text-xs text-slate-400 truncate flex items-center gap-1 mt-0.5">
                  <ExternalLink className="h-3 w-3 flex-shrink-0" />
                  {domain || company.website.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
                </p>
              )}
            </div>
          </div>

          {/* Score */}
          <div
            className={cn(
              'flex-shrink-0 px-3 py-2 rounded-lg font-bold text-lg',
              colors.bg,
              colors.text,
              (hasPersistedDecisionMaker || canReveal) && 'mr-8'
            )}
          >
            {score}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Match Origin Badges */}
        {(company.validatedByCible || company.validatedByCerveau || company.analysisStatus === 'deduced') && (
          <TooltipProvider>
            <div className="flex items-center gap-1.5 flex-wrap">
              {company.analysisStatus === 'deduced' && (
                <Badge variant="outline" className="text-xs bg-indigo-50 border-indigo-200 text-indigo-700 gap-1 animate-pulse">
                  <Sparkles className="h-3 w-3" />
                  Identifié par IA Stratège
                </Badge>
              )}
              {company.validatedByCible && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="text-xs bg-emerald-50 border-emerald-200 text-emerald-700 gap-1">
                      <Target className="h-3 w-3" />
                      Cible ✓
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p className="text-xs">Validé par Définition Cible (secteur, taille, géographie OK)</p>
                  </TooltipContent>
                </Tooltip>
              )}
              {company.validatedByCerveau && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="text-xs bg-violet-50 border-violet-200 text-violet-700 gap-1">
                      <Brain className="h-3 w-3" />
                      Cerveau ✓
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p className="text-xs">Validé par Cerveau Agence (correspond aux docs uploadés)</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </TooltipProvider>
        )}

        {/* Enrichment Status Loader */}
        {!company.logoUrl && (company.analysisStatus === 'deduced' || company.analysisStatus === 'pending') && (
          <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100">
            <Loader2 className="h-3 w-3 animate-spin text-violet-500" />
            <span>Recherche du site web & logo...</span>
          </div>
        )}

        {/* Industry */}
        {company.industry && (
          <Badge variant="outline" className="text-xs bg-slate-50 border-slate-200 text-slate-600">
            {company.industry}
          </Badge>
        )}

        {/* IA INSIGHT - Match Reason with dynamic explanation */}
        {company.matchReason && (
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <MatchInsightBadge
                matchReason={company.matchReason}
                score={score}
                similarClient={company.matchExplanation?.includes('Ressemble') ? {
                  name: company.matchExplanation.match(/client\s+'([^']+)'/)?.[1] || 'Client Passé',
                  caseStudySource: 'Cerveau Agence',
                  similarity: company.matchExplanation,
                } : undefined}
              />
            </div>
            <p className="text-xs text-slate-600 leading-relaxed bg-gradient-to-r from-violet-50/50 to-transparent p-2 rounded-lg border-l-2 border-violet-200">
              <Sparkles className="inline h-3 w-3 text-violet-400 mr-1" />
              {company.matchReason.slice(0, 150)}{company.matchReason.length > 150 ? '...' : ''}
            </p>
          </div>
        )}

        {/* Signals */}
        {company.signals && company.signals.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {company.signals.slice(0, 2).map((signal, idx) => (
              <Badge key={idx} variant="outline" className="text-xs bg-violet-50 border-violet-200 text-violet-700">
                <TrendingUp className="h-3 w-3 mr-1" />
                {signal.length > 25 ? signal.slice(0, 25) + '...' : signal}
              </Badge>
            ))}
          </div>
        )}

        {/* Decision Maker */}
        {decisionMaker && (
          <div className="pt-3 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-white flex-shrink-0',
                    hasPersistedDecisionMaker
                      ? 'bg-gradient-to-br from-violet-500 to-purple-600'
                      : 'bg-gradient-to-br from-blue-500 to-blue-600'
                  )}
                >
                  <User className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate flex items-center gap-1.5">
                    {decisionMaker.fullName}
                    {hasPersistedDecisionMaker && <CheckCircle className="h-3 w-3 text-violet-500 flex-shrink-0" />}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{decisionMaker.jobTitle}</p>
                </div>
              </div>
              {decisionMaker.linkedinUrl && (
                <a
                  href={decisionMaker.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex-shrink-0 p-2 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors"
                  title="Ouvrir LinkedIn"
                >
                  <Linkedin className="h-4 w-4 text-blue-600" />
                </a>
              )}
            </div>

            {/* Transfer CTA */}
            {canTransfer && (
              <div className="flex items-center justify-end">
                {isCheckingExists ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled
                    className="gap-2"
                  >
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Vérification...
                  </Button>
                ) : transferredId ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleViewFiche}
                    className="gap-2 border-violet-200 text-violet-700 hover:bg-violet-50"
                  >
                    Ouvrir la Fiche
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    data-tour={index === 0 ? 'transfer-button' : undefined}
                    onClick={handleTransferToCRM}
                    disabled={isTransferring}
                    className="gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-md"
                  >
                    {isTransferring ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Sauvegarde...
                      </>
                    ) : (
                      <>
                        <Database className="h-4 w-4" />
                        Transférer vers Fiche
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
          'absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-xl ring-2',
          hasPersistedDecisionMaker ? 'ring-violet-300/70' : 'ring-violet-200/50'
        )}
      />
    </motion.div>
  );
}
