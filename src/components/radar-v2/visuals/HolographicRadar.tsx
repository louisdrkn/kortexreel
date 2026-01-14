import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface HolographicRadarProps {
    isActive: boolean;
    scanStep:
        | "idle"
        | "analyzing"
        | "searching"
        | "validating"
        | "complete"
        | "error";
    onScanClick: () => void;
    className?: string;
}

export function HolographicRadar({
    isActive,
    scanStep,
    onScanClick,
    className,
}: HolographicRadarProps) {
    // Determine color theme based on step
    const getColor = () => {
        switch (scanStep) {
            case "analyzing":
                return "text-blue-500 border-blue-500 shadow-blue-500";
            case "searching":
                return "text-violet-500 border-violet-500 shadow-violet-500";
            case "validating":
                return "text-fuchsia-500 border-fuchsia-500 shadow-fuchsia-500";
            case "complete":
                return "text-emerald-500 border-emerald-500 shadow-emerald-500";
            case "error":
                return "text-red-500 border-red-500 shadow-red-500";
            default:
                return "text-slate-400 border-slate-700 shadow-slate-500";
        }
    };

    const getGlowColor = () => {
        switch (scanStep) {
            case "analyzing":
                return "from-blue-500/20 to-transparent";
            case "searching":
                return "from-violet-500/20 to-transparent";
            case "validating":
                return "from-fuchsia-500/20 to-transparent";
            case "complete":
                return "from-emerald-500/20 to-transparent";
            case "error":
                return "from-red-500/20 to-transparent";
            default:
                return "from-slate-500/10 to-transparent";
        }
    };

    return (
        <div
            className={cn(
                "relative flex items-center justify-center w-64 h-64 md:w-80 md:h-80 mx-auto",
                className,
            )}
        >
            {/* 1. Base Ring (Static) */}
            <div
                className={cn(
                    "absolute inset-0 rounded-full border border-opacity-20 backdrop-blur-sm transition-colors duration-500",
                    isActive
                        ? "border-slate-800 bg-slate-950/50"
                        : "border-slate-800 bg-slate-950/30",
                )}
            />

            {/* 2. Concentric Waves (Pulsing) */}
            {isActive && (
                <>
                    {[0, 1, 2].map((i) => (
                        <motion.div
                            key={i}
                            className={cn(
                                "absolute inset-0 rounded-full border opacity-0",
                                getColor().split(" ")[1], // extracts border-color class
                            )}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1.5, opacity: [0.5, 0] }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                delay: i * 0.6,
                                ease: "easeOut",
                            }}
                        />
                    ))}
                </>
            )}

            {/* 3. The Scanner (Rotating Radar Sweep) */}
            <motion.div
                className="absolute inset-0 rounded-full overflow-hidden"
                animate={isActive ? { rotate: 360 } : { rotate: 0 }}
                transition={isActive
                    ? {
                        duration: scanStep === "searching" ? 1.5 : 3,
                        repeat: Infinity,
                        ease: "linear",
                    }
                    : {}}
            >
                {/* The 'Beam' */}
                <div
                    className={cn(
                        "absolute top-0 left-1/2 w-1/2 h-full origin-left bg-gradient-to-t opacity-40 blur-md pointer-events-none",
                        getGlowColor(),
                    )}
                    style={{ transformOrigin: "0 50%" }}
                />
            </motion.div>

            {/* 4. Center Button / Core */}
            <button
                onClick={onScanClick}
                disabled={isActive}
                className={cn(
                    "relative z-20 flex items-center justify-center w-24 h-24 rounded-full border-2 transition-all duration-500 group",
                    isActive
                        ? getColor()
                        : "border-slate-700 hover:border-violet-500 hover:shadow-[0_0_30px_rgba(139,92,246,0.3)]",
                )}
            >
                <div
                    className={cn(
                        "absolute inset-2 rounded-full opacity-20 transition-all duration-500",
                        isActive
                            ? "bg-current animate-pulse"
                            : "bg-slate-800 group-hover:bg-violet-900",
                    )}
                />

                {/* Core Icon/Text */}
                <div className="relative z-30 flex flex-col items-center">
                    {isActive
                        ? (
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{
                                    duration: 4,
                                    repeat: Infinity,
                                    ease: "linear",
                                }}
                            >
                                <div className="w-8 h-8 border-t-2 border-r-2 border-current rounded-full" />
                            </motion.div>
                        )
                        : (
                            <span className="text-xs font-mono font-bold tracking-widest text-slate-300 group-hover:text-white">
                                SCAN
                            </span>
                        )}
                </div>
            </button>

            {/* 5. Floating Particles (Noise) - Only active when scanning */}
            {isActive && (
                <div className="absolute inset-0 overflow-hidden rounded-full pointer-events-none">
                    {[...Array(12)].map((_, i) => (
                        <Particle key={i} color={getColor().split(" ")[0]} />
                    ))}
                </div>
            )}
        </div>
    );
}

// Micro-component for random particles
function Particle({ color }: { color: string }) {
    const [randomPos] = useState({
        top: `${Math.random() * 80 + 10}%`,
        left: `${Math.random() * 80 + 10}%`,
    });

    return (
        <motion.div
            className={cn("absolute w-1 h-1 rounded-full bg-current", color)}
            style={{ top: randomPos.top, left: randomPos.left }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 0] }}
            transition={{
                duration: Math.random() * 1 + 0.5,
                repeat: Infinity,
                delay: Math.random() * 2,
            }}
        />
    );
}
