import { motion } from 'framer-motion';
import { Radar } from 'lucide-react';

interface ScanInAnimationProps {
  isActive: boolean;
  children: React.ReactNode;
}

// Wrapper component that shows a "scan" effect when a card is inserted
export function ScanInAnimation({ isActive, children }: ScanInAnimationProps) {
  if (!isActive) {
    return <>{children}</>;
  }

  return (
    <motion.div
      className="relative"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Scan lines overlay */}
      <motion.div
        className="absolute inset-0 z-10 overflow-hidden rounded-xl pointer-events-none"
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 1.5, delay: 0.5 }}
      >
        {/* Horizontal scan lines */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-400 to-transparent"
            style={{ top: `${(i + 1) * 12}%` }}
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ 
              opacity: [0, 0.8, 0],
              scaleX: [0, 1, 0],
            }}
            transition={{ 
              duration: 0.8,
              delay: i * 0.05,
              ease: 'easeOut'
            }}
          />
        ))}

        {/* Vertical sweep */}
        <motion.div
          className="absolute top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-violet-500 to-transparent"
          initial={{ left: 0, opacity: 0.8 }}
          animate={{ left: '100%', opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
        />

        {/* Glow effect */}
        <motion.div
          className="absolute inset-0 bg-violet-500/10"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 1 }}
        />
      </motion.div>

      {/* "IA" badge during scan */}
      <motion.div
        className="absolute top-2 right-2 z-20 flex items-center gap-1 px-2 py-1 rounded-md bg-violet-600 text-white text-xs font-medium"
        initial={{ opacity: 1, scale: 1 }}
        animate={{ opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.5, delay: 1 }}
      >
        <Radar className="h-3 w-3" />
        Nouveau
      </motion.div>

      {/* Content with fade-in */}
      <motion.div
        initial={{ opacity: 0.3, filter: 'blur(4px)' }}
        animate={{ opacity: 1, filter: 'blur(0px)' }}
        transition={{ duration: 0.8, delay: 0.3 }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
