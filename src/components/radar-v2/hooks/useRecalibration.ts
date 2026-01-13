import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface RecalibrateStep {
  step: string;
  message: string;
  progress: number;
}

interface RecalibrationResult {
  success: boolean;
  mode: "expansion" | "pivot";
  modeReason: string;
  steps: RecalibrateStep[];
  newCompanies: any[];
  updatedScores: number;
  trendVector: string[];
  learnedInsights: string[];
  painPointAnalysis?: {
    coreProblems: string[];
    targetProfiles: string[];
    searchQueries: string[];
  };
  jobId?: string; // NEW: For background job tracking
}

export function useRecalibration(
  projectId: string | undefined,
  userId: string | undefined,
) {
  const { toast } = useToast();
  const [isRecalibrating, setIsRecalibrating] = useState(false);
  const [currentStep, setCurrentStep] = useState<RecalibrateStep | null>(null);
  const [lastResult, setLastResult] = useState<RecalibrationResult | null>(
    null,
  );

  // TABULA RASA: Hard reset with fresh discovery
  const recalibrate = useCallback(async (
    clearLeads: () => void, // Callback to clear UI immediately
    triggerScan: () => Promise<void>, // Callback to trigger fresh scan after recalibration
  ): Promise<RecalibrationResult | null> => {
    if (!projectId || !userId) {
      toast({
        title: "Erreur",
        description: "Projet et utilisateur requis pour la recalibration",
        variant: "destructive",
      });
      return null;
    }

    setIsRecalibrating(true);

    // STEP 0: TABULA RASA - Clear UI immediately
    setCurrentStep({
      step: "tabula_rasa",
      message: "Oubli des mauvaises pistes...",
      progress: 0,
    });
    clearLeads(); // Clear leads in UI immediately

    try {
      console.log(
        "[RECALIBRATION] 🧠 TABULA RASA: Hard reset for project:",
        projectId,
      );

      // Simulate visual steps for UX
      const simulateSteps = async () => {
        const steps: RecalibrateStep[] = [
          {
            step: "clean",
            message: "Suppression des résultats parasites...",
            progress: 10,
          },
          {
            step: "relearn",
            message: "Nouvelle stratégie d'analyse en cours...",
            progress: 25,
          },
          {
            step: "brain",
            message: "Le Cerveau identifie les VRAIS secteurs cibles...",
            progress: 40,
          },
          {
            step: "prepare",
            message: "Préparation des requêtes nominatives...",
            progress: 55,
          },
        ];

        for (const step of steps) {
          setCurrentStep(step);
          await new Promise((resolve) => setTimeout(resolve, 700));
        }
      };

      // Start step simulation in parallel with API call
      const stepPromise = simulateSteps();

      // Call recalibrate-radar with force_fresh_start flag
      const { data, error } = await supabase.functions.invoke(
        "recalibrate-radar",
        {
          body: {
            projectId,
            userId,
            force_fresh_start: true, // TABULA RASA: Force fresh discovery
          },
        },
      );

      // Wait for visual steps to complete
      await stepPromise;

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || "Erreur de recalibration");
      }

      // Show backend steps (if any remain)
      const backendSteps = (data.steps as RecalibrateStep[]) || [];
      const remainingSteps = backendSteps.filter((s) => s.progress > 55);

      for (const step of remainingSteps) {
        setCurrentStep(step);
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // Preparing for fresh scan
      setCurrentStep({
        step: "rescan",
        message: "Lancement d'une nouvelle chasse...",
        progress: 75,
      });

      setLastResult(data as RecalibrationResult);

      // Show mode-specific insights toast
      const modeEmoji = data.mode === "expansion" ? "🔍" : "🔄";
      const modeTitle = data.mode === "expansion"
        ? "Mode Expansion"
        : "Mode Pivot";

      toast({
        title: `${modeEmoji} ${modeTitle}`,
        description: data.modeReason || data.learnedInsights?.[0] ||
          "Nouvelle stratégie appliquée",
      });

      // TABULA RASA: Trigger fresh discovery scan
      console.log(
        "[RECALIBRATION] 🚀 Triggering fresh scan after recalibration...",
      );
      setCurrentStep({
        step: "scanning",
        message: "Découverte de nouvelles cibles...",
        progress: 85,
      });

      // Don't await - let the scan run and update via realtime
      triggerScan().catch((err) => {
        console.error("[RECALIBRATION] Trigger scan failed:", err);
      });

      // Final step
      setCurrentStep({
        step: "complete",
        message: "Recalibration terminée",
        progress: 100,
      });
      await new Promise((resolve) => setTimeout(resolve, 500));

      console.log("[RECALIBRATION] ✅ TABULA RASA Complete:", data);

      return data as RecalibrationResult;
    } catch (error) {
      console.error("[RECALIBRATION] Error:", error);
      toast({
        title: "Erreur de recalibration",
        description: error instanceof Error
          ? error.message
          : "Une erreur est survenue",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsRecalibrating(false);
      setTimeout(() => setCurrentStep(null), 1000);
    }
  }, [projectId, userId, toast]);

  // Track an interaction (view, reject, validate)
  const trackInteraction = useCallback(async (
    companyId: string,
    action: "viewed" | "rejected" | "validated" | "shortlisted",
    durationMs?: number,
  ) => {
    if (!projectId || !userId) return;

    try {
      const { error } = await supabase
        .from("lead_interactions")
        .insert({
          user_id: userId,
          project_id: projectId,
          company_id: companyId,
          action,
          duration_ms: durationMs || 0,
          metadata: { timestamp: new Date().toISOString() },
        });

      if (error) {
        console.warn("[RECALIBRATION] Track interaction error:", error);
      } else {
        console.log("[RECALIBRATION] 📊 Tracked:", action, companyId);
      }
    } catch (err) {
      console.warn("[RECALIBRATION] Track error:", err);
    }
  }, [projectId, userId]);

  return {
    recalibrate,
    trackInteraction,
    isRecalibrating,
    currentStep,
    lastResult,
  };
}
