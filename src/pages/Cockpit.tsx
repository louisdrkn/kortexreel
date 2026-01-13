import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NeuroCockpitHeader } from "@/components/cockpit/NeuroCockpitHeader";
import { ContextTransition } from "@/components/cockpit/ContextTransition";
import { DynamicBriefing } from "@/components/cockpit/DynamicBriefing";
import { ActiveCapabilities } from "@/components/cockpit/ActiveCapabilities";
import { SuggestionsZone } from "@/components/cockpit/SuggestionsZone";
import { SimulationMode } from "@/components/cockpit/SimulationMode";
import { MemoryBox } from "@/components/cockpit/MemoryBox";

export default function Cockpit() {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionStep, setTransitionStep] = useState<"unloading" | "loading" | "applying" | "ready">("ready");

  const handleContextTransition = useCallback(async () => {
    setIsTransitioning(true);
    setTransitionStep("unloading");
    await new Promise(r => setTimeout(r, 600));
    setTransitionStep("loading");
    await new Promise(r => setTimeout(r, 800));
    setTransitionStep("applying");
    await new Promise(r => setTimeout(r, 500));
    setTransitionStep("ready");
    await new Promise(r => setTimeout(r, 300));
    setIsTransitioning(false);
  }, []);

  return (
    <div className="min-h-screen bg-[#09090B]">
      {/* Grid Background */}
      <div 
        className="fixed inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}
      />

      {/* Context Transition Overlay */}
      <AnimatePresence>
        {isTransitioning && (
          <ContextTransition
            isTransitioning={isTransitioning}
            currentStep={transitionStep}
          />
        )}
      </AnimatePresence>

      {/* Neuro Cockpit Header */}
      <NeuroCockpitHeader onContextTransition={handleContextTransition} />

      {/* Main Content */}
      <main className="max-w-[1400px] mx-auto px-6 py-8 relative z-10">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="space-y-8"
        >
          {/* Section 1: Dynamic Briefing */}
          <DynamicBriefing />

          {/* Section 2: Capabilities + Bonus Features */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <ActiveCapabilities />
              <SuggestionsZone />
            </div>
            
            {/* Sidebar - Bonus Features */}
            <div className="space-y-6">
              <SimulationMode />
              <MemoryBox />
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
