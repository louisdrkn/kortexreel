import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const statusMessages = [
  "Analyse de 3 profils LinkedIn en cours...",
  "Enrichissement des données TechCorp...",
  "Génération d'email personnalisé...",
  "Mise à jour du pipeline...",
  "Détection de signaux d'achat...",
];

export function StatusBar() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % statusMessages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-10 flex items-center px-4 rounded-lg bg-[#131316] border border-white/[0.05]">
      <div className="flex items-center gap-3">
        {/* Status Indicator */}
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cockpit-success opacity-60"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cockpit-success"></span>
          </span>
          <span className="text-xs text-cockpit-success">Kortex est actif</span>
        </div>

        <span className="text-white/20">|</span>

        {/* Dynamic Message */}
        <AnimatePresence mode="wait">
          <motion.span
            key={messageIndex}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.3 }}
            className="text-xs text-[#888]"
          >
            {statusMessages[messageIndex]}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
}
