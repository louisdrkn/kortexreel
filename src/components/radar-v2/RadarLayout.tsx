import { ElementType, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  ChevronDown,
  FileText,
  Filter,
  Globe,
  Loader2,
  Moon,
  Radar,
  Sparkles,
  Target,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { CompanyGrid } from "./CompanyGrid";
import { CompanyDetailSheet } from "./CompanyDetailSheet";
import { RecalibrateButton } from "./RecalibrateButton";
import { useRadar } from "./hooks/useRadar";
import { useNeuralLoop } from "./hooks/useNeuralLoop";
import { useRecalibration } from "./hooks/useRecalibration";
import { NeuralFeedbackBar } from "./NeuralFeedbackBar";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Company } from "./types";

// NEW VISUALS
import { RadarContainer } from "./visuals/RadarContainer";
import { HolographicRadar } from "./visuals/HolographicRadar";
import { CyberTerminal } from "./visuals/CyberTerminal";
import { GlitchCard } from "./visuals/GlitchCard";
import { ValidationMatrix } from "./visuals/ValidationMatrix";

export function RadarLayout() {
  const {
    companies,
    selectedCompany,
    isLoading,
    isSheetOpen,
    openCompanySheet,
    closeSheet,
    isScanning,
    scanProgress,
    scanStep,
    scanMarket,
    analyzeCompany,
    isFindingDecisionMaker,
    findDecisionMaker,
    projectName,
    projectContext,
    projectId,
    refetch,
    analyzingCompanyId, // NEW: Track specific analysis
    clearCompanies, // NEW: For Tabula Rasa
    injectTestCard, // 🧪 DEBUG
    resetRadar, // NEW: Reset & Refine

    // Double-Pass
    strategicIdentity,
    proposedStrategy,
    executeStrategy,
    analyzeMarket,
    isStrategizing,
    isExecuting,
    forceReloadRadar, // NEW: Force Reset
  } = useRadar();

  const { session } = useAuth();
  const userId = session?.user?.id;

  // Neural Loop integration
  const { excludeCompany, validateCompany, feedback, clearFeedback } =
    useNeuralLoop(projectId, userId);

  // Recalibration integration
  const { recalibrate, trackInteraction, isRecalibrating, currentStep } =
    useRecalibration(projectId, userId);

  const [minScore, setMinScore] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);

  // Track view duration
  const viewStartTime = useRef<number | null>(null);
  const [newlyAddedIds, setNewlyAddedIds] = useState<Set<string>>(new Set());

  // 🔍 DEBUG: Trace Rendering
  useEffect(() => {
    console.log(
      `[RadarLayout] Render. Total: ${companies.length} | ProjectId: ${projectId}`,
    );
    if (companies.length > 0) {
      console.log(
        "[RadarLayout] First Company:",
        companies[0].name,
        companies[0].status,
      );
    }
  }, [companies, projectId]);

  // Filter companies locally - exclude archived/excluded
  const filteredCompanies = companies.filter((c) => {
    if (c.analysisStatus === "archived" || c.analysisStatus === "excluded") {
      return false;
    }
    if (minScore > 0 && (c.score || 0) < minScore) return false;
    if (statusFilter.length > 0 && !statusFilter.includes(c.status)) {
      return false;
    }
    return true;
  });

  // Count buffer companies (discovered overnight)
  const bufferCompanies = companies.filter((c) =>
    c.analysisStatus === "buffer"
  );

  // VIEW MODE: Show Big Radar if scanning OR empty. Show Small if results exist and idle.
  const isBigMode = companies.length === 0 || isScanning || isStrategizing ||
    isExecuting;

  const handleInitScan = () => {
    analyzeMarket(); // Start Phase 1
  };

  const handleRevealContact = async (company: Company) => {
    await findDecisionMaker(company);
    // Force refresh to show the decided-maker immediately (no waiting on realtime)
    refetch();
  };

  // Handle exclude with ripple effect
  const handleExcludeCompany = async (company: Company) => {
    // Track rejection
    if (company.id) {
      await trackInteraction(company.id, "rejected");
    }
    const result = await excludeCompany(company);
    if (result) {
      refetch();
    }
  };

  // Handle validate with positive reinforcement
  const handleValidateCompany = async (company: Company) => {
    // Track validation
    if (company.id) {
      await trackInteraction(company.id, "validated");
    }
    const result = await validateCompany(company);
    if (result) {
      refetch();
    }
  };

  // Handle company sheet open (track view start) OR trigger analysis
  const handleCompanyClick = (company: Company) => {
    // ON-DEMAND LOGIC: If discovered but not analyzed, trigger analysis
    if (company.analysisStatus === "discovered" || !company.score) {
      analyzeCompany(company);
      return;
    }

    // Normal behavior: Open sheet
    viewStartTime.current = Date.now();
    if (company.id) {
      trackInteraction(company.id, "viewed");
    }
    openCompanySheet(company);
  };

  // Handle company sheet close (track view duration)
  const handleCloseSheet = () => {
    if (selectedCompany?.id && viewStartTime.current) {
      const duration = Date.now() - viewStartTime.current;
      // Re-track with duration if significant (>5 seconds)
      if (duration > 5000) {
        trackInteraction(selectedCompany.id, "viewed", duration);
      }
    }
    viewStartTime.current = null;
    closeSheet();
  };

  // Handle recalibration with TABULA RASA logic
  const handleRecalibrate = async () => {
    // TABULA RASA: Pass clear function and scan trigger
    const result = await recalibrate(
      () => {
        // Clear companies in UI - triggers refetch which will show empty state
        clearCompanies();
      },
      async () => {
        // Trigger fresh scan after recalibration with FORCE REFRESH
        await scanMarket({ forceRefresh: true }); // strategy implied by new flow
      },
    );
    if (result?.success) {
      refetch();
    }
  };

  // Clear newly added flag after animation
  useEffect(() => {
    if (newlyAddedIds.size > 0) {
      const timer = setTimeout(() => {
        setNewlyAddedIds(new Set());
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [newlyAddedIds]);

  return (
    <RadarContainer>
      {/* Header - Floating Control Pod */}
      <header className="sticky top-0 z-30 pt-4 px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-7xl mx-auto"
        >
          {/* Control Pod Container */}
          <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-800 p-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              {/* Left: Title + Project Badge */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 border border-violet-500/20 shadow-[0_0_15px_rgba(139,92,246,0.3)]">
                    <Radar className="h-5 w-5 text-violet-400" />
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold tracking-tight text-white flex items-center gap-2">
                      KORTEX RADAR
                      <span className="text-[10px] bg-violet-500/20 text-violet-300 px-1.5 py-0.5 rounded border border-violet-500/30">
                        V2.0
                      </span>
                    </h1>
                  </div>
                </div>

                {projectName && (
                  <Badge
                    variant="outline"
                    className="bg-slate-800/50 border-slate-700 text-slate-300 font-medium text-xs uppercase tracking-wide"
                  >
                    {projectName}
                  </Badge>
                )}
              </div>

              {/* Center: Status Pills */}
              <div className="hidden md:flex items-center gap-2">
                <StatusPill
                  icon={FileText}
                  label="PDF"
                  active={projectContext.hasPdf}
                />
                <StatusPill
                  icon={Globe}
                  label="Site"
                  active={projectContext.hasSite}
                />
                <StatusPill
                  icon={Target}
                  label="Cible"
                  active={projectContext.hasTarget}
                />
              </div>

              {/* Right: Filter + Recalibrate + Action */}
              <div className="flex items-center gap-3">
                {/* Recalibrate Button */}
                <RecalibrateButton
                  onRecalibrate={handleRecalibrate}
                  isRecalibrating={isRecalibrating}
                  currentStep={currentStep}
                  disabled={isScanning || companies.length === 0}
                />

                {/* 🧪 DEBUG: Force Visibility Test */}
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-8 w-8 p-0 opacity-50 hover:opacity-100"
                  onClick={() => (window as any).injectTestCard?.()}
                  title="TEST: Force Card Injection"
                >
                  🧪
                </Button>

                {/* 🔄 RESET & REFINE BUTTON */}
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 bg-red-950/30 border-red-900/50 text-red-400 hover:text-red-300 hover:bg-red-900/50 hover:border-red-500/50 transition-all duration-300"
                  onClick={forceReloadRadar}
                  title="Supprimer tout et recommencer"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Reload UI</span>
                </Button>

                {/* Filter Popover */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 bg-slate-900 border-slate-700 text-slate-400 hover:text-white hover:border-violet-500/50 hover:bg-slate-800"
                    >
                      <Filter className="h-4 w-4" />
                      <span className="hidden sm:inline">Filtres</span>
                      {(minScore > 0 || statusFilter.length > 0) && (
                        <Badge
                          variant="secondary"
                          className="ml-1 px-1.5 py-0 text-xs bg-violet-900/50 text-violet-300 border border-violet-500/20"
                        >
                          {(minScore > 0 ? 1 : 0) + statusFilter.length}
                        </Badge>
                      )}
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="end"
                    className="w-72 bg-slate-900 border-slate-800 text-slate-200 shadow-xl shadow-black/50"
                  >
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-slate-400 text-xs uppercase tracking-wide">
                          Score minimum:{" "}
                          <span className="text-violet-400 font-semibold">
                            {minScore}
                          </span>
                        </Label>
                        <Slider
                          value={[minScore]}
                          onValueChange={([v]) => setMinScore(v)}
                          min={0}
                          max={100}
                          step={10}
                          className="[&_[role=slider]]:bg-violet-500 [&_[role=slider]]:border-violet-400 [&_[role=track]]:bg-slate-800"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-400 text-xs uppercase tracking-wide">
                          Statut
                        </Label>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { key: "hot", label: "🔥 Hot", color: "emerald" },
                            { key: "warm", label: "☀️ Warm", color: "amber" },
                            { key: "cold", label: "❄️ Cold", color: "blue" },
                          ].map((status) => (
                            <Button
                              key={status.key}
                              variant={statusFilter.includes(status.key)
                                ? "default"
                                : "outline"}
                              size="sm"
                              onClick={() => {
                                setStatusFilter((prev) =>
                                  prev.includes(status.key)
                                    ? prev.filter((s) => s !== status.key)
                                    : [...prev, status.key]
                                );
                              }}
                              className={cn(
                                "text-xs border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300",
                                statusFilter.includes(status.key) &&
                                  "bg-violet-600 text-white hover:bg-violet-700 border-violet-500",
                              )}
                            >
                              {status.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                      {(minScore > 0 || statusFilter.length > 0) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-slate-500 hover:text-slate-300"
                          onClick={() => {
                            setMinScore(0);
                            setStatusFilter([]);
                          }}
                        >
                          Réinitialiser
                        </Button>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </motion.div>
      </header>

      {/* CORE RADAR SECTION - DYNAMIC RESIZING */}
      <AnimatePresence mode="wait">
        {/* VALIDATION MATRIX (Phase 1.5) */}
        {scanStep === "reviewing" && strategicIdentity && proposedStrategy && (
          <motion.section
            key="validation"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="py-12 min-h-[500px] flex items-center justify-center"
          >
            <ValidationMatrix
              identity={strategicIdentity}
              strategy={proposedStrategy}
              onConfirm={() => executeStrategy()}
              onCancel={() => resetRadar()}
              isExecuting={isExecuting}
            />
          </motion.section>
        )}

        {/* SCANNER UI (Phase 1 & 2) */}
        {scanStep !== "reviewing" && (
          <motion.section
            key="scanner"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{
              opacity: 0,
              scale: 0.8,
              transition: { duration: 0.5, ease: "easeInOut" },
            }}
            className={cn(
              "relative flex flex-col items-center justify-center transition-all duration-700 ease-in-out",
              isBigMode ? "py-12 min-h-[500px]" : "py-6 min-h-[200px]",
            )}
          >
            <HolographicRadar
              isActive={isScanning || isStrategizing || isExecuting}
              scanStep={scanStep}
              onScanClick={handleInitScan}
              className={cn(
                "transition-all duration-700",
                isBigMode
                  ? "w-64 h-64 md:w-80 md:h-80"
                  : "w-32 h-32 md:w-40 md:h-40",
              )}
            />

            <div
              className={cn(
                "w-full max-w-2xl px-4 text-center transition-all duration-500",
                isBigMode
                  ? "mt-8 opacity-100 h-auto"
                  : "mt-0 opacity-0 h-0 overflow-hidden",
              )}
            >
              <CyberTerminal scanStep={scanStep} />
            </div>

            {/* Show buffer only in scanner mode */}
            {bufferCompanies.length > 0 && companies.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-8 p-4 rounded-xl bg-slate-900/50 border border-violet-500/20 backdrop-blur-sm max-w-md mx-auto"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-violet-500/10">
                    <Moon className="h-4 w-4 text-violet-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      Activité Nocturne Détectée
                    </h3>
                    <p className="text-xs text-slate-400">
                      {bufferCompanies.length}{" "}
                      cible{bufferCompanies.length > 1 ? "s" : ""}{" "}
                      identifiée{bufferCompanies.length > 1 ? "s" : ""}{" "}
                      pendant votre absence
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.section>
        )}

        {companies.length > 0 && scanStep !== "reviewing" && (
          <>
            <motion.main
              key="results"
              initial={{ opacity: 0, y: 100 }} // Slide up from bottom
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 w-full"
            >
              <div className="min-h-[200px]">
                <CompanyGrid
                  companies={filteredCompanies}
                  isLoading={isLoading}
                  onCompanyClick={handleCompanyClick}
                  onRevealContact={handleRevealContact}
                  isScanning={isScanning}
                  analyzingCompanyId={analyzingCompanyId}
                  onExclude={handleExcludeCompany}
                  onValidate={handleValidateCompany}
                  newlyAddedIds={newlyAddedIds}
                />
              </div>
            </motion.main>
          </>
        )}
      </AnimatePresence>

      {/* Company Detail Sheet */}
      <CompanyDetailSheet
        company={selectedCompany}
        isOpen={isSheetOpen}
        onClose={handleCloseSheet}
        onAnalyze={analyzeCompany}
        onFindDecisionMaker={findDecisionMaker}
        isAnalyzing={!!analyzingCompanyId} // Pass boolean if needed, or update prop
        isFindingDecisionMaker={isFindingDecisionMaker}
      />

      {/* Neural Feedback Bar */}
      <NeuralFeedbackBar
        message={feedback.message}
        isProcessing={feedback.isProcessing}
        removedCount={feedback.removedCount}
        onDismiss={clearFeedback}
      />
    </RadarContainer>
  );
}

// Status pill component (organic look)
function StatusPill({
  icon: Icon,
  label,
  active,
}: {
  icon: ElementType;
  label: string;
  active: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border",
        active
          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
          : "bg-slate-800 text-slate-500 border-slate-700",
      )}
    >
      {active
        ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
        : <Icon className="h-3.5 w-3.5" />}
      <span>{label}</span>
    </div>
  );
}
