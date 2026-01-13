import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useProject } from "@/contexts/ProjectContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type {
  AgencyDNA,
  Contact,
  MeetingCapture,
  OutreachSequence,
  TargetAccount,
  TargetCriteria,
} from "@/types/pod";

export type AutoSaveStatus =
  | "idle"
  | "saving"
  | "saved"
  | "synced"
  | "error"
  | "restored";

interface PODContextType {
  agencyDNA: AgencyDNA;
  updateAgencyDNA: (updates: Partial<AgencyDNA>, immediate?: boolean) => void;
  targetCriteria: TargetCriteria;
  updateTargetCriteria: (
    updates: Partial<TargetCriteria>,
    immediate?: boolean,
  ) => void;
  targetAccounts: TargetAccount[];
  setTargetAccounts: (accounts: TargetAccount[]) => void;
  contacts: Record<string, Contact[]>;
  addContact: (accountId: string, contact: Contact) => void;
  outreachSequences: OutreachSequence[];
  addOutreachSequence: (accountId: string, sequence: OutreachSequence) => void;
  meetingCaptures: MeetingCapture[];
  addMeetingCapture: (capture: MeetingCapture) => void;
  saveAgencyDNA: (dataOverride?: AgencyDNA) => Promise<void>;
  saveTargetCriteria: () => Promise<void>;
  saveTargetAccounts: () => Promise<void>;
  saveMeetingCaptures: () => Promise<void>;
  isSaving: boolean;
  // Auto-save status
  agencyDNAStatus: AutoSaveStatus;
  targetCriteriaStatus: AutoSaveStatus;
  lastSavedAt: Date | null;
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

const PODContext = createContext<PODContextType | undefined>(undefined);

// Debounce delay in milliseconds
const DEBOUNCE_MS = 1000;

export function PODProvider({ children }: { children: ReactNode }) {
  const { currentProject, projectData, updateProjectData, isSaving } =
    useProject();
  const { toast } = useToast();

  const [agencyDNA, setAgencyDNA] = useState<AgencyDNA>({});
  const [targetCriteria, setTargetCriteria] = useState<TargetCriteria>(
    defaultTargetCriteria,
  );
  const [targetAccounts, setTargetAccountsState] = useState<TargetAccount[]>(
    [],
  );
  const [contacts, setContacts] = useState<Record<string, Contact[]>>({});
  const [outreachSequences, setOutreachSequences] = useState<
    OutreachSequence[]
  >([]);
  const [meetingCaptures, setMeetingCaptures] = useState<MeetingCapture[]>([]);

  // Auto-save status
  const [agencyDNAStatus, setAgencyDNAStatus] = useState<AutoSaveStatus>(
    "idle",
  );
  const [targetCriteriaStatus, setTargetCriteriaStatus] = useState<
    AutoSaveStatus
  >("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // Debounce timers
  const agencyDNATimerRef = useRef<NodeJS.Timeout | null>(null);
  const targetCriteriaTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasInitializedRef = useRef(false);
  const lastAgencyDNARef = useRef<string>("");
  const lastTargetCriteriaRef = useRef<string>("");

  // Build localStorage keys
  const projectId = currentProject?.id;
  const agencyDNAStorageKey = projectId
    ? `draft_agency_dna_${projectId}`
    : null;
  const targetCriteriaStorageKey = projectId
    ? `draft_target_criteria_${projectId}`
    : null;

  // LAYER 1: Immediate local state update (handled by setAgencyDNA/setTargetCriteria)
  // LAYER 2: Debounced Supabase Sync
  // ======================
  const saveAgencyDNAToSupabase = useCallback(async (data: AgencyDNA) => {
    if (!currentProject?.id) return;

    const dataString = JSON.stringify(data);
    if (dataString === lastAgencyDNARef.current) {
      setAgencyDNAStatus("synced");
      return;
    }

    setAgencyDNAStatus("saving");

    try {
      await updateProjectData("agencyDNA", data);
      lastAgencyDNARef.current = dataString;
      setLastSavedAt(new Date());
      setAgencyDNAStatus("synced");
    } catch (error) {
      console.error("[AutoSave] AgencyDNA save failed:", error);
      setAgencyDNAStatus("error");
    }
  }, [currentProject?.id, updateProjectData]);

  const saveTargetCriteriaToSupabase = useCallback(
    async (data: TargetCriteria) => {
      if (!currentProject?.id) return;

      const dataString = JSON.stringify(data);
      if (dataString === lastTargetCriteriaRef.current) {
        setTargetCriteriaStatus("synced");
        return;
      }

      setTargetCriteriaStatus("saving");

      try {
        await updateProjectData("targetCriteria", data);
        lastTargetCriteriaRef.current = dataString;
        setLastSavedAt(new Date());
        setTargetCriteriaStatus("synced");
      } catch (error) {
        console.error("[AutoSave] TargetCriteria save failed:", error);
        setTargetCriteriaStatus("error");
      }
    },
    [currentProject?.id, updateProjectData],
  );

  // ======================
  // LAYER 3: Data Hydration (No more Draft Recovery)
  // ======================
  useEffect(() => {
    if (!projectId) return;

    // Simple initialization check - we trust the DB now
    hasInitializedRef.current = true;
  }, [projectId]);

  // PROJECT ISOLATION: Full state reset when project changes
  useEffect(() => {
    // console.log("[PODContext] Project changed to:", projectId);

    // Cancel any pending debounced saves
    if (agencyDNATimerRef.current) clearTimeout(agencyDNATimerRef.current);
    if (targetCriteriaTimerRef.current) {
      clearTimeout(targetCriteriaTimerRef.current);
    }

    // Reset initialization flag
    hasInitializedRef.current = false;
    lastAgencyDNARef.current = "";
    lastTargetCriteriaRef.current = "";

    // IMMEDIATE STATE PURGE - prevent showing old project data
    setAgencyDNA({});
    setTargetCriteria(defaultTargetCriteria);
    setTargetAccountsState([]);
    setContacts({});
    setOutreachSequences([]);
    setMeetingCaptures([]);

    // Reset status indicators
    setAgencyDNAStatus("idle");
    setTargetCriteriaStatus("idle");
    setLastSavedAt(null);
    console.log("[PODContext] 🧹 State RESET for project:", projectId);
  }, [projectId]);

  // Sync with project data when it loads, BUT check LocalStorage for fresher drafts ("Manière Forte")
  useEffect(() => {
    console.log(
      "[PODContext] 🔄 Hydration Effect Triggered. ProjectId:",
      projectId,
      "HasData:",
      !!projectData,
    );
    if (projectData && projectId) {
      // console.log("[PODContext] Loading project data for:", projectId);

      // 1. Load from DB (Base)
      const dbAgencyDNA = projectData.agencyDNA || {};
      const dbTargetCriteria = projectData.targetCriteria ||
        defaultTargetCriteria;

      // 2. Load from LocalStorage (Overlay - The "Draft")
      let finalAgencyDNA = dbAgencyDNA;
      let finalTargetCriteria = dbTargetCriteria;

      // Check AgencyDNA Draft
      if (agencyDNAStorageKey) {
        try {
          const localDraftDiff = localStorage.getItem(agencyDNAStorageKey);
          if (localDraftDiff) {
            const parsedDraft = JSON.parse(localDraftDiff);
            // Verify if draft is actually different/richer?
            // For "Manière Forte", we assume Local Storage is the TRUTH for the current session.
            // We merge it on top of DB data.
            finalAgencyDNA = { ...dbAgencyDNA, ...parsedDraft };
            console.log(
              "[PODContext] 🧠 Restored AgencyDNA from LocalStorage draft.",
            );
          }
        } catch (e) {
          console.warn("Failed to load AgencyDNA local draft", e);
        }
      }

      // Check TargetCriteria Draft
      if (targetCriteriaStorageKey) {
        try {
          const localDraftDiff = localStorage.getItem(targetCriteriaStorageKey);
          if (localDraftDiff) {
            const parsedDraft = JSON.parse(localDraftDiff);
            finalTargetCriteria = { ...dbTargetCriteria, ...parsedDraft };
            console.log(
              "[PODContext] 🎯 Restored TargetCriteria from LocalStorage draft.",
            );
          }
        } catch (e) {
          console.warn("Failed to load TargetCriteria local draft", e);
        }
      }

      // Update State
      setAgencyDNA(finalAgencyDNA);
      setTargetCriteria(finalTargetCriteria);
      setTargetAccountsState(projectData.targetAccounts || []);
      setContacts(projectData.contacts || {});
      setOutreachSequences(projectData.outreachSequences || []);
      setMeetingCaptures(projectData.meetingCaptures || []);

      // Update refs to reflect current state (to avoid unnecessary save trigger)
      lastAgencyDNARef.current = JSON.stringify(finalAgencyDNA);
      lastTargetCriteriaRef.current = JSON.stringify(finalTargetCriteria);

      // Mark as initialized
      hasInitializedRef.current = true;
    }
  }, [projectData, projectId, agencyDNAStorageKey, targetCriteriaStorageKey]);

  // ======================
  // Update handlers with auto-save
  // ======================
  const updateAgencyDNA = useCallback(
    (updates: Partial<AgencyDNA>, immediate = false) => {
      setAgencyDNA((prev) => {
        const newData = { ...prev, ...updates };

        // 1. IMMEDIATE LOCAL SAVE ("Manière Forte")
        if (agencyDNAStorageKey) {
          try {
            // We save the WHOLE object to be safe, or just the diff?
            // Saving the whole object ensures we don't lose anything.
            localStorage.setItem(agencyDNAStorageKey, JSON.stringify(newData));
          } catch (e) {
            console.error("Local Save Failed (AgencyDNA)", e);
          }
        }

        // 2. Direct debounce schedule (DB Sync)
        setAgencyDNAStatus("saving");
        if (agencyDNATimerRef.current) {
          clearTimeout(agencyDNATimerRef.current);
        }

        if (immediate) {
          saveAgencyDNAToSupabase(newData);
        } else {
          agencyDNATimerRef.current = setTimeout(() => {
            saveAgencyDNAToSupabase(newData);
          }, DEBOUNCE_MS);
        }

        return newData;
      });
    },
    [saveAgencyDNAToSupabase, agencyDNAStorageKey],
  );

  const updateTargetCriteria = useCallback(
    (updates: Partial<TargetCriteria>, immediate = false) => {
      setTargetCriteria((prev) => {
        const newData = { ...prev, ...updates };

        // 1. IMMEDIATE LOCAL SAVE ("Manière Forte")
        if (targetCriteriaStorageKey) {
          try {
            localStorage.setItem(
              targetCriteriaStorageKey,
              JSON.stringify(newData),
            );
          } catch (e) {
            console.error("Local Save Failed (TargetCriteria)", e);
          }
        }

        // 2. Direct debounce schedule (DB Sync)
        setTargetCriteriaStatus("saving");
        if (targetCriteriaTimerRef.current) {
          clearTimeout(targetCriteriaTimerRef.current);
        }

        if (immediate) {
          saveTargetCriteriaToSupabase(newData);
        } else {
          targetCriteriaTimerRef.current = setTimeout(() => {
            saveTargetCriteriaToSupabase(newData);
          }, DEBOUNCE_MS);
        }

        return newData;
      });
    },
    [saveTargetCriteriaToSupabase, targetCriteriaStorageKey],
  );

  const setTargetAccounts = (accounts: TargetAccount[]) => {
    setTargetAccountsState(accounts);
  };

  const addContact = (accountId: string, contact: Contact) => {
    setContacts((prev) => ({
      ...prev,
      [accountId]: [...(prev[accountId] || []), contact],
    }));
  };

  const addOutreachSequence = (
    _accountId: string,
    sequence: OutreachSequence,
  ) => {
    setOutreachSequences((prev) => [...prev, sequence]);
  };

  const addMeetingCapture = (capture: MeetingCapture) => {
    setMeetingCaptures((prev) => [...prev, capture]);
  };

  // Manual save functions (force immediate save)
  const saveAgencyDNA = async (dataOverride?: AgencyDNA) => {
    if (agencyDNATimerRef.current) {
      clearTimeout(agencyDNATimerRef.current);
    }
    await saveAgencyDNAToSupabase(dataOverride || agencyDNA);
  };

  const saveTargetCriteria = async () => {
    if (targetCriteriaTimerRef.current) {
      clearTimeout(targetCriteriaTimerRef.current);
    }
    await saveTargetCriteriaToSupabase(targetCriteria);
  };

  const saveTargetAccounts = async () => {
    if (currentProject) {
      await updateProjectData("targetAccounts", targetAccounts);
    }
  };

  const saveMeetingCaptures = async () => {
    if (currentProject) {
      await updateProjectData("meetingCaptures", meetingCaptures);
    }
  };

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (agencyDNATimerRef.current) clearTimeout(agencyDNATimerRef.current);
      if (targetCriteriaTimerRef.current) {
        clearTimeout(targetCriteriaTimerRef.current);
      }
    };
  }, []);

  return (
    <PODContext.Provider
      value={{
        agencyDNA,
        updateAgencyDNA,
        targetCriteria,
        updateTargetCriteria,
        targetAccounts,
        setTargetAccounts,
        contacts,
        addContact,
        outreachSequences,
        addOutreachSequence,
        meetingCaptures,
        addMeetingCapture,
        saveAgencyDNA,
        saveTargetCriteria,
        saveTargetAccounts,
        saveMeetingCaptures,
        isSaving,
        agencyDNAStatus,
        targetCriteriaStatus,
        lastSavedAt,
      }}
    >
      {children}
    </PODContext.Provider>
  );
}

export function usePOD() {
  const context = useContext(PODContext);
  if (!context) {
    throw new Error("usePOD must be used within a PODProvider");
  }
  return context;
}
