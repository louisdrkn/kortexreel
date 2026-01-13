import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProjectRealtime } from "@/hooks/useProjectRealtime";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type {
  AgencyDNA,
  Contact,
  MeetingCapture,
  OutreachSequence,
  TargetAccount,
  TargetCriteria,
} from "@/types/pod";

export interface Project {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  user_id: string;
}

interface ProjectContextType {
  projects: Project[];
  currentProject: Project | null;
  isLoading: boolean;
  isTransitioning: boolean; // True during project switch (cache purge)
  setCurrentProject: (project: Project | null) => void;
  createProject: (name: string) => Promise<Project | null>;
  deleteProject: (id: string) => Promise<void>;
  fetchProjects: () => Promise<void>;
  // Project data
  projectData: {
    agencyDNA: AgencyDNA;
    targetCriteria: TargetCriteria;
    targetAccounts: TargetAccount[];
    contacts: Record<string, Contact[]>;
    outreachSequences: OutreachSequence[];
    meetingCaptures: MeetingCapture[];
  };
  updateProjectData: <K extends keyof typeof defaultProjectData>(
    dataType: K,
    data: typeof defaultProjectData[K],
  ) => Promise<void>;
  loadProjectData: () => Promise<void>;
  isSaving: boolean;
}

const defaultTargetCriteria: TargetCriteria = {
  headcount: [],
  industries: [],
  geography: ["France"],
  seniority: [],
  functions: [],
  weakSignals: [],
  customSignals: [],
};

const defaultProjectData = {
  agencyDNA: {} as AgencyDNA,
  targetCriteria: defaultTargetCriteria,
  targetAccounts: [] as TargetAccount[],
  contacts: {} as Record<string, Contact[]>,
  outreachSequences: [] as OutreachSequence[],
  meetingCaptures: [] as MeetingCapture[],
};

const DATA_TYPE_MAP: Record<string, string> = {
  agencyDNA: "agency_dna",
  targetCriteria: "target_criteria",
  targetAccounts: "target_accounts",
  outreachSequences: "outreach_sequences",
  meetingCaptures: "meeting_captures",
  contacts: "contacts",
};

