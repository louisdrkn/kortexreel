import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface DataStreamEffectProps {
  isActive: boolean;
  onComplete?: () => void;
  duration?: number;
}

const mockDataFragments = [
  '{ "email": "john.doe@' ,
  '"linkedin": "/in/sarah' ,
  '"title": "VP Sales"' ,
  '"company": "Tesla Inc"' ,
  '"phone": "+1 650..."' ,
  '"verified": true' ,
  '"score": 94' ,
  '"name": "Michael Chen"' ,
  '"department": "Eng..."' ,
  '"seniority": "C-Level"' ,
];

const finalContacts = [
  { name: "Sarah Mitchell", title: "VP of Sales", email: "s.mitchell@tesla.com", verified: true },
  { name: "Michael Chen", title: "Head of Partnerships", email: "m.chen@tesla.com", verified: true },
  { name: "Jennifer Walsh", title: "Director of BD", email: "j.walsh@tesla.com", verified: true },
];

export function DataStreamEffect({ isActive, onComplete, duration = 3000 }: DataStreamEffectProps) {
  const [phase, setPhase] = useState<"streaming" | "assembling" | "complete">("streaming");
  const [streamLines, setStreamLines] = useState<string[]>([]);

  useEffect(() => {
    if (!isActive) {
      setPhase("streaming");
      setStreamLines([]);
      return;
    }

    // Phase 1: Streaming data
    let lineIndex = 0;
    const streamInterval = setInterval(() => {
      if (lineIndex < 20) {
        const randomFragment = mockDataFragments[Math.floor(Math.random() * mockDataFragments.length)];
        setStreamLines(prev => [...prev.slice(-15), randomFragment]);
        lineIndex++;
      }
    }, 100);

    // Phase 2: Assembling
    const assembleTimeout = setTimeout(() => {
      clearInterval(streamInterval);
      setPhase("assembling");
    }, duration * 0.6);

    // Phase 3: Complete
    const completeTimeout = setTimeout(() => {
      setPhase("complete");
      onComplete?.();
    }, duration);

    return () => {
      clearInterval(streamInterval);
      clearTimeout(assembleTimeout);
      clearTimeout(completeTimeout);
    };
  }, [isActive, duration, onComplete]);

  if (!isActive) return null;

  return (
    <motion.div
      className="fixed inset-0 z-[9998] pointer-events-none flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Matrix stream effect */}
      {phase === "streaming" && (
        <div className="absolute inset-0 overflow-hidden">
          {Array.from({ length: 8 }).map((_, colIndex) => (
            <div
              key={colIndex}
              className="absolute top-0 text-xs font-mono text-primary/60"
              style={{ left: `${10 + colIndex * 12}%` }}
            >
              {streamLines.map((line, lineIndex) => (
                <motion.div
                  key={`${colIndex}-${lineIndex}`}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: [0, 1, 0.5], y: lineIndex * 24 }}
                  transition={{ duration: 0.5 }}
                  className="whitespace-nowrap"
                >
                  {line}
                </motion.div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Assembling phase */}
      {phase === "assembling" && (
        <motion.div
          className="bg-card/95 backdrop-blur-sm rounded-lg border border-border p-6 w-[400px]"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <motion.div
              className="w-3 h-3 rounded-full bg-primary"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            />
            <span className="text-sm text-muted-foreground">Assemblage des données...</span>
          </div>

          <div className="space-y-2">
            {finalContacts.map((_, index) => (
              <motion.div
                key={index}
                className="h-16 bg-muted/50 rounded animate-pulse"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.2 }}
              />
            ))}
          </div>
        </motion.div>
      )}

      {/* Complete phase - show final contacts */}
      {phase === "complete" && (
        <motion.div
          className="bg-card/95 backdrop-blur-sm rounded-lg border border-border p-6 w-[400px]"
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-sm text-green-500">3 décideurs identifiés</span>
          </div>

          <div className="space-y-3">
            {finalContacts.map((contact, index) => (
              <motion.div
                key={contact.email}
                className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border/50"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.15 }}
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-medium">
                  {contact.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground truncate">{contact.name}</span>
                    {contact.verified && (
                      <span className="text-xs px-1.5 py-0.5 bg-green-500/10 text-green-500 rounded">
                        ✓ Vérifié
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground truncate">{contact.title}</div>
                  <div className="text-xs text-muted-foreground/60 truncate">{contact.email}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
