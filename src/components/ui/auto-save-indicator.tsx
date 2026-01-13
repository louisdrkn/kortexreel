import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Check, Cloud, AlertCircle, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { SaveStatus } from "@/hooks/useAutoSave";

interface AutoSaveIndicatorProps {
  status: SaveStatus;
  lastSavedAt?: Date | null;
  className?: string;
}

const statusConfig: Record<SaveStatus, {
  icon: React.ReactNode;
  label: string;
  color: string;
}> = {
  idle: {
    icon: <Cloud className="h-3.5 w-3.5" />,
    label: "",
    color: "text-muted-foreground",
  },
  saving: {
    icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
    label: "Sauvegarde...",
    color: "text-amber-500",
  },
  saved: {
    icon: <Check className="h-3.5 w-3.5" />,
    label: "Enregistré",
    color: "text-emerald-500",
  },
  synced: {
    icon: <Cloud className="h-3.5 w-3.5" />,
    label: "Synchronisé",
    color: "text-emerald-500",
  },
  error: {
    icon: <AlertCircle className="h-3.5 w-3.5" />,
    label: "Erreur",
    color: "text-destructive",
  },
  restored: {
    icon: <RotateCcw className="h-3.5 w-3.5" />,
    label: "Brouillon restauré",
    color: "text-blue-500",
  },
};

export function AutoSaveIndicator({ status, lastSavedAt, className }: AutoSaveIndicatorProps) {
  const config = statusConfig[status];
  
  // Don't show anything when idle and no saved time
  if (status === "idle" && !lastSavedAt) {
    return null;
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={status}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 4 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "flex items-center gap-1.5 text-xs font-medium transition-colors",
          config.color,
          className
        )}
      >
        {config.icon}
        <span>{config.label}</span>
        {status === "synced" && lastSavedAt && (
          <span className="text-muted-foreground ml-1">
            à {formatTime(lastSavedAt)}
          </span>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
