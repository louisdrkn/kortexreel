import { useState } from "react";
import { motion } from "framer-motion";
import { Power, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface KillSwitchProps {
  projectName?: string;
  onToggle?: (isActive: boolean) => void;
}

export function KillSwitch({ projectName = "Ce compte", onToggle }: KillSwitchProps) {
  const [isActive, setIsActive] = useState(true);

  const handleToggle = () => {
    const newState = !isActive;
    setIsActive(newState);
    onToggle?.(newState);
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={handleToggle}
          className={cn(
            "relative flex items-center gap-2 px-3 py-2 rounded-full",
            "transition-all duration-500",
            isActive
              ? "bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20"
              : "bg-red-500/10 border border-red-500/30 hover:bg-red-500/20"
          )}
        >
          {/* The Switch Track */}
          <div className={cn(
            "relative w-10 h-5 rounded-full transition-colors duration-300",
            isActive ? "bg-emerald-500/30" : "bg-red-500/30"
          )}>
            {/* The Knob */}
            <motion.div
              animate={{ x: isActive ? 20 : 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className={cn(
                "absolute top-0.5 left-0.5 w-4 h-4 rounded-full flex items-center justify-center",
                isActive 
                  ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" 
                  : "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"
              )}
            >
              {isActive ? (
                <Zap className="h-2.5 w-2.5 text-white" />
              ) : (
                <Power className="h-2.5 w-2.5 text-white" />
              )}
            </motion.div>
          </div>

          {/* Status Text */}
          <span className={cn(
            "text-xs font-medium transition-colors duration-300",
            isActive ? "text-emerald-400" : "text-red-400"
          )}>
            {isActive ? "ON" : "OFF"}
          </span>

          {/* Pulse Animation when Active */}
          {isActive && (
            <motion.div
              initial={{ scale: 1, opacity: 0.5 }}
              animate={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="absolute inset-0 rounded-full border border-emerald-500/50"
            />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent 
        side="bottom" 
        className="bg-[#0a0a0f]/95 backdrop-blur-xl border border-white/10 text-white"
      >
        <div className="text-xs">
          <p className="font-medium">
            {isActive ? "Cerveau IA Actif" : "Cerveau IA en Stase"}
          </p>
          <p className="text-white/60 mt-1">
            {isActive 
              ? `L'IA analyse et propose des actions pour ${projectName}`
              : "Aucune donnée n'est traitée. Mode sécurisé."
            }
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
