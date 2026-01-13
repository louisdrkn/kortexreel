import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Lightbulb } from "lucide-react";

// Simple sparkline component
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - ((value - min) / range) * 100;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg viewBox="0 0 100 100" className="w-full h-16" preserveAspectRatio="none">
      <defs>
        <linearGradient id="sparklineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
      />
      <motion.polygon
        fill="url(#sparklineGradient)"
        points={`0,100 ${points} 100,100`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5, delay: 0.5 }}
      />
    </svg>
  );
}

export function NeuralCoreModule() {
  const [openRate, setOpenRate] = useState(0);
  const targetOpenRate = 68;
  const sparklineData = [42, 48, 45, 52, 58, 55, 62, 58, 65, 68, 64, 68];

  // CountUp animation
  useEffect(() => {
    const duration = 1500;
    const steps = 50;
    const increment = targetOpenRate / steps;
    let current = 0;
    
    const interval = setInterval(() => {
      current += increment;
      if (current >= targetOpenRate) {
        setOpenRate(targetOpenRate);
        clearInterval(interval);
      } else {
        setOpenRate(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-8">
        <h3 className="text-sm font-medium text-white">Intelligence</h3>
        <p className="text-xs text-[#888] mt-0.5">Métriques clés en temps réel</p>
      </div>

      {/* Main Metric */}
      <div className="flex-1">
        <div className="mb-8">
          <p className="text-xs text-[#888] uppercase tracking-wider mb-2">Taux d'ouverture</p>
          <div className="flex items-baseline gap-1">
            <motion.span 
              className="text-6xl font-light text-white tabular-nums"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              {openRate}
            </motion.span>
            <span className="text-2xl text-[#888]">%</span>
          </div>
        </div>

        {/* Sparkline */}
        <div className="mb-8">
          <p className="text-xs text-[#888] mb-3">Évolution (30 jours)</p>
          <Sparkline data={sparklineData} color="hsl(258, 90%, 66%)" />
        </div>

        {/* Secondary Metrics Grid */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="p-4 rounded-lg bg-white/[0.02]">
            <p className="text-xs text-[#888] mb-1">Taux de réponse</p>
            <p className="text-xl font-medium text-white">24%</p>
          </div>
          <div className="p-4 rounded-lg bg-white/[0.02]">
            <p className="text-xs text-[#888] mb-1">RDV obtenus</p>
            <p className="text-xl font-medium text-white">12</p>
          </div>
        </div>

        {/* Insight */}
        <motion.div 
          className="p-4 rounded-lg bg-cockpit-violet/5 border border-cockpit-violet/10"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.5 }}
        >
          <div className="flex items-start gap-3">
            <Lightbulb className="h-4 w-4 text-cockpit-violet mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-[#888] mb-1">Dernier insight</p>
              <p className="text-sm text-white/90">
                L'approche B performe 23% mieux ce matin. Les emails envoyés à 10h ont le meilleur taux d'ouverture.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
