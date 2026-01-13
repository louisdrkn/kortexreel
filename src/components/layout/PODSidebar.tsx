import { Brain, Users, MessageSquare, Phone, FileText, Download, ChevronLeft, ChevronRight, FolderOpen, ArrowLeft, Settings2, Target, Radar, LayoutDashboard, UserCog } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProject } from "@/contexts/ProjectContext";
import kortexBrain from "@/assets/kortex-brain.png";
import kortexText from "@/assets/kortex-text.png";

const navSections = [{
  title: "Stratégie & ADN",
  phase: 1,
  color: "text-emerald-500",
  bgColor: "bg-emerald-500/10",
  items: [{
    title: "Cerveau Agence",
    url: "/strategie/cerveau",
    icon: Brain
  }, {
    title: "Définition Cible",
    url: "/strategie/cible",
    icon: Target
  }]
}, {
  title: "Radar & Conquête",
  phase: 2,
  color: "text-amber-500",
  bgColor: "bg-amber-500/10",
  items: [{
    title: "Radar Marché",
    url: "/radar/scan",
    icon: Radar
  }, {
    title: "Fiche Prospect",
    url: "/radar/prospects",
    icon: Users
  }, {
    title: "Séquence Approche",
    url: "/radar/outreach",
    icon: MessageSquare
  }, {
    title: "Capture RDV",
    url: "/radar/rdv",
    icon: Phone
  }]
}, {
  title: "Closing",
  phase: 3,
  color: "text-rose-500",
  bgColor: "bg-rose-500/10",
  items: [{
    title: "Générateur Propale",
    url: "/closing/propale",
    icon: FileText
  }, {
    title: "Export",
    url: "/closing/export",
    icon: Download
  }]
}, {
  title: "Réglages",
  phase: 0,
  color: "text-muted-foreground",
  bgColor: "bg-muted",
  items: [{
    title: "Documents",
    url: "/data-room",
    icon: FolderOpen
  }, {
    title: "Intégrations",
    url: "/settings/integrations",
    icon: Settings2
  }, {
    title: "Paramètres",
    url: "/settings",
    icon: UserCog
  }]
}];

export function PODSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const {
    currentProject,
    setCurrentProject
  } = useProject();
  const handleBackToProjects = () => {
    setCurrentProject(null);
    navigate("/");
  };
  return <aside className={cn("flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300 ease-out", collapsed ? "w-[72px]" : "w-[260px]")}>
      {/* Logo & Project */}
      <div className="flex flex-col border-b border-sidebar-border">
        {/* Premium Brand Block */}
        <div className={cn("flex justify-center items-center bg-slate-950", collapsed ? "py-4 px-2" : "py-6 px-4")}>
          {collapsed ? <img src={kortexBrain} alt="KORTEX" className="h-8 w-8 object-contain" /> : <img src={kortexText} alt="KORTEX" className="w-11/12 h-auto object-contain border-2 border-primary" />}
        </div>
        
        {/* Cockpit Link - Always visible above project */}
        <div className={cn("px-3 pt-3", collapsed && "px-2")}>
          <NavLink 
            to="/dashboard" 
            className={cn(
              "group relative flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] font-semibold text-sidebar-foreground transition-all duration-150",
              "bg-gradient-to-r from-primary/10 to-transparent hover:from-primary/20",
              "border border-primary/20 hover:border-primary/40",
              collapsed && "justify-center px-2"
            )} 
            activeClassName="from-primary/20 border-primary/50 text-primary"
          >
            <LayoutDashboard className="h-4 w-4 shrink-0 text-primary" />
            {!collapsed && <span>Cockpit</span>}
          </NavLink>
        </div>
        
        {currentProject && <div className={cn("px-3 pb-3 pt-2", collapsed && "px-2")}>
            <Button variant="ghost" onClick={handleBackToProjects} className={cn("w-full justify-start gap-2 text-xs bg-sidebar-accent/50 hover:bg-sidebar-accent text-sidebar-accent-foreground rounded-lg h-auto py-2.5", collapsed && "justify-center px-2")}>
              <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
              {!collapsed && <div className="flex flex-col items-start overflow-hidden">
                  <span className="text-[9px] uppercase tracking-wider text-sidebar-foreground/60">Projet</span>
                  <span className="font-medium truncate max-w-[160px]">{currentProject.name}</span>
                </div>}
            </Button>
          </div>}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-4">
        {navSections.map(section => <div key={section.title}>
            {!collapsed && <div className="mb-1.5 px-3 flex items-center gap-2">
                {section.phase > 0 && <span className={cn("flex h-4 w-4 items-center justify-center rounded text-[9px] font-bold", section.bgColor, section.color)}>
                    {section.phase}
                  </span>}
                <span className="text-[9px] uppercase tracking-widest font-semibold text-sidebar-foreground/60">
                  {section.title}
                </span>
              </div>}
            <div className="space-y-0.5">
              {section.items.map(item => {
                // Map items to data-tour attributes
                const tourAttribute = item.url === '/radar/scan' ? 'sidebar-radar'
                  : item.url === '/radar/prospects' ? 'sidebar-prospects'
                  : item.url === '/radar/outreach' ? 'sidebar-sequences'
                  : item.url === '/radar/rdv' ? 'sidebar-rdv'
                  : undefined;

                return (
                  <NavLink 
                    key={item.title} 
                    to={item.url} 
                    data-tour={tourAttribute}
                    className={cn("group relative flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium text-sidebar-foreground transition-all duration-150", "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground", collapsed && "justify-center px-2")} 
                    activeClassName="bg-sidebar-accent text-sidebar-accent-foreground before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-5 before:w-[3px] before:rounded-r-full before:bg-primary"
                  >
                    {item.icon && (
                      <item.icon className={cn("h-4 w-4 shrink-0 transition-colors", "group-hover:text-sidebar-accent-foreground")} />
                    )}
                    {!collapsed && <span>{item.title}</span>}
                  </NavLink>
                );
              })}
            </div>
          </div>)}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-sidebar-border p-2">
        <Button variant="ghost" size="sm" onClick={() => setCollapsed(!collapsed)} className={cn("w-full justify-center rounded-md text-sidebar-foreground/60 hover:text-white hover:bg-sidebar-accent", !collapsed && "justify-start gap-2")}>
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <>
              <ChevronLeft className="h-4 w-4" />
              <span className="text-xs">Réduire</span>
            </>}
        </Button>
      </div>
    </aside>;
}