import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { CompanyCard } from "./CompanyCard";
import { useEffect, useState } from "react";
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
  analyzingCompanyId?: string | null;
}

const INITIAL_VISIBLE_COUNT = 50;
const LOAD_MORE_INCREMENT = 50;

export function CompanyGrid({
  companies,
  isLoading,
  onCompanyClick,
  onRevealContact,
  isScanning,
  onExclude,
  onValidate,
  newlyAddedIds = new Set(),
  analyzingCompanyId = null,
}: CompanyGridProps) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);

  // Reset visible count when companies list changes completely (new search)
  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE_COUNT);
  }, [companies.length]); // Use length as proxy for reset, or maybe deep compare if needed but length is fine for "load more" reset usually

  const visibleCompanies = companies.slice(0, visibleCount);
  const hasMore = visibleCount < companies.length;

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + LOAD_MORE_INCREMENT);
  };

  // AUDIT: Render Check
  console.log("GRID_RENDER_CHECK:", companies.length, "Visible:", visibleCount);

  return (
    <div className="space-y-8 w-full">
      {/* Grid */}
      <motion.div
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: {
              staggerChildren: 0.05, // Faster stagger for large lists
              delayChildren: 0.1,
            },
          },
        }}
      >
        <AnimatePresence mode="popLayout">
          {visibleCompanies.map((company, index) => (
            <motion.div
              key={company.id || index}
              layout
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 },
              }}
            >
              {/* If it's newly added, use GlitchCard, otherwise just show it (or use GlitchCard without delay) */}
              <div className="relative group">
                <CompanyCard
                  company={company}
                  onClick={onCompanyClick}
                  onRevealContact={onRevealContact}
                  index={index}
                  isAnalyzing={analyzingCompanyId === company.id}
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
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Load More Button */}
      {hasMore && (
        <div className="flex justify-center pt-8 pb-12">
          <Button
            onClick={handleLoadMore}
            variant="outline"
            className="gap-2 min-w-[200px] border-primary/20 hover:bg-primary/5 text-primary"
          >
            <ChevronDown className="h-4 w-4" />
            Voir{" "}
            {Math.min(LOAD_MORE_INCREMENT, companies.length - visibleCount)}
            {" "}
            de plus ({companies.length - visibleCount} restants)
          </Button>
        </div>
      )}
    </div>
  );
}
