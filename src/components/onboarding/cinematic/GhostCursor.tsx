import { motion, useSpring, useTransform } from "framer-motion";
import { useEffect, useState } from "react";

interface GhostCursorProps {
  position: { x: number; y: number };
  isClicking?: boolean;
  isHovering?: boolean;
  isVisible?: boolean;
}

export function GhostCursor({ 
  position, 
  isClicking = false, 
  isHovering = false,
  isVisible = true 
}: GhostCursorProps) {
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);

  // Smooth spring animation for cursor movement
  const springConfig = { damping: 25, stiffness: 200 };
  const x = useSpring(position.x, springConfig);
  const y = useSpring(position.y, springConfig);

  // Update spring values when position changes
  useEffect(() => {
    x.set(position.x);
    y.set(position.y);
  }, [position.x, position.y, x, y]);

  // Create ripple effect on click
  useEffect(() => {
    if (isClicking) {
      const newRipple = { id: Date.now(), x: position.x, y: position.y };
      setRipples(prev => [...prev, newRipple]);
      
      // Remove ripple after animation
      setTimeout(() => {
        setRipples(prev => prev.filter(r => r.id !== newRipple.id));
      }, 600);
    }
  }, [isClicking, position.x, position.y]);

  if (!isVisible) return null;

  return (
    <>
      {/* Click ripples */}
      {ripples.map(ripple => (
        <motion.div
          key={ripple.id}
          className="fixed pointer-events-none z-[10001]"
          style={{ left: ripple.x, top: ripple.y }}
          initial={{ scale: 0, opacity: 0.8 }}
          animate={{ scale: 2, opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="w-12 h-12 -ml-6 -mt-6 rounded-full border-2 border-primary" />
        </motion.div>
      ))}

      {/* Main cursor */}
      <motion.div
        className="fixed pointer-events-none z-[10000]"
        style={{ x, y }}
      >
        {/* Hover glow effect */}
        <motion.div
          className="absolute -inset-4 rounded-full bg-primary/20 blur-xl"
          animate={{
            scale: isHovering ? 1.5 : 1,
            opacity: isHovering ? 0.6 : 0.3,
          }}
          transition={{ duration: 0.3 }}
        />

        {/* Cursor body */}
        <motion.svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          className="-ml-1 -mt-1"
          animate={{
            scale: isClicking ? 0.85 : isHovering ? 1.1 : 1,
          }}
          transition={{ duration: 0.15 }}
        >
          {/* Cursor shape */}
          <motion.path
            d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87c.48 0 .72-.58.38-.92L6.35 2.85c-.34-.35-.85-.11-.85.36Z"
            fill="hsl(var(--primary))"
            stroke="hsl(var(--primary-foreground))"
            strokeWidth="1.5"
          />
          
          {/* Inner glow */}
          <motion.path
            d="M7 6v10l3-3h5L7 6Z"
            fill="hsl(var(--primary-foreground))"
            opacity={0.3}
          />
        </motion.svg>

        {/* Kortex label */}
        <motion.div
          className="absolute left-6 top-4 px-2 py-0.5 rounded bg-primary text-primary-foreground text-xs font-medium whitespace-nowrap"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          Kortex
        </motion.div>
      </motion.div>
    </>
  );
}
