import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProjectProvider } from "@/contexts/ProjectContext";
import { PODProvider } from "@/contexts/PODContext";
import { PODLayout } from "@/components/layout/PODLayout";
import { ProjectGuard } from "@/components/layout/ProjectGuard";
import { AuthGuard } from "@/components/layout/AuthGuard";
import { FullScreenAuthLoader } from "@/components/layout/FullScreenAuthLoader";
import { useScrollToTop } from "@/hooks/useScrollToTop";

// Pages
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Projects from "./pages/Projects";
import Cockpit from "./pages/Cockpit";
import AgencyBrain from "./pages/phase1/AgencyBrain";
import TargetDefinition from "./pages/phase1/TargetDefinition";
import MarketRadar from "./pages/phase2/MarketRadar";
import ProspectDeepDive from "./pages/phase2/ProspectDeepDive";
import OutreachSequence from "./pages/phase2/OutreachSequence";
import RDVCapture from "./pages/phase2/RDVCapture";
import FicheProspect from "./pages/FicheProspect";
import ProposalGenerator from "./pages/phase3/ProposalGenerator";
import ExportPage from "./pages/phase3/ExportPage";
import DataRoom from "./pages/DataRoom";
import Integrations from "./pages/Integrations";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Scroll to top component
function ScrollToTop() {
  useScrollToTop();
  return null;
}

function AuthLoading({ children }: { children: React.ReactNode }) {
  const { isLoading } = useAuth();
  if (isLoading) {
    return <FullScreenAuthLoader label="Chargement de la session…" />;
  }
  return <>{children}</>;
}

function Protected({ children }: { children: React.ReactNode }) {
  return (
    <AuthLoading>
      <AuthGuard>{children}</AuthGuard>
    </AuthLoading>
  );
}

// Layout wrapper component
function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Protected>
      <ProjectGuard>
        <PODLayout>{children}</PODLayout>
      </ProjectGuard>
    </Protected>
  );
}

import { RadarProvider } from "@/contexts/RadarContext";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ProjectProvider>
        <PODProvider>
          <RadarProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <ScrollToTop />
                <Routes>
                  {/* Auth Route */}
                  <Route path="/auth" element={<Auth />} />

                  {/* Onboarding Route (Protected but no sidebar) */}
                  <Route
                    path="/onboarding"
                    element={
                      <Protected>
                        <Onboarding />
                      </Protected>
                    }
                  />

                  {/* Projects List (Protected but no POD layout) */}
                  <Route
                    path="/"
                    element={
                      <Protected>
                        <Projects />
                      </Protected>
                    }
                  />

                  {/* App Routes with Layout */}
                  <Route
                    path="/dashboard"
                    element={
                      <AppLayout>
                        <Cockpit />
                      </AppLayout>
                    }
                  />
                  <Route
                    path="/strategie/cerveau"
                    element={
                      <AppLayout>
                        <AgencyBrain />
                      </AppLayout>
                    }
                  />
                  <Route
                    path="/strategie/cible"
                    element={
                      <AppLayout>
                        <TargetDefinition />
                      </AppLayout>
                    }
                  />
                  <Route
                    path="/radar/scan"
                    element={
                      <AppLayout>
                        <MarketRadar />
                      </AppLayout>
                    }
                  />
                  <Route
                    path="/radar/prospect"
                    element={
                      <AppLayout>
                        <ProspectDeepDive />
                      </AppLayout>
                    }
                  />
                  <Route
                    path="/radar/outreach"
                    element={
                      <AppLayout>
                        <OutreachSequence />
                      </AppLayout>
                    }
                  />
                  <Route
                    path="/radar/rdv"
                    element={
                      <AppLayout>
                        <RDVCapture />
                      </AppLayout>
                    }
                  />
                  <Route
                    path="/radar/prospects"
                    element={
                      <AppLayout>
                        <FicheProspect />
                      </AppLayout>
                    }
                  />
                  <Route
                    path="/closing/propale"
                    element={
                      <AppLayout>
                        <ProposalGenerator />
                      </AppLayout>
                    }
                  />
                  <Route
                    path="/closing/export"
                    element={
                      <AppLayout>
                        <ExportPage />
                      </AppLayout>
                    }
                  />
                  <Route
                    path="/data-room"
                    element={
                      <AppLayout>
                        <DataRoom />
                      </AppLayout>
                    }
                  />
                  <Route
                    path="/settings/integrations"
                    element={
                      <AppLayout>
                        <Integrations />
                      </AppLayout>
                    }
                  />
                  <Route
                    path="/settings"
                    element={
                      <AppLayout>
                        <Settings />
                      </AppLayout>
                    }
                  />

                  {/* 404 */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </RadarProvider>
        </PODProvider>
      </ProjectProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
