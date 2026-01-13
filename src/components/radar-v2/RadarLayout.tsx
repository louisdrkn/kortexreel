import { useEffect, useRef, useState } from "react";
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
    isAnalyzing,
    analyzeCompany,
    isFindingDecisionMaker,
    findDecisionMaker,
    projectName,
    projectContext,
    projectId,
    refetch,
    clearCompanies, // NEW: For Tabula Rasa
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

  const handleInitScan = () => {
    scanMarket();
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

  // Handle company sheet open (track view start)
  const handleOpenCompanySheet = (company: Company) => {
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
        await scanMarket({ forceRefresh: true, strategy: "deep_deduction" });
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
    <div className="min-h-screen bg-slate-50/80 backdrop-blur-sm">
      {/* Header - Floating Control Pod */}
      <header className="sticky top-0 z-30 pt-4 px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-7xl mx-auto"
        >
          {/* Control Pod Container */}
          <h1 className="text-red-500 bg-yellow-200 text-center p-2 font-bold mb-2">
            MODE V2 ACTIVÉ
          </h1>
          <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 p-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              {/* Left: Title + Project Badge */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 border border-violet-100">
                    <Radar className="h-5 w-5 text-violet-600" />
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold tracking-tight text-slate-900">
                      Radar Marché
                    </h1>
                  </div>
                </div>

                {projectName && (
                  <Badge
                    variant="outline"
                    className="bg-slate-50 border-slate-200 text-slate-600 font-medium text-xs uppercase tracking-wide"
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

                {/* Filter Popover */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 hover:bg-slate-50"
                    >
                      <Filter className="h-4 w-4" />
                      <span className="hidden sm:inline">Filtres</span>
                      {(minScore > 0 || statusFilter.length > 0) && (
                        <Badge
                          variant="secondary"
                          className="ml-1 px-1.5 py-0 text-xs bg-violet-100 text-violet-700"
                        >
                          {(minScore > 0 ? 1 : 0) + statusFilter.length}
                        </Badge>
                      )}
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="end"
                    className="w-72 bg-white border-slate-200 shadow-xl shadow-slate-200/50"
                  >
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-slate-500 text-xs uppercase tracking-wide">
                          Score minimum:{" "}
                          <span className="text-violet-600 font-semibold">
                            {minScore}
                          </span>
                        </Label>
                        <Slider
                          value={[minScore]}
                          onValueChange={([v]) => setMinScore(v)}
                          min={0}
                          max={100}
                          step={10}
                          className="[&_[role=slider]]:bg-violet-600 [&_[role=slider]]:border-violet-600"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-500 text-xs uppercase tracking-wide">
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
                                "text-xs",
                                statusFilter.includes(status.key)
                                  ? "bg-violet-600 text-white hover:bg-violet-700"
                                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50",
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
                          className="w-full text-slate-400 hover:text-slate-600"
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

                {/* Main Action Button with breathing animation */}
                <motion.div
                  animate={isScanning ? {} : {
                    boxShadow: [
                      "0 4px 20px rgba(124, 58, 237, 0.15)",
                      "0 4px 30px rgba(124, 58, 237, 0.25)",
                      "0 4px 20px rgba(124, 58, 237, 0.15)",
                    ],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="rounded-lg"
                >
                  <Button
                    onClick={handleInitScan}
                    disabled={isScanning}
                    size="lg"
                    data-tour="scan-button"
                    className={cn(
                      "gap-2 px-6 font-semibold",
                      "bg-violet-600 hover:bg-violet-700",
                      "text-white",
                      "shadow-lg shadow-violet-200/50",
                      "transition-all duration-200",
                      isScanning && "opacity-80",
                    )}
                  >
                    {isScanning
                      ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Scan en cours...
                        </>
                      )
                      : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          Lancer la Découverte
                        </>
                      )}
                  </Button>
                </motion.div>
              </div>
            </div>

            {/* Scan Progress Bar */}
            <AnimatePresence>
              {isScanning && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: "auto", marginTop: 16 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                        <span className="text-slate-600 text-sm font-medium">
                          {scanStep === "searching"
                            ? "Recherche web..."
                            : scanStep === "validating"
                            ? "Validation IA..."
                            : scanStep === "complete"
                            ? "Terminé"
                            : "Initialisation..."}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400">
                        {companies.length} entreprises trouvées
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${scanProgress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                    <div className="flex justify-end mt-2">
                      <span className="text-xs text-slate-500 font-medium">
                        {scanProgress}%
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </header>

      {/* Buffer Section - Overnight Discoveries */}
      {bufferCompanies.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl bg-gradient-to-br from-violet-50 via-fuchsia-50 to-slate-50 border border-violet-100"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-violet-100">
                <Moon className="h-4 w-4 text-violet-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Pendant votre sommeil...
                </h3>
                <p className="text-xs text-slate-500">
                  J'ai trouvé {bufferCompanies.length}{" "}
                  pépite{bufferCompanies.length > 1 ? "s" : ""}{" "}
                  basée{bufferCompanies.length > 1 ? "s" : ""}{" "}
                  sur vos actions d'hier
                </p>
              </div>
            </div>
          </motion.div>
        </section>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <CompanyGrid
          companies={filteredCompanies}
          isLoading={isLoading}
          onCompanyClick={handleOpenCompanySheet}
          onRevealContact={handleRevealContact}
          isScanning={isScanning}
          onExclude={handleExcludeCompany}
          onValidate={handleValidateCompany}
          newlyAddedIds={newlyAddedIds}
        />
      </main>

      {/* Company Detail Sheet */}
      <CompanyDetailSheet
        company={selectedCompany}
        isOpen={isSheetOpen}
        onClose={handleCloseSheet}
        onAnalyze={analyzeCompany}
        onFindDecisionMaker={findDecisionMaker}
        isAnalyzing={isAnalyzing}
        isFindingDecisionMaker={isFindingDecisionMaker}
      />

      {/* Neural Feedback Bar */}
      <NeuralFeedbackBar
        message={feedback.message}
        isProcessing={feedback.isProcessing}
        removedCount={feedback.removedCount}
        onDismiss={clearFeedback}
      />
    </div>
  );
}

// Status pill component (organic look)
function StatusPill({
  icon: Icon,
  label,
  active,
}: {
  icon: React.ElementType;
  label: string;
  active: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200",
        active
          ? "bg-emerald-50 text-emerald-700"
          : "bg-slate-100 text-slate-400",
      )}
    >
      {active
        ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
        : <Icon className="h-3.5 w-3.5" />}
      <span>{label}</span>
    </div>
  );
}
