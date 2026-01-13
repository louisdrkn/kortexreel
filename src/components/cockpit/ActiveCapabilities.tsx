import { useState } from "react";
import { motion } from "framer-motion";
import { 
  MessageSquare, 
  Radar, 
  Headphones, 
  Mail,
  Phone,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Capability {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  enabled: boolean;
  status: string;
}

const defaultCapabilities: Capability[] = [
  {
    id: "contact",
    name: "Contact Client",
    description: "Je peux envoyer des SMS et des Mails",
    icon: MessageSquare,
    enabled: true,
    status: "Actif • 127 messages envoyés",
  },
  {
    id: "market",
    name: "Analyse Marché",
    description: "Je surveille 3 concurrents",
    icon: Radar,
    enabled: true,
    status: "Scanning • Mise à jour il y a 2h",
  },
  {
    id: "support",
    name: "Support 24/7",
    description: "Je réponds aux questions basiques",
    icon: Headphones,
    enabled: false,
    status: "En pause",
  },
  {
    id: "email",
    name: "Séquences Email",
    description: "3 campagnes automatisées actives",
    icon: Mail,
    enabled: true,
    status: "2 leads en nurturing",
  },
  {
    id: "calling",
    name: "Appels Automatisés",
    description: "Qualification par téléphone IA",
    icon: Phone,
    enabled: false,
    status: "Non configuré",
  },
];

export function ActiveCapabilities() {
  const [capabilities, setCapabilities] = useState<Capability[]>(defaultCapabilities);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    capability: Capability | null;
    action: "enable" | "disable";
  }>({ open: false, capability: null, action: "disable" });

  const handleToggle = (capability: Capability) => {
    setConfirmDialog({
      open: true,
      capability,
      action: capability.enabled ? "disable" : "enable",
    });
  };

  const confirmToggle = () => {
    if (!confirmDialog.capability) return;
    
    setCapabilities(prev => 
      prev.map(cap => 
        cap.id === confirmDialog.capability?.id 
          ? { ...cap, enabled: !cap.enabled }
          : cap
      )
    );
    setConfirmDialog({ open: false, capability: null, action: "disable" });
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-white text-lg font-semibold">Capacités Actives</h2>
          <span className="text-xs text-white/40">
            {capabilities.filter(c => c.enabled).length}/{capabilities.length} activées
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {capabilities.map((capability, index) => (
            <motion.div
              key={capability.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 + index * 0.05 }}
              className={cn(
                "p-4 rounded-xl transition-all duration-300",
                "border",
                capability.enabled
                  ? "bg-white/[0.03] border-white/[0.08] hover:border-violet-500/30"
                  : "bg-white/[0.01] border-white/[0.05] opacity-60"
              )}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center",
                  capability.enabled
                    ? "bg-violet-500/20 text-violet-400"
                    : "bg-white/5 text-white/30"
                )}>
                  <capability.icon className="h-5 w-5" />
                </div>
                <Switch
                  checked={capability.enabled}
                  onCheckedChange={() => handleToggle(capability)}
                  className="data-[state=checked]:bg-violet-600"
                />
              </div>

              <h3 className={cn(
                "font-medium mb-1 transition-colors",
                capability.enabled ? "text-white" : "text-white/50"
              )}>
                {capability.name}
              </h3>
              <p className={cn(
                "text-sm mb-3",
                capability.enabled ? "text-white/60" : "text-white/30"
              )}>
                {capability.description}
              </p>

              <div className="flex items-center justify-between pt-3 border-t border-white/[0.05]">
                <span className={cn(
                  "text-xs",
                  capability.enabled ? "text-white/40" : "text-white/20"
                )}>
                  {capability.status}
                </span>
                <ChevronRight className="h-4 w-4 text-white/20" />
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="bg-[#0a0a0f]/95 backdrop-blur-xl border border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>
              {confirmDialog.action === "disable" 
                ? `Désactiver ${confirmDialog.capability?.name} ?` 
                : `Activer ${confirmDialog.capability?.name} ?`
              }
            </DialogTitle>
            <DialogDescription className="text-white/60">
              {confirmDialog.action === "disable"
                ? `Voulez-vous que j'arrête ${confirmDialog.capability?.description?.toLowerCase()} pour ce client ?`
                : `Voulez-vous que je commence à ${confirmDialog.capability?.description?.toLowerCase()} pour ce client ?`
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => setConfirmDialog({ open: false, capability: null, action: "disable" })}
              className="text-white/60 hover:text-white hover:bg-white/5"
            >
              Annuler
            </Button>
            <Button
              onClick={confirmToggle}
              className={cn(
                confirmDialog.action === "disable"
                  ? "bg-red-600 hover:bg-red-500"
                  : "bg-violet-600 hover:bg-violet-500",
                "text-white"
              )}
            >
              {confirmDialog.action === "disable" ? "Oui, désactiver" : "Oui, activer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
