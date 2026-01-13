import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Lightbulb, 
  Check, 
  X, 
  TrendingDown, 
  MessageSquare,
  Star,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface Suggestion {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  confidence: "high" | "medium" | "low";
  impact: string;
  status: "pending" | "approved" | "ignored";
}

const defaultSuggestions: Suggestion[] = [
  {
    id: "1",
    title: "Répondre aux avis Google",
    description: "J'ai détecté que vos avis Google baissent. Voulez-vous que je rédige des réponses automatiques pour remonter la note ?",
    icon: Star,
    confidence: "high",
    impact: "+0.3 étoiles estimées",
    status: "pending",
  },
  {
    id: "2",
    title: "Relancer 12 prospects dormants",
    description: "Ces contacts n'ont pas ouvert vos emails depuis 30 jours. Je propose une séquence de réengagement.",
    icon: MessageSquare,
    confidence: "medium",
    impact: "~4 réponses attendues",
    status: "pending",
  },
  {
    id: "3",
    title: "Alerte concurrence",
    description: "Votre concurrent 'TechCorp' a lancé une nouvelle offre. Voulez-vous que j'analyse leur positionnement ?",
    icon: TrendingDown,
    confidence: "high",
    impact: "Analyse en 2 min",
    status: "pending",
  },
];

export function SuggestionsZone() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>(defaultSuggestions);

  const handleAction = (id: string, action: "approve" | "ignore") => {
    setSuggestions(prev => 
      prev.map(s => 
        s.id === id 
          ? { ...s, status: action === "approve" ? "approved" : "ignored" } 
          : s
      )
    );
  };

  const pendingSuggestions = suggestions.filter(s => s.status === "pending");

  const confidenceColors = {
    high: {
      bg: "bg-emerald-500/20",
      text: "text-emerald-400",
      border: "border-emerald-500/30",
      label: "Confiance élevée",
    },
    medium: {
      bg: "bg-orange-500/20",
      text: "text-orange-400",
      border: "border-orange-500/30",
      label: "Validation requise",
    },
    low: {
      bg: "bg-red-500/20",
      text: "text-red-400",
      border: "border-red-500/30",
      label: "Action sensible",
    },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-amber-400" />
          <h2 className="text-white text-lg font-semibold">Suggestions IA</h2>
        </div>
        <span className="text-xs text-white/40">
          {pendingSuggestions.length} action(s) en attente
        </span>
      </div>

      <div className="space-y-3">
        {pendingSuggestions.map((suggestion, index) => {
          const confidence = confidenceColors[suggestion.confidence];
          
          return (
            <motion.div
              key={suggestion.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "p-4 rounded-xl",
                "bg-white/[0.02] border border-white/[0.06]",
                "hover:bg-white/[0.04] transition-all duration-300"
              )}
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <suggestion.icon className="h-5 w-5 text-amber-400" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-white font-medium">{suggestion.title}</h3>
                    
                    {/* Confidence Indicator */}
                    <div className={cn(
                      "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium",
                      confidence.bg,
                      confidence.text,
                      "border",
                      confidence.border
                    )}>
                      <span className="relative flex h-1.5 w-1.5">
                        <span className={cn(
                          "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                          suggestion.confidence === "high" ? "bg-emerald-400" :
                          suggestion.confidence === "medium" ? "bg-orange-400" : "bg-red-400"
                        )} />
                        <span className={cn(
                          "relative inline-flex rounded-full h-1.5 w-1.5",
                          suggestion.confidence === "high" ? "bg-emerald-500" :
                          suggestion.confidence === "medium" ? "bg-orange-500" : "bg-red-500"
                        )} />
                      </span>
                      {confidence.label}
                    </div>
                  </div>
                  
                  <p className="text-sm text-white/60 mb-3">{suggestion.description}</p>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-violet-400/80">{suggestion.impact}</span>
                    
                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleAction(suggestion.id, "ignore")}
                        className="h-8 text-white/40 hover:text-white hover:bg-white/5"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Ignorer
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleAction(suggestion.id, "approve")}
                        className="h-8 bg-violet-600 hover:bg-violet-500 text-white"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Approuver
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}

        {pendingSuggestions.length === 0 && (
          <div className="text-center py-12 text-white/30">
            <Lightbulb className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Aucune suggestion en attente</p>
            <p className="text-xs mt-1">L'IA vous proposera des actions basées sur l'analyse de vos données</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
