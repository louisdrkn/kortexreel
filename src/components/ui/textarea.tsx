import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  showCharCount?: boolean;
  maxLength?: number;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, showCharCount, maxLength, value, ...props }, ref) => {
    const charCount = typeof value === 'string' ? value.length : 0;
    
    return (
      <div className="relative w-full">
        <textarea
          className={cn(
            "flex min-h-[160px] w-full rounded-xl border border-border bg-card px-4 py-3.5 text-sm leading-relaxed",
            "text-foreground placeholder:text-muted-foreground/60",
            "ring-offset-background transition-all duration-200",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-2 focus-visible:border-primary/50",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "resize-y shadow-subtle hover:shadow-soft hover:border-border",
            showCharCount && "pb-9",
            className,
          )}
          ref={ref}
          value={value}
          maxLength={maxLength}
          {...props}
        />
        {showCharCount && (
          <div className="absolute bottom-3 right-4 text-[11px] text-muted-foreground/70 tabular-nums font-medium">
            {charCount.toLocaleString('fr-FR')}
            {maxLength && <span className="text-muted-foreground/50"> / {maxLength.toLocaleString('fr-FR')}</span>}
          </div>
        )}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
