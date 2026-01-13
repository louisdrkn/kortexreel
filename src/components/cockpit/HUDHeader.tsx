import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";

export function HUDHeader() {
  const { user } = useAuth();
  const [pipelineValue, setPipelineValue] = useState(0);
  const targetPipeline = 124500;

  // CountUp animation
  useEffect(() => {
    const duration = 1800;
    const steps = 60;
    const increment = targetPipeline / steps;
    let current = 0;
    
    const interval = setInterval(() => {
      current += increment;
      if (current >= targetPipeline) {
        setPipelineValue(targetPipeline);
        clearInterval(interval);
      } else {
        setPipelineValue(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-[#0C0C0E] border-b border-white/[0.05]">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Greeting */}
          <div>
            <p className="text-sm text-white font-medium">
              Bonjour, {user?.email?.split("@")[0] || "Pilote"}
            </p>
            <p className="text-xs text-[#888]">
              Votre cockpit est prêt.
            </p>
          </div>

          {/* Right: Pipeline KPI */}
          <div className="text-right">
            <p className="text-[10px] text-[#888] uppercase tracking-wider">
              Pipeline total
            </p>
            <motion.p 
              className="text-xl font-semibold text-white tabular-nums"
              key={pipelineValue}
            >
              {pipelineValue.toLocaleString("fr-FR")} €
            </motion.p>
          </div>
        </div>
      </div>
    </div>
  );
}
