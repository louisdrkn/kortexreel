import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Brain, 
  Plus, 
  X, 
  ChevronDown, 
  ChevronUp,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface MemoryRule {
  id: string;
  content: string;
  type: "preference" | "constraint" | "context";
  addedAt: Date;
}

const defaultRules: MemoryRule[] = [
  {
    id: "1",
    content: "Ce client déteste le tutoiement",
    type: "preference",
    addedAt: new Date(),
  },
  {
    id: "2",
    content: "Budget maximum : 500€/mois",
    type: "constraint",
    addedAt: new Date(),
  },
  {
    id: "3",
    content: "Secteur : Restauration haut de gamme",
    type: "context",
    addedAt: new Date(),
  },
];

export function MemoryBox() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [rules, setRules] = useState<MemoryRule[]>(defaultRules);
  const [newRule, setNewRule] = useState("");

  const addRule = () => {
    if (!newRule.trim()) return;
    
    const rule: MemoryRule = {
      id: Date.now().toString(),
      content: newRule.trim(),
      type: "constraint",
      addedAt: new Date(),
    };
    
    setRules(prev => [rule, ...prev]);
    setNewRule("");
  };

  const removeRule = (id: string) => {
    setRules(prev => prev.filter(r => r.id !== id));
  };

  const typeColors = {
    preference: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    constraint: "bg-red-500/20 text-red-400 border-red-500/30",
    context: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  };

  const typeLabels = {
    preference: "Préférence",
    constraint: "Contrainte",
    context: "Contexte",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className={cn(
        "rounded-xl overflow-hidden transition-all duration-300",
        "bg-gradient-to-br from-cyan-500/5 via-transparent to-blue-500/5",
        "border border-white/[0.06]"
      )}
    >
      {/* Header - Always Visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
            <Brain className="h-5 w-5 text-cyan-400" />
          </div>
          <div className="text-left">
            <h3 className="text-white font-medium">Memory Box</h3>
            <p className="text-xs text-white/40">{rules.length} règles contextuelles</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-cyan-400/50" />
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-white/40" />
          ) : (
            <ChevronDown className="h-4 w-4 text-white/40" />
          )}
        </div>
      </button>

      {/* Expandable Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-white/[0.05]"
          >
            <div className="p-4 space-y-4">
              {/* Add New Rule */}
              <div className="flex gap-2">
                <Input
                  placeholder="Ajouter une règle... Ex: Ne jamais contacter le dimanche"
                  value={newRule}
                  onChange={(e) => setNewRule(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addRule()}
                  className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-white/30 text-sm"
                />
                <Button
                  onClick={addRule}
                  disabled={!newRule.trim()}
                  size="sm"
                  className="bg-cyan-600 hover:bg-cyan-500 text-white"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Rules List */}
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {rules.map((rule, index) => (
                  <motion.div
                    key={rule.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.05] group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded border font-medium flex-shrink-0",
                        typeColors[rule.type]
                      )}>
                        {typeLabels[rule.type]}
                      </span>
                      <p className="text-sm text-white/80 truncate">{rule.content}</p>
                    </div>
                    
                    <button
                      onClick={() => removeRule(rule.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white/10 rounded"
                    >
                      <X className="h-3.5 w-3.5 text-white/40 hover:text-red-400" />
                    </button>
                  </motion.div>
                ))}
              </div>

              {/* Info */}
              <p className="text-[10px] text-white/30 text-center pt-2 border-t border-white/[0.05]">
                Ces règles sont intégrées instantanément dans le calibrage de l'IA
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
