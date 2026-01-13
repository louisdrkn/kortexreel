import { motion, AnimatePresence } from "framer-motion";

interface CinematicOverlayProps {
  isActive: boolean;
  focusPosition?: { x: number; y: number; radius?: number } | null;
  intensity?: number; // 0-1, how dark the overlay is
}

export function CinematicOverlay({ 
  isActive, 
  focusPosition = null,
  intensity = 0.7 
}: CinematicOverlayProps) {
  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          className="fixed inset-0 z-[9997] pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Dark overlay with spotlight hole */}
          <svg className="absolute inset-0 w-full h-full">
            <defs>
              {/* Radial gradient for spotlight */}
              <radialGradient id="spotlight" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="black" stopOpacity="0" />
                <stop offset="70%" stopColor="black" stopOpacity={intensity * 0.5} />
                <stop offset="100%" stopColor="black" stopOpacity={intensity} />
              </radialGradient>

              {/* Mask for the spotlight hole */}
              {focusPosition && (
                <mask id="spotlightMask">
                  <rect width="100%" height="100%" fill="white" />
                  <motion.circle
                    initial={{ 
                      cx: focusPosition.x, 
                      cy: focusPosition.y, 
                      r: 0 
                    }}
                    animate={{ 
                      cx: focusPosition.x, 
                      cy: focusPosition.y, 
                      r: focusPosition.radius || 80 
                    }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    fill="black"
                  />
                </mask>
              )}
            </defs>

            {/* Main overlay */}
            <motion.rect
              width="100%"
              height="100%"
              fill={`rgba(0, 0, 0, ${intensity})`}
              mask={focusPosition ? "url(#spotlightMask)" : undefined}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            />
          </svg>

          {/* Spotlight ring effect */}
          {focusPosition && (
            <motion.div
              className="absolute pointer-events-none"
              style={{
                left: focusPosition.x,
                top: focusPosition.y,
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              {/* Outer glow */}
              <motion.div
                className="absolute rounded-full border border-primary/30"
                style={{
                  width: (focusPosition.radius || 80) * 2 + 20,
                  height: (focusPosition.radius || 80) * 2 + 20,
                  marginLeft: -((focusPosition.radius || 80) + 10),
                  marginTop: -((focusPosition.radius || 80) + 10),
                }}
                animate={{
                  boxShadow: [
                    "0 0 20px 0px hsl(var(--primary) / 0.2)",
                    "0 0 40px 5px hsl(var(--primary) / 0.3)",
                    "0 0 20px 0px hsl(var(--primary) / 0.2)",
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              />

              {/* Inner ring */}
              <motion.div
                className="absolute rounded-full border-2 border-primary/50"
                style={{
                  width: (focusPosition.radius || 80) * 2,
                  height: (focusPosition.radius || 80) * 2,
                  marginLeft: -(focusPosition.radius || 80),
                  marginTop: -(focusPosition.radius || 80),
                }}
              />
            </motion.div>
          )}

          {/* Ambient particles */}
          <div className="absolute inset-0 overflow-hidden">
            {Array.from({ length: 20 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 rounded-full bg-primary/30"
                initial={{
                  x: Math.random() * window.innerWidth,
                  y: Math.random() * window.innerHeight,
                  opacity: 0,
                }}
                animate={{
                  y: [null, Math.random() * window.innerHeight],
                  opacity: [0, 0.5, 0],
                }}
                transition={{
                  duration: 3 + Math.random() * 2,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                }}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
