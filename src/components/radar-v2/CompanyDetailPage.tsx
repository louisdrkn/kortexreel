import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    AlertTriangle,
    ArrowLeft,
    Brain,
    Building2,
    CheckCircle2,
    Crown,
    Database,
    ExternalLink,
    Linkedin,
    Loader2,
    Mail,
    MapPin,
    RefreshCw,
    Rocket,
    Shield,
    Sparkles,
    Target,
    TrendingUp,
    User,
    Users,
    UserSearch,
    Zap,
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

interface CompanyDetailPageProps {
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

function getHomepageUrl(url: string | undefined): string {
    if (!url) return "";
    let clean = url.trim();
    if (!clean.match(/^https?:\/\//)) clean = `https://${clean}`;
    try {
        return new URL(clean).origin;
    } catch {
        return clean;
    }
}

function ScoreRing({ score }: { score: number }) {
    const color = score >= 85 ? "#10b981" : score >= 70 ? "#f59e0b" : "#6366f1";
    const r = 36;
    const circ = 2 * Math.PI * r;
    const dash = (score / 100) * circ;

    return (
        <div className="relative flex items-center justify-center w-24 h-24">
            <svg className="absolute inset-0 w-full h-full -rotate-90">
                <circle
                    cx="48"
                    cy="48"
                    r={r}
                    fill="none"
                    stroke="#27272a"
                    strokeWidth="6"
                />
                <motion.circle
                    cx="48"
                    cy="48"
                    r={r}
                    fill="none"
                    stroke={color}
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={circ}
                    initial={{ strokeDashoffset: circ }}
                    animate={{ strokeDashoffset: circ - dash }}
                    transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
                />
            </svg>
            <div className="text-center z-10">
                <div className="text-2xl font-bold text-white">{score}</div>
                <div className="text-[9px] text-zinc-500 uppercase tracking-wider font-mono">
                    score
                </div>
            </div>
        </div>
    );
}

function InfoChip(
    { icon: Icon, label, value }: {
        icon: React.ElementType;
        label: string;
        value: string;
    },
) {
    return (
        <div className="flex flex-col gap-1 p-3 rounded-xl bg-zinc-900/60 border border-white/5 min-w-[120px]">
            <div className="flex items-center gap-1.5 text-zinc-500">
                <Icon className="h-3 w-3" />
                <span className="text-[10px] font-mono uppercase tracking-wider">
                    {label}
                </span>
            </div>
            <span className="text-sm text-zinc-200 font-medium truncate">
                {value}
            </span>
        </div>
    );
}

function Section({
    title,
    icon: Icon,
    accentColor = "violet",
    children,
}: {
    title: string;
    icon: React.ElementType;
    accentColor?: string;
    children: React.ReactNode;
}) {
    const accents: Record<string, string> = {
        violet:
            "from-violet-500/20 to-violet-500/0 border-violet-500/20 text-violet-400",
        emerald:
            "from-emerald-500/20 to-emerald-500/0 border-emerald-500/20 text-emerald-400",
        amber:
            "from-amber-500/20 to-amber-500/0 border-amber-500/20 text-amber-400",
        indigo:
            "from-indigo-500/20 to-indigo-500/0 border-indigo-500/20 text-indigo-400",
    };
    const a = accents[accentColor] || accents.violet;

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn("rounded-2xl border bg-gradient-to-br p-5", a)}
        >
            <div
                className={cn(
                    "flex items-center gap-2 mb-4",
                    a.split(" ").pop(),
                )}
            >
                <Icon className="h-4 w-4" />
                <span className="text-xs font-mono uppercase tracking-widest font-semibold">
                    {title}
                </span>
            </div>
            {children}
        </motion.div>
    );
}

export function CompanyDetailPage({
    company,
    isOpen,
    onClose,
    onAnalyze,
    onFindDecisionMaker,
    isAnalyzing,
    isFindingDecisionMaker,
}: CompanyDetailPageProps) {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [isOpen]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [onClose]);

    if (!company) return null;

    const logoUrl = company.logoUrl ||
        (company.domain ? `https://logo.clearbit.com/${company.domain}` : null);
    const score = company.score || 0;
    const hasDecisionMaker = !!company.decisionMaker;

