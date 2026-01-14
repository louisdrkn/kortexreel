import { AnimatePresence, motion } from "framer-motion";
import { Check, Search, X } from "lucide-react";
import { CompanyCard } from "./CompanyCard";
import { GlitchCard } from "./visuals/GlitchCard";
import { Company } from "./types";
import { Button } from "@/components/ui/button";

interface CompanyGridProps {
  companies: Company[];
  isLoading: boolean;
  onCompanyClick: (company: Company) => void;
  onRevealContact?: (company: Company) => Promise<unknown>;
  isScanning?: boolean;
  onExclude?: (company: Company) => void;
  onValidate?: (company: Company) => void;
  newlyAddedIds?: Set<string>;
}

// Dark/Sci-fi Loading Skeleton
function LoadingSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="rounded-xl bg-slate-900/50 border border-slate-800 shadow-sm overflow-hidden h-64 relative"
        >
          <div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-800/30 to-transparent animate-shimmer"
            style={{ backgroundSize: "200% 100%" }}
          />
          <div className="p-4 space-y-4">
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-lg bg-slate-800/50" />
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-slate-800/50 rounded w-3/4" />
                <div className="h-3 bg-slate-800/30 rounded w-1/2" />
              </div>
            </div>
            <div className="h-20 bg-slate-800/30 rounded-lg" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export function CompanyGrid({
  companies,
  isLoading,
  onCompanyClick,
  onRevealContact,
  isScanning,
  onExclude,
  onValidate,
  newlyAddedIds = new Set(),
}: CompanyGridProps) {
  // AUDIT: Render Check
  console.log("GRID_RENDER_CHECK:", companies.length);

  // Loading state
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  // Empty state - We render nothing or a subtle message, as the Radar takes center stage
  if (companies.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-10"
      >
        <div className="p-4 border-2 border-dashed border-slate-700/50 rounded-xl text-center text-slate-400 mb-4 bg-slate-900/50">
          <p className="font-mono text-xs">
            🛑 AUDIO DEBUG: LISTE VIDE DÉTECTÉE
          </p>
          <p className="text-[10px] text-slate-500 mt-1">
            Si le backend a renvoyé des résultats, ils ne sont pas arrivés
            jusqu'ici.
          </p>
        </div>
        {!isScanning && (
          <p className="text-slate-600 font-mono text-xs tracking-widest uppercase opacity-50">
            // Aucun signal détecté
          </p>
        )}
      </motion.div>
    );
  }

  // Companies grid with GlitchCard animation
  return (
    <div className="space-y-4 w-full">
      {/* 🛑 RAW DEBUG: BYPASSING ANIMATIONS */}
      <div className="p-4 bg-red-900/80 border-2 border-red-500 text-white font-bold text-center rounded-lg shadow-lg z-50 relative">
        🚨 VISUAL DEBUGGER ACTIVE <br />
        CARDS DETECTED: {companies.length} <br />
        IS LOADING: {isLoading ? "YES" : "NO"}
      </div>

      {companies.length === 0 && (
        <div className="p-8 border-2 border-dashed border-slate-700 rounded-xl text-center text-slate-400">
          DEBUG: LISTE VIDE DÉTECTÉE (MAIS LE COMPOSANT S'AFFICHE)
        </div>
      )}

      <motion.div
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        initial="visible" // Force visible to skip fancy staggering if needed
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: {
              staggerChildren: 0.1,
            },
          },
        }}
      >
        <AnimatePresence mode="popLayout">
          {companies.map((company, index) => (
            <motion.div key={company.id || index} layout>
              {/* If it's newly added, use GlitchCard, otherwise just show it (or use GlitchCard without delay) */}
              <GlitchCard delay={index * 0.1}>
                <div className="relative group">
                  <CompanyCard
                    company={company}
                    onClick={onCompanyClick}
                    onRevealContact={onRevealContact}
                    index={index}
                  />

                  {/* Quick Actions Overlay */}
                  {(onExclude || onValidate) && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      whileHover={{ opacity: 1 }}
                      className="absolute bottom-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20"
                    >
                      {onValidate && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            onValidate(company);
                          }}
                          className="h-8 w-8 p-0 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 hover:text-emerald-300 border border-emerald-500/30"
                          title="Valider"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      {onExclude && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            onExclude(company);
                          }}
                          className="h-8 w-8 p-0 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 border border-red-500/30"
                          title="Exclure"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </motion.div>
                  )}
                </div>
              </GlitchCard>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
