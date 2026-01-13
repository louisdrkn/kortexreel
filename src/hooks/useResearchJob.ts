import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface ResearchJob {
  id: string;
  project_id: string;
  user_id: string;
  status: "idle" | "running" | "completed" | "failed";
  progress: number;
  current_step: string | null;
  step_details: {
    phase?: string;
    icp?: string;
    stats?: {
      queriesGenerated?: number;
      queriesExecuted?: number;
      urlsFound?: number;
      urlsProcessed?: number;
      companiesValidated?: number;
      companiesEnriched?: number;
    };
    [key: string]: any;
  } | null;
  results: any[];
  error_message: string | null;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export function useResearchJob(projectId: string | undefined) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentJob, setCurrentJob] = useState<ResearchJob | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch the latest job for this project on mount
  const fetchLatestJob = useCallback(async () => {
    if (!projectId || !user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("research_jobs")
        .select("*")
        .eq("project_id", projectId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching research job:", error);
      }

      if (data) {
        setCurrentJob(data as ResearchJob);
      }
    } catch (err) {
      console.error("Error in fetchLatestJob:", err);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, user?.id]);

  // Subscribe to realtime updates for this project's jobs
  useEffect(() => {
    // If no project or user, stop loading and exit
    if (!projectId || !user?.id) {
      setIsLoading(false);
      return;
    }

    fetchLatestJob();

    // Subscribe to changes on research_jobs for this project
    const channel = supabase
      .channel(`research-jobs-${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "research_jobs",
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          console.log("Research job update:", payload);
          
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const newJob = payload.new as ResearchJob;
            // Only update if this is the user's job
            if (newJob.user_id === user.id) {
              setCurrentJob(newJob);

              // Show toast on completion
              if (payload.eventType === "UPDATE" && newJob.status === "completed") {
                const companiesCount = newJob.results?.length || 0;
                toast({
                  title: "Découverte terminée !",
                  description: `${companiesCount} entreprises qualifiées trouvées`,
                });
              }

              // Show toast on error
              if (payload.eventType === "UPDATE" && newJob.status === "failed") {
                toast({
                  title: "Erreur de découverte",
                  description: newJob.error_message || "Une erreur est survenue",
                  variant: "destructive",
                });
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, user?.id, fetchLatestJob, toast]);

  // Start a new discovery job
  const startDiscovery = useCallback(async () => {
    if (!projectId || !user?.id) {
      toast({
        title: "Erreur",
        description: "Projet ou utilisateur non trouvé",
        variant: "destructive",
      });
      return null;
    }

    try {
      // Call the edge function - it will create the job and return immediately
      const { data, error } = await supabase.functions.invoke("agent-researcher-process", {
        body: {
          projectId,
          userId: user.id,
          batchSize: 10,
          targetCount: 100,
        },
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || "Échec du démarrage");
      }

      // Fetch the new job immediately to get its full data
      const { data: newJob } = await supabase
        .from("research_jobs")
        .select("*")
        .eq("id", data.jobId)
        .single();

      if (newJob) {
        setCurrentJob(newJob as ResearchJob);
      }

      toast({
        title: "Découverte lancée",
        description: "Le processus tourne en arrière-plan. Vous pouvez naviguer ailleurs.",
      });

      return data.jobId;
    } catch (err) {
      console.error("Error starting discovery:", err);
      toast({
        title: "Erreur",
        description: err instanceof Error ? err.message : "Impossible de lancer la découverte",
        variant: "destructive",
      });
      return null;
    }
  }, [projectId, user?.id, toast]);

  // Force restart a stuck job
  const forceRestart = useCallback(async () => {
    if (!projectId || !user?.id) return null;

    // If there's a stuck job, mark it as failed first
    if (currentJob && currentJob.status === "running") {
      await supabase
        .from("research_jobs")
        .update({ 
          status: "failed", 
          error_message: "Forcé par l'utilisateur (job bloqué)",
          updated_at: new Date().toISOString()
        })
        .eq("id", currentJob.id);
    }

    // Start a fresh discovery
    return startDiscovery();
  }, [projectId, user?.id, currentJob, startDiscovery]);

  // Check if job is stuck (no updates for 3+ minutes while running)
  const isStuck = currentJob?.status === "running" && 
    currentJob?.updated_at && 
    (Date.now() - new Date(currentJob.updated_at).getTime()) > 3 * 60 * 1000;

  // Reset/clear current job state (for starting fresh)
  const resetJob = useCallback(() => {
    setCurrentJob(null);
  }, []);

  return {
    currentJob,
    isLoading,
    startDiscovery,
    forceRestart,
    resetJob,
    refetch: fetchLatestJob,
    isRunning: currentJob?.status === "running",
    isComplete: currentJob?.status === "completed",
    isFailed: currentJob?.status === "failed",
    isStuck,
  };
}
