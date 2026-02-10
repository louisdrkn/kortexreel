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
                    "absolute inset-0 rounded-full border-2 border-opacity-30 backdrop-blur-md transition-colors duration-500",
                    isActive
                        ? "border-slate-700 bg-slate-950/60"
                        : "border-slate-800 bg-slate-950/40",
                )}
            />

            {/* 2. Concentric Waves (Pulsing Sonar Effect) */}
            {isActive && (
                <>
                    {[0, 1, 2, 3].map((i) => (
                        <motion.div
                            key={i}
                            className={cn(
                                "absolute inset-0 rounded-full border-2 opacity-0",
                                getColor().split(" ")[1], // extracts border-color class
                            )}
                            initial={{
                                scale: 0.8,
                                opacity: 0,
                                borderWidth: "2px",
                            }}
                            animate={{
                                scale: 1.8,
                                opacity: [0, 0.6, 0],
                                borderWidth: ["2px", "1px", "0px"],
                            }}
                            transition={{
                                duration: 3, // Slower expansion
                                repeat: Infinity,
                                delay: i * 0.8, // Staggered
                                ease: "easeOut",
                            }}
                        />
                    ))}
                </>
            )}

            {/* 3. The Scanner (Rotating Radar Sweep) - Thicker and Glowier */}
            <motion.div
                className="absolute inset-0 rounded-full overflow-hidden"
                animate={isActive ? { rotate: 360 } : { rotate: 0 }}
                transition={isActive
                    ? {
                        duration: scanStep === "searching" ? 2.5 : 3.5,
                        repeat: Infinity,
                        ease: "linear",
                    }
                    : {}}
            >
                {/* The 'Beam' */}
                <div
                    className={cn(
                        "absolute top-0 left-1/2 w-1/2 h-full origin-left bg-gradient-to-t opacity-50 blur-xl pointer-events-none",
                        getGlowColor(),
                    )}
                    style={{ transformOrigin: "0 50%" }}
                />
                {/* Sharper leading edge */}
                <div
                    className={cn(
                        "absolute top-0 left-1/2 w-[2px] h-1/2 origin-bottom bg-gradient-to-t opacity-80",
                        isActive ? "bg-white" : "bg-transparent",
                    )}
                    style={{ transformOrigin: "0 100%" }}
                />
            </motion.div>

            {/* 4. Center Button / Core */}
            <button
                onClick={onScanClick}
                disabled={isActive}
                className={cn(
                    "relative z-20 flex items-center justify-center w-28 h-28 rounded-full border-2 transition-all duration-500 group",
                    isActive
                        ? getColor()
                        : "border-slate-700 hover:border-violet-500 hover:shadow-[0_0_40px_rgba(139,92,246,0.5)]",
                )}
            >
                <div
                    className={cn(
                        "absolute inset-3 rounded-full opacity-30 transition-all duration-500",
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
                                animate={{ rotate: -360 }} // Counter-rotate
                                transition={{
                                    duration: 8,
                                    repeat: Infinity,
                                    ease: "linear",
                                }}
                            >
                                <div className="w-10 h-10 border-t-2 border-l-2 border-current rounded-full" />
                            </motion.div>
                        )
                        : (
                            <span className="text-sm font-mono font-bold tracking-widest text-slate-300 group-hover:text-white drop-shadow-md">
                                SCAN
                            </span>
                        )}
                </div>
            </button>

            {/* 5. Floating Particles (Noise) - Only active when scanning */}
            {isActive && (
                <div className="absolute inset-0 overflow-hidden rounded-full pointer-events-none">
                    {[...Array(20)].map((_, i) => (
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
            className={cn(
                "absolute w-1.5 h-1.5 rounded-full bg-current shadow-[0_0_5px_currentColor]",
                color,
            )}
            style={{ top: randomPos.top, left: randomPos.left }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: [0, 1, 0], scale: [0, 2, 0] }}
            transition={{
                duration: Math.random() * 1.5 + 0.5,
                repeat: Infinity,
                delay: Math.random() * 2,
            }}
        />
    );
}
