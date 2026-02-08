import { Loader2 } from "lucide-react";
import kortexLogo from "@/assets/kortex-logo-transparent.png";

export function FullScreenAuthLoader({
  label = "Synchronisation de la session…",
}: {
  label?: string;
}) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background text-foreground">
      <div className="flex flex-col items-center gap-4">
        <img
          src={kortexLogo}
          alt="Kortex"
          className="h-14 w-14 object-contain animate-pulse-subtle brightness-110"
          loading="eager"
        />
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span>{label}</span>
        </div>
      </div>
    </div>
  );
}
