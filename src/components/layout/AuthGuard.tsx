import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";
import { FullScreenAuthLoader } from "@/components/layout/FullScreenAuthLoader";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, isLoading } = useAuth();
  const { isCompleted, isLoading: onboardingLoading } = useOnboardingStatus();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isLoading || onboardingLoading) return;

    // Redirect to auth if not logged in
    if (!user) {
      navigate("/auth");
      return;
    }

    // Handle onboarding flow
    const isOnboardingPage = location.pathname === "/onboarding";
    
    if (!isCompleted && !isOnboardingPage) {
      // User hasn't completed onboarding, redirect to onboarding
      navigate("/onboarding");
    } else if (isCompleted && isOnboardingPage) {
      // User already completed onboarding, redirect to projects
      navigate("/");
    }
  }, [user, isLoading, isCompleted, onboardingLoading, navigate, location.pathname]);

  // Show loader while checking auth/onboarding status
  if (isLoading || onboardingLoading) {
    return <FullScreenAuthLoader label="Synchronisation…" />;
  }

  // Don't render if no user
  if (!user) {
    return null;
  }

  // If onboarding not completed, don't render (redirect will happen)
  if (!isCompleted && location.pathname !== "/onboarding") {
    return null;
  }

  return <>{children}</>;
}
