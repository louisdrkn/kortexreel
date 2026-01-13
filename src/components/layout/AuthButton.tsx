import { LogIn, LogOut, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function AuthButton() {
  const { user, signOut, isLoading } = useAuth();
  const navigate = useNavigate();

  // Get user initials for avatar
  const getInitials = (email: string | undefined) => {
    if (!email) return "U";
    const parts = email.split("@")[0].split(/[._-]/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  if (isLoading) {
    return (
      <div className="h-10 w-10 animate-pulse rounded-full bg-white/5 backdrop-blur-md" />
    );
  }

  // Logged out state
  if (!user) {
    return (
      <Button
        onClick={() => navigate("/auth")}
        className={cn(
          "group relative flex items-center gap-2 rounded-full px-5 py-2",
          "bg-white/5 backdrop-blur-md border border-white/10",
          "text-white font-medium",
          "transition-all duration-300 ease-out",
          "hover:bg-white/10 hover:border-violet-500/50",
          "hover:shadow-[0_0_20px_rgba(139,92,246,0.3)]"
        )}
        variant="ghost"
      >
        <LogIn className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        <span>Connexion</span>
      </Button>
    );
  }

  // Logged in state
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full",
            "bg-white/5 backdrop-blur-md border border-white/10",
            "text-white font-semibold text-sm",
            "transition-all duration-300 ease-out",
            "hover:bg-white/10 hover:border-violet-500/50",
            "hover:shadow-[0_0_20px_rgba(139,92,246,0.3)]",
            "focus:outline-none focus:ring-2 focus:ring-violet-500/50"
          )}
        >
          {getInitials(user.email)}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className={cn(
          "w-56 rounded-xl p-2",
          "bg-slate-900/95 backdrop-blur-xl border border-white/10",
          "shadow-xl shadow-black/20"
        )}
      >
        <DropdownMenuLabel className="px-2 py-1.5">
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/10" />
        <DropdownMenuItem
          onClick={() => navigate("/projects")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-2 py-2 cursor-pointer",
            "text-white/90 hover:text-white",
            "hover:bg-white/10 focus:bg-white/10"
          )}
        >
          <User className="h-4 w-4" />
          <span>Mon Espace</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleSignOut}
          className={cn(
            "flex items-center gap-2 rounded-lg px-2 py-2 cursor-pointer",
            "text-red-400 hover:text-red-300",
            "hover:bg-red-500/10 focus:bg-red-500/10"
          )}
        >
          <LogOut className="h-4 w-4" />
          <span>Déconnexion</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
