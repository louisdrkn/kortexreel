import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import kortexLogoGradient from "@/assets/kortex-logo-gradient.png";

interface GhostPilotOverlayProps {
  onComplete: () => void;
  onSkip?: () => void;
}

type Phase = "init" | "spotlight" | "complete";
type SpotlightStep = 0 | 1 | 2 | 3;

const spotlightContent = [
  {
    title: "1. L'IDENTITÉ",
    text: "Ici, on ne configure pas, on éduque. Importez vos documents et votre site web. Kortex absorbe votre ADN pour penser et écrire exactement comme vous.",
    targetSection: "strategie",
  },
  {
    title: "2. LA CHASSE",
    text: "Votre centre de commandement. L'IA scanne le marché en temps réel, identifie vos cibles et enrichit les fiches prospects automatiquement.",
    targetSection: "radar",
  },
  {
    title: "3. LA SIGNATURE",
    text: "L'objectif final. Transformez un prospect chaud en client signé. Générez des propositions commerciales ultra-personnalisées en 1 clic.",
    targetSection: "closing",
  },
];

export function GhostPilotOverlay({ onComplete, onSkip }: GhostPilotOverlayProps) {
  const [phase, setPhase] = useState<Phase>("init");
  const [spotlightStep, setSpotlightStep] = useState<SpotlightStep>(0);
  const [showToast, setShowToast] = useState(false);

  // Phase 1: Logo animation + toast
  useEffect(() => {
    const toastTimer = setTimeout(() => setShowToast(true), 500);
    const transitionTimer = setTimeout(() => {
      setPhase("spotlight");
    }, 3000);

    return () => {
      clearTimeout(toastTimer);
      clearTimeout(transitionTimer);
    };
  }, []);

  const handleNext = useCallback(() => {
    if (spotlightStep < 2) {
      setSpotlightStep((prev) => (prev + 1) as SpotlightStep);
    } else {
      setPhase("complete");
      onComplete();
    }
  }, [spotlightStep, onComplete]);

  const handleSkip = useCallback(() => {
    setPhase("complete");
    onSkip?.();
  }, [onSkip]);

  // Calculate spotlight position for sidebar sections
  const getSpotlightStyles = (step: number): React.CSSProperties => {
    // These approximate the sidebar section positions
    const positions = [
      { top: 180, height: 100 }, // Stratégie & ADN
      { top: 290, height: 150 }, // Radar & Conquête
      { top: 450, height: 90 },  // Closing
    ];
    
    return {
      top: positions[step]?.top || 0,
      height: positions[step]?.height || 100,
    };
  };

  return (
    <AnimatePresence mode="wait">
      {phase === "init" && (
        <motion.div
          key="init"
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        >
          {/* Pulsing Logo */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ 
              scale: [0.9, 1, 0.9],
              opacity: 1 
            }}
            transition={{ 
              scale: { 
                duration: 2, 
                repeat: Infinity, 
                ease: "easeInOut" 
              },
              opacity: { duration: 0.5 }
            }}
            className="relative"
          >
            <img 
              src={kortexLogoGradient} 
              alt="KORTEX" 
              className="h-24 w-auto object-contain"
            />
            {/* Glow effect */}
            <div className="absolute inset-0 blur-2xl bg-gradient-to-r from-blue-500/30 to-violet-500/30 -z-10 scale-150" />
          </motion.div>

          {/* Toast notification */}
          <AnimatePresence>
            {showToast && (
              <motion.div
                initial={{ opacity: 0, y: 20, x: 20 }}
                animate={{ opacity: 1, y: 0, x: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="fixed bottom-6 right-6 flex items-center gap-3 rounded-xl bg-emerald-500/90 backdrop-blur-sm px-4 py-3 shadow-lg shadow-emerald-500/20"
              >
                <CheckCircle2 className="h-5 w-5 text-white" />
                <span className="text-sm font-medium text-white">Connexion réussie !</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Skip button */}
          <button
            onClick={handleSkip}
            className="fixed bottom-6 left-6 text-xs text-white/40 hover:text-white/70 transition-colors"
          >
            Passer l'introduction
          </button>
        </motion.div>
      )}

      {phase === "spotlight" && (
        <motion.div
          key="spotlight"
          className="fixed inset-0 z-[9998]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Dark overlay with cutout for sidebar */}
          <div className="absolute inset-0 bg-black/85" />
          
          {/* Spotlight on sidebar section */}
          <motion.div
            className="absolute left-0 w-[260px] pointer-events-none"
            initial={false}
            animate={{
              top: getSpotlightStyles(spotlightStep).top,
              height: getSpotlightStyles(spotlightStep).height,
            }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            {/* Glowing border effect */}
            <div className="absolute inset-0 rounded-r-xl border-2 border-violet-500 shadow-[0_0_30px_rgba(139,92,246,0.5),inset_0_0_30px_rgba(139,92,246,0.1)]">
              {/* Pulsing animation */}
              <motion.div
                className="absolute inset-0 rounded-r-xl border-2 border-violet-400"
                animate={{ 
                  opacity: [0.5, 1, 0.5],
                  scale: [1, 1.02, 1]
                }}
                transition={{ 
                  duration: 1.5, 
                  repeat: Infinity, 
                  ease: "easeInOut" 
                }}
              />
            </div>
            
            {/* Hole in the overlay to show sidebar content */}
            <div 
              className="absolute inset-0 bg-transparent"
              style={{
                boxShadow: "0 0 0 9999px rgba(0,0,0,0.85)",
              }}
            />
          </motion.div>

          {/* Info card - positioned to the right of the spotlight */}
          <AnimatePresence mode="wait">
            <motion.div
              key={spotlightStep}
              className="absolute left-[280px] w-[380px]"
              style={{ 
                top: getSpotlightStyles(spotlightStep).top,
              }}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <div className="rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-white/10 p-6 shadow-2xl shadow-black/50">
                {/* Title with gradient */}
                <h3 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent mb-3">
                  {spotlightContent[spotlightStep].title}
                </h3>
                
                {/* Description */}
                <p className="text-sm text-white/70 leading-relaxed mb-5">
                  {spotlightContent[spotlightStep].text}
                </p>
                
                {/* Action button */}
                <Button
                  onClick={handleNext}
                  className="w-full bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white font-medium rounded-xl h-11 transition-all duration-200 shadow-lg shadow-violet-500/25"
                >
                  {spotlightStep < 2 ? (
                    <>Suivant →</>
                  ) : (
                    <>
                      <Rocket className="h-4 w-4 mr-2" />
                      Lancer Kortex 🚀
                    </>
                  )}
                </Button>

                {/* Step indicator */}
                <div className="flex justify-center gap-2 mt-4">
                  {[0, 1, 2].map((step) => (
                    <div
                      key={step}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        step === spotlightStep 
                          ? "w-6 bg-violet-500" 
                          : step < spotlightStep 
                            ? "w-1.5 bg-violet-500/50" 
                            : "w-1.5 bg-white/20"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Skip button */}
          <button
            onClick={handleSkip}
            className="fixed bottom-6 right-6 text-xs text-white/40 hover:text-white/70 transition-colors z-[9999]"
          >
            Passer l'introduction
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
