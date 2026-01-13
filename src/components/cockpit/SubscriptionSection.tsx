import { motion } from "framer-motion";
import { Crown, Zap, Brain, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

const CircularGauge = ({ 
  value, 
  max, 
  label, 
  color = "violet" 
}: { 
  value: number; 
  max: number; 
  label: string; 
  color?: "violet" | "emerald" 
}) => {
  const percentage = (value / max) * 100;
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
  const colorClasses = color === "violet" 
    ? "stroke-violet-500" 
    : "stroke-emerald-500";

  return (
    <div className="relative w-24 h-24">
      <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-white/5"
        />
        <motion.circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          className={colorClasses}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          style={{ strokeDasharray: circumference }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-mono font-bold text-white">{Math.round(percentage)}%</span>
      </div>
    </div>
  );
};

export function SubscriptionSection() {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Crown className="h-5 w-5 text-violet-400" />
        <h2 className="text-lg font-semibold text-white">Ressources & Abonnement</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Subscription Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#131316] rounded-xl border border-white/[0.05] p-5 hover:border-white/[0.1] transition-all"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-white font-semibold">Plan SCALER</span>
                <span className="px-2 py-0.5 bg-violet-500/20 text-violet-400 text-xs font-medium rounded-full">
                  Actif
                </span>
              </div>
              <p className="text-sm text-[#A1A1AA]">Renouvellement le 01/05</p>
            </div>
            <Crown className="h-8 w-8 text-violet-500" />
          </div>
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-[#A1A1AA]">Facturation</span>
              <span className="text-white font-mono">299€/mois</span>
            </div>
          </div>
          <Button variant="outline" className="w-full border-violet-500/30 text-violet-400 hover:bg-violet-500/10">
            <TrendingUp className="h-4 w-4 mr-2" />
            Upgrade to Empire
          </Button>
        </motion.div>

        {/* Radar Fuel Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[#131316] rounded-xl border border-white/[0.05] p-5 hover:border-white/[0.1] transition-all"
        >
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Zap className="h-4 w-4 text-emerald-400" />
                <span className="text-white font-semibold">Radar Fuel</span>
              </div>
              <p className="text-xs text-[#A1A1AA]">Crédits de scraping</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <CircularGauge value={850} max={1000} label="Leads" color="emerald" />
            <div className="flex-1">
              <p className="text-white font-mono text-lg">850 / 1000</p>
              <p className="text-xs text-[#A1A1AA]">leads extraits ce mois</p>
              <p className="text-xs text-emerald-400 mt-2">
                ~30 prospects restants
              </p>
            </div>
          </div>
        </motion.div>

        {/* Neural Tokens Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-[#131316] rounded-xl border border-white/[0.05] p-5 hover:border-white/[0.1] transition-all"
        >
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Brain className="h-4 w-4 text-violet-400" />
                <span className="text-white font-semibold">Neural Tokens</span>
              </div>
              <p className="text-xs text-[#A1A1AA]">Génération IA</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <CircularGauge value={12400} max={50000} label="Mots" color="violet" />
            <div className="flex-1">
              <p className="text-white font-mono text-lg">12.4k / 50k</p>
              <p className="text-xs text-[#A1A1AA]">mots générés</p>
              <p className="text-xs text-violet-400 mt-2">
                ~200 conversations restantes
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
