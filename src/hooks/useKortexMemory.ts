import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * useKortexMemory: A robust dual-layer persistence hook.
 *
 * Layer 1 (Speed): LocalStorage (Synchronous, instant access)
 * Layer 2 (Resilience): Supabase 'kortex_cache' table (Asynchronous, backup)
 *
 * Logic:
 * 1. Mounting: Read LocalStorage immediately. Then, lazily fetch Supabase to sync/restore if local is empty.
 * 2. Updates: Write to LocalStorage immediately. Push to Supabase in background (debounce 2s).
 */
export function useKortexMemory<T>(
    key: string,
    defaultValue: T,
    userId?: string, // Optional: if provided, enables Cloud Sync
): [T, React.Dispatch<React.SetStateAction<T>>] {
    // 1. Initialize from LocalStorage (Instant)
    const [state, setState] = useState<T>(() => {
        if (typeof window === "undefined") return defaultValue;
        try {
            const stored = localStorage.getItem(key);
            return stored ? JSON.parse(stored) : defaultValue;
        } catch (e) {
            console.warn("KortexMemory: Local read failed", e);
            return defaultValue;
        }
    });

    const [isInitialized, setIsInitialized] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // 2. Cloud Hydration (Lazy) - Only if userId is present
    useEffect(() => {
        if (!userId) {
            setIsInitialized(true);
            return;
        }

        const hydrateFromCloud = async () => {
            try {
                const { data, error } = await supabase
                    .from("kortex_cache")
                    .select("value")
                    .eq("user_id", userId)
                    .eq("key", key)
                    .single();

                if (data?.value) {
                    // Conflict resolution: Cloud wins if Local is empty or default,
                    // but if User has been working locally, we might trust Local most recently updated.
                    // Simple strategy: If Local is default/empty AND Cloud has data -> Restore Cloud.
                    // Otherwise, keeping Local is safer to avoid overwriting recent work.

                    const localStored = localStorage.getItem(key);
                    const isLocalEmpty = !localStored ||
                        localStored === JSON.stringify(defaultValue);

                    if (isLocalEmpty) {
                        console.log(
                            `[KortexMemory] ☁️ Restoring '${key}' from cloud backup.`,
                        );
                        setState(data.value as T);
                        // Also sync back to local to avoid re-fetch
                        localStorage.setItem(key, JSON.stringify(data.value));
                    }
                }
            } catch (e) {
                // Silent fail (offline mode)
            } finally {
                setIsInitialized(true);
            }
        };

        hydrateFromCloud();
    }, [key, userId]);

    // 3. Dual-Write (Local + Cloud Debounced)
    useEffect(() => {
        if (typeof window === "undefined") return;

        // A. Local Write (Immediate)
        try {
            localStorage.setItem(key, JSON.stringify(state));
        } catch (e) {
            console.warn("KortexMemory: Local write failed", e);
        }

        // B. Cloud Write (Debounced)
        if (userId && isInitialized) {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);

            timeoutRef.current = setTimeout(async () => {
                try {
                    await supabase.from("kortex_cache").upsert(
                        {
                            user_id: userId,
                            key: key,
                            value: state as any,
                            updated_at: new Date().toISOString(),
                        },
                        { onConflict: "user_id, key" },
                    );
                    console.log(`[KortexMemory] ☁️ Synced '${key}' to cloud.`);
                } catch (e) {
                    console.warn("KortexMemory: Cloud sync failed", e);
                }
            }, 2000); // 2 seconds debounce
        }

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [key, state, userId, isInitialized]);

    return [state, setState];
}
