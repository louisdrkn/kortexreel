import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
    Brain,
    CheckCircle2,
    Satellite,
    Sparkles,
    Terminal,
    Zap,
} from "lucide-react";
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

const MOCK_LOGS = [
    "INITIALIZING_CORTEX_V2...",
    "ESTABLISHING_NEURAL_UPLINK...",
    "SCANNING_GLOBAL_DATABASES...",
    "FILTERING_NOISE_PATTERNS...",
    "DETECTING_HIGH_VALUE_TARGETS...",
    "ANALYZING_COMPANY_STRUCTURES...",
    "CROSS_REFERENCING_TECH_STACKS...",
    "VALIDATING_DECISION_MAKERS...",
    "OPTIMIZING_OUTREACH_VECTORS...",
    "COMPILING_STRATEGIC_DATA...",
    "ENCRYPTING_RESULTS_BUFFER...",
    "MISSION_OBJECTIVES_UPDATED.",
];

export function CyberTerminal(
    { scanStep, targetName, className }: CyberTerminalProps,
) {
    const [logs, setLogs] = useState<string[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    // Generate logs sequence
    useEffect(() => {
        if (scanStep === "idle" || scanStep === "complete") {
            if (scanStep === "idle") {
                setLogs(["SYSTEM_YIELD. STANDBY_MODE_ENGAGED."]);
            }
            return;
        }

        setLogs([]); // Reset on start
        let currentIndex = 0;

        const interval = setInterval(() => {
            if (currentIndex >= MOCK_LOGS.length) {
                currentIndex = 0; // Loop logs if scan is long
            }

            const timestamp = new Date().toLocaleTimeString("fr-FR", {
                hour12: false,
            });
            const newLog = `[${timestamp}] ${MOCK_LOGS[currentIndex]}`;

            setLogs((prev) => [...prev.slice(-6), newLog]); // Keep last 7 logs
            currentIndex++;
        }, 800); // New log every 800ms

        return () => clearInterval(interval);
    }, [scanStep]);

    // Determine status color
    const getStatusColor = () => {
        switch (scanStep) {
            case "analyzing":
                return "text-blue-400";
            case "searching":
                return "text-violet-400";
            case "validating":
                return "text-fuchsia-400";
            case "complete":
                return "text-emerald-400";
            case "error":
                return "text-red-400";
            default:
                return "text-slate-400";
        }
    };

    const statusColor = getStatusColor();

    return (
        <div
            className={cn(
                "w-full max-w-lg mx-auto overflow-hidden rounded-lg border border-zinc-800 bg-black/90 shadow-2xl backdrop-blur-xl",
                className,
            )}
        >
            {/* Terminal Header */}
            <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900/50 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                    <Terminal className={cn("w-3 h-3", statusColor)} />
                    <span className="text-[10px] font-mono font-bold text-zinc-400">
                        CORTEX_SYSTEM_LOGS
                    </span>
                </div>
                <div className="flex gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-red-500/20 border border-red-500/50" />
                    <div className="w-2 h-2 rounded-full bg-amber-500/20 border border-amber-500/50" />
                    <div className="w-2 h-2 rounded-full bg-emerald-500/20 border border-emerald-500/50" />
                </div>
            </div>

            {/* Terminal Body */}
            <div
                ref={scrollRef}
                className="p-4 h-48 overflow-y-auto font-mono text-xs space-y-1 scrollbar-hide"
            >
                {logs.map((log, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-start gap-2 text-emerald-500/90"
                    >
                        <span className="shrink-0 text-zinc-600">{">"}</span>
                        <span>
                            {log}
                            {i === logs.length - 1 && (
                                <span className="animate-pulse ml-1 inline-block w-1.5 h-3 bg-emerald-500 align-middle" />
                            )}
                        </span>
                    </motion.div>
                ))}

                {logs.length === 0 && (
                    <div className="h-full flex items-center justify-center text-zinc-700 italic">
                        WAITING_FOR_INPUT...
                    </div>
                )}
            </div>

            {/* Footer Status */}
            <div className="px-3 py-1 bg-zinc-900/80 border-t border-zinc-800 flex justify-between items-center text-[10px] font-mono text-zinc-500">
                <span>PID: {Math.floor(Math.random() * 9000) + 1000}</span>
                <span className={cn("uppercase", statusColor)}>
                    {scanStep === "idle" ? "READY" : scanStep}
                </span>
            </div>
        </div>
    );
}

// Typing Effect Component (Depreciated in this version but kept for ref if needed)
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
