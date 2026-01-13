import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

interface TypewriterSubtitlesProps {
  text: string;
  isVisible?: boolean;
  speed?: number; // ms per character
  onComplete?: () => void;
}

export function TypewriterSubtitles({
  text,
  isVisible = true,
  speed = 30,
  onComplete,
}: TypewriterSubtitlesProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (!isVisible || !text) {
      setDisplayedText("");
      return;
    }

    setIsTyping(true);
    setDisplayedText("");
    let currentIndex = 0;

    const interval = setInterval(() => {
      if (currentIndex < text.length) {
        setDisplayedText(text.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        clearInterval(interval);
        setIsTyping(false);
        onComplete?.();
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, isVisible, speed, onComplete]);

  return (
    <AnimatePresence>
      {isVisible && displayedText && (
        <motion.div
          className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[10002] max-w-3xl w-full px-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3 }}
        >
          <div className="relative">
            {/* Background blur */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md rounded-lg" />
            
            {/* Content */}
            <div className="relative px-6 py-4">
              {/* Kortex indicator */}
              <div className="flex items-center gap-2 mb-2">
                <motion.div
                  className="w-2 h-2 rounded-full bg-primary"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <span className="text-xs font-medium text-primary uppercase tracking-wider">
                  Kortex
                </span>
              </div>

              {/* Text */}
              <p className="text-lg text-white/90 leading-relaxed font-light">
                {displayedText}
                {isTyping && (
                  <motion.span
                    className="inline-block w-0.5 h-5 bg-primary ml-1 align-middle"
                    animate={{ opacity: [1, 0] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                  />
                )}
              </p>
            </div>

            {/* Decorative border */}
            <div className="absolute inset-0 rounded-lg border border-white/10 pointer-events-none" />
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary via-primary/50 to-transparent rounded-l-lg" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
