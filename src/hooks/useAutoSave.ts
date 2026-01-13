import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type SaveStatus = "idle" | "saving" | "saved" | "synced" | "error" | "restored";

interface UseAutoSaveOptions<T> {
  /** Unique key for localStorage (e.g., 'target_criteria') */
  storageKey: string;
  /** Project ID for database queries */
  projectId: string | undefined;
  /** Data type identifier for project_data table */
  dataType: string;
  /** Debounce delay in ms (default: 1000) */
  debounceMs?: number;
  /** Initial data value */
  initialData: T;
  /** Callback when data is loaded from any source */
  onDataLoaded?: (data: T, source: "database" | "localStorage" | "initial") => void;
}

interface UseAutoSaveReturn<T> {
  data: T;
  updateData: (updates: Partial<T>) => void;
  setData: (data: T) => void;
  status: SaveStatus;
  lastSavedAt: Date | null;
  forceSave: () => Promise<void>;
  clearDraft: () => void;
}

export function useAutoSave<T extends Record<string, any>>({
  storageKey,
  projectId,
  dataType,
  debounceMs = 1000,
  initialData,
  onDataLoaded,
}: UseAutoSaveOptions<T>): UseAutoSaveReturn<T> {
  const [data, setDataState] = useState<T>(initialData);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const { toast } = useToast();
  
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasInitializedRef = useRef(false);
  const lastSavedDataRef = useRef<string>("");

  // Build full storage key with project ID
  const fullStorageKey = projectId ? `${storageKey}_${projectId}` : storageKey;
  const timestampKey = `${fullStorageKey}_timestamp`;

  // ======================
  // LAYER 1: Instant localStorage Mirror
  // ======================
  const saveToLocalStorage = useCallback((newData: T) => {
    try {
      const dataString = JSON.stringify(newData);
      localStorage.setItem(fullStorageKey, dataString);
      localStorage.setItem(timestampKey, Date.now().toString());
    } catch (error) {
      console.error("[AutoSave] localStorage save failed:", error);
    }
  }, [fullStorageKey, timestampKey]);

  // ======================
  // LAYER 2: Debounced Supabase Sync
  // ======================
  const saveToSupabase = useCallback(async (newData: T) => {
    if (!projectId) return;
    
    const dataString = JSON.stringify(newData);
    // Skip if data hasn't changed
    if (dataString === lastSavedDataRef.current) {
      setStatus("synced");
      return;
    }

    setStatus("saving");
    
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user?.id) {
        throw new Error("No authenticated user");
      }

      // Use project_data table for all form data
      const { error } = await supabase
        .from("project_data")
        .upsert({
          project_id: projectId,
          data_type: dataType,
          data: newData as any,
          user_id: session.session.user.id,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "project_id,data_type",
        });

      if (error) throw error;

      lastSavedDataRef.current = dataString;
      setLastSavedAt(new Date());
      setStatus("synced");
    } catch (error) {
      console.error("[AutoSave] Supabase save failed:", error);
      setStatus("error");
    }
  }, [projectId, dataType]);

  const scheduleSave = useCallback((newData: T) => {
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Schedule new save
    debounceTimerRef.current = setTimeout(() => {
      saveToSupabase(newData);
    }, debounceMs);
  }, [debounceMs, saveToSupabase]);

  // ======================
  // LAYER 3: Crash Recovery
  // ======================
  useEffect(() => {
    if (!projectId || hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    const initializeData = async () => {
      try {
        // 1. Try to fetch from Supabase
        const { data: dbResult, error } = await supabase
          .from("project_data")
          .select("data, updated_at")
          .eq("project_id", projectId)
          .eq("data_type", dataType)
          .maybeSingle();

        const dbTimestamp = dbResult?.updated_at ? new Date(dbResult.updated_at).getTime() : 0;

        // 2. Check localStorage for a more recent draft
        const localDataString = localStorage.getItem(fullStorageKey);
        const localTimestampString = localStorage.getItem(timestampKey);
        const localTimestamp = localTimestampString ? parseInt(localTimestampString, 10) : 0;

        // 3. Determine which version to use
        if (localDataString && localTimestamp > dbTimestamp) {
          // localStorage has more recent data (crash recovery)
          try {
            const localData = JSON.parse(localDataString) as T;
            setDataState(localData);
            lastSavedDataRef.current = ""; // Force sync to DB
            setStatus("restored");
            
            toast({
              title: "Brouillon restauré 🔄",
              description: "Nous avons récupéré votre dernier brouillon non sauvegardé.",
            });
            
            onDataLoaded?.(localData, "localStorage");
            
            // Schedule immediate sync to DB
            scheduleSave(localData);
            return;
          } catch (parseError) {
            console.error("[AutoSave] Failed to parse localStorage data:", parseError);
          }
        }

        if (dbResult?.data) {
          // Use database version
          const restoredData = dbResult.data as T;
          setDataState(restoredData);
          lastSavedDataRef.current = JSON.stringify(restoredData);
          setStatus("synced");
          onDataLoaded?.(restoredData, "database");
        } else {
          // Use initial data
          setDataState(initialData);
          onDataLoaded?.(initialData, "initial");
        }
      } catch (error) {
        console.error("[AutoSave] Initialization failed:", error);
        // Fallback to localStorage or initial
        const localDataString = localStorage.getItem(fullStorageKey);
        if (localDataString) {
          try {
            const localData = JSON.parse(localDataString) as T;
            setDataState(localData);
            onDataLoaded?.(localData, "localStorage");
          } catch {
            setDataState(initialData);
            onDataLoaded?.(initialData, "initial");
          }
        } else {
          setDataState(initialData);
          onDataLoaded?.(initialData, "initial");
        }
      }
    };

    initializeData();
  }, [projectId, dataType, fullStorageKey, timestampKey, initialData, toast, onDataLoaded, scheduleSave]);

  // ======================
  // Update handler (merges partial updates)
  // ======================
  const updateData = useCallback((updates: Partial<T>) => {
    setDataState((prev) => {
      const newData = { ...prev, ...updates };
      
      // Layer 1: Instant localStorage save
      saveToLocalStorage(newData);
      
      // Layer 2: Schedule debounced Supabase sync
      setStatus("saving");
      scheduleSave(newData);
      
      return newData;
    });
  }, [saveToLocalStorage, scheduleSave]);

  // Full data replacement
  const setData = useCallback((newData: T) => {
    setDataState(newData);
    saveToLocalStorage(newData);
    setStatus("saving");
    scheduleSave(newData);
  }, [saveToLocalStorage, scheduleSave]);

  // Force immediate save
  const forceSave = useCallback(async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    await saveToSupabase(data);
  }, [data, saveToSupabase]);

  // Clear draft from localStorage
  const clearDraft = useCallback(() => {
    localStorage.removeItem(fullStorageKey);
    localStorage.removeItem(timestampKey);
  }, [fullStorageKey, timestampKey]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Reset initialization when project changes
  useEffect(() => {
    hasInitializedRef.current = false;
  }, [projectId]);

  return {
    data,
    updateData,
    setData,
    status,
    lastSavedAt,
    forceSave,
    clearDraft,
  };
}
