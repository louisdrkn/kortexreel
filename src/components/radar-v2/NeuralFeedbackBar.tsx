import { motion, AnimatePresence } from 'framer-motion';
import { Brain, X, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NeuralFeedbackBarProps {
  message: string | null;
  isProcessing: boolean;
  removedCount: number;
  onDismiss: () => void;
}

export function NeuralFeedbackBar({ 
  message, 
  isProcessing, 
  removedCount,
  onDismiss 
}: NeuralFeedbackBarProps) {
  const isVisible = isProcessing || message;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.9 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
        >
          <div className={cn(
            "flex items-center gap-3 px-5 py-3 rounded-xl",
            "bg-slate-900 text-white",
            "shadow-2xl shadow-slate-900/30",
            "border border-slate-700"
          )}>
            {/* Animated brain icon */}
            <div className="relative">
              <motion.div
                animate={isProcessing ? { 
                  rotate: [0, 10, -10, 0],
                  scale: [1, 1.1, 1]
                } : {}}
                transition={{ duration: 0.5, repeat: isProcessing ? Infinity : 0 }}
              >
                <Brain className="h-5 w-5 text-violet-400" />
              </motion.div>
              {isProcessing && (
                <motion.div
                  className="absolute inset-0 rounded-full bg-violet-500/30"
                  animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              )}
            </div>

            {/* Message */}
            <div className="flex items-center gap-2 min-w-0">
              {isProcessing ? (
                <motion.span 
                  className="text-sm font-medium text-slate-200"
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  L'IA analyse vos préférences...
                </motion.span>
              ) : (
                <span className="text-sm font-medium text-slate-200">
                  {message}
                </span>
              )}
            </div>

            {/* Removed count badge */}
            {removedCount > 0 && !isProcessing && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 text-xs font-medium"
              >
                <Trash2 className="h-3 w-3" />
                {removedCount}
              </motion.div>
            )}

            {/* Dismiss button */}
            {!isProcessing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDismiss}
                className="h-6 w-6 p-0 rounded-full hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
