import { ReactNode } from "react";
import { PODSidebar } from "./PODSidebar";
import { KortexMasterTour } from "@/components/onboarding";
import { ProjectTransitionOverlay } from "./ProjectTransitionOverlay";

interface PODLayoutProps {
  children: ReactNode;
}

export function PODLayout({ children }: PODLayoutProps) {
  return (
    <div className="flex min-h-screen w-full">
      <PODSidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
      <KortexMasterTour />
      <ProjectTransitionOverlay />
    </div>
  );
}
