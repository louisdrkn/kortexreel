import { useCallback, useState } from "react";

interface UseLocalAutoSaveProps {
    storageKey: string;
    initialValue?: string;
    onCloudSync?: (value: string) => Promise<void>;
}

/**
 * Hook ultra-simple pour auto-save avec localStorage
 *
 * Fonctionnalités :
 * 1. Chargement synchrone depuis localStorage (pas de flash vide au chargement)
 * 2. Sauvegarde instantanée dans localStorage à chaque changement
 * 3. Sync optionnel avec Supabase via callback
 *
 * Utilisation :
 * ```tsx
 * const [pitch, setPitch] = useLocalAutoSave({
 *   storageKey: `agency_pitch_${projectId}`,
 *   initialValue: "",
 *   onCloudSync: async (newValue) => {
 *     await saveToSupabase(newValue);
 *   }
 * });
 *
 * <textarea value={pitch} onChange={(e) => setPitch(e.target.value)} />
 * ```
 */
export function useLocalAutoSave({
    storageKey,
    initialValue = "",
    onCloudSync,
}: UseLocalAutoSaveProps) {
    // ASTUCE MAGIQUE : Lecture synchrone au moment de l'initialisation
    // Cela empêche React d'afficher "vide" au premier render
    const [value, setInnerValue] = useState(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem(storageKey);
            return saved !== null ? saved : initialValue;
        }
        return initialValue;
    });

    const setValue = useCallback((newValue: string) => {
        // 1. Update React state
        setInnerValue(newValue);

        // 2. Save immediately to localStorage (synchronous)
        if (typeof window !== "undefined") {
            localStorage.setItem(storageKey, newValue);
        }

        // 3. Optional: Trigger cloud sync (caller can debounce this)
        onCloudSync?.(newValue);
    }, [storageKey, onCloudSync]);

    return [value, setValue] as const;
}
