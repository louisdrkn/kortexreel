import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Brain, CheckCircle2, Satellite, Sparkles, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface CyberTerminalProps {
    scanStep:
        | "idle"
        | "analyzing"
        | "searching"
        | "validating"
        | "complete"
        | "error";
    targetName?: string;
    className?: string;
}

export function CyberTerminal(
    { scanStep, targetName, className }: CyberTerminalProps,
) {
    // Determine message and icon based on step
    const getStatus = () => {
        switch (scanStep) {
            case "analyzing":
                return {
                    icon: Satellite,
                    text: "INITIALISATION DES SATELLITES...",
                    color: "text-blue-400",
                };
            case "searching":
                return {
                    icon: Zap,
                    text: activeMessage, // Dynamic Message
                    color: "text-violet-400",
                };
            case "validating":
                return {
                    icon: Brain,
                    text: "ANALYSE NEURONALE DU CORTEX... DÉDUCTION EN COURS",
                    color: "text-fuchsia-400",
                };
            case "complete":
                return {
                    icon: CheckCircle2,
                    text: "MISSION TERMINÉE. CIBLES VERROUILLÉES.",
                    color: "text-emerald-400",
                };
            default:
                return {
                    icon: Sparkles,
                    text: "SYSTÈME EN ATTENTE. PRÊT AU DÉPLOIEMENT.",
                    color: "text-slate-500",
                };
        }
    };

    // Cycling Messages Logic
    const [activeMessage, setActiveMessage] = useState(
        "EXPLORATION DU WEB PROFOND...",
    );
    const SEARCH_MESSAGES = [
        "EXPLORATION DU WEB PROFOND...",
        "ANALYSE DES SIGNAUX DE MARCHÉ...",
        "DÉTECTION DES CIBLES POTENTIELLES...",
        "VÉRIFICATION DES SOURCES EN COURS...",
        "CONNEXION SÉCURISÉE AU CORTEX...",
        "RECHERCHE D'OPPORTUNITÉS CACHÉES...",
    ];

    useEffect(() => {
        if (scanStep !== "searching") return;

        let index = 0;
        const interval = setInterval(() => {
            index = (index + 1) % SEARCH_MESSAGES.length;
            setActiveMessage(SEARCH_MESSAGES[index]);
        }, 4000); // Change every 4 seconds

        return () => clearInterval(interval);
    }, [scanStep]);

    const status = getStatus();
    const Icon = status.icon;

    return (
        <div
            className={cn(
                "w-full max-w-md mx-auto p-4 font-mono text-sm",
                className,
            )}
        >
            <div className="flex items-center gap-3 mb-2">
                {/* Animated Icon */}
                <div
                    className={cn(
                        "relative p-2 rounded-lg bg-opacity-10",
                        status.color.replace("text-", "bg-"),
                    )}
                >
                    <Icon
                        className={cn(
                            "w-5 h-5",
                            status.color,
                            scanStep !== "idle" && scanStep !== "complete" &&
                                "animate-pulse",
                        )}
                    />

                    {/* Ping animation behind icon */}
                    {scanStep !== "idle" && scanStep !== "complete" && (
                        <span
                            className={cn(
                                "absolute inset-0 rounded-lg animate-ping opacity-20",
                                status.color.replace("text-", "bg-"),
                            )}
                        />
                    )}
                </div>

                {/* Typing Text */}
                <div className="flex-1 overflow-hidden h-6 flex items-center">
                    <Typewriter
                        text={status.text}
                        className={cn("font-bold tracking-tight", status.color)}
                    />
                </div>
            </div>

            {/* Progress Bar (Fake Terminal Loader) */}
            {(scanStep !== "idle" && scanStep !== "complete") && (
                <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden mt-2">
                    <motion.div
                        className={cn(
                            "h-full",
                            status.color.replace("text-", "bg-"),
                        )}
                        initial={{ width: "0%" }}
                        animate={{ width: "100%" }}
                        transition={{
                            duration: scanStep === "searching" ? 15 : 3, // Match Radar timing approx
                            ease: "linear",
                            repeat: Infinity,
                        }}
                    />
                </div>
            )}
        </div>
    );
}

// Typing Effect Component
function Typewriter({ text, className }: { text: string; className?: string }) {
    const [displayedText, setDisplayedText] = useState("");

    useEffect(() => {
        setDisplayedText("");
        let i = 0;
        const interval = setInterval(() => {
            setDisplayedText(text.slice(0, i + 1));
            i++;
            if (i > text.length) clearInterval(interval);
        }, 30); // Speed of typing

        return () => clearInterval(interval);
    }, [text]);

    return (
        <span className={className}>
            {displayedText}
            <span className="animate-pulse">_</span>
        </span>
    );
}
