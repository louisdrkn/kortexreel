import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Ghost, 
  Play, 
  AlertTriangle,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

interface SimulationResult {
  action: string;
  wouldDo: string;
  prevented: boolean;
}

export function SimulationMode() {
  const [isActive, setIsActive] = useState(false);
  const [results, setResults] = useState<SimulationResult[]>([]);

  const simulateAction = () => {
    // Simulated results for demo
    const newResults: SimulationResult[] = [
      {
        action: "Envoyer campagne email",
        wouldDo: "J'aurais envoyé 50 emails à votre liste 'Prospects Chauds'",
        prevented: true,
      },
      {
        action: "Publier sur LinkedIn",
        wouldDo: "J'aurais posté: 'Nouveau service disponible...'",
        prevented: true,
      },
      {
        action: "Mettre à jour CRM",
        wouldDo: "J'aurais qualifié 12 leads comme 'À contacter'",
        prevented: true,
      },
    ];
    setResults(newResults);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className={cn(
        "p-5 rounded-xl transition-all duration-500",
        isActive
          ? "bg-gradient-to-br from-purple-500/10 via-transparent to-pink-500/10 border border-purple-500/20"
          : "bg-white/[0.02] border border-white/[0.06]"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
            isActive ? "bg-purple-500/20" : "bg-white/5"
          )}>
            <Ghost className={cn(
              "h-5 w-5 transition-colors",
              isActive ? "text-purple-400" : "text-white/40"
            )} />
          </div>
          <div>
            <h3 className="text-white font-medium">Mode Simulation</h3>
            <p className="text-xs text-white/40">Ghost Mode 👻</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <span className={cn(
            "text-xs font-medium transition-colors",
            isActive ? "text-purple-400" : "text-white/40"
          )}>
            {isActive ? "ACTIF" : "INACTIF"}
          </span>
          <Switch
            checked={isActive}
            onCheckedChange={(checked) => {
              setIsActive(checked);
              if (!checked) setResults([]);
            }}
            className="data-[state=checked]:bg-purple-600"
          />
        </div>
      </div>

      {/* Active State Content */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4"
          >
            {/* Warning Banner */}
            <div className="flex items-center gap-2 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <AlertTriangle className="h-4 w-4 text-purple-400 flex-shrink-0" />
              <p className="text-xs text-purple-300">
                Mode simulation activé. Aucune action réelle ne sera exécutée.
              </p>
            </div>

            {/* Simulate Button */}
            <Button
              onClick={simulateAction}
              className="w-full bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30"
            >
              <Play className="h-4 w-4 mr-2" />
              Simuler les actions en attente
            </Button>

            {/* Results */}
            {results.length > 0 && (
              <div className="space-y-2 pt-2">
                <p className="text-xs text-white/40 uppercase tracking-wider">Résultats de simulation</p>
                {results.map((result, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]"
                  >
                    {result.prevented ? (
                      <XCircle className="h-4 w-4 text-purple-400 mt-0.5 flex-shrink-0" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    )}
                    <div>
                      <p className="text-sm text-white/80">{result.action}</p>
                      <p className="text-xs text-white/40 mt-0.5">{result.wouldDo}</p>
                      {result.prevented && (
                        <span className="inline-block mt-1 text-[10px] text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">
                          Action bloquée (simulation)
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Inactive State */}
      {!isActive && (
        <p className="text-sm text-white/40">
          Activez ce mode pour tester les actions de l'IA sans risque. Idéal pour les démos clients.
        </p>
      )}
    </motion.div>
  );
}
