import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { OnboardingData } from "@/components/onboarding/OnboardingWizard";

const ONBOARDING_STORAGE_KEY = "kortex_onboarding_completed";

export function useOnboarding() {
  const { user } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        // Check localStorage first for quick response
        const localCompleted = localStorage.getItem(`${ONBOARDING_STORAGE_KEY}_${user.id}`);
        if (localCompleted === "true") {
          setShowOnboarding(false);
          setIsLoading(false);
          return;
        }

        // Check database for onboarding status
        const { data, error } = await supabase
          .from("project_data")
          .select("data")
          .eq("user_id", user.id)
          .eq("data_type", "onboarding_status")
          .maybeSingle();

        if (error) {
          console.error("Error checking onboarding status:", error);
        }

        const isCompleted = data?.data && (data.data as { completed?: boolean }).completed === true;
        setShowOnboarding(!isCompleted);
        
        if (isCompleted) {
          localStorage.setItem(`${ONBOARDING_STORAGE_KEY}_${user.id}`, "true");
        }
      } catch (err) {
        console.error("Error in onboarding check:", err);
        setShowOnboarding(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkOnboardingStatus();
  }, [user]);

  const completeOnboarding = useCallback(async (data: OnboardingData) => {
    if (!user) return;

    try {
      // Save onboarding data and mark as completed
      const { error } = await supabase.from("project_data").upsert({
        user_id: user.id,
        project_id: user.id, // Use user_id as project_id for user-level settings
        data_type: "onboarding_status",
        data: {
          completed: true,
          completedAt: new Date().toISOString(),
          ...data,
        },
      });

      if (error) {
        console.error("Error saving onboarding data:", error);
      }

      // Update localStorage
      localStorage.setItem(`${ONBOARDING_STORAGE_KEY}_${user.id}`, "true");
      setShowOnboarding(false);
    } catch (err) {
      console.error("Error completing onboarding:", err);
    }
  }, [user]);

  const skipOnboarding = useCallback(() => {
    if (user) {
      localStorage.setItem(`${ONBOARDING_STORAGE_KEY}_${user.id}`, "true");
    }
    setShowOnboarding(false);
  }, [user]);

  return {
    showOnboarding,
    isLoading,
    completeOnboarding,
    skipOnboarding,
  };
}
