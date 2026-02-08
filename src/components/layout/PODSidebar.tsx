import {
  ArrowLeft,
  Brain,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  FolderOpen,
  LayoutDashboard,
  MessageSquare,
  Phone,
  Radar,
  Settings2,
  Target,
  UserCog,
  Users,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProject } from "@/contexts/ProjectContext";
import kortexBrain from "@/assets/kortex-brain.png";
import kortexText from "@/assets/kortex-text.png";
import { useRadar } from "@/components/radar-v2/hooks/useRadar";

const navSections = [{
  title: "Stratégie & ADN",
  phase: 1,
  color: "text-zinc-500",
  bgColor: "bg-zinc-500/10",
  items: [{
    title: "Cerveau Agence",
    url: "/strategie/cerveau",
    icon: Brain,
  }, {
    title: "Définition Cible",
    url: "/strategie/cible",
    icon: Target,
  }],
}, {
  title: "Radar & Conquête",
  phase: 2,
  color: "text-zinc-500",
  bgColor: "bg-zinc-500/10",
  items: [{
    title: "Radar Marché",
    url: "/radar/scan",
    icon: Radar,
  }, {
    title: "Fiche Prospect",
    url: "/radar/prospects",
    icon: Users,
  }, {
    title: "Séquence Approche",
    url: "/radar/outreach",
    icon: MessageSquare,
  }, {
    title: "Capture RDV",
    url: "/radar/rdv",
    icon: Phone,
  }],
}, {
  title: "Closing",
  phase: 3,
  color: "text-zinc-500",
  bgColor: "bg-zinc-500/10",
  items: [{
    title: "Générateur Propale",
    url: "/closing/propale",
    icon: FileText,
  }, {
    title: "Export",
    url: "/closing/export",
    icon: Download,
  }],
}, {
  title: "Réglages",
  phase: 0,
  color: "text-muted-foreground",
  bgColor: "bg-muted",
  items: [{
    title: "Documents",
    url: "/data-room",
    icon: FolderOpen,
  }, {
    title: "Intégrations",
    url: "/settings/integrations",
    icon: Settings2,
  }, {
    title: "Paramètres",
    url: "/settings",
    icon: UserCog,
  }],
}];

export function PODSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const {
    currentProject,
    setCurrentProject,
  } = useProject();
  const { isScanning, isExecuting } = useRadar();
  const handleBackToProjects = () => {
    setCurrentProject(null);
    navigate("/");
  };
  return (
    <aside
      className={cn(
        "flex flex-col border-r border-white/5 bg-zinc-950/30 backdrop-blur-xl text-zinc-400 transition-all duration-300 ease-out",
        collapsed ? "w-[72px]" : "w-[260px]",
      )}
    >
      {/* Logo & Project */}
      <div className="flex flex-col border-b border-white/5 bg-transparent">
        {/* Premium Brand Block */}
        <div
          className={cn(
            "flex items-center justify-center", // Center alignment
            collapsed ? "pt-8 px-2" : "pl-6 pt-8 pb-8",
          )}
        >
          {collapsed
            ? (
              <img
                src={kortexBrain}
                alt="KORTEX"
                className="h-8 w-8 object-contain mix-blend-screen filter brightness-125 drop-shadow-[0_0_10px_rgba(139,92,246,0.5)]"
              />
            )
            : (
              <img
                src="/kortex-logo-transparent.png"
                alt="KORTEX"
                className="w-[85%] max-w-[90%] object-contain filter brightness-110"
              />
            )}
        </div>

        {/* Cockpit Link - Always visible above project */}
        <div className={cn("px-3 pt-3", collapsed && "px-2")}>
          <NavLink
            to="/dashboard"
            className={cn(
              "group relative flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] font-medium text-zinc-400 transition-all duration-150",
              "hover:bg-zinc-900/50 hover:text-zinc-100",
              "border border-white/5 hover:border-white/10",
              collapsed && "justify-center px-2",
            )}
            activeClassName="bg-zinc-800/50 text-white border-indigo-500/30"
          >
            <LayoutDashboard className="h-4 w-4 shrink-0 text-zinc-500 stroke-[1.5px] group-hover:text-zinc-300 transition-colors" />
            {!collapsed && <span>Cockpit</span>}
          </NavLink>
        </div>

        {currentProject && (
          <div className={cn("px-3 pb-3 pt-2", collapsed && "px-2")}>
            <Button
              variant="ghost"
              onClick={handleBackToProjects}
              className={cn(
                "w-full justify-start gap-2 text-xs bg-zinc-900/30 hover:bg-zinc-800/50 text-zinc-400 hover:text-white rounded-lg h-auto py-2.5 border border-white/5",
                collapsed && "justify-center px-2",
              )}
            >
              <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
              {!collapsed && (
                <div className="flex flex-col items-start overflow-hidden">
                  <span className="text-[9px] uppercase tracking-wider text-sidebar-foreground/60">
                    Projet
                  </span>
                  <span className="font-medium truncate max-w-[160px]">
                    {currentProject.name}
                  </span>
                </div>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-4">
        {navSections.map((section) => (
          <div key={section.title}>
            {!collapsed && (
              <div className="mb-1.5 px-3 flex items-center gap-2">
                {section.phase > 0 && (
                  <span
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded text-[9px] font-bold",
                      section.bgColor,
                      section.color,
                    )}
                  >
                    {section.phase}
                  </span>
                )}
                <span className="text-[9px] uppercase tracking-widest font-semibold text-zinc-600">
                  {section.title}
                </span>
              </div>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                // Map items to data-tour attributes
                const tourAttribute = item.url === "/radar/scan"
                  ? "sidebar-radar"
                  : item.url === "/radar/prospects"
                  ? "sidebar-prospects"
                  : item.url === "/radar/outreach"
                  ? "sidebar-sequences"
                  : item.url === "/radar/rdv"
                  ? "sidebar-rdv"
                  : undefined;

                return (
                  <NavLink
                    key={item.title}
                    to={item.url}
                    data-tour={tourAttribute}
                    className={cn(
                      "group relative flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium text-zinc-400 transition-all duration-150",
                      "hover:bg-zinc-900/50 hover:text-zinc-200",
                      collapsed && "justify-center px-2",
                    )}
                    activeClassName="bg-zinc-800/50 text-white before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-5 before:w-[3px] before:rounded-r-full before:bg-indigo-500"
                  >
                    {item.icon && (
                      <item.icon
                        className={cn(
                          "h-4 w-4 shrink-0 transition-colors stroke-[1.5px]",
                          "text-zinc-500 group-hover:text-zinc-300",
                          // ACTIVE STATE HIGHLIGHT
                          item.url === window.location.pathname &&
                            "text-indigo-400",
                          item.url === "/radar/scan" &&
                            (isScanning || isExecuting) &&
                            "animate-spin text-indigo-500",
                        )}
                      />
                    )}
                    {!collapsed && <span>{item.title}</span>}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-sidebar-border p-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "w-full justify-center rounded-md text-sidebar-foreground/60 hover:text-white hover:bg-sidebar-accent",
            !collapsed && "justify-start gap-2",
          )}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span className="text-xs">Réduire</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
