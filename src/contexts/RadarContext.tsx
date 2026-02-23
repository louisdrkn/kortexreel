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
    cancelScan: () => Promise<void>;
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

    // FIX 1: Ref mirror of isExecuting — used in realtime callbacks to avoid
    // stale closure issues without adding isExecuting to the useEffect dep array
    // (which would destroy/recreate the channel every time a scan starts).
    const isExecutingRef = useRef(false);
    useEffect(() => {
        isExecutingRef.current = isExecuting;
    }, [isExecuting]);

    // FIX 3: Ref to the polling fallback interval so it can be cleared anytime
    const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const scanChannelRef = useRef<any>(null);

    // Cancel any ongoing scan — stops polling, resets UI, marks DB cancelled
    const cancelScan = async () => {
        console.log("[Radar] ⛔ Cancelling scan...");
        // Stop all intervals
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
        }
        // Reset UI state
        setIsExecuting(false);
        setIsStrategizing(false);
        setScanStep("idle");
        setScanProgress(0);
        setIsScanning(false);
        isExecutingRef.current = false;
        // Mark DB as cancelled (best-effort)
        try {
            if (currentProject?.id) {
                await supabase
                    .from("radar_scans" as any)
                    .update({
                        status: "cancelled",
                        updated_at: new Date().toISOString(),
                    })
                    .eq("project_id", currentProject.id)
                    .in("status", ["processing", "queued", "searching"]);
            }
        } catch { /* non-blocking */ }
        toast({
            title: "⛔ Scan annulé",
            description: "Le scan a été arrêté.",
            className: "bg-zinc-900 text-white border-zinc-700",
        });
    };

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

    // Helper: map a radar_catch_all row directly to the Company interface
    // Each row IS one company — columns company_name & website_url are the source of truth.
    const mapCatchAllRowToCompany = (row: any): Company | null => {
        try {
            const name = row.company_name || row.name || "Unknown";
            let url = row.website_url || row.url || row.website || "";
            if (url && !url.startsWith("http")) url = `https://${url}`;
            if (!name || name === "Unknown") return null;

            return {
                id: String(row.id),
                name,
                website: url || undefined,
                domain: url || undefined,
                logoUrl: url
                    ? `https://www.google.com/s2/favicons?domain=${
                        new URL(url).hostname
                    }&sz=128`
                    : undefined,
                createdAt: row.created_at,
                updatedAt: row.updated_at || row.created_at,

                // IA-sourced fields from dedicated columns
                industry: row.activity_sector || undefined,
                matchReason: row.pain_point_context ||
                    "Identifié par l'Agent Firecrawl",
                matchExplanation: row.pain_point_context ||
                    "Identifié par l'Agent Firecrawl",
                context: row.pain_point_context ||
                    "Identifié par l'Agent Firecrawl",
                activity: row.activity_sector || "N/A",

                score: 85,
                status: "hot",
                analysisStatus: "discovered",
                strategicCategory: "PERFECT_MATCH",

                signals: [],
                painPoints: [],
                buyingSignals: [],
                tags: [],
            } as Company;
        } catch {
            return null;
        }
    };

    // Fetch companies from 'radar_catch_all' OR 'company_analyses' (Fallback)
    const { data: companies = [], isLoading, refetch } = useQuery({
        queryKey: ["radar-companies", currentProject?.id],
        queryFn: async () => {
            if (!currentProject?.id) return [];

            console.log(
                "[Radar] Fetching from radar_catch_all for project:",
                currentProject.id,
            );

            // 1. Try Fetching from radar_catch_all — one row = one company
            const { data, error } = await supabase
                .from("radar_catch_all" as any)
                .select("*")
                .eq("project_id", currentProject.id)
                .order("created_at", { ascending: false });

            if (error) {
                console.error("[Radar] Error fetching radar_catch_all:", error);
            }

            let allCompanies: Company[] = [];

            // 2. Map each row directly (company_name & website_url are top-level columns)
            if (data && data.length > 0) {
                allCompanies = (data as any[])
                    .map(mapCatchAllRowToCompany)
                    .filter((c): c is Company => c !== null);

                console.log(
                    `[Radar] ✅ Mapped ${allCompanies.length} companies from radar_catch_all.`,
                );
            }

            // 3. FALLBACK: If catch_all is empty, check 'company_analyses' (Legacy)
            if (allCompanies.length === 0) {
                console.log(
                    "[Radar] ⚠️ No data in catch_all. Falling back to 'company_analyses'...",
                );
                const { data: legacyData, error: legacyError } = await supabase
                    .from("company_analyses")
                    .select("*")
                    .eq("project_id", currentProject.id)
                    .order("created_at", { ascending: false });

                if (!legacyError && legacyData && legacyData.length > 0) {
                    console.log(
                        `[Radar] ✅ Found ${legacyData.length} companies in legacy table.`,
                    );
                    allCompanies = legacyData.map((row: any) => ({
                        id: row.id,
                        name: row.company_name,
                        website: row.company_url,
                        domain: row.company_url,
                        logoUrl: row.logo_url ||
                            `https://www.google.com/s2/favicons?domain=${row.company_url}&sz=128`,
                        createdAt: row.created_at,
                        updatedAt: row.updated_at,
                        score: row.match_score || 80,
                        matchReason: row.match_explanation,
                        matchExplanation: row.match_explanation,
                        context: row.match_explanation,
                        activity: "Voir Analyse",
                        strategicAnalysis: row.sales_thesis ||
                            row.strategic_analysis,
                        status: "hot",
                        analysisStatus: row.analysis_status || "analyzed",
                        strategicCategory: row.strategic_category ||
                            "PERFECT_MATCH",
                        painPoints: row.detected_pain_points || [],
                        buyingSignals: row.trigger_events || [],
                    } as Company));
                }
            }

            console.log(
                `[Radar] Parsed ${allCompanies.length} companies total.`,
            );
            return allCompanies;
        },
        enabled: !!currentProject?.id,
    });

    // Real-time subscription for radar_catch_all
    // FIX 1: isExecuting removed from deps — we use isExecutingRef instead to avoid
    //        destroying/recreating this channel every time the scan state changes.
    // FIX 2: event "*" instead of "INSERT" — upsert on existing rows fires UPDATE,
    //        which was silently missed before.
    useEffect(() => {
        if (!currentProject?.id) return;

        console.log(
            "[Radar] 🔌 Subscribing to radar_catch_all for project:",
            currentProject.id,
        );

        const channel = supabase
            .channel("radar-catch-all-realtime")
            .on(
                "postgres_changes",
                {
                    event: "*", // FIX 2: catch INSERT and UPDATE (upsert)
                    schema: "public",
                    table: "radar_catch_all" as any,
                    filter: `project_id=eq.${currentProject.id}`,
                },
                (payload) => {
                    console.log(
                        `[Radar] ⚡️ REALTIME ${payload.eventType} on radar_catch_all`,
                    );
                    lastActivityRef.current = Date.now();

                    const newRow = payload.new as any;
                    if (!newRow) return;

                    const newCompany = mapCatchAllRowToCompany(newRow);

                    if (newCompany) {
                        console.log(
                            `[Radar] 🚀 Injecting company: ${newCompany.name}`,
                        );

                        // Inject immediately into the query cache
                        queryClient.setQueryData(
                            ["radar-companies", currentProject.id],
                            (oldData: Company[] | undefined) => {
                                const existing = oldData || [];
                                // Replace if already exists (upsert case), else prepend
                                const filtered = existing.filter(
                                    (c) => c.id !== newCompany.id,
                                );
                                return [newCompany, ...filtered];
                            },
                        );

                        // FIX 1: Use ref to read isExecuting — no stale closure
                        if (isExecutingRef.current) {
                            setIsExecuting(false);
                            setScanStep("complete");
                            setScanProgress(100);
                            // Clear polling fallback too
                            if (pollIntervalRef.current) {
                                clearInterval(pollIntervalRef.current);
                                pollIntervalRef.current = null;
                            }
                            toast({
                                title: "✅ Résultats Reçus",
                                description:
                                    `Entreprise détectée : ${newCompany.name}`,
                                className:
                                    "bg-emerald-500 text-white border-none",
                            });
                        }
                    }
                },
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentProject?.id, queryClient, manualResetActive]); // FIX 1: no isExecuting/toast

    // ========================================================================
    // ⚡️ STATUS SYNC (THE "MAGIC SLATE" CONNECTION)
    // ========================================================================

    // 1. RECOVER STATE ON MOUNT (Refresh handling)
    useEffect(() => {
        const recoverState = async () => {
            if (!currentProject?.id) return;
            // Check if a ghost scan is running
            const { data } = await supabase.from("radar_scans" as any)
                .select("*")
                .eq("project_id", currentProject.id)
                .in("status", ["processing", "queued"])
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

            if (data) {
                const scan = data as any;
                console.log("👻 [GHOST RECOVERY] Found active scan:", scan.id);
                setIsExecuting(true);
                setScanStep(scan.stage);
                setScanProgress(scan.progress || 0);
            }
        };
        recoverState();
    }, [currentProject?.id]);

    // 2. REALTIME PROGRESS SYNC
    useEffect(() => {
        if (!currentProject?.id) return;
        const channel = supabase.channel("radar-scans-sync")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "radar_scans" as any,
                    filter: `project_id=eq.${currentProject.id}`,
                },
                (payload) => {
                    const newRow = payload.new as any;
                    console.log(
                        "⚡️ [STATUS SYNC] Update:",
                        newRow.status,
                        newRow.stage,
                        newRow.progress,
                    );

                    if (["processing", "queued"].includes(newRow.status)) {
                        setIsExecuting(true);
                        setScanStep(newRow.stage as any);
                        setScanProgress(newRow.progress || 0);
                        lastActivityRef.current = Date.now(); // Keep watchdog happy
                    } else if (newRow.status === "completed") {
                        setIsExecuting(false);
                        setScanStep("complete");
                        setScanProgress(100);
                        // Trigger refresh of companies list immediately
                        queryClient.invalidateQueries({
                            queryKey: ["radar-companies"],
                        });
                        toast({
                            title: "Mission Terminée",
                            description:
                                "Analyse complète. Résultats disponibles.",
                            className: "bg-emerald-500 text-white border-none",
                        });
                    } else if (newRow.status === "failed") {
                        setIsExecuting(false);
                        setScanStep("error");
                        toast({
                            variant: "destructive",
                            title: "Echec du Scan",
                            description: newRow.meta?.error ||
                                "Erreur technique signalée par l'agent.",
                        });
                    }
                },
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentProject?.id, queryClient, toast]);

    // SILENCE DETECTION (Auto-Complete)
    useEffect(() => {
        if (!isExecuting) {
            if (silenceTimerRef.current) clearInterval(silenceTimerRef.current);
            return;
        }

        lastActivityRef.current = Date.now(); // Reset on start

        silenceTimerRef.current = setInterval(() => {
            const inactiveDuration = Date.now() - lastActivityRef.current;
            if (inactiveDuration > 1800000) { // 30m timeout (For long "Deep Research" jobs)
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

    // SIMULATED PROGRESS REMOVED - NOW USING REALTIME STATUS SYNC
    // The "Ghost in the Machine" is now gone. The UI reflects the database state.

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
                await supabase.auth.refreshSession();

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
                await supabase.auth.refreshSession();

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

            console.log(
                "⚔️ EXECUTION STARTED (Async Mode) - API Returned Success",
            );

            toast({
                title: "Scan en cours",
                description:
                    "L'Agent Radar explore le web. Les résultats apparaîtront ici automatiquement.",
            });

            // IMMEDIATE COMPLETION OF UI STATE (User Request)
            setScanStep("searching"); // Keep searching visual until data arrives

            // SMART RECOVERY (If Backend says "Data is already here")
            if (data.recovered) {
                console.log(
                    "♻️ RECOVERED PREVIOUS SCAN - Fetching results immediately.",
                );
                toast({
                    title: "Restauration",
                    description: "Résultats d'un scan précédent récupérés.",
                    className: "bg-blue-500 text-white border-none",
                });
                await refetch(); // Force fetch DB
                setIsExecuting(false);
                setScanStep("complete");
                setScanProgress(100);
                return;
            }

            // AUTOMATIC POLLING / REFRESH
            // We don't want to just stop, we want to look for data.
            // Since API returned 200, the job is "accepted".
            // We DO NOT wait for data here. The Realtime Listener will wake us up.
            console.log("👂 Radar is listening for Realtime updates...");

            // ================================================================
            // FIX 3: POLLING FALLBACK — every 20s, check db directly
            // Guards against realtime events being missed (network gap, reconnect)
            // ================================================================
            let pollCount = 0;
            const MAX_POLLS = 45; // 45 × 20s = 15 minutes hard stop

            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

            pollIntervalRef.current = setInterval(async () => {
                pollCount++;
                console.log(
                    `[Radar] ⏱️ Poll #${pollCount} — checking completion...`,
                );

                // Hard stop after 15 minutes
                if (pollCount >= MAX_POLLS) {
                    console.warn(
                        "[Radar] ⏰ Max polls reached. Force-stopping.",
                    );
                    clearInterval(pollIntervalRef.current!);
                    pollIntervalRef.current = null;
                    setIsExecuting(false);
                    setScanStep("complete");
                    setScanProgress(100);
                    return;
                }

                try {
                    // ── ACTIVE CHECK: Call check-firecrawl to poll Firecrawl & insert results ──
                    // Runs every other tick (~40s) — the key relay after execute-radar is killed
                    if (pollCount % 2 === 0) {
                        console.log("[Radar] 🔍 Calling check-firecrawl...");
                        try {
                            const { data: checkResult } = await supabase
                                .functions.invoke(
                                    "check-firecrawl",
                                    { body: { projectId: currentProject!.id } },
                                );
                            if (
                                checkResult?.done && checkResult?.inserted > 0
                            ) {
                                console.log(
                                    `[Radar] ✅ check-firecrawl inserted ${checkResult.inserted} companies!`,
                                );
                                clearInterval(pollIntervalRef.current!);
                                pollIntervalRef.current = null;
                                await refetch();
                                setIsExecuting(false);
                                setScanStep("complete");
                                setScanProgress(100);
                                toast({
                                    title: "✅ Résultats Radar",
                                    description:
                                        `${checkResult.inserted} entreprise(s) trouvée(s).`,
                                    className:
                                        "bg-emerald-500 text-white border-none",
                                });
                                return;
                            }
                        } catch (checkErr) {
                            console.warn(
                                "[Radar] check-firecrawl error (non-blocking):",
                                checkErr,
                            );
                        }
                    }

                    // 1. Check if radar_scans shows completion
                    const { data: scan } = await supabase
                        .from("radar_scans" as any)
                        .select("status")
                        .eq("project_id", currentProject!.id)
                        .eq("status", "completed")
                        .order("updated_at", { ascending: false })
                        .limit(1)
                        .maybeSingle();

                    if (scan) {
                        console.log(
                            "[Radar] ✅ Poll detected completed scan. Stopping.",
                        );
                        clearInterval(pollIntervalRef.current!);
                        pollIntervalRef.current = null;
                        await refetch();
                        setIsExecuting(false);
                        setScanStep("complete");
                        setScanProgress(100);
                        toast({
                            title: "✅ Scan Terminé",
                            description:
                                "Résultats chargés depuis la base de données.",
                            className: "bg-emerald-500 text-white border-none",
                        });
                        return;
                    }

                    // 2. Check if new companies appeared in radar_catch_all
                    const { data: catchAllRows } = await supabase
                        .from("radar_catch_all" as any)
                        .select("id")
                        .eq("project_id", currentProject!.id)
                        .limit(1);

                    if (
                        catchAllRows && catchAllRows.length > 0 &&
                        isExecutingRef.current
                    ) {
                        console.log(
                            "[Radar] ✅ Poll found data in radar_catch_all. Refreshing.",
                        );
                        await refetch();
                        clearInterval(pollIntervalRef.current!);
                        pollIntervalRef.current = null;
                        setIsExecuting(false);
                        setScanStep("complete");
                        setScanProgress(100);
                        toast({
                            title: "✅ Données Récupérées",
                            description:
                                "Les résultats sont maintenant disponibles.",
                            className: "bg-emerald-500 text-white border-none",
                        });
                    }
                } catch (pollErr) {
                    console.warn("[Radar] Poll error (non-blocking):", pollErr);
                }
            }, 20000); // 20 seconds
        } catch (err: any) {
            clearInterval(progressInterval);
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
            }
            console.error("[Radar] Execution Error:", err);
            setScanStep("error");
            setIsExecuting(false);
            toast({
                title: "Erreur d'Exécution",
                description: err.message,
                variant: "destructive",
            });
        }
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
        queryClient.invalidateQueries({
            queryKey: ["radar-companies", currentProject.id],
        });

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
        cancelScan,

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
