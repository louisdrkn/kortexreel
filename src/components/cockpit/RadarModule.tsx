import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

interface Lead {
  id: string;
  company: string;
  score: number;
  signal: string;
}

const mockLeads: Lead[] = [
  {
    id: "1",
    company: "TechCorp Solutions",
    score: 94,
    signal: "Recrutement actif",
  },
  { id: "2", company: "InnovateSAS", score: 87, signal: "Levée de fonds" },
  { id: "3", company: "DataFlow Industries", score: 82, signal: "Nouveau DG" },
  { id: "4", company: "CloudNine Tech", score: 78, signal: "Expansion" },
  { id: "5", company: "Nexus Digital", score: 71, signal: "Recrutement actif" },
];

import { useKortexMemory } from "@/hooks/useKortexMemory";
import { useAuth } from "@/contexts/AuthContext"; // Assuming AuthContext exists

export function RadarModule() {
  const navigate = useNavigate();
  const { session } = useAuth(); // Get user ID for cloud sync

  // Dual-Layer Memory (Local + Cloud)
  const [visibleLeads, setVisibleLeads] = useKortexMemory<Lead[]>(
    "KORTEX_RADAR_CACHE",
    [],
    session?.user?.id,
  );

  // 3. CLEAN UP (Reset)
  const clearCache = () => {
    localStorage.removeItem("KORTEX_RADAR_CACHE");
    setVisibleLeads([]);
    window.location.reload();
  };

  // Reveal leads progressively with fade (ONLY IF NO CACHE)
  useEffect(() => {
    // Si on a des données en mémoire (Local ou Restored Cloud), on ne joue pas l'animation fake
    if (visibleLeads.length > 0) {
      return;
    }

    const timers: NodeJS.Timeout[] = [];
    mockLeads.forEach((lead, index) => {
      const timer = setTimeout(() => {
        setVisibleLeads((prev) => [...prev, lead]);
      }, 600 + index * 400);
      timers.push(timer);
    });
    return () => timers.forEach(clearTimeout);
  }, []); // Run once on mount, but logic inside checks visibleLeads state

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-medium text-white">Radar de Chasse</h3>
          <p className="text-xs text-[#888] mt-0.5">Prospects qualifiés</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cockpit-success opacity-60">
            </span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cockpit-success">
            </span>
          </span>
          <span className="text-[10px] text-cockpit-success uppercase tracking-wider">
            Live
          </span>
        </div>
      </div>

      {/* Reset Button (Demo Mode) */}
      <div className="px-1 mb-2">
        <button
          onClick={clearCache}
          className="text-[10px] text-gray-500 underline hover:text-red-500 transition-colors"
        >
          🗑️ Réinitialiser (Nouvelle Démo)
        </button>
      </div>

      {/* Feed List */}
      <div className="flex-1 space-y-3 overflow-y-auto">
        <AnimatePresence>
          {visibleLeads.map((lead) => (
            <motion.div
              key={lead.id}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
              onClick={() => navigate("/radar/scan")}
              className="group p-4 rounded-lg bg-white/[0.02] border border-transparent cursor-pointer transition-all duration-500 ease-out hover:bg-white/[0.04] hover:border-white/[0.08]"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {/* Status Dot */}
                  <div className="relative">
                    <div className="w-2 h-2 rounded-full bg-cockpit-success" />
                    <motion.div
                      className="absolute inset-0 w-2 h-2 rounded-full bg-cockpit-success"
                      animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
                      transition={{
                        duration: 2.5,
                        repeat: Infinity,
                        ease: "easeOut",
                      }}
                    />
                  </div>

                  {/* Company Info */}
                  <div>
                    <p className="text-sm font-medium text-white">
                      {lead.company}
                    </p>
                    <p className="text-xs text-[#888] mt-0.5">{lead.signal}</p>
                  </div>
                </div>

                {/* Score Badge */}
                <span className="text-xs text-[#888] bg-white/[0.05] px-2 py-1 rounded">
                  {lead.score}%
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* View All Link */}
      <button
        onClick={() => navigate("/radar/scan")}
        className="mt-4 text-xs text-cockpit-violet hover:text-cockpit-violet/80 transition-colors duration-300"
      >
        Voir tous les prospects →
      </button>
    </div>
  );
}
