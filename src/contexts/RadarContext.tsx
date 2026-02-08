import React, {
    createContext,
    ReactNode,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProject } from "@/contexts/ProjectContext";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { usePOD } from "@/contexts/PODContext";
import {
    AnalysisResult,
    Company,
    DecisionMaker,
    FindDecisionMakerResult,
    TargetingAnalysis,
} from "@/components/radar-v2/types";

// Interface for the Context
interface RadarContextType {
    companies: Company[];
    selectedCompany: Company | null;
    isLoading: boolean;
    isSheetOpen: boolean;
    openCompanySheet: (company: Company) => void;
    closeSheet: () => void;
    isScanning: boolean;
    scanProgress: number;
    scanStep:
        | "idle"
        | "analyzing"
        | "reviewing"
        | "searching"
        | "validating"
        | "complete"
        | "error";
    scanMarket: (options?: { forceRefresh?: boolean }) => Promise<void>;
    analyzeMarket: (forceRefresh?: boolean) => Promise<void>;
    executeStrategy: (approvedQueries?: string[]) => Promise<void>;
    strategicIdentity: any;
    proposedStrategy: any;
    isStrategizing: boolean;
    isExecuting: boolean;
    analyzingCompanyId: string | null;
    analyzeCompany: (company: Company) => Promise<AnalysisResult | null>;
    isFindingDecisionMaker: boolean;
    findDecisionMaker: (
        company: Company,
    ) => Promise<FindDecisionMakerResult | null>;
    clearCompanies: () => void;
    injectTestCard: () => void;
    resetRadar: () => Promise<void>;
    forceReloadRadar: () => void;
    recalibrateRadar: (forceFreshStart?: boolean) => Promise<void>;
    refetch: () => void;
    projectId: string | undefined;
    projectName: string | undefined;
    projectContext: {
        hasPdf: boolean;
        hasSite: boolean;
        hasTarget: boolean;
    };
}

const RadarContext = createContext<RadarContextType | undefined>(undefined);

