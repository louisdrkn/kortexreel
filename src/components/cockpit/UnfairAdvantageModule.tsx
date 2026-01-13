import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export function UnfairAdvantageModule() {
  const [savedHours, setSavedHours] = useState(0);
  const [prospectionProgress, setProspectionProgress] = useState(0);
  const [emailsProgress, setEmailsProgress] = useState(0);
  const [proposalsProgress, setProposalsProgress] = useState(0);
  const targetHours = 18;

  useEffect(() => {
    // Animate hours counter
    const duration = 1500;
    const steps = 30;
    const increment = targetHours / steps;
    let current = 0;
    
    const interval = setInterval(() => {
      current += increment;
      if (current >= targetHours) {
        setSavedHours(targetHours);
        clearInterval(interval);
      } else {
        setSavedHours(Math.floor(current));
      }
    }, duration / steps);

    // Animate progress bars
    setTimeout(() => setProspectionProgress(85), 300);
    setTimeout(() => setEmailsProgress(72), 500);
    setTimeout(() => setProposalsProgress(45), 700);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-white">Performance</h3>
        <p className="text-xs text-[#888] mt-0.5">Automatisation</p>
      </div>

      {/* Main Metric: Time Saved */}
      <div className="mb-8">
        <p className="text-xs text-[#888] uppercase tracking-wider mb-2">Temps économisé</p>
        <div className="flex items-baseline gap-1">
          <motion.span 
            className="text-5xl font-light text-white tabular-nums"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {savedHours}
          </motion.span>
          <span className="text-lg text-[#888]">heures</span>
        </div>
        <p className="text-xs text-[#888] mt-1">cette semaine</p>
      </div>

      {/* Progress Bars */}
      <div className="flex-1 space-y-6">
        {/* Prospection */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#888]">Prospection</span>
            <span className="text-xs text-white tabular-nums">{prospectionProgress}%</span>
          </div>
          <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-cockpit-violet rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${prospectionProgress}%` }}
              transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
            />
          </div>
        </div>

        {/* Emails */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#888]">Emails envoyés</span>
            <span className="text-xs text-white tabular-nums">{emailsProgress}%</span>
          </div>
          <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-cockpit-violet rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${emailsProgress}%` }}
              transition={{ duration: 1, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            />
          </div>
        </div>

        {/* Proposals */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#888]">Propales générées</span>
            <span className="text-xs text-white tabular-nums">{proposalsProgress}%</span>
          </div>
          <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-cockpit-violet rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${proposalsProgress}%` }}
              transition={{ duration: 1, delay: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            />
          </div>
        </div>
      </div>

      {/* Speed Comparison */}
      <div className="mt-6 pt-6 border-t border-white/[0.05]">
        <p className="text-xs text-[#888] mb-2">Comparé à un humain</p>
        <p className="text-lg font-medium text-cockpit-success">40× plus rapide</p>
      </div>
    </div>
  );
}
