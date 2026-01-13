import { useMemo } from "react";
import { motion } from "framer-motion";
import { Sparkles, Target, TrendingUp, Calendar } from "lucide-react";
import { useProject } from "@/contexts/ProjectContext";
import { cn } from "@/lib/utils";

export function DynamicBriefing() {
  const { currentProject, projectData } = useProject();

  // Generate contextual briefing based on project data
  const briefing = useMemo(() => {
    if (!currentProject) {
      return {
        greeting: "Bonjour.",
        objective: "Sélectionnez un projet pour commencer.",
        context: null,
        suggestion: null,
      };
    }

    const name = currentProject.name;
    
    // Detect industry from project name or data
    const isRestaurant = name.toLowerCase().includes("restaurant") || name.toLowerCase().includes("resto");
    const isEcommerce = name.toLowerCase().includes("shop") || name.toLowerCase().includes("commerce") || name.toLowerCase().includes("boutique");
    const isAgency = name.toLowerCase().includes("agence") || name.toLowerCase().includes("cabinet");
    const isImmobilier = name.toLowerCase().includes("immo") || name.toLowerCase().includes("immobilier");

    let objective = "optimiser votre prospection B2B";
    let context = "Votre pipeline de ventes est prêt à être activé.";
    let suggestion = "Commencez par définir vos critères de ciblage.";
    let metric = "prospects";

    if (isRestaurant) {
      objective = "remplir les mardis soirs";
      context = "Je parle en termes de couverts et réservations.";
      suggestion = "J'ai identifié 3 actions pour augmenter les réservations en semaine.";
      metric = "couverts";
    } else if (isEcommerce) {
      objective = "augmenter le panier moyen de 15%";
      context = "Je surveille vos KPIs e-commerce en temps réel.";
      suggestion = "3 séquences d'emails de relance sont prêtes à être envoyées.";
      metric = "commandes";
    } else if (isAgency) {
      objective = "décrocher 5 nouveaux mandats ce mois";
      context = "Je cible les décideurs de votre secteur.";
      suggestion = "J'ai trouvé 12 prospects correspondant à vos critères idéaux.";
      metric = "mandats";
    } else if (isImmobilier) {
      objective = "générer 10 leads qualifiés par semaine";
      context = "Je surveille les signaux d'achat immobilier.";
      suggestion = "2 prospects ont visité votre page plus de 3 fois.";
      metric = "leads";
    }

    return {
      greeting: `Bonjour. Pour ${name},`,
      objective: `l'objectif de la semaine est "${objective}".`,
      context,
      suggestion: `Voici ce que j'ai préparé : ${suggestion}`,
      metric,
    };
  }, [currentProject]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative p-6 rounded-2xl overflow-hidden",
        "bg-gradient-to-br from-violet-500/10 via-transparent to-indigo-500/10",
        "border border-white/[0.08]"
      )}
    >
      {/* Ambient Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
      
      <div className="relative z-10">
        {/* AI Avatar + Greeting */}
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/30 to-indigo-600/30 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
            <Sparkles className="h-6 w-6 text-violet-400" />
          </div>
          <div>
            <p className="text-white text-lg">
              <span className="text-white/70">{briefing.greeting}</span>{" "}
              <span className="text-violet-300 font-medium">{briefing.objective}</span>
            </p>
            {briefing.context && (
              <p className="text-white/50 text-sm mt-1">{briefing.context}</p>
            )}
          </div>
        </div>

        {/* Suggestion */}
        {briefing.suggestion && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.05]"
          >
            <p className="text-white/80 text-sm">{briefing.suggestion}</p>
          </motion.div>
        )}

        {/* Quick Stats */}
        {currentProject && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex items-center gap-6 mt-6"
          >
            <QuickStat 
              icon={Target} 
              value="12" 
              label="Cibles identifiées" 
              color="text-violet-400"
            />
            <QuickStat 
              icon={TrendingUp} 
              value="+23%" 
              label="Taux de réponse" 
              color="text-emerald-400"
            />
            <QuickStat 
              icon={Calendar} 
              value="3" 
              label="RDV cette semaine" 
              color="text-blue-400"
            />
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

interface QuickStatProps {
  icon: React.ElementType;
  value: string;
  label: string;
  color: string;
}

function QuickStat({ icon: Icon, value, label, color }: QuickStatProps) {
  return (
    <div className="flex items-center gap-2">
      <div className={cn("w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center", color)}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className={cn("text-lg font-semibold", color)}>{value}</p>
        <p className="text-[10px] text-white/40 uppercase tracking-wider">{label}</p>
      </div>
    </div>
  );
}
