import { motion, AnimatePresence } from 'framer-motion';
import { Radar, Search, X, Check } from 'lucide-react';
import { CompanyCard } from './CompanyCard';
import { ScanInAnimation } from './ScanInAnimation';
import { Company } from './types';
import { Button } from '@/components/ui/button';

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

// Elegant radar scanner animation
function RadarScanner() {
  return (
    <div className="relative w-48 h-48">
      {/* Concentric circles */}
      {[1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className="absolute inset-0 rounded-full border border-violet-200"
          style={{ transform: `scale(${0.33 * i})` }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
        />
      ))}
      
      {/* Scanning beam */}
      <motion.div
        className="absolute inset-0"
        animate={{ rotate: 360 }}
        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
      >
        <div 
          className="absolute top-1/2 left-1/2 w-1/2 h-0.5 rounded-full"
          style={{
            transformOrigin: 'left center',
            background: 'linear-gradient(90deg, rgba(124, 58, 237, 0.6), transparent)',
          }}
        />
      </motion.div>
      
      {/* Center icon */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center">
          <Radar className="h-6 w-6 text-violet-600" />
        </div>
      </div>
    </div>
  );
}

// Loading skeleton with light theme
function LoadingSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[...Array(6)].map((_, i) => (
        <motion.div 
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="rounded-xl bg-white border border-slate-100 shadow-sm overflow-hidden"
        >
          {/* Header skeleton */}
          <div className="bg-slate-50 border-b border-slate-100 p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-slate-200 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-200 rounded w-3/4 animate-pulse" />
                <div className="h-3 bg-slate-100 rounded w-1/2 animate-pulse" />
              </div>
              <div className="w-12 h-10 rounded-lg bg-slate-200 animate-pulse" />
            </div>
          </div>
          {/* Content skeleton */}
          <div className="p-4 space-y-3">
            <div className="h-5 bg-slate-100 rounded-full w-20 animate-pulse" />
            <div className="flex gap-2">
              <div className="h-5 bg-slate-100 rounded-full w-24 animate-pulse" />
              <div className="h-5 bg-slate-100 rounded-full w-20 animate-pulse" />
            </div>
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
  newlyAddedIds = new Set()
}: CompanyGridProps) {
  // Loading state
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  // Empty state
  if (companies.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-20 px-6 text-center"
      >
        {isScanning ? (
          <>
            <RadarScanner />
            <motion.p 
              className="mt-8 text-slate-500 font-medium"
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              Recherche en cours...
            </motion.p>
          </>
        ) : (
          <>
            <motion.div 
              className="relative mb-6"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {/* Pulsing ring */}
              <motion.div 
                className="absolute inset-0 flex items-center justify-center"
                animate={{ scale: [1, 1.2], opacity: [0.5, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <div className="w-24 h-24 rounded-full border-2 border-violet-200" />
              </motion.div>
              
              {/* Center icon */}
              <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-white border border-slate-200 shadow-lg shadow-slate-200/50">
                <Search className="h-10 w-10 text-slate-300" />
              </div>
            </motion.div>
            
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              Prêt à explorer
            </h3>
            <p className="text-slate-500 max-w-md">
              Cliquez sur "Lancer la Découverte" pour identifier vos prochains clients.
            </p>
          </>
        )}
      </motion.div>
    );
  }

  // Companies grid with stagger animation
  return (
    <motion.div 
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: 0.05,
          },
        },
      }}
    >
      <AnimatePresence mode="popLayout">
        {companies.map((company, index) => (
          <ScanInAnimation 
            key={company.id} 
            isActive={newlyAddedIds.has(company.id)}
          >
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
                  className="absolute bottom-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {onValidate && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        onValidate(company);
                      }}
                      className="h-8 w-8 p-0 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-600 hover:text-emerald-700 shadow-sm"
                      title="Valider - L'IA cherchera plus de profils similaires"
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
                      className="h-8 w-8 p-0 rounded-full bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-600 shadow-sm"
                      title="Exclure - L'IA ajustera les préférences"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </motion.div>
              )}
            </div>
          </ScanInAnimation>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
