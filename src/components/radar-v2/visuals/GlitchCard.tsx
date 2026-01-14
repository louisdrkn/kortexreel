import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface GlitchCardProps {
    children: React.ReactNode;
    delay?: number; // Stagger delay
}

export function GlitchCard({ children, delay = 0 }: GlitchCardProps) {
    const [stage, setStage] = useState<"blip" | "glitch" | "reveal">("blip");

    useEffect(() => {
        // Sequence: Blip -> Glitch -> Reveal
        const t1 = setTimeout(() => setStage("glitch"), 500 + delay * 100);
        const t2 = setTimeout(() => setStage("reveal"), 1200 + delay * 100);

        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
        };
    }, [delay]);

    return (
        <div className="relative">
            <AnimatePresence mode="wait">
                {/* STAGE 1: THE BLIP (Radar Dot) */}
                {stage === "blip" && (
                    <motion.div
                        key="blip"
                        className="flex items-center justify-center p-12"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                    >
                        <div className="w-4 h-4 bg-emerald-400 rounded-full shadow-[0_0_20px_rgba(52,211,153,0.8)] animate-ping" />
                    </motion.div>
                )}

                {/* STAGE 2: THE GLITCH (Decoding) */}
                {stage === "glitch" && (
                    <motion.div
                        key="glitch"
                        className="w-full h-48 bg-emerald-900/10 border border-emerald-500/30 rounded-xl flex items-center justify-center overflow-hidden relative"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        {/* Matrix rain / Noise lines */}
                        <div className="font-mono text-emerald-500/50 text-xs p-4 break-all opacity-50">
                            {Array.from({ length: 400 }).map(() =>
                                Math.random() > 0.5 ? "1" : "0"
                            ).join("")}
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/50" />

                        {/* Decoding Text center */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="bg-emerald-500/20 text-emerald-300 px-2 py-1 font-mono text-xs rounded animate-pulse">
                                DÉCRYPTAGE...
                            </span>
                        </div>
                    </motion.div>
                )}

                {/* STAGE 3: THE REVEAL (Actual Content) */}
                {stage === "reveal" && (
                    <motion.div
                        key="reveal"
                        initial={{
                            opacity: 0,
                            scale: 0.95,
                            filter: "blur(10px)",
                        }}
                        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                        transition={{ duration: 0.5, ease: "circOut" }}
                        className="relative"
                    >
                        {children}

                        {/* Holographic Border Flash on Entry */}
                        <motion.div
                            className="absolute inset-0 rounded-xl border-2 border-emerald-400/50 pointer-events-none"
                            initial={{ opacity: 1 }}
                            animate={{ opacity: 0, scale: 1.05 }}
                            transition={{ duration: 0.8 }}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
