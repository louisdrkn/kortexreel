import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PremiumEmptyStateProps {
  icon: LucideIcon;
  iconColor?: 'violet' | 'amber' | 'emerald';
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaIcon?: LucideIcon;
  onCtaClick: () => void;
  variant?: 'default' | 'success';
  showGhostBackground?: boolean;
}

export function PremiumEmptyState({
  icon: Icon,
  iconColor = 'violet',
  title,
  subtitle,
  ctaLabel,
  ctaIcon: CtaIcon,
  onCtaClick,
  variant = 'default',
  showGhostBackground = false,
}: PremiumEmptyStateProps) {
  const iconColorClasses = {
    violet: 'from-violet-500 to-purple-600 shadow-violet-300/50',
    amber: 'from-amber-400 to-orange-500 shadow-amber-300/50',
    emerald: 'from-emerald-400 to-teal-500 shadow-emerald-300/50',
  };

  const pulseColorClasses = {
    violet: 'bg-violet-400/20',
    amber: 'bg-amber-400/20',
    emerald: 'bg-emerald-400/20',
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6 lg:p-10 relative overflow-hidden">
      {/* Mesh Gradient Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div 
          className={cn(
            "absolute top-1/4 -left-1/4 w-[600px] h-[600px] rounded-full blur-3xl",
            variant === 'success' 
              ? "bg-gradient-to-br from-amber-200/10 to-orange-200/5" 
              : "bg-gradient-to-br from-violet-200/10 to-indigo-200/5"
          )} 
        />
        <div 
          className={cn(
            "absolute bottom-1/4 -right-1/4 w-[500px] h-[500px] rounded-full blur-3xl",
            variant === 'success'
              ? "bg-gradient-to-br from-emerald-200/10 to-teal-200/5"
              : "bg-gradient-to-br from-fuchsia-200/10 to-pink-200/5"
          )} 
        />
      </div>

      {/* Ghost Background (blurred fake content) */}
      {showGhostBackground && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl px-8 opacity-[0.07] blur-[2px]">
            {[1, 2, 3].map((i) => (
              <div key={i} className="mb-4 p-4 rounded-xl bg-slate-400">
                <div className="h-4 bg-slate-500 rounded w-3/4 mb-2" />
                <div className="h-3 bg-slate-500 rounded w-1/2" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10"
      >
        <div className="bg-white/80 backdrop-blur-md border border-white/20 shadow-xl rounded-3xl p-12 md:p-16 max-w-lg mx-auto text-center">
          {/* Icon with Pulse Animation */}
          <div className="relative inline-flex mb-8">
            {/* Outer pulse ring */}
            <motion.div
              animate={{ 
                scale: [1, 1.3, 1],
                opacity: [0.5, 0, 0.5]
              }}
              transition={{ 
                duration: 2.5, 
                repeat: Infinity,
                ease: 'easeInOut'
              }}
              className={cn(
                "absolute inset-0 rounded-full",
                pulseColorClasses[iconColor]
              )}
            />
            {/* Inner pulse ring */}
            <motion.div
              animate={{ 
                scale: [1, 1.15, 1],
                opacity: [0.3, 0, 0.3]
              }}
              transition={{ 
                duration: 2.5, 
                repeat: Infinity,
                ease: 'easeInOut',
                delay: 0.3
              }}
              className={cn(
                "absolute inset-2 rounded-full",
                pulseColorClasses[iconColor]
              )}
            />
            {/* Icon Container */}
            <div className={cn(
              "relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br shadow-lg",
              iconColorClasses[iconColor]
            )}>
              <Icon className="h-12 w-12 text-white" strokeWidth={1.5} />
            </div>
          </div>

          {/* Typography */}
          <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-4 leading-tight">
            {title}
          </h2>
          <p className="text-slate-500 text-base md:text-lg mb-10 max-w-sm mx-auto leading-relaxed">
            {subtitle}
          </p>

          {/* CTA Button */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              onClick={onCtaClick}
              size="lg"
              className={cn(
                "text-base px-8 py-6 rounded-xl font-semibold gap-2 shadow-lg transition-all duration-300",
                variant === 'success'
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-amber-200/50"
                  : "bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-violet-200/50"
              )}
            >
              {CtaIcon && <CtaIcon className="h-5 w-5" />}
              {ctaLabel}
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
