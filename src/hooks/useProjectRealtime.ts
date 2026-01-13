import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useProjectRealtime(
    projectId: string | undefined,
    callbacks?: {
        onRadarUpdate?: () => void;
        onBrainUpdate?: () => void;
    },
) {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    useEffect(() => {
        if (!projectId) return;

        console.log("🔌 Connecting to Realtime for Project:", projectId);

        const channel = supabase
            .channel(`project-updates-${projectId}`)
            // 1. Radar Results (New Companies in company_analyses)
            .on(
                "postgres_changes",
                {
                    event: "*", // INSERT, UPDATE
                    schema: "public",
                    table: "company_analyses",
                    filter: `project_id=eq.${projectId}`,
                },
                (payload) => {
                    console.log(
                        "⚡️ Realtime update (Radar):",
                        payload.eventType,
                    );
                    // Always invalidate React Query (for RadarPage which unlikely uses Context)
                    queryClient.invalidateQueries({
                        queryKey: ["radar-companies", projectId],
                    });
                    callbacks?.onRadarUpdate?.();

                    if (payload.eventType === "INSERT") {
                        const newCompany = payload.new as any;
                        if (newCompany.company_name) {
                            /* Optional: Add Toast here if desired */
                        }
                    }
                },
            )
            // 2. Agency DNA / Track Record (Updates to project_data table)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "project_data",
                    filter: `project_id=eq.${projectId}`,
                },
                (payload) => {
                    console.log(
                        "⚡️ Realtime update (Brain):",
                        payload.eventType,
                    );
                    queryClient.invalidateQueries({
                        queryKey: ["project-data", projectId],
                    });
                    callbacks?.onBrainUpdate?.();
                },
            )
            .subscribe((status) => {
                if (status === "SUBSCRIBED") {
                    console.log("✅ Realtime Subscribed");
                }
            });

        return () => {
            console.log("🔌 Disconnecting Realtime...");
            supabase.removeChannel(channel);
        };
    }, [projectId, queryClient, toast, callbacks]);
}
