import { motion } from "framer-motion";
import { Eye, FileText, Sparkles, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type RecommendationReason =
  | "viewed_similar"
  | "validated_similar"
  | "document_match"
  | "trend_match"
  | "sector_boost";

interface RecommendationBadgeProps {
  reason: RecommendationReason;
  relatedCompanyName?: string;
  documentName?: string;
  className?: string;
}

export function RecommendationBadge({
  reason,
  relatedCompanyName,
  documentName,
  className,
}: RecommendationBadgeProps) {
  const getReasonConfig = () => {
    switch (reason) {
      case "viewed_similar":
        return {
          icon: Eye,
          label: "Profil similaire",
          tooltip: relatedCompanyName
            ? `Recommandé car vous avez consulté ${relatedCompanyName}`
            : "Similaire à un profil que vous avez consulté",
          color: "bg-blue-50 text-blue-600 border-blue-100",
        };
      case "validated_similar":
        return {
          icon: Users,
          label: "Like validé",
          tooltip: relatedCompanyName
            ? `Match fort avec ${relatedCompanyName} que vous avez validé`
            : "Similaire à un prospect que vous avez validé",
          style: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", // Updated style
        };
      case "document_match":
        return {
          icon: FileText,
          label: "Match PDF",
          tooltip: documentName
            ? `Match fort avec votre document "${documentName}"`
            : "Correspond à vos documents uploadés",
          style: "bg-violet-500/10 text-violet-400 border-violet-500/20", // Updated style
        };
      case "trend_match":
        return {
          icon: Sparkles,
          label: "Tendance",
          tooltip: "Correspond à vos critères de recherche récents",
          style: "bg-amber-500/10 text-amber-400 border-amber-500/20", // Updated style
        };
      case "sector_boost":
        return {
          icon: Sparkles,
          label: "Secteur favori",
          tooltip: "Ce secteur correspond à vos préférences détectées",
          color: "bg-fuchsia-50 text-fuchsia-600 border-fuchsia-100",
        };
      default:
        return {
          icon: Sparkles,
          label: "Recommandé",
          tooltip: "Recommandé par l'IA",
          color: "bg-slate-50 text-slate-600 border-slate-100",
        };
    }
  };

  const config = getReasonConfig();
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              "inline-flex items-center gap-1.5 px-2 py-1 rounded-full",
              "text-[10px] font-medium border",
              "cursor-help transition-all duration-200",
              "hover:scale-105",
              config.color,
              className,
            )}
          >
            <Icon className="h-3 w-3" />
            <span>{config.label}</span>
          </motion.div>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="bg-slate-900 text-white border-none max-w-xs"
        >
          <p className="text-xs">{config.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
