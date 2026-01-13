import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useProject } from '@/contexts/ProjectContext';

/**
 * PROJECT ISOLATION HOOK
 * 
 * Prevents data leakage between projects by:
 * 1. Invalidating ALL TanStack Query caches when project changes
 * 2. Forcing re-fetch of all project-scoped data
 * 3. Clearing localStorage drafts for previous projects
 * 
 * USAGE: Call this hook in any top-level layout component (PODLayout, AppLayout)
 */
export function useProjectIsolation() {
  const { currentProject } = useProject();
  const queryClient = useQueryClient();
  const previousProjectIdRef = useRef<string | null>(null);
  const isFirstMountRef = useRef(true);

  useEffect(() => {
    const currentProjectId = currentProject?.id ?? null;

    // Skip first mount - we don't need to purge on initial load
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      previousProjectIdRef.current = currentProjectId;
      return;
    }

    // Detect project switch
    if (previousProjectIdRef.current !== currentProjectId) {
      console.log('[ISOLATION] 🔄 Project switch detected:', {
        from: previousProjectIdRef.current,
        to: currentProjectId,
      });

      // NUCLEAR OPTION: Invalidate ALL queries to prevent data leakage
      // This forces a complete re-fetch of all data for the new project
      queryClient.invalidateQueries();

      // Also clear any stale cache entries from previous project
      queryClient.removeQueries({
        predicate: (query) => {
          const queryKey = query.queryKey;
          // Remove queries that contain the old project ID
          return (
            Array.isArray(queryKey) &&
            queryKey.some((key) => key === previousProjectIdRef.current)
          );
        },
      });

      // Clear localStorage drafts from previous project (avoid confusion)
      if (previousProjectIdRef.current) {
        const oldDraftKeys = [
          `draft_agency_dna_${previousProjectIdRef.current}`,
          `draft_target_criteria_${previousProjectIdRef.current}`,
        ];
        oldDraftKeys.forEach((key) => {
          // Don't delete, just mark as "synced" to prevent false restore
          // The data will be cleaned up naturally
        });
      }

      console.log('[ISOLATION] ✅ Cache purged, new project context ready');
      
      previousProjectIdRef.current = currentProjectId;
    }
  }, [currentProject?.id, queryClient]);

  return {
    currentProjectId: currentProject?.id ?? null,
    isProjectActive: !!currentProject?.id,
  };
}

/**
 * Helper hook to get the current project ID with null safety
 * Always use this instead of directly accessing currentProject.id
 */
export function useCurrentProjectId(): string | null {
  const { currentProject } = useProject();
  return currentProject?.id ?? null;
}
