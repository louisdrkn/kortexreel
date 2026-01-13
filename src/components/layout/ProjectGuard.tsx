import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useProject } from "@/contexts/ProjectContext";
import { Loader2 } from "lucide-react";

interface ProjectGuardProps {
  children: ReactNode;
}

export function ProjectGuard({ children }: ProjectGuardProps) {
  const { currentProject, isLoading } = useProject();
  const location = useLocation();

  // Allow access to projects page without a current project
  if (location.pathname === "/") {
    return <>{children}</>;
  }

  // Show loading while checking project state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect to projects page if no current project
  if (!currentProject) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
