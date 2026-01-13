import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GhostCursor } from "./GhostCursor";
import { TypewriterSubtitles } from "./TypewriterSubtitles";
import { DataStreamEffect } from "./DataStreamEffect";
import { CinematicOverlay } from "./CinematicOverlay";
import { MockCockpit } from "./MockCockpit";
import { Zap, Building2, Briefcase } from "lucide-react";

interface OnboardingCinematicProps {
  onComplete: (data: { role: "agency" | "enterprise" }) => void;
  onSkip: () => void;
}

type Phase = 
  | "intro" 
  | "chameleon" 
  | "chameleon_transition"
  | "enrichment" 
  | "enrichment_stream"
  | "action" 
  | "action_click"
  | "handover";

export function OnboardingCinematic({ onComplete, onSkip }: OnboardingCinematicProps) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [cursorPosition, setCursorPosition] = useState({ x: -100, y: -100 });
  const [isClicking, setIsClicking] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(false);
  const [subtitle, setSubtitle] = useState("");
  const [cockpitVariant, setCockpitVariant] = useState<"empty" | "immobilier">("empty");
  const [showContacts, setShowContacts] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertClicked, setAlertClicked] = useState(false);
  const [showDataStream, setShowDataStream] = useState(false);

  // Sequence timing controller
  useEffect(() => {
    const runSequence = async () => {
      // Phase 1: Intro (5s)
      await wait(1500);
      setSubtitle("Bonjour. Je suis Kortex. Je ne suis pas juste un logiciel, je suis votre extension numérique.");
      await wait(4000);
      setSubtitle("Laissez-moi vous montrer comment je transforme votre business.");
      await wait(3000);
      
      // Transition to cockpit
      setPhase("chameleon");
      setSubtitle("");
      await wait(1000);

      // Phase 2: Chameleon demo
      setCursorVisible(true);
      setCursorPosition({ x: window.innerWidth / 2, y: 60 });
      await wait(800);
      
      setSubtitle("Tout commence ici. Mon intelligence s'adapte à votre cible.");
      await wait(2000);

      // Move to context switcher
      const contextSwitcher = document.getElementById("mock-context-switcher");
      if (contextSwitcher) {
        const rect = contextSwitcher.getBoundingClientRect();
        setCursorPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
      }
      await wait(1000);
      
      setIsHovering(true);
      await wait(500);
      setIsClicking(true);
      await wait(200);
      setIsClicking(false);
      setIsHovering(false);

      // Transform interface
      setPhase("chameleon_transition");
      setCockpitVariant("immobilier");
      await wait(1500);

      setSubtitle("Voyez ? Je viens de recalibrer tout mon système pour penser comme un agent immobilier. Je cloisonne les données. Ce projet est unique.");
      await wait(5000);

      // Phase 3: Enrichment
      setPhase("enrichment");
      setSubtitle("Le nerf de la guerre, c'est l'information. Vous n'avez pas à la chercher, je la chasse pour vous.");
      await wait(3000);

      // Move to contacts section
      setCursorPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
      await wait(1000);

      setSubtitle("");
      setShowDataStream(true);
      setPhase("enrichment_stream");
      await wait(3500);
      
      setShowDataStream(false);
      setShowContacts(true);
      await wait(500);

      setSubtitle("J'ai scanné l'environnement. J'ai trouvé les décideurs. J'ai vérifié les emails. Tout est prêt pour l'attaque. C'est ça, la phase cachée de l'iceberg.");
      await wait(5000);

      // Phase 4: Action
      setPhase("action");
      setSubtitle("Maintenant, agissons. Oubliez les configurations techniques. Dites-moi juste quoi faire.");
      await wait(3000);

      setShowAlert(true);
      setSubtitle("");
      await wait(1500);

      // Move to action button
      const actionButton = document.getElementById("mock-action-button");
      if (actionButton) {
        const rect = actionButton.getBoundingClientRect();
        setCursorPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
      }
      await wait(1000);

      setIsHovering(true);
      await wait(800);
      setIsClicking(true);
      await wait(200);
      setIsClicking(false);
      setIsHovering(false);
      setPhase("action_click");
      setAlertClicked(true);
      await wait(1500);

      setSubtitle("Je gère la complexité. Vous gérez la stratégie.");
      await wait(3000);

      // Phase 5: Handover
      setPhase("handover");
      setCursorVisible(false);
      setSubtitle("Je suis prêt. Mon système est calibré. C'est à votre tour.");
      await wait(3000);
      setSubtitle("");
    };

    runSequence();
  }, []);

  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const handleRoleSelect = (role: "agency" | "enterprise") => {
    onComplete({ role });
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black">
      {/* Intro screen */}
      <AnimatePresence>
        {phase === "intro" && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center bg-black z-[10010]"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
          >
            <motion.div
              className="flex flex-col items-center"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <motion.div
                className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center mb-6"
                animate={{
                  boxShadow: [
                    "0 0 0 0 hsl(var(--primary) / 0.4)",
                    "0 0 0 20px hsl(var(--primary) / 0)",
                  ],
                }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <Zap className="w-12 h-12 text-primary-foreground" />
              </motion.div>
              <motion.h1
                className="text-3xl font-bold text-white"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                Kortex
              </motion.h1>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mock Cockpit */}
      {phase !== "intro" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <MockCockpit
            variant={cockpitVariant}
            showContacts={showContacts}
            showAlert={showAlert}
            alertClicked={alertClicked}
          />
        </motion.div>
      )}

      {/* Cinematic Overlay */}
      <CinematicOverlay
        isActive={phase !== "intro" && phase !== "handover"}
        focusPosition={cursorVisible ? { ...cursorPosition, radius: 100 } : null}
        intensity={0.6}
      />

      {/* Data Stream Effect */}
      <DataStreamEffect
        isActive={showDataStream}
        duration={3000}
      />

      {/* Ghost Cursor */}
      <GhostCursor
        position={cursorPosition}
        isClicking={isClicking}
        isHovering={isHovering}
        isVisible={cursorVisible}
      />

      {/* Subtitles */}
      <TypewriterSubtitles
        text={subtitle}
        isVisible={!!subtitle}
        speed={25}
      />

      {/* Handover Modal */}
      <AnimatePresence>
        {phase === "handover" && !subtitle && (
          <motion.div
            className="fixed inset-0 flex items-center justify-center z-[10005]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <motion.div
              className="bg-card/95 backdrop-blur-xl rounded-2xl border border-border p-8 max-w-md w-full mx-4"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ delay: 0.7, type: "spring" }}
            >
              <div className="text-center mb-8">
                <motion.div
                  className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center"
                  initial={{ rotate: -10 }}
                  animate={{ rotate: 0 }}
                  transition={{ delay: 1, type: "spring" }}
                >
                  <Zap className="w-8 h-8 text-primary-foreground" />
                </motion.div>
                <h2 className="text-2xl font-bold mb-2">Qui êtes-vous ?</h2>
                <p className="text-muted-foreground">
                  Cela me permettra d'adapter mon intelligence à votre contexte.
                </p>
              </div>

              <div className="space-y-3">
                <motion.button
                  className="w-full p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-primary/50 transition-all flex items-center gap-4 group"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleRoleSelect("agency")}
                >
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold group-hover:text-primary transition-colors">
                      Je suis une Agence
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Je gère plusieurs clients et campagnes
                    </div>
                  </div>
                </motion.button>

                <motion.button
                  className="w-full p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-primary/50 transition-all flex items-center gap-4 group"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleRoleSelect("enterprise")}
                >
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                    <Briefcase className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold group-hover:text-primary transition-colors">
                      Je suis une Entreprise
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Je développe mon propre business
                    </div>
                  </div>
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Skip Button */}
      <motion.button
        className="fixed bottom-6 right-6 z-[10010] px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        onClick={onSkip}
      >
        Passer l'introduction →
      </motion.button>
    </div>
  );
}
