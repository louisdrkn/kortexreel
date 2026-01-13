import { useCallback, useEffect, useRef, useState } from "react";
import { useProject } from "@/contexts/ProjectContext";
import { useToast } from "@/hooks/use-toast";
import { debounce } from "lodash";

export type AutoSaveStatus = "idle" | "saving" | "saved" | "error";

interface UseAutoSaveProjectProps<T> {
    data: T;
    onSave: (data: T) => Promise<void>;
    debounceMs?: number;
}

export function useAutoSaveProject<T>({
    data,
    onSave,
    debounceMs = 1000,
}: UseAutoSaveProjectProps<T>) {
    const [status, setStatus] = useState<AutoSaveStatus>("idle");
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
    const [localData, setLocalData] = useState<T>(data);
    const isFirstRender = useRef(true);
    const { toast } = useToast();

    // Sync local data with external data changes (e.g. initial load)
    useEffect(() => {
        if (JSON.stringify(data) !== JSON.stringify(localData)) {
            setLocalData(data);
        }
    }, [data]);

    // Create the debounced save function
    const debouncedSave = useCallback(
        debounce(async (dataToSave: T) => {
            setStatus("saving");
            try {
                await onSave(dataToSave);
                setStatus("saved");
                setLastSavedAt(new Date());

                // Reset to idle after a moment
                setTimeout(() => setStatus("idle"), 2000);
            } catch (error) {
                console.error("Auto-save failed:", error);
                setStatus("error");
                toast({
                    title: "Erreur de sauvegarde",
                    description:
                        "Vos modifications n'ont pas pu être enregistrées.",
                    variant: "destructive",
                });
            }
        }, debounceMs),
        [onSave, debounceMs, toast],
    );

    // Handle value changes (for text inputs)
    const handleChange = useCallback((newData: T) => {
        setLocalData(newData);
        debouncedSave(newData);
    }, [debouncedSave]);

    // Handle immediate saves (for toggles/selects)
    const handleImmediateSave = useCallback(async (newData: T) => {
        setLocalData(newData);
        // Cancel any pending debounce
        debouncedSave.cancel();

        setStatus("saving");
        try {
            await onSave(newData);
            setStatus("saved");
            setLastSavedAt(new Date());

            setTimeout(() => setStatus("idle"), 2000);
        } catch (error) {
            console.error("Immediate save failed:", error);
            setStatus("error");
            toast({
                title: "Erreur de sauvegarde",
                description:
                    "Vos modifications n'ont pas pu être enregistrées.",
                variant: "destructive",
            });
        }
    }, [onSave, debouncedSave, toast]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            debouncedSave.cancel();
        };
    }, [debouncedSave]);

    return {
        localData,
        setLocalData: handleChange, // Default setter uses debounce
        saveImmediately: handleImmediateSave,
        status,
        lastSavedAt,
    };
}