    const statusConfig = {
        hot: {
            label: "HOT",
            class: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
            icon: Zap,
        },
        warm: {
            label: "WARM",
            class: "border-amber-500/40 bg-amber-500/10 text-amber-400",
            icon: TrendingUp,
        },
        cold: {
            label: "COLD",
            class: "border-blue-500/40 bg-blue-500/10 text-blue-400",
            icon: Target,
        },
        detected: {
            label: "DÉTECTÉ",
            class: "border-violet-500/40 bg-violet-500/10 text-violet-400",
            icon: Sparkles,
        },
    };
    const st = statusConfig[company.status] || statusConfig.detected;
    const StatusIcon = st.icon;

    // Derive match reason from relevance_reason if available
    const matchReason = company.matchReason || company.context ||
        company.matchExplanation;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    key="company-page-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
                    onClick={(e) => e.target === e.currentTarget && onClose()}
                >
                    <motion.div
                        initial={{ opacity: 0, y: 60, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 40, scale: 0.97 }}
                        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                        className={cn(
                            "absolute inset-2 sm:inset-4 md:inset-6 lg:inset-x-[10%] lg:inset-y-6",
                            "bg-zinc-950 rounded-3xl border border-white/10",
                            "shadow-[0_40px_120px_rgba(0,0,0,0.8)]",
                            "flex flex-col overflow-hidden",
                        )}
                    >
                        {/* ── HERO HEADER ─────────────────────────────────────────── */}
                        <div className="relative overflow-hidden shrink-0">
                            {/* Background gradient mesh */}
                            <div className="h-40 md:h-52 bg-gradient-to-br from-indigo-950 via-zinc-950 to-purple-950" />
                            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(99,102,241,0.15),transparent_60%)]" />
                            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />

                            {/* Close / back button */}
                            <button
                                onClick={onClose}
                                className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 transition-all text-xs font-mono"
                            >
                                <ArrowLeft className="h-3.5 w-3.5" />
                                Retour
                            </button>

                            {/* Score ring top-right */}
                            <div className="absolute top-3 right-4 z-20">
                                <ScoreRing score={score} />
                            </div>

                            {/* Status badge */}
                            <div className="absolute top-16 right-6 z-20">
                                <div
                                    className={cn(
                                        "flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-mono font-semibold tracking-wide",
                                        st.class,
                                    )}
                                >
                                    <StatusIcon className="h-3 w-3" />
                                    {st.label}
                                </div>
                            </div>

                            {/* Company identity */}
                            <div className="absolute bottom-0 left-0 right-0 px-6 pb-5 z-10 flex items-end gap-4">
                                {/* Logo */}
                                <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-zinc-900 border-2 border-zinc-700 shadow-xl flex items-center justify-center overflow-hidden shrink-0">
                                    {logoUrl
                                        ? (
                                            <img
                                                src={logoUrl}
                                                alt={company.name}
                                                className="w-full h-full object-contain p-2"
                                                onError={(e) => {
                                                    e.currentTarget.style
                                                        .display = "none";
                                                    (e.currentTarget
                                                        .nextElementSibling as HTMLElement)
                                                        ?.classList.remove(
                                                            "hidden",
                                                        );
                                                }}
                                            />
                                        )
                                        : null}
                                    <Building2
                                        className={cn(
                                            "h-8 w-8 text-zinc-500",
                                            logoUrl && "hidden",
                                        )}
                                    />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <h1 className="text-2xl md:text-3xl font-bold text-white truncate">
                                        {company.name}
                                    </h1>
                                    {company.website && (
                                        <a
                                            href={getHomepageUrl(
                                                company.website,
                                            )}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300 mt-1 transition-colors"
                                        >
                                            <ExternalLink className="h-3 w-3" />
                                            {company.website.replace(
                                                /^https?:\/\/(www\.)?/,
                                                "",
                                            ).split("/")[0]}
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* ── INFO STRIP ──────────────────────────────────────────── */}
                        <div className="px-6 py-3 flex gap-3 overflow-x-auto shrink-0 border-b border-white/5 scrollbar-hide">
                            {company.industry && (
                                <InfoChip
                                    icon={Building2}
                                    label="Secteur"
                                    value={company.industry}
                                />
                            )}
                            {company.location && (
                                <InfoChip
                                    icon={MapPin}
                                    label="Localisation"
                                    value={company.location}
                                />
                            )}
                            {company.headcount && (
                                <InfoChip
                                    icon={Users}
                                    label="Effectifs"
                                    value={company.headcount}
                                />
                            )}
                            {company.activity && (
                                <InfoChip
                                    icon={Brain}
                                    label="Activité"
                                    value={company.activity}
                                />
                            )}
                        </div>

                        {/* ── SCROLLABLE BODY ─────────────────────────────────────── */}
                        <ScrollArea className="flex-1">
                            <div className="px-6 py-6 space-y-5 max-w-4xl">
                                {/* MATCH ORIGIN */}
                                {matchReason && (
                                    <Section
                                        title="Origine du Match"
                                        icon={CheckCircle2}
                                        accentColor="emerald"
                                    >
                                        <p className="text-sm text-zinc-300 leading-relaxed">
                                            {matchReason}
                                        </p>
                                        <div className="flex flex-wrap gap-2 mt-3">
                                            {company.validatedByCible && (
                                                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 border gap-1">
                                                    <Target className="h-3 w-3" />
                                                    {" "}
                                                    Validé Définition Cible
                                                </Badge>
                                            )}
                                            {company.validatedByCerveau && (
                                                <Badge className="bg-violet-500/10 text-violet-400 border-violet-500/20 border gap-1">
                                                    <Brain className="h-3 w-3" />
                                                    {" "}
                                                    Validé Cerveau Agence
                                                </Badge>
                                            )}
                                        </div>
                                    </Section>
                                )}

                                {/* ANALYSE STRATÉGIQUE */}
                                {(company.descriptionLong || company.context) &&
                                    (
                                        <Section
                                            title="Analyse Stratégique"
                                            icon={Brain}
                                            accentColor="violet"
                                        >
                                            <p className="text-sm text-zinc-300 leading-relaxed">
                                                {company.descriptionLong ||
                                                    company.context}
                                            </p>
                                            {company.strategicAnalysis && (
                                                <div className="mt-4 pt-4 border-t border-violet-500/10">
                                                    <p className="text-xs text-violet-400 font-mono uppercase mb-2 tracking-wider">
                                                        Pourquoi eux ?
                                                    </p>
                                                    <p className="text-sm text-zinc-400 leading-relaxed">
                                                        {company
                                                            .strategicAnalysis}
                                                    </p>
                                                </div>
                                            )}
                                        </Section>
                                    )}

                                {/* ACCROCHE */}
                                {company.customHook && (
                                    <Section
                                        title="Accroche Personnalisée"
                                        icon={Sparkles}
                                        accentColor="amber"
                                    >
                                        <p className="text-base text-zinc-200 italic leading-relaxed">
                                            "{company.customHook}"
                                        </p>
                                    </Section>
                                )}

                                {/* POINTS DE DOULEUR + SIGNAUX côte à côte */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    {company.painPoints &&
                                        company.painPoints.length > 0 && (
                                        <Section
                                            title="Points de Douleur"
                                            icon={AlertTriangle}
                                            accentColor="amber"
                                        >
                                            <ul className="space-y-2">
                                                {company.painPoints.map((
                                                    pain,
                                                    i,
                                                ) => (
                                                    <li
                                                        key={i}
                                                        className="flex items-start gap-2 text-sm text-zinc-400"
                                                    >
                                                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                                                        {pain}
                                                    </li>
                                                ))}
                                            </ul>
                                        </Section>
                                    )}
                                    {company.buyingSignals &&
                                        company.buyingSignals.length > 0 && (
                                        <Section
                                            title="Signaux d'Achat"
                                            icon={TrendingUp}
                                            accentColor="emerald"
                                        >
                                            <div className="flex flex-wrap gap-2">
                                                {company.buyingSignals.map((
                                                    sig,
                                                    i,
                                                ) => (
                                                    <span
                                                        key={i}
                                                        className="text-xs px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1"
                                                    >
                                                        <TrendingUp className="h-3 w-3" />
                                                        {" "}
                                                        {sig}
                                                    </span>
                                                ))}
                                            </div>
                                        </Section>
                                    )}
                                </div>

                                {/* DÉCIDEURS */}
                                <Section
                                    title="Décideurs Identifiés"
                                    icon={User}
                                    accentColor="indigo"
                                >
                                    {hasDecisionMaker
                                        ? (
                                            <div className="space-y-4">
                                                <ContactCard
                                                    decisionMaker={company
                                                        .decisionMaker!}
                                                    isPrimary={true}
                                                    targetingAnalysis={company
                                                        .targetingAnalysis}
                                                    companyName={company.name}
                                                />
                                                {company.alternativeContact && (
                                                    <ContactCard
                                                        decisionMaker={company
                                                            .alternativeContact}
                                                        isPrimary={false}
                                                        companyName={company
                                                            .name}
                                                    />
                                                )}
                                            </div>
                                        )
                                        : (
                                            <div className="flex flex-col items-center py-8 gap-4">
                                                <div className="w-14 h-14 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                                                    <User className="h-6 w-6 text-zinc-500" />
                                                </div>
                                                <p className="text-zinc-500 text-sm">
                                                    Aucun contact identifié
                                                </p>
                                                <Button
                                                    onClick={() =>
                                                        onFindDecisionMaker(
                                                            company,
                                                        )}
                                                    disabled={isFindingDecisionMaker}
                                                    className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
                                                >
                                                    {isFindingDecisionMaker
                                                        ? (
                                                            <>
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                                {" "}
                                                                Analyse en
                                                                cours...
                                                            </>
                                                        )
                                                        : (
                                                            <>
                                                                <UserSearch className="h-4 w-4" />
                                                                {" "}
                                                                Identifier les
                                                                Décideurs
                                                            </>
                                                        )}
                                                </Button>
                                            </div>
                                        )}
                                </Section>

                                {/* RE-ANALYSE */}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onAnalyze(company)}
                                    disabled={isAnalyzing}
                                    className="w-full bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 mt-2"
                                >
                                    <RefreshCw
                                        className={cn(
                                            "h-3 w-3 mr-2",
                                            isAnalyzing && "animate-spin",
                                        )}
                                    />
                                    {company.analysisStatus === "completed" ||
                                            company.analysisStatus ===
                                                "analyzed"
                                        ? "Re-analyser avec l'IA"
                                        : "Lancer l'analyse IA approfondie"}
                                </Button>

                                {/* Spacer for footer */}
                                <div className="h-4" />
                            </div>
                        </ScrollArea>

                        {/* ── FOOTER ACTION ───────────────────────────────────────── */}
                        {hasDecisionMaker && (
                            <ProspectFooter
                                company={company}
                                decisionMaker={company.decisionMaker!}
                                onClose={onClose}
                            />
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// ── Contact Card ─────────────────────────────────────────────────────────────
function ContactCard({
    decisionMaker,
    isPrimary,
    companyName,
    targetingAnalysis,
}: {
    decisionMaker: DecisionMaker;
    isPrimary: boolean;
    companyName: string;
    targetingAnalysis?: TargetingAnalysis;
}) {
    const score = decisionMaker.matchScore || decisionMaker.confidenceScore ||
        0;

    return (
        <div
            className={cn(
                "p-4 rounded-xl border",
                isPrimary
                    ? "bg-amber-500/5 border-amber-500/20"
                    : "bg-zinc-900/50 border-zinc-800",
            )}
        >
            {/* Badge */}
            <div className="flex items-center gap-2 mb-3">
                <div
                    className={cn(
                        "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold font-mono border",
                        isPrimary
                            ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                            : "bg-zinc-800 border-zinc-700 text-zinc-400",
                    )}
                >
                    {isPrimary
                        ? <Crown className="h-3 w-3" />
                        : <Shield className="h-3 w-3" />}
                    {isPrimary ? "DÉCIDEUR PRINCIPAL" : "CONTACT ALTERNATIF"}
                </div>
                {score > 0 && (
                    <span
                        className={cn(
                            "ml-auto text-xs px-2 py-0.5 rounded-full font-bold border",
                            score >= 85
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : "bg-amber-500/10 text-amber-400 border-amber-500/20",
                        )}
                    >
                        Match {score}%
                    </span>
                )}
            </div>

            {/* Profile */}
            <div className="flex items-center gap-3">
                <div
                    className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold border-2",
                        isPrimary
                            ? "bg-amber-500/20 border-amber-500/30 text-amber-400"
                            : "bg-zinc-800 border-zinc-700 text-zinc-400",
                    )}
                >
                    {decisionMaker.fullName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                    <p className="font-semibold text-white">
                        {decisionMaker.fullName}
                    </p>
                    <p className="text-sm text-zinc-400">
                        {decisionMaker.jobTitle}
                    </p>
                    <p className="text-xs text-zinc-600">{companyName}</p>
                </div>
            </div>

            {/* Contact actions */}
            <div className="flex gap-2 mt-3">
                {decisionMaker.linkedinUrl && (
                    <a
                        href={decisionMaker.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#0A66C2]/10 border border-[#0A66C2]/30 text-[#0A66C2] hover:bg-[#0A66C2]/20 transition-colors text-xs font-medium"
                    >
                        <Linkedin className="h-3.5 w-3.5" /> LinkedIn
                    </a>
                )}
                {decisionMaker.email && (
                    <a
                        href={`mailto:${decisionMaker.email}`}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 transition-colors text-xs font-medium"
                    >
                        <Mail className="h-3.5 w-3.5" /> Email
                    </a>
                )}
            </div>

            {/* Why this role */}
            {(decisionMaker.whyThisRole || targetingAnalysis?.primaryReason) &&
                isPrimary && (
                <div className="mt-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                    <p className="text-xs text-amber-500 font-mono uppercase mb-1">
                        Pourquoi ce profil ?
                    </p>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                        {decisionMaker.whyThisRole ||
                            targetingAnalysis?.primaryReason}
                    </p>
                </div>
            )}
        </div>
    );
}

// ── Prospect Footer ───────────────────────────────────────────────────────────
function ProspectFooter({
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

    useEffect(() => {
        const check = async () => {
            if (decisionMaker.linkedinUrl) {
                const id = await checkProspectExists(decisionMaker.linkedinUrl);
                if (id) {
                    setIsAdded(true);
                    setProspectId(id);
                }
            }
        };
        check();
    }, [decisionMaker.linkedinUrl, checkProspectExists]);

    const handleEngager = async () => {
        setIsAdding(true);
        const result = await addProspect({
            company_name: company.name,
            contact_name: decisionMaker.fullName,
            first_name: decisionMaker.firstName,
            last_name: decisionMaker.lastName,
            job_title: decisionMaker.jobTitle,
            linkedin_url: decisionMaker.linkedinUrl || "",
            email: decisionMaker.email,
            company_website: company.website,
            company_domain: company.domain,
            company_industry: company.industry,
            company_headcount: company.headcount,
            company_location: company.location,
            company_logo_url: company.logoUrl,
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
        setIsAdding(false);
        if (result.success) {
            setIsAdded(true);
            setProspectId(result.prospectId || null);
        }
    };

    return (
        <div className="shrink-0 border-t border-white/5 bg-zinc-950/90 backdrop-blur-md px-6 py-4">
            {isAdded
                ? (
                    <div className="flex items-center gap-3">
                        <div className="flex-1">
                            <p className="text-xs text-emerald-400 flex items-center gap-1 mb-1">
                                <CheckCircle2 className="h-3.5 w-3.5" />{" "}
                                Prospect transféré
                            </p>
                            <p className="text-xs text-zinc-600">
                                Disponible dans la Tour de Contrôle
                            </p>
                        </div>
                        <Button
                            onClick={() => {
                                onClose();
                                navigate(
                                    "/radar/prospects" + (prospectId
                                        ? `?highlight=${prospectId}`
                                        : ""),
                                );
                            }}
                            className="gap-2 bg-violet-600 hover:bg-violet-700 text-white"
                        >
                            <ExternalLink className="h-4 w-4" /> Voir la Fiche
                        </Button>
                    </div>
                )
                : (
                    <Button
                        onClick={handleEngager}
                        disabled={isAdding || !decisionMaker.linkedinUrl}
                        className="w-full gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-900/30 h-12 text-base font-semibold rounded-xl"
                        size="lg"
                    >
                        {isAdding
                            ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    {" "}
                                    Transfert en cours...
                                </>
                            )
                            : (
                                <>
                                    <Rocket className="h-5 w-5" />{" "}
                                    Engager ce contact
                                </>
                            )}
                    </Button>
                )}
        </div>
    );
}
