/**
 * MATCH INSIGHT BADGE
 * 
 * Displays the "IA Insight" explaining WHY Kortex chose this lead
 * based on uploaded documents and agency DNA.
 */

import { Sparkles, Building2, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface MatchInsightBadgeProps {
  matchReason: string;
  similarClient?: {
    name: string;
    caseStudySource: string;
    similarity: string;
  };
  score: number;
  className?: string;
}

export function MatchInsightBadge({ 
  matchReason, 
  similarClient, 
  score,
  className 
}: MatchInsightBadgeProps) {
  // Determine badge styling based on score
  const badgeStyle = score >= 85 
    ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200 text-emerald-800'
    : score >= 70 
    ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200 text-amber-800'
    : 'bg-gradient-to-r from-violet-50 to-purple-50 border-violet-200 text-violet-800';

  const iconColor = score >= 85 
    ? 'text-emerald-500' 
    : score >= 70 
    ? 'text-amber-500' 
    : 'text-violet-500';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className={cn('inline-block', className)}
          >
            <Badge 
              variant="outline" 
              className={cn(
                'cursor-help transition-all duration-200',
                'hover:shadow-md',
                'flex items-center gap-1.5 py-1 px-2',
                badgeStyle
              )}
            >
              <Sparkles className={cn('h-3 w-3', iconColor)} />
              <span className="text-xs font-medium">IA Insight</span>
            </Badge>
          </motion.div>
        </TooltipTrigger>
        <TooltipContent 
          side="bottom" 
          align="start"
          className="max-w-sm p-3 space-y-2"
        >
          {/* Main match reason */}
          <div className="flex items-start gap-2">
            <Zap className="h-4 w-4 text-violet-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-slate-700 leading-relaxed">
              {matchReason}
            </p>
          </div>

          {/* Similar client callout */}
          {similarClient && (
            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-start gap-2">
                <Building2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="text-xs text-slate-600">
                    <span className="font-medium text-emerald-700">Lookalike détecté:</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    Ressemble à <span className="font-medium">{similarClient.name}</span>
                    {similarClient.caseStudySource && (
                      <span className="text-slate-400"> ({similarClient.caseStudySource})</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
