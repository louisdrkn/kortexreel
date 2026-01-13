import { useProject } from "@/contexts/ProjectContext";
import { Loader2 } from "lucide-react";

/**
 * PROJECT ISOLATION OVERLAY
 * 
 * Shows a brief loading overlay during project switch to:
 * 1. Prevent users from seeing stale data
 * 2. Provide visual feedback that context is changing
 * 3. Block interactions during cache purge
 */
export function ProjectTransitionOverlay() {
  const { isTransitioning, currentProject } = useProject();

  if (!isTransitioning) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-background/95 backdrop-blur-sm flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <div>
          <p className="text-lg font-medium">Changement de projet...</p>
          {currentProject && (
            <p className="text-sm text-muted-foreground mt-1">
              Chargement de « {currentProject.name} »
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
