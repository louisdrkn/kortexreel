import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2, Brain, Target, Users, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface RecalibrateStep {
  step: string;
  message: string;
  progress: number;
}

interface RecalibrateButtonProps {
  onRecalibrate: () => Promise<void>;
  isRecalibrating: boolean;
  currentStep: RecalibrateStep | null;
  disabled?: boolean;
}

export function RecalibrateButton({
  onRecalibrate,
  isRecalibrating,
  currentStep,
  disabled,
}: RecalibrateButtonProps) {
  const getStepIcon = (step: string) => {
    switch (step) {
      case 'interactions':
        return <Users className="h-3.5 w-3.5" />;
      case 'weights':
      case 'trend':
        return <Brain className="h-3.5 w-3.5" />;
      case 'rescore':
      case 'lookalike':
        return <Target className="h-3.5 w-3.5" />;
      case 'complete':
        return <Check className="h-3.5 w-3.5" />;
      default:
        return <Sparkles className="h-3.5 w-3.5" />;
    }
  };

  return (
    <div className="relative">
      {/* Main Button */}
      <motion.div
        animate={!isRecalibrating && !disabled ? {
          boxShadow: [
            '0 0 0 rgba(168, 85, 247, 0)',
            '0 0 20px rgba(168, 85, 247, 0.3)',
            '0 0 0 rgba(168, 85, 247, 0)',
          ],
        } : {}}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        className="rounded-lg"
      >
        <Button
          onClick={onRecalibrate}
          disabled={disabled || isRecalibrating}
          variant="outline"
          size="sm"
          className={cn(
            "gap-2 relative overflow-hidden",
            "bg-gradient-to-r from-violet-50 to-fuchsia-50",
            "border-violet-200 hover:border-violet-300",
            "text-violet-700 hover:text-violet-800",
            "transition-all duration-300",
            isRecalibrating && "pr-4"
          )}
        >
          {isRecalibrating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-violet-600" />
              <span className="text-xs">Recalibration...</span>
            </>
          ) : (
            <>
              <motion.div
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Sparkles className="h-4 w-4" />
              </motion.div>
              <span className="hidden sm:inline">Recalibrer l'IA</span>
              <span className="sm:hidden">IA</span>
            </>
          )}
        </Button>
      </motion.div>

      {/* Progress Popup */}
      <AnimatePresence>
        {isRecalibrating && currentStep && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className={cn(
              "absolute top-full mt-2 right-0 z-50",
              "w-72 p-4 rounded-xl",
              "bg-white border border-violet-100",
              "shadow-xl shadow-violet-100/50"
            )}
          >
            {/* Step Icon + Message */}
            <div className="flex items-start gap-3 mb-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                <motion.div
                  key={currentStep.step}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', bounce: 0.5 }}
                  className="text-violet-600"
                >
                  {getStepIcon(currentStep.step)}
                </motion.div>
              </div>
              <div className="flex-1 min-w-0">
                <motion.p
                  key={currentStep.message}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-sm text-slate-700 font-medium leading-tight"
                >
                  {currentStep.message}
                </motion.p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${currentStep.progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>

            {/* Progress Text */}
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-slate-400">
                {currentStep.step === 'complete' ? 'Terminé' : 'En cours...'}
              </span>
              <span className="text-xs font-medium text-violet-600">
                {currentStep.progress}%
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
