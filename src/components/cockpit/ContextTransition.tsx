import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ContextTransitionProps {
  isTransitioning: boolean;
  fromProject?: string;
  toProject?: string;
  currentStep: "unloading" | "loading" | "applying" | "ready";
}

export function ContextTransition({ 
  isTransitioning, 
  fromProject, 
  toProject,
  currentStep 
}: ContextTransitionProps) {
  if (!isTransitioning) return null;

  const steps = {
    unloading: {
      message: `Déchargement du contexte ${fromProject || "précédent"}...`,
      progress: 30,
      color: "text-orange-400",
    },
    loading: {
      message: `Chargement des données ${toProject || ""}...`,
      progress: 60,
      color: "text-blue-400",
    },
    applying: {
      message: "Application des règles métier...",
      progress: 90,
      color: "text-violet-400",
    },
    ready: {
      message: "Contexte prêt",
      progress: 100,
      color: "text-emerald-400",
    },
  };

  const current = steps[currentStep];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center"
    >
      {/* Blur Overlay */}
      <div className="absolute inset-0 bg-[#09090B]/80 backdrop-blur-md" />
      
      {/* Content */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative z-10 text-center"
      >
        {/* Brain Animation */}
        <motion.div
          animate={{ 
            rotate: [0, 360],
            scale: [1, 1.1, 1],
          }}
          transition={{ 
            rotate: { duration: 2, repeat: Infinity, ease: "linear" },
            scale: { duration: 1, repeat: Infinity, ease: "easeInOut" }
          }}
          className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-violet-500/30 to-indigo-600/30 border border-violet-500/30 flex items-center justify-center"
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500/50 to-indigo-600/50 flex items-center justify-center">
            <div className="w-6 h-6 rounded-full bg-violet-500 shadow-[0_0_20px_rgba(139,92,246,0.5)]" />
          </div>
        </motion.div>

        {/* Status Message */}
        <p className={cn("text-lg font-medium mb-4", current.color)}>
          {current.message}
        </p>

        {/* Progress Bar */}
        <div className="w-64 h-1.5 bg-white/10 rounded-full mx-auto overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${current.progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full"
          />
        </div>

        {/* Sub-text */}
        <p className="text-xs text-white/40 mt-4">
          Cloisonnement des données en cours...
        </p>
      </motion.div>
    </motion.div>
  );
}
