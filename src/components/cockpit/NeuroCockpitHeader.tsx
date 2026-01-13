import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { ContextSwitcher } from "./ContextSwitcher";
import { KillSwitch } from "./KillSwitch";
import { 
  User, 
  Settings, 
  LogOut, 
  HelpCircle,
  ChevronDown
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import kortexLogo from "@/assets/kortex-logo.png";

interface NeuroCockpitHeaderProps {
  onContextTransition?: () => void;
}

export function NeuroCockpitHeader({ onContextTransition }: NeuroCockpitHeaderProps) {
  const { user, signOut } = useAuth();
  const { currentProject } = useProject();

  const userInitials = user?.email 
    ? user.email.slice(0, 2).toUpperCase() 
    : "??";

  return (
    <header className="sticky top-0 z-50 w-full">
      {/* Glassmorphism Background */}
      <div className="absolute inset-0 bg-[#09090B]/80 backdrop-blur-xl border-b border-white/[0.05]" />
      
      <div className="relative max-w-[1600px] mx-auto px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Left Zone - Logo + Context Switcher */}
          <div className="flex items-center gap-6">
            {/* Kortex Logo */}
            <div className="flex items-center gap-2">
              <img 
                src={kortexLogo} 
                alt="Kortex" 
                className="h-8 w-auto"
              />
            </div>

            {/* Divider */}
            <div className="h-6 w-px bg-white/10" />

            {/* Context Switcher */}
            <ContextSwitcher onContextChange={onContextTransition} />
          </div>

          {/* Right Zone - Kill Switch + Profile */}
          <div className="flex items-center gap-4">
            {/* Kill Switch */}
            <KillSwitch projectName={currentProject?.name} />

            {/* Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={cn(
                  "flex items-center gap-2 p-1.5 rounded-full",
                  "bg-white/5 border border-white/10",
                  "hover:bg-white/10 hover:border-violet-500/30",
                  "hover:shadow-[0_0_15px_rgba(139,92,246,0.2)]",
                  "transition-all duration-300"
                )}>
                  {/* Avatar Circle */}
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center",
                    "bg-gradient-to-br from-violet-500/40 to-indigo-600/40",
                    "border border-violet-500/30 text-white text-xs font-semibold"
                  )}>
                    {userInitials}
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-white/50 mr-1" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="w-56 bg-[#0a0a0f]/95 backdrop-blur-xl border border-white/10 text-white"
              >
                <DropdownMenuLabel className="text-xs text-white/50 font-normal">
                  {user?.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem className="text-white/80 hover:text-white hover:bg-white/5 cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  Mon Compte
                </DropdownMenuItem>
                <DropdownMenuItem className="text-white/80 hover:text-white hover:bg-white/5 cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Réglages
                </DropdownMenuItem>
                <DropdownMenuItem className="text-white/80 hover:text-white hover:bg-white/5 cursor-pointer">
                  <HelpCircle className="mr-2 h-4 w-4" />
                  Support
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem 
                  onClick={() => signOut()}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Déconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
