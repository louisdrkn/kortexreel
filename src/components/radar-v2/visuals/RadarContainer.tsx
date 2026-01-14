import React from "react";
import { cn } from "@/lib/utils";

interface RadarContainerProps {
    children: React.ReactNode;
    className?: string;
}

export function RadarContainer({ children, className }: RadarContainerProps) {
    return (
        <div
            className={cn(
                "relative min-h-screen w-full bg-slate-950 text-slate-100 selection:bg-violet-500/30",
                className,
            )}
        >
            {/* Background Gradients/Glows */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {/* Top Center Glow (Blue/Violet) */}
                <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-violet-900/20 blur-[120px] rounded-full mix-blend-screen animate-pulse-slow" />

                {/* Bottom Right Glow (Cyan/Green) */}
                <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[500px] bg-emerald-900/10 blur-[100px] rounded-full mix-blend-screen" />

                {/* Grid Pattern Overlay */}
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
                <div
                    className="absolute inset-0 opacity-[0.03]"
                    style={{
                        backgroundImage:
                            `linear-gradient(to right, #808080 1px, transparent 1px),
            linear-gradient(to bottom, #808080 1px, transparent 1px)`,
                        backgroundSize: "40px 40px",
                    }}
                />
            </div>

            {/* Main Content Layer */}
            <div className="relative z-10">
                {children}
            </div>
        </div>
    );
}
