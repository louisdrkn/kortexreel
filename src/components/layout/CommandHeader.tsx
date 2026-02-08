import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CommandHeaderProps {
    title: ReactNode;
    subtitle?: ReactNode;
    icon?: LucideIcon;
    actions?: ReactNode;
    className?: string;
}

export function CommandHeader({
    title,
    subtitle,
    icon: Icon,
    actions,
    className,
}: CommandHeaderProps) {
    return (
        <div
            className={cn(
                "flex flex-col md:flex-row items-start md:items-center justify-between border-b border-white/10 pb-6 mb-6 gap-4 md:gap-0",
                className,
            )}
        >
            <div className="flex items-center gap-3">
                {Icon && <Icon className="h-6 w-6 text-emerald-500" />}
                <div className="flex flex-col md:flex-row md:items-baseline md:gap-3">
                    <div className="text-2xl font-semibold text-foreground tracking-tight">
                        {title}
                    </div>
                    {subtitle && (
                        <div className="text-sm text-zinc-500 font-mono hidden md:block">
                            {subtitle}
                        </div>
                    )}
                </div>
                {/* Mobile subtitle */}
                {subtitle && (
                    <div className="text-sm text-zinc-500 font-mono md:hidden mt-1">
                        {subtitle}
                    </div>
                )}
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                {actions}
            </div>
        </div>
    );
}
