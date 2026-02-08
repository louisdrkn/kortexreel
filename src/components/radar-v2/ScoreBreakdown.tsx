/**
 * SCORE BREAKDOWN COMPONENT
 *
 * Displays the weighted score breakdown:
 * - Fit Structurel (30%)
 * - Fit Technologique (30%)
 * - Fit Sémantique (40%)
 */

import { Brain, Building2, Cpu } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ScoreBreakdownProps {
  structuralFit?: number;
  technologicalFit?: number;
  semanticFit?: number;
  structuralExplanation?: string;
  technologicalExplanation?: string;
  semanticExplanation?: string;
  className?: string;
}

interface ScoreBarProps {
  label: string;
  icon: React.ReactNode;
  score: number;
  weight: string;
  explanation?: string;
  color: "violet" | "blue" | "emerald";
}

function ScoreBar(
  { label, icon, score, weight, explanation, color }: ScoreBarProps,
) {
  const colorStyles = {
    violet: {
      bg: "bg-indigo-500/10",
      fill: "bg-gradient-to-r from-indigo-500 to-violet-500",
      text: "text-indigo-400",
      icon: "text-indigo-400",
    },
    blue: {
      bg: "bg-blue-500/10",
      fill: "bg-gradient-to-r from-blue-500 to-cyan-500",
      text: "text-blue-400",
      icon: "text-blue-400",
    },
    emerald: {
      bg: "bg-emerald-500/10",
      fill: "bg-gradient-to-r from-emerald-500 to-teal-500",
      text: "text-emerald-400",
      icon: "text-emerald-400",
    },
  };

  const styles = colorStyles[color];

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={cn("p-1 rounded", styles.bg)}>
            {icon}
          </span>
          <span className="text-xs font-medium text-zinc-300">{label}</span>
          <span className="text-xs text-zinc-500 font-mono">({weight})</span>
        </div>
        <span className={cn("text-sm font-bold font-mono", styles.text)}>
          {score}%
        </span>
      </div>

      <div className={cn("h-1.5 rounded-full overflow-hidden", styles.bg)}>
        <motion.div
          className={cn("h-full rounded-full", styles.fill)}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>

      {explanation && (
        <p className="text-xs text-zinc-500 pl-7">
          {explanation}
        </p>
      )}
    </div>
  );
}

export function ScoreBreakdown({
  structuralFit = 0,
  technologicalFit = 0,
  semanticFit = 0,
  structuralExplanation,
  technologicalExplanation,
  semanticExplanation,
  className,
}: ScoreBreakdownProps) {
  // Calculate weighted total
  const total = Math.round(
    structuralFit * 0.30 +
      technologicalFit * 0.30 +
      semanticFit * 0.40,
  );

  return (
    <div
      className={cn(
        "space-y-4 p-4 rounded-xl bg-zinc-900/50 border border-white/5 backdrop-blur-sm",
        className,
      )}
    >
      <div className="flex items-center justify-between pb-2 border-b border-white/5">
        <h4 className="text-sm font-semibold text-zinc-300">
          Kortex Score Breakdown
        </h4>
        <div className="flex items-center gap-1.5">
          <span className="text-lg font-bold text-indigo-400 font-mono">
            {total}
          </span>
          <span className="text-xs text-zinc-500 font-mono">/100</span>
        </div>
      </div>

      <div className="space-y-3">
        <ScoreBar
          label="Fit Structurel"
          icon={<Building2 className="h-3 w-3 text-violet-500" />}
          score={structuralFit}
          weight="30%"
          explanation={structuralExplanation}
          color="violet"
        />

        <ScoreBar
          label="Fit Technologique"
          icon={<Cpu className="h-3 w-3 text-blue-500" />}
          score={technologicalFit}
          weight="30%"
          explanation={technologicalExplanation}
          color="blue"
        />

        <ScoreBar
          label="Fit Sémantique"
          icon={<Brain className="h-3 w-3 text-emerald-500" />}
          score={semanticFit}
          weight="40%"
          explanation={semanticExplanation}
          color="emerald"
        />
      </div>

      <p className="text-xs text-zinc-500 text-center pt-2 border-t border-white/5">
        Score calculé par analyse IA des documents + critères cible
      </p>
    </div>
  );
}
