import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface UseOnboardingStatusReturn {
  isCompleted: boolean;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

export function useOnboardingStatus(): UseOnboardingStatusReturn {
  const { user } = useAuth();
  const [isCompleted, setIsCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkOnboardingStatus = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("[ONBOARDING_STATUS] Error fetching:", error);
        setIsCompleted(false);
      } else {
        console.log("[ONBOARDING_STATUS] Data received:", data);
        setIsCompleted(data?.onboarding_completed ?? false);
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      setIsCompleted(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkOnboardingStatus();
  }, [user]);

  return {
    isCompleted,
    isLoading,
    refetch: checkOnboardingStatus,
  };
}
