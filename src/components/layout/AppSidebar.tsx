import {
  ChevronLeft,
  ChevronRight,
  FileText,
  HeadphonesIcon,
  History,
  LayoutDashboard,
  LogOut,
  Mail,
  Settings,
  User,
  Zap,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import kortexLogo from "@/assets/kortex-logo-transparent.png";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Nouvelle Propale", url: "/generate", icon: Zap },
  { title: "Générateur d'Emails", url: "/emails", icon: Mail },
  { title: "Historique", url: "/history", icon: History },
  { title: "Configuration", url: "/config", icon: Settings },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, signOut, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const handleLogoClick = () => {
    if (!user) {
      navigate("/auth");
    }
  };

  // Smart Logo Component
  const SmartLogo = () => {
    const logoElement = (
      <div className="relative flex justify-center items-center w-full">
        <img
          src={kortexLogo}
          alt="KORTEX"
          className={cn(
            "object-contain transition-all duration-300",
            "brightness-125 drop-shadow-[0_0_8px_rgba(99,102,241,0.3)]",
            collapsed ? "h-8 w-8" : "w-full h-auto px-2",
            !user && "cursor-pointer",
            user && "cursor-pointer",
          )}
        />
        {/* Active session indicator dot */}
        {user && !isLoading && (
          <span
            className={cn(
              "absolute -bottom-1 right-2 h-2.5 w-2.5 rounded-full bg-emerald-500",
              "ring-2 ring-[hsl(222,47%,11%)]",
              "animate-pulse",
              collapsed && "right-0",
            )}
          />
        )}
      </div>
    );

    // Guest state - simple click to login
    if (!user) {
      return (
        <button
          onClick={handleLogoClick}
          className="group focus:outline-none w-full flex justify-center"
          title="Se connecter"
        >
          {logoElement}
        </button>
      );
    }

    // Logged in state - dropdown menu
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="group focus:outline-none w-full flex justify-center">
            {logoElement}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          side="bottom"
          sideOffset={8}
          className={cn(
            "w-56 rounded-xl p-2",
            "bg-slate-900/95 backdrop-blur-xl border border-white/10",
            "shadow-xl shadow-black/20",
          )}
        >
          <DropdownMenuLabel className="px-2 py-1.5">
            <p className="text-xs text-muted-foreground truncate">
              {user.email}
            </p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-white/10" />
          <DropdownMenuItem
            onClick={() => navigate("/settings")}
            className={cn(
              "flex items-center gap-2 rounded-lg px-2 py-2 cursor-pointer",
              "text-white/90 hover:text-white",
              "hover:bg-white/10 focus:bg-white/10",
            )}
          >
            <User className="h-4 w-4" />
            <span>Mon Compte</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => window.open("mailto:support@kortex.ai", "_blank")}
            className={cn(
              "flex items-center gap-2 rounded-lg px-2 py-2 cursor-pointer",
              "text-white/90 hover:text-white",
              "hover:bg-white/10 focus:bg-white/10",
            )}
          >
            <HeadphonesIcon className="h-4 w-4" />
            <span>Support</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-white/10" />
          <DropdownMenuItem
            onClick={handleSignOut}
            className={cn(
              "flex items-center gap-2 rounded-lg px-2 py-2 cursor-pointer",
              "text-red-400 hover:text-red-300",
              "hover:bg-red-500/10 focus:bg-red-500/10",
            )}
          >
            <LogOut className="h-4 w-4" />
            <span>Déconnexion</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-white/5 bg-slate-900/60 backdrop-blur-xl transition-all duration-300 ease-out",
        collapsed ? "w-[72px]" : "w-[260px]",
      )}
    >
      {/* Smart Logo - Compact & Wide */}
      <div
        className={cn(
          "flex items-center justify-center w-full py-6",
          collapsed ? "px-3" : "px-4",
        )}
      >
        <SmartLogo />
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2 p-3">
        <div
          className={cn(
            "mb-3 px-3 py-2 transition-opacity duration-300",
            collapsed ? "hidden opacity-0" : "block opacity-100",
          )}
        >
          <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/60">
            Navigation
          </span>
        </div>
        {navItems.map((item) => (
          <NavLink
            key={item.title}
            to={item.url}
            end={item.url === "/"}
            className={cn(
              "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-300 ease-out",
              // Default State
              "text-muted-foreground hover:text-white hover:bg-white/5",
              // Hover Animation
              "hover:translate-x-1",
              collapsed && "justify-center px-2",
            )}
            activeClassName="bg-gradient-to-r from-primary/20 to-transparent text-white"
          >
            {({ isActive }) => (
              <>
                {/* Active Laser Indicator */}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 h-full w-[3px] bg-primary shadow-[0_0_12px_var(--primary)] rounded-r-full" />
                )}

                <item.icon
                  className={cn(
                    "h-[18px] w-[18px] shrink-0 transition-all duration-300",
                    isActive
                      ? "text-primary drop-shadow-[0_0_8px_rgba(var(--primary),0.5)]"
                      : "text-muted-foreground/70 group-hover:text-white",
                  )}
                />
                {!collapsed && <span>{item.title}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-white/5 p-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "w-full justify-center rounded-xl text-muted-foreground hover:text-white hover:bg-white/5 transition-all duration-300",
            !collapsed && "justify-start gap-2",
          )}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span className="text-sm">Réduire</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