const REVERSE_DATA_TYPE_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(DATA_TYPE_MAP).map(([k, v]) => [v, k]),
);

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProjectState] = useState<Project | null>(
    () => {
      const saved = localStorage.getItem("current-project-id");
      return saved ? JSON.parse(saved) : null;
    },
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [projectData, setProjectData] = useState(defaultProjectData);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const previousProjectIdRef = useRef<string | null>(null);

  // REALTIME UPDATES: Listen for changes and auto-reload data
  useProjectRealtime(currentProject?.id, {
    onBrainUpdate: () => {
      console.log(
        "[ProjectContext] ⚡️ Realtime update detected. Reloading data...",
      );
      loadProjectData();
    },
  });

  // PROJECT ISOLATION: Wrapper function that purges cache on project switch
  const setCurrentProject = useCallback((project: Project | null) => {
    const newProjectId = project?.id ?? null;
    const oldProjectId = previousProjectIdRef.current;

    // Detect actual project change (not initial load)
    if (oldProjectId && oldProjectId !== newProjectId) {
      console.log(
        "[ISOLATION] 🔄 Project switch:",
        oldProjectId,
        "->",
        newProjectId,
      );

      // Start transition state (can show loading screen)
      setIsTransitioning(true);

      // NUCLEAR CACHE PURGE: Invalidate ALL queries
      queryClient.invalidateQueries();

      // Remove stale queries from old project
      queryClient.removeQueries({
        predicate: (query) => {
          const queryKey = query.queryKey;
          return Array.isArray(queryKey) &&
            queryKey.some((key) => key === oldProjectId);
        },
      });

      // Reset project data to defaults immediately
      setProjectData(defaultProjectData);

      console.log("[ISOLATION] ✅ Cache purged");

      // End transition after a brief delay
      setTimeout(() => setIsTransitioning(false), 100);
    }

    previousProjectIdRef.current = newProjectId;
    setCurrentProjectState(project);
  }, [queryClient]);

  // Persist current project to localStorage
  useEffect(() => {
    if (currentProject) {
      localStorage.setItem(
        "current-project-id",
        JSON.stringify(currentProject),
      );
    } else {
      localStorage.removeItem("current-project-id");
    }
  }, [currentProject]);

  // Clear project state when user logs out
  useEffect(() => {
    if (!user) {
      setProjects([]);
      setCurrentProjectState(null);
      setProjectData(defaultProjectData);
      localStorage.removeItem("current-project-id");
      previousProjectIdRef.current = null;
    }
  }, [user]);

  const fetchProjects = useCallback(async () => {
    if (!user) {
      setProjects([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error("Error fetching projects:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const createProject = async (name: string): Promise<Project | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from("projects")
        .insert({ name, user_id: user.id })
        .select()
        .single();

      if (error) throw error;

      await fetchProjects();
      return data;
    } catch (error) {
      console.error("Error creating project:", error);
      return null;
    }
  };

  const deleteProject = async (id: string) => {
    // 1. Optimistic UI update (Instant feel)
    const previousProjects = [...projects];
    const previousCurrentProject = currentProject;

    // Immediately remove from local state
    setProjects((prev) => prev.filter((p) => p.id !== id));
    if (currentProject?.id === id) {
      setCurrentProject(null);
      setProjectData(defaultProjectData);
      localStorage.removeItem("current-project-id");
    }

    try {
      // 2. Attempt Atomic DB Deletion via RPC
      const { error: rpcError } = await supabase.rpc("delete_project_fully", {
        target_project_id: id,
      });

      if (rpcError) {
        console.warn(
          "RPC deletion failed, falling back to manual cascade:",
          rpcError,
        );
        throw rpcError; // Trigger catch block for fallback
      }
    } catch (error) {
      console.log(
        "Creation of RPC might be pending. Executing manual cascade delete...",
      );

      try {
        // 3. Fallback: Manual Cascade Delete (Client-side)
        // Order matters: Children first, then Parent

        // A. Lead Interactions
        await supabase.from("lead_interactions").delete().eq("project_id", id);

        // B. Tasks (linked to leads of this project)
        // Note: We can't easily join in delete, so we might skip this if strict FK enforces it.
        // Assuming tasks cascade or we accept risk of orphans if RPC is missing.
        // But let's try to be clean:
        const { data: leads } = await supabase.from("leads").select("id").eq(
          "project_id",
          id,
        );
        if (leads && leads.length > 0) {
          const leadIds = leads.map((l) => l.id);
          await supabase.from("tasks").delete().in("lead_id", leadIds);
        }

        // C. Leads
        await supabase.from("leads").delete().eq("project_id", id);

        // D. Company Analyses
        await supabase.from("company_analyses").delete().eq("project_id", id);

        // E. Project Data
        await supabase.from("project_data").delete().eq("project_id", id);

        // F. Learned Preferences
        await supabase.from("learned_preferences").delete().eq(
          "project_id",
          id,
        );

        // G. Research Jobs
        await supabase.from("research_jobs").delete().eq("project_id", id);

        // H. Company Documents
        await supabase.from("company_documents").delete().eq("project_id", id);

        // I. Project itself
        const { error: deletionError } = await supabase
          .from("projects")
          .delete()
          .eq("id", id);

        if (deletionError) {
          // Revert state if we truly failed
          console.error("Critical failure in manual delete:", deletionError);
          toast({
            title: "Erreur critique",
            description: "Impossible de supprimer le projet même manuellement.",
            variant: "destructive",
          });
          // Rollback UI
          setProjects(previousProjects);
          if (previousCurrentProject?.id === id) {
            setCurrentProject(previousCurrentProject);
          }
          throw deletionError;
        }
      } catch (manualError) {
        console.error("Manual fallback failed:", manualError);
        // Rollback UI
        setProjects(previousProjects);
        if (previousCurrentProject?.id === id) {
          setCurrentProject(previousCurrentProject);
        }
        throw manualError;
      }
    }

    // Refresh list to be sure
    await fetchProjects();
  };

  const loadProjectData = useCallback(async () => {
    if (!currentProject) {
      setProjectData(defaultProjectData);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("project_data")
        .select("*")
        .eq("project_id", currentProject.id);

      if (error) throw error;

      const newData = { ...defaultProjectData };

      data?.forEach((item) => {
        // Use mapping to convert DB snake_case to Frontend camelCase
        const frontendKey = REVERSE_DATA_TYPE_MAP[item.data_type] ||
          item.data_type;

        // Type guard to ensure we only assign valid keys
        if (frontendKey in newData) {
          const key = frontendKey as keyof typeof newData;
          // We can't easily validate the shape of item.data at runtime without Zod,
          // but we can at least cast it to known types instead of explicit any if possible,
          // or keep the cast minimal.
          (newData as any)[key] = item.data;
        }
      });

      setProjectData(newData);
    } catch (error) {
      console.error("Error loading project data:", error);
    }
  }, [currentProject]);

  const updateProjectData = async <K extends keyof typeof defaultProjectData>(
    dataType: K,
    data: typeof defaultProjectData[K],
  ) => {
    if (!currentProject || !user) return;

    setIsSaving(true);
    try {
      // Map frontend key to DB key
      const dbDataType = DATA_TYPE_MAP[dataType] || dataType;

      const payloadSize = JSON.stringify(data).length;
      console.log(
        `💾 Saving ${dataType} (as ${dbDataType}) to Supabase... (Size: ${payloadSize} bytes)`,
      );

      // Update local state immediately
      setProjectData((prev) => ({
        ...prev,
        [dataType]: data,
      }));

      // Upsert to database
      const { error } = await supabase
        .from("project_data")
        .upsert({
          project_id: currentProject.id,
          data_type: dbDataType,
          data: data as any, // Supabase expects Json, so we cast to any or Json compatible
          user_id: user.id,
        }, {
          onConflict: "project_id,data_type",
        });

      if (error) throw error;

      console.log(`✅ ${dataType} saved successfully.`);
    } catch (error) {
      console.error(`❌ Error saving ${dataType}:`, error);
    } finally {
      setIsSaving(false);
    }
  };

  // Load projects when user changes
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // RECONCILIATION: After projects are loaded, verify currentProject exists in list
  // (fixes "ghost project" after reload where localStorage is outdated)
  useEffect(() => {
    if (isLoading) return; // wait until fetch is done
    if (!currentProject) return; // nothing to reconcile

    const exists = projects.some((p) => p.id === currentProject.id);
    if (!exists) {
      console.warn(
        "[ProjectContext] currentProject from localStorage not found in fetched list, clearing...",
      );
      setCurrentProject(null);
      setProjectData(defaultProjectData);
      localStorage.removeItem("current-project-id");
    }
  }, [projects, isLoading, currentProject]);

  // Load project data when current project changes
  useEffect(() => {
    if (currentProject) {
      loadProjectData();
    } else {
      setProjectData(defaultProjectData);
    }
  }, [currentProject, loadProjectData]);

  return (
    <ProjectContext.Provider
      value={{
        projects,
        currentProject,
        isLoading,
        isTransitioning,
        setCurrentProject,
        createProject,
        deleteProject,
        fetchProjects,
        projectData,
        updateProjectData,
        loadProjectData,
        isSaving,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useProject must be used within a ProjectProvider");
  }
  return context;
}