export function RadarProvider({ children }: { children: ReactNode }) {
    const { currentProject } = useProject();
    const { saveAgencyDNA, saveTargetCriteria } = usePOD();
    const { toast } = useToast();
    const { session, ensureSession } = useAuth();
    const queryClient = useQueryClient();

    const [selectedCompany, setSelectedCompany] = useState<Company | null>(
        null,
    );
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [scanProgress, setScanProgress] = useState(0);
    const [scanStep, setScanStep] = useState<
        | "idle"
        | "analyzing"
        | "reviewing"
        | "searching"
        | "validating"
        | "complete"
        | "error"
    >("idle");
    const [analyzingCompanyId, setAnalyzingCompanyId] = useState<string | null>(
        null,
    );
    const [isFindingDecisionMaker, setIsFindingDecisionMaker] = useState(false);

    // REALTIME WATCHDOG
    const lastActivityRef = useRef<number>(Date.now());
    const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

    // FORCE RESET LOCK: Prevents auto-refetching during "Hard Reset"
    const [manualResetActive, setManualResetActive] = useState(false);

    // New Double-Pass State
    const [strategicIdentity, setStrategicIdentity] = useState<any>(null);
    const [proposedStrategy, setProposedStrategy] = useState<any>(null);
    const [isStrategizing, setIsStrategizing] = useState(false);
    const [isExecuting, setIsExecuting] = useState(false);

    const scanChannelRef = useRef<any>(null);

    // Fetch project context (DNA) to check what's configured
    const { data: projectData } = useQuery({
        queryKey: ["project-data", currentProject?.id],
        queryFn: async () => {
            if (!currentProject?.id) return null;

            const { data, error } = await supabase
                .from("project_data")
                .select("*")
                .eq("project_id", currentProject.id);

            if (error) {
                console.error("Error fetching project data:", error);
                return null;
            }

            return data;
        },
        enabled: !!currentProject?.id,
    });

    // Compute project context status
    const projectContext = useMemo(() => {
        if (!projectData) {
            return { hasPdf: false, hasSite: false, hasTarget: false };
        }

        const agencyDNA = projectData.find((d) => d.data_type === "agency_dna")
            ?.data as Record<string, any> | undefined;
        const targetDef = projectData.find((d) =>
            d.data_type === "target_definition"
        )?.data as Record<string, any> | undefined;

        return {
            hasPdf: !!(agencyDNA?.extractedContent),
            hasSite: !!agencyDNA?.websiteUrl,
            hasTarget: !!(targetDef ||
                agencyDNA?.trackRecord?.dreamClients?.length > 0),
        };
    }, [projectData]);

    // Fetch companies from company_analyses table
    const { data: companies = [], isLoading, refetch } = useQuery({
        queryKey: ["radar-companies", currentProject?.id],
        queryFn: async () => {
            if (!currentProject?.id) return [];

            const { data, error } = await supabase
                .from("company_analyses")
                .select("*")
                .select("*")
                .eq("project_id", currentProject.id)
                // VISIBILITY FIX: Sort by UPDATE date (Freshness)
                .order("updated_at", { ascending: false, nullsFirst: false });

            if (error) {
                console.error("Error fetching companies:", error);
                return [];
            }

            const result = (data || []).map((row) => {
                // Parse decision maker, alternative contact, and match origin from custom_hook
                let decisionMaker = undefined;
                let alternativeContact = undefined;
                let targetingAnalysis = undefined;
                let validatedByCible = false;
                let validatedByCerveau = false;
                let matchReason = row.match_explanation;
                let googleMaps = undefined;

                if (row.custom_hook) {
                    try {
                        const hookData = typeof row.custom_hook === "string"
                            ? JSON.parse(row.custom_hook)
                            : row.custom_hook;

                        // PRECISION ENGINE V3: Primary Contact
                        if (
                            hookData?.decisionMaker || hookData?.primaryContact
                        ) {
                            const dm = hookData.primaryContact ||
                                hookData.decisionMaker;
                            decisionMaker = {
                                firstName: dm.firstName,
                                lastName: dm.lastName,
                                fullName: dm.fullName,
                                email: dm.email,
                                linkedinUrl: dm.linkedinUrl,
                                jobTitle: dm.jobTitle,
                                confidenceScore: dm.confidenceScore,
                                matchScore: dm.matchScore,
                                matchReason: dm.matchReason,
                                whyThisRole: dm.whyThisRole,
                                scoreBreakdown: dm.scoreBreakdown,
                            };
                        }

                        // PRECISION ENGINE V3: Alternative Contact
                        if (hookData?.alternativeContact) {
                            const alt = hookData.alternativeContact;
                            alternativeContact = {
                                firstName: alt.firstName,
                                lastName: alt.lastName,
                                fullName: alt.fullName,
                                email: alt.email,
                                linkedinUrl: alt.linkedinUrl,
                                jobTitle: alt.jobTitle,
                                matchScore: alt.matchScore,
                                matchReason: alt.matchReason,
                                whyThisRole: alt.whyThisRole,
                                scoreBreakdown: alt.scoreBreakdown,
                            };
                        }

                        // PRECISION ENGINE V3: Targeting Analysis
                        if (hookData?.targetingAnalysis) {
                            targetingAnalysis = hookData.targetingAnalysis;
                        }

                        // ZERO-DÉCHET: Extract match origin
                        if (hookData?.validatedByCible !== undefined) {
                            validatedByCible = hookData.validatedByCible;
                        }
                        if (hookData?.validatedByCerveau !== undefined) {
                            validatedByCerveau = hookData.validatedByCerveau;
                        }
                        if (hookData?.matchReason) {
                            matchReason = hookData.matchReason;
                        }
                        if (hookData?.googleMaps) {
                            googleMaps = hookData.googleMaps;
                        }
                    } catch (e) {
                        // Not JSON, ignore
                    }
                }

                // NEW: Extract Activity from custom_hook if available
                let activity = undefined;
                if (row.custom_hook) {
                    try {
                        const hookData = typeof row.custom_hook === "string"
                            ? JSON.parse(row.custom_hook)
                            : row.custom_hook;
                        if (hookData?.original_activity) {
                            activity = hookData.original_activity;
                        } else if (hookData?.activity) {
                            activity = hookData.activity;
                        }
                    } catch (e) {
                        // Ignore
                    }
                }

                // FRONTEND FALLBACKS:
                // 1. Name: If "Unknown" or missing, use Domain Name
                let finalName = row.company_name;
                if (
                    (!finalName || finalName === "Unknown") && row.company_url
                ) {
                    try {
                        // Strip protocol and www to get clean name
                        const urlObj = new URL(
                            row.company_url.startsWith("http")
                                ? row.company_url
                                : `https://${row.company_url}`,
                        );
                        finalName = urlObj.hostname.replace("www.", "");
                    } catch (e) {
                        finalName = row.company_url;
                    }
                }

                // 2. Logo: If missing, use Google Favicon
                let finalLogo = row.logo_url;
                if (!finalLogo && row.company_url) {
                    finalLogo =
                        `https://www.google.com/s2/favicons?domain=${row.company_url}&sz=128`;
                }

                // 3. Strategic Category & Fallback Calculation
                // Cast row to any to access strategic_category without updating global types immediately
                const rawRow = row as any;
                let strategicCategory = rawRow.strategic_category;

                if (!strategicCategory) {
                    // Default to Perfect Match for Agent findings as requested
                    strategicCategory = "PERFECT_MATCH";
                }

                return {
                    id: row.id,
                    name: finalName || "Entreprise Inconnue", // Ultra fallback
                    website: row.company_url
                        ? `https://${row.company_url}`
                        : undefined,
                    domain: row.company_url,
                    logoUrl: finalLogo,
                    industry: row.industry,
                    headcount: row.headcount,
                    location: row.location,
                    score: 0, // Score is dead
                    status: "hot", // Always hot since Agent filtered it
                    signals: Array.isArray(row.buying_signals)
                        ? row.buying_signals
                        : [],
                    tags: row.industry ? [row.industry] : [],
                    descriptionLong: row.description_long,
                    painPoints: Array.isArray(row.detected_pain_points)
                        ? row.detected_pain_points
                        : [],
                    buyingSignals: Array.isArray(row.buying_signals)
                        ? row.buying_signals
                        : [],
                    strategicAnalysis: row.strategic_analysis,
                    customHook: typeof row.custom_hook === "string" &&
                            !row.custom_hook.startsWith("{")
                        ? row.custom_hook
                        : undefined,

                    matchExplanation: row.match_explanation,
                    context: row.match_explanation, // Map context
                    activity: activity, // Map activity
                    analysisStatus: row
                        .analysis_status as Company["analysisStatus"],
                    analyzedAt: row.analyzed_at,
                    createdAt: row.created_at,
                    updatedAt: row.updated_at, // Ensure we have this for sorting by freshness
                    decisionMaker,
                    alternativeContact,
                    targetingAnalysis,
                    validatedByCible,
                    validatedByCerveau,
                    matchReason,
                    googleMaps,
                    strategicCategory,
                };
            })
                .sort((a: any, b: any) => {
                    // SORT PRIORITY:
                    // 1. Strategic Category (PERFECT_MATCH > OPPORTUNITY > OUT_OF_SCOPE/Undefined)
                    // 2. Freshness (updatedAt)
                    // 3. Score (matchScore)

                    const categoryRank = {
                        "PERFECT_MATCH": 3,
                        "OPPORTUNITY": 2,
                        "OUT_OF_SCOPE": 0,
                    };

                    const catA = categoryRank[
                        a.strategicCategory as keyof typeof categoryRank
                    ] || 1; // Default to 1 (between opp and out)
                    const catB = categoryRank[
                        b.strategicCategory as keyof typeof categoryRank
                    ] || 1;

                    if (catA !== catB) return catB - catA; // Higher rank first

                    // Secondary: Date
                    const dateA = new Date(a.updatedAt || a.createdAt || 0)
                        .getTime();
                    const dateB = new Date(b.updatedAt || b.createdAt || 0)
                        .getTime();
                    return dateB - dateA; // Descending Date
                }) as Company[];

            console.log("🔍 [useRadar] FETCHED COMPANIES:", {
                total: result.length,
                top3: result.slice(0, 3).map((c) => ({
                    name: c.name,
                    category: c.strategicCategory,
                    score: c.score,
                })),
            });

            return result;
        },
        enabled: !!currentProject?.id && !manualResetActive, // LOCK QUERY IF RESETTING
    });

    // Real-time subscription for company_analyses
    useEffect(() => {
        if (!currentProject?.id) return;

        const channel = supabase
            .channel("radar-companies-realtime")
            .on(
                "postgres_changes",
                {
                    event: "*", // Listen to ALL events (INSERT + UPDATE)
                    schema: "public",
                    table: "company_analyses",
                    filter: `project_id=eq.${currentProject.id}`,
                },
                (payload) => {
                    console.log(
                        "⚡️ REALTIME EVENT:",
                        payload.eventType,
                        payload.new,
                    );

                    // 1. UPDATE WATCHDOG
                    lastActivityRef.current = Date.now();

                    // 2. OPTIMISTIC UI UPDATE
                    queryClient.setQueryData(
                        ["radar-companies", currentProject.id],
                        (oldData: Company[] | undefined) => {
                            const newRecord = payload.new as any;

                            // Helper to shape the company object
                            const shapeCompany = (record: any): Company => {
                                // Fallback Strategy for legacy data (Realtime)
                                let strategicCategory =
                                    record.strategic_category;
                                if (!strategicCategory) {
                                    strategicCategory = "PERFECT_MATCH";
                                }

                                return {
                                    id: record.id,
                                    name: record.company_name ||
                                        "New Candidate",
                                    website: record.company_url
                                        ? `https://${record.company_url}`
                                        : undefined,
                                    domain: record.company_url,
                                    logoUrl: record.logo_url,
                                    score: 0,
                                    status: "hot",
                                    analysisStatus: record.analysis_status,
                                    createdAt: record.created_at,
                                    updatedAt: record.updated_at,
                                    // Add defaults for other required fields
                                    tags: [],
                                    signals:
                                        Array.isArray(record.buying_signals)
                                            ? record.buying_signals
                                            : [],
                                    painPoints: Array.isArray(
                                            record.detected_pain_points,
                                        )
                                        ? record.detected_pain_points
                                        : [],
                                    buyingSignals:
                                        Array.isArray(record.buying_signals)
                                            ? record.buying_signals
                                            : [],
                                    strategicAnalysis:
                                        record.strategic_analysis,
                                    matchExplanation: record.match_explanation,
                                    descriptionLong: record.description_long ||
                                        record.strategic_analysis,

                                    strategicCategory,
                                    // Map real-time fields
                                    context: record.match_explanation,
                                    activity: record.custom_hook &&
                                            typeof record.custom_hook ===
                                                "string" &&
                                            record.custom_hook.includes(
                                                "original_activity",
                                            )
                                        ? JSON.parse(record.custom_hook)
                                            .original_activity
                                        : undefined,
                                } as Company;
                            };

                            const shapedNew = shapeCompany(newRecord);

                            if (!oldData) return [shapedNew];

                            // Check if exists
                            const exists = oldData.find((c) =>
                                c.id === shapedNew.id
                            );
                            if (exists) {
                                // UPDATE
                                return oldData.map((c) =>
                                    c.id === shapedNew.id
                                        ? { ...c, ...shapedNew }
                                        : c
                                );
                            } else {
                                // INSERT
                                return [shapedNew, ...oldData];
                            }
                        },
                    );

                    // 3. FORCE INVALIDATE (Safety net)
                    if (!manualResetActive) {
                        queryClient.invalidateQueries({
                            queryKey: ["radar-companies", currentProject.id],
                        });
                    }
                },
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentProject?.id, queryClient, manualResetActive]);

    // SILENCE DETECTION (Auto-Complete)
    useEffect(() => {
        if (!isExecuting) {
            if (silenceTimerRef.current) clearInterval(silenceTimerRef.current);
            return;
        }

        lastActivityRef.current = Date.now(); // Reset on start

        silenceTimerRef.current = setInterval(() => {
            const inactiveDuration = Date.now() - lastActivityRef.current;
            if (inactiveDuration > 300000) { // 5m silence (Ultimate Patience)
                console.log("🛑 SILENCE DETECTED - ENDING SCAN");
                setIsExecuting(false);
                setScanStep("complete");
                setScanProgress(100);
                toast({
                    title: "Radar Terminé",
                    description: "Scan terminé (période de silence détectée).",
                });
                clearInterval(silenceTimerRef.current!);
            }
        }, 2000);

        return () => {
            if (silenceTimerRef.current) clearInterval(silenceTimerRef.current);
        };
    }, [isExecuting, toast]);

    // Open company detail sheet
    const openCompanySheet = useCallback((company: Company) => {
        console.log("🔥 CLIC DÉTECTÉ SUR :", company.name);
        setSelectedCompany(company);
        setIsSheetOpen(true);
    }, []);

    // Close company detail sheet
    const closeSheet = useCallback(() => {
        setIsSheetOpen(false);
        setSelectedCompany(null);
    }, []);

    // Simulated Progress Logic
    useEffect(() => {
        if (!isScanning) return;

        const startTime = Date.now();
        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime;

            setScanProgress((prev) => {
                if (elapsed < 3000) {
                    setScanStep("analyzing");
                    return Math.min(15, (elapsed / 3000) * 15); // 0 à 15% en 3s (Analyse)
                } else if (elapsed < 25000) {
                    setScanStep("searching");
                    return Math.min(75, 15 + ((elapsed - 3000) / 22000) * 60); // 15 à 75% (Recherche)
                } else {
                    setScanStep("validating"); // "Analyse IA"
                    return Math.min(85, prev + 0.1);
                }
            });
        }, 100);

        return () => clearInterval(interval);
    }, [isScanning]);

    // --- PHASE 1: STRATEGIZE (The Brain) ---
    const analyzeMarket = useCallback(async (forceRefresh = false) => {
        if (!currentProject?.id) return;

        setIsStrategizing(true);
        setScanStep("analyzing");
        setScanProgress(10);
        setManualResetActive(false); // UNLOCK QUERY FOR NEW SCAN

        try {
            // FORCE SESSION REFRESH to avoid 401 errors
            console.log("[Radar] 🔄 Refreshing session before strategize...");
            const { data: { session: freshSession }, error: sessionError } =
                await supabase.auth.getSession();

            if (sessionError || !freshSession) {
                throw new Error(
                    "Session expired or invalid. Please refresh the page.",
                );
            }

            console.log(
                "[Radar] 🧠 Strategizing for project:",
                currentProject.id,
            );

            const { data, error } = await supabase.functions.invoke(
                "strategize-radar",
                {
                    body: {
                        projectId: currentProject.id,
                        force_analyze: forceRefresh,
                    },
                    headers: {
                        Authorization: `Bearer ${freshSession.access_token}`,
                    },
                },
            );

            if (error) throw error;
            if (!data.success) throw new Error(data.error);

            console.log("🧠 STRATEGY RECEIVED:", data);

            if (data.fallback_mode) {
                toast({
                    title: "Mode Dégradé (Secours)",
                    description: `Erreur interne: ${
                        data.original_error || data.error_logged
                    }. Utilisation de la stratégie par défaut.`,
                    variant: "destructive",
                    duration: 5000,
                });
            }

            setStrategicIdentity(data.identity);
            setProposedStrategy(data.strategy);
            setScanStep("reviewing"); // Wait for user validation
            setScanProgress(30);
        } catch (err: any) {
            console.error("[Radar] Strategy Error:", err);
            setScanStep("error");
            toast({
                title: "Erreur Stratégique",
                description: err.message || "Echec de l'analyse",
                variant: "destructive",
            });
        } finally {
            setIsStrategizing(false);
        }
    }, [currentProject?.id, session, toast]);

    // --- PHASE 2: EXECUTE (The Muscle) ---
    const executeStrategy = useCallback(async (approvedQueries?: string[]) => {
        if (!currentProject?.id) return;

        const queries = approvedQueries || proposedStrategy?.queries;
        if (!queries || queries.length === 0) {
            toast({
                title: "Aucune stratégie",
                description: "Veuillez relancer l'analyse.",
                variant: "destructive",
            });
            return;
        }

        setIsExecuting(true);
        setScanStep("searching");
        setScanProgress(40);

        // Progress Simulation for the boring part
        const progressInterval = setInterval(() => {
            setScanProgress((p) => p < 80 ? p + 2 : p);
        }, 500);

        try {
            // FORCE SESSION REFRESH to avoid 401 errors
            console.log("[Radar] 🔄 Refreshing session before execute...");
            const { data: { session: freshSession }, error: sessionError } =
                await supabase.auth.getSession();

            if (sessionError || !freshSession) {
                throw new Error(
                    "Session expired or invalid. Please refresh the page.",
                );
            }

            console.log("[Radar] ⚔️ Executing Strategy:", queries);

            const { data, error } = await supabase.functions.invoke(
                "execute-radar",
                {
                    body: {
                        projectId: currentProject.id,
                        approved_queries: queries,
                    },
                    headers: {
                        Authorization: `Bearer ${freshSession.access_token}`,
                    },
                },
            );

            clearInterval(progressInterval);

            if (error) throw error;
            if (!data.success) throw new Error(data.error);

            console.log("⚔️ EXECUTION STARTED (Async Mode)");

            toast({
                title: "Radar Lancé (Deep Research)",
                description:
                    "L'Agent analyse le web en profondeur. Cela peut prendre 5 à 10 minutes. Restez sur cette page.",
            });

            // DO NOT COMPLETE IMMEDIATELY
            // setScanStep("complete");
            // setScanProgress(100);

            // Instead, rely on the Silence Detection Effect to finish the job
            // or Realtime events to keep it alive.
        } catch (err: any) {
            clearInterval(progressInterval);
            console.error("[Radar] Execution Error:", err);
            setScanStep("error");
            setIsExecuting(false); // Stop the loop on error
            toast({
                title: "Erreur d'Exécution",
                description: err.message,
                variant: "destructive",
            });
        }
        // FINALLY BLOCK REMOVED: We want isExecuting to stay TRUE until silence detection kills it
        // finally {
        //   setIsExecuting(false);
        // }
    }, [currentProject?.id, session, proposedStrategy, toast, refetch]);

    // Legacy Wrapper for compatibility (optional)
    const scanMarket = useCallback(
        async (options?: { forceRefresh?: boolean }) => {
            // For now, we redirect to analyzeMarket to start the flow
            return analyzeMarket(options?.forceRefresh);
        },
        [analyzeMarket],
    );

    // Analyze a specific company with Firecrawl
    const analyzeCompany = useCallback(
        async (company: Company): Promise<AnalysisResult | null> => {
            if (!currentProject?.id || !company.website) {
                toast({
                    title: "Données manquantes",
                    description: "URL de l'entreprise requise pour l'analyse",
                    variant: "destructive",
                });
                return null;
            }

            setAnalyzingCompanyId(company.id);

            try {
                console.log("[RADAR] 🔍 Analyzing company:", company.name);

                const { data, error } = await supabase.functions.invoke(
                    "analyze-single-company",
                    {
                        body: {
                            companyId: company.id, // Use ID, not name/url as primary key if possible, but function supports ID
                        },
                    },
                );

                if (error) throw error;
                if (!data.success) {
                    throw new Error(data.error || "Analysis failed");
                }

                const analysis = data.data; // New format returns { success: true, data: { ...company } }

                // Feedback for Cache Hit (Optimistic UI)
                if (data.cached) {
                    toast({
                        title: "⚡️ Analyse instantanée",
                        description: "Résultat chargé depuis la mémoire cache",
                        duration: 2000,
                        className:
                            "bg-emerald-50 border-emerald-200 text-emerald-800",
                    });
                }

                // Update selected company with new data
                if (selectedCompany?.id === company.id) {
                    setSelectedCompany({
                        ...selectedCompany,
                        descriptionLong: analysis.description_long ||
                            analysis.strategic_analysis, // Fallback
                        painPoints: analysis.detected_pain_points || [],
                        buyingSignals: analysis.buying_signals || [],
                        strategicAnalysis: analysis.strategic_analysis,
                        customHook: analysis.custom_hook,
                        matchExplanation: analysis.match_explanation,
                        score: analysis.match_score,
                        logoUrl: analysis.logo_url,
                        analysisStatus: "deduced", // Confirmed completed
                    });
                }

                refetch();

                return {
                    descriptionLong: analysis.description_long,
                    painPoints: analysis.detected_pain_points || [],
                    buyingSignals: analysis.buying_signals || [],
                    strategicAnalysis: analysis.strategic_analysis,
                    customHook: analysis.custom_hook,
                    matchScore: analysis.match_score,
                    matchExplanation: analysis.match_explanation,
                    logoUrl: analysis.logo_url,
                };
            } catch (error) {
                console.error("[RADAR] Analysis error:", error);
                toast({
                    title: "Erreur d'analyse",
                    description: error instanceof Error
                        ? error.message
                        : "Impossible d'analyser l'entreprise",
                    variant: "destructive",
                });
                return null;
            } finally {
                setAnalyzingCompanyId(null);
            }
        },
        [currentProject?.id, selectedCompany, toast, refetch],
    );

    // Find decision maker using PRECISION CONTACT ENGINE V3
    const findDecisionMaker = useCallback(
        async (company: Company): Promise<FindDecisionMakerResult | null> => {
            if (!company.domain && !company.website) {
                toast({
                    title: "Domaine manquant",
                    description:
                        "L'URL de l'entreprise est requise pour trouver le décideur",
                    variant: "destructive",
                });
                return null;
            }

            setIsFindingDecisionMaker(true);

            try {
                console.log(
                    "[RADAR] 🎯 PRECISION ENGINE V3: Finding decision makers for:",
                    company.name,
                );

                // Use the PRECISION CONTACT ENGINE
                const { data, error } = await supabase.functions.invoke(
                    "sniper-decision-maker",
                    {
                        body: {
                            companyName: company.name,
                            companyUrl: company.website || company.domain,
                            projectId: currentProject?.id,
                        },
                    },
                );

                if (error) throw error;

                if (data.success) {
                    // 👑 PRIMARY CONTACT (Le Décideur)
                    const primaryDm: DecisionMaker | undefined =
                        data.primaryContact || data.decisionMaker
                            ? {
                                firstName:
                                    (data.primaryContact || data.decisionMaker)
                                        .firstName,
                                lastName:
                                    (data.primaryContact || data.decisionMaker)
                                        .lastName,
                                fullName:
                                    (data.primaryContact || data.decisionMaker)
                                        .fullName,
                                linkedinUrl:
                                    (data.primaryContact || data.decisionMaker)
                                        .linkedinUrl,
                                jobTitle:
                                    (data.primaryContact || data.decisionMaker)
                                        .jobTitle,
                                matchScore:
                                    (data.primaryContact || data.decisionMaker)
                                        .matchScore,
                                matchReason:
                                    (data.primaryContact || data.decisionMaker)
                                        .matchReason,
                                whyThisRole:
                                    (data.primaryContact || data.decisionMaker)
                                        .whyThisRole ||
                                    data.targetingAnalysis?.primaryReason,
                                scoreBreakdown:
                                    (data.primaryContact || data.decisionMaker)
                                        .scoreBreakdown,
                                confidenceScore:
                                    (data.primaryContact || data.decisionMaker)
                                        .matchScore,
                            }
                            : undefined;

                    // 🛡️ ALTERNATIVE CONTACT (Le Relais)
                    const alternativeDm: DecisionMaker | undefined =
                        data.alternativeContact
                            ? {
                                firstName: data.alternativeContact.firstName,
                                lastName: data.alternativeContact.lastName,
                                fullName: data.alternativeContact.fullName,
                                linkedinUrl:
                                    data.alternativeContact.linkedinUrl,
                                jobTitle: data.alternativeContact.jobTitle,
                                matchScore: data.alternativeContact.matchScore,
                                matchReason:
                                    data.alternativeContact.matchReason,
                                whyThisRole:
                                    data.alternativeContact.whyThisRole ||
                                    data.targetingAnalysis?.alternativeReason,
                                scoreBreakdown:
                                    data.alternativeContact.scoreBreakdown,
                            }
                            : undefined;

                    // Targeting Analysis
                    const targetingAnalysis: TargetingAnalysis | undefined =
                        data.targetingAnalysis;

                    // Update selected company with both contacts
                    if (selectedCompany?.id === company.id) {
                        setSelectedCompany({
                            ...selectedCompany,
                            decisionMaker: primaryDm,
                            alternativeContact: alternativeDm,
                            targetingAnalysis,
                        });
                    }

                    // Update in database with PRECISION ENGINE data
                    if (company.id) {
                        const hookData = {
                            primaryContact: primaryDm,
                            alternativeContact: alternativeDm,
                            targetingAnalysis,
                            decisionMaker: primaryDm, // Legacy compatibility
                            targetJobTitles: data.targetJobTitles,
                            searchPhases: data.searchPhases,
                        };

                        await supabase
                            .from("company_analyses")
                            .update({ custom_hook: JSON.stringify(hookData) })
                            .eq("id", company.id);
                    }

                    // Toast with both contacts info
                    const altInfo = alternativeDm
                        ? ` | Alternative: ${alternativeDm.fullName}`
                        : "";
                    toast({
                        title: `🎯 ${
                            primaryDm ? "👑 Décideur" : "🛡️ Alternative"
                        } identifié`,
                        description: primaryDm
                            ? `${primaryDm.fullName} - ${primaryDm.jobTitle}${altInfo}`
                            : alternativeDm
                            ? `${alternativeDm.fullName} - ${alternativeDm.jobTitle}`
                            : "Aucun contact qualifié",
                    });

                    return {
                        success: true,
                        primaryContact: primaryDm,
                        alternativeContact: alternativeDm,
                        targetingAnalysis,
                        decisionMaker: primaryDm, // Legacy
                        alternatives: alternativeDm
                            ? [{
                                fullName: alternativeDm.fullName,
                                jobTitle: alternativeDm.jobTitle,
                                linkedinUrl: alternativeDm.linkedinUrl,
                            }]
                            : undefined,
                        targetJobTitles: data.targetJobTitles,
                        searchPhases: data.searchPhases,
                    };
                } else {
                    const errorMsg = data.error ||
                        "Aucun profil qualifié trouvé";

                    toast({
                        title: "Aucun décideur qualifié",
                        description: `${errorMsg}. Rejetés: ${
                            data.searchPhases?.phase2?.candidatesRejected || 0
                        }`,
                        variant: "destructive",
                    });

                    return {
                        success: false,
                        error: errorMsg,
                        targetJobTitles: data.targetJobTitles,
                        searchPhases: data.searchPhases,
                        targetingAnalysis: data.targetingAnalysis,
                    };
                }
            } catch (error) {
                console.error("[RADAR] PRECISION ENGINE error:", error);
                toast({
                    title: "Erreur de recherche",
                    description: error instanceof Error
                        ? error.message
                        : "Impossible de trouver les décideurs",
                    variant: "destructive",
                });
                return null;
            } finally {
                setIsFindingDecisionMaker(false);
            }
        },
        [selectedCompany, currentProject?.id, toast],
    );

    // 🧪 FORCE VISIBILITY TEST: Verify if frontend can display ANY card
    const injectTestCard = () => {
        console.log("🧪 INJECTING TEST CARD...");
        const testCard: Company = {
            id: "test-card-" + Date.now(),
            name: "TEST COMPANY - " + new Date().toLocaleTimeString(),
            website: "https://example.com",
            domain: "example.com",
            score: 99,
            status: "hot",
            matchReason: "This is a forced test card to verify UI rendering.",
            analysisStatus: "deduced",
            signals: ["Test Signal 1", "Test Signal 2"],
            painPoints: ["Test Pain Point"],
            buyingSignals: ["Test Buying Signal"],
            descriptionLong: "This is a dummy description for the test card.",
            customHook: "{}",
        };

        queryClient.setQueryData(
            ["radar-companies", currentProject?.id],
            (old: Company[] = []) => [testCard, ...old],
        );
        toast({
            title: "Carte Test Injectée",
            description: "Vérifiez si elle s'affiche.",
        });
    };

    // 🔄 RESET & REFINE: Purge data and reset state
    const resetRadar = async () => {
        if (!currentProject?.id) {
            console.error("No project selected for reset");
            return;
        }

        try {
            console.log(
                "🔥 PURGING RADAR DATA FOR PROJECT:",
                currentProject.id,
            );

            // 1. Optimistic UI Reset (Immediate feedback)
            queryClient.removeQueries({
                queryKey: ["radar-companies", currentProject.id],
            });
            queryClient.setQueryData(
                ["radar-companies", currentProject.id],
                [],
            );
            setIsScanning(false);
            setIsExecuting(false);
            setIsStrategizing(false);
            setScanStep("idle");
            setScanProgress(0);
            setSelectedCompany(null);
            setIsSheetOpen(false);
            setStrategicIdentity(null);
            setProposedStrategy(null);

            // 2. Secure Hard Delete via Edge Function (Bypass RLS)
            const session = await ensureSession();
            if (!session) throw new Error("Authentication required");

            const { data, error } = await supabase.functions.invoke(
                "reset-radar",
                {
                    body: { projectId: currentProject.id },
                    headers: {
                        Authorization: `Bearer ${session.access_token}`,
                    },
                },
            );

            if (error) {
                console.error("[useRadar] Invoke Error Details:", error);
                throw new Error(
                    `Connection Error: ${
                        error.message || "Unknown invoke error"
                    }`,
                );
            }

            if (!data) {
                throw new Error("Empty response from Reset Function");
            }

            if (!data.success) {
                throw new Error(
                    data.error || "Failed to execute Clean Slate protocol",
                );
            }

            // 3. Force Refetch to ensure backend sync
            await refetch();

            toast({
                title: "♻️ Clean Slate Activé",
                description:
                    "Radar réinitialisé avec succès. Prêt pour un nouveau scan.",
            });
        } catch (e: any) {
            console.error("Purge Error:", e);
            toast({
                title: "Erreur de réinitialisation",
                description: e.message || "Impossible de vider le radar.",
                variant: "destructive",
            });
        }
    };

    // ⚡ FORCE RELOAD: Immediate UI Reset (Bypassing Backend Wait)
    const forceReloadRadar = () => {
        if (!currentProject?.id) return;

        console.log("⚡ FORCE RELOAD TRIGGERED");

        // 1. LOCK THE GATE
        setManualResetActive(true);

        // 2. Immediate UI State Reset
        setScanStep("idle");
        setIsScanning(false);
        setIsExecuting(false);
        setIsStrategizing(false);
        setScanProgress(0);
        setSelectedCompany(null);
        setStrategicIdentity(null);

        // 3. Nuke Cache
        // We cancel queries first to stop any in-flight requests
        queryClient.cancelQueries({
            queryKey: ["radar-companies", currentProject.id],
        });
        queryClient.setQueryData(["radar-companies", currentProject.id], []);

        toast({
            title: "🔄 Radar Relancé",
            description: "Interface réinitialisée. Prêt à scanner.",
        });

        // 3. Fire-and-forget backend cleanup (optional, best effort)
        // We don't await this, so UI is instant
        ensureSession().then((session) => {
            if (session) {
                supabase.functions.invoke("reset-radar", {
                    body: { projectId: currentProject.id },
                    headers: {
                        Authorization: `Bearer ${session.access_token}`,
                    },
                }).catch((err) =>
                    console.error("Background reset failed:", err)
                );
            }
        });
    };

    // 🆕 RECALIBRATE: Adjust strategy based on feedback
    const recalibrateRadar = async (forceFreshStart = false) => {
        if (!currentProject?.id) {
            toast({ title: "Projet manquant", variant: "destructive" });
            return;
        }

        try {
            toast({
                title: "Recalibration...",
                description: "Analyse de vos préférences en cours.",
            });
            setScanStep("analyzing");

            const session = await ensureSession();
            const { data, error } = await supabase.functions.invoke(
                "recalibrate-radar",
                {
                    body: {
                        projectId: currentProject.id,
                        userId: session?.user?.id,
                        force_fresh_start: forceFreshStart,
                    },
                    headers: {
                        Authorization: `Bearer ${session?.access_token}`,
                    },
                },
            );

            if (error) throw error;
            if (!data.success) throw new Error(data.error);

            console.log("🧠 RECALIBRATION RESULT:", data);

            // Updated learned insights notification
            const insights = data.learnedInsights || [];
            if (insights.length > 0) {
                toast({
                    title: "Stratégie Ajustée",
                    description: insights[0], // Show top insight
                    duration: 4000,
                });
            }

            // Force Cache Clear & Refresh
            queryClient.removeQueries({
                queryKey: ["radar-companies", currentProject.id],
            });
            await refetch();

            // Force State Reset
            setScanStep("idle");
            setScanProgress(0);
        } catch (e: any) {
            console.error("Recalibration Error:", e);
            toast({
                title: "Echec de Recalibration",
                description: e.message,
                variant: "destructive",
            });
            setScanStep("idle");
        }
    };

    const value = {
        // Data
        companies,
        selectedCompany,
        isLoading,

        // Sheet state
        isSheetOpen,
        openCompanySheet,
        closeSheet,

        // Scan state
        isScanning,
        scanProgress,
        scanStep,
        scanMarket,

        // New Double-Pass API
        analyzeMarket,
        executeStrategy,
        strategicIdentity,
        proposedStrategy,
        isStrategizing,
        isExecuting,

        // Analysis state
        analyzingCompanyId,
        analyzeCompany,

        // Decision maker state
        isFindingDecisionMaker,
        findDecisionMaker,

        // Clear companies manually (for Tabula Rasa)
        clearCompanies: () => {
            queryClient.setQueryData(
                ["radar-companies", currentProject?.id],
                [],
            );
        },

        injectTestCard,
        resetRadar,
        forceReloadRadar,
        recalibrateRadar,

        // Utils
        refetch,
        projectId: currentProject?.id,
        projectName: currentProject?.name,
        projectContext,
    };

    return (
        <RadarContext.Provider value={value}>{children}</RadarContext.Provider>
    );
}

export const useRadar = () => {
    const context = useContext(RadarContext);
    if (context === undefined) {
        throw new Error("useRadar must be used within a RadarProvider");
    }
    return context;
};
