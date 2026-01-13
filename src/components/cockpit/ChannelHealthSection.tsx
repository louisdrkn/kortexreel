import { motion } from "framer-motion";
import { Shield, Linkedin, Mail, AlertTriangle, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type ChannelStatus = "secure" | "healthy" | "warning" | "disconnected";

interface Channel {
  id: string;
  type: "linkedin" | "email";
  name: string;
  status: ChannelStatus;
  statusLabel: string;
  detail: string;
  subtext: string;
}

const channels: Channel[] = [
  {
    id: "1",
    type: "linkedin",
    name: "LinkedIn (Jean T.)",
    status: "secure",
    statusLabel: "SECURE",
    detail: "Proxy Résidentiel Actif",
    subtext: "45 invitations restantes aujourd'hui",
  },
  {
    id: "2",
    type: "email",
    name: "Email (jean@kortex.ai)",
    status: "healthy",
    statusLabel: "HEALTHY",
    detail: "Warmup actif, 98% délivrabilité",
    subtext: "Dernière sync: il y a 5 min",
  },
  {
    id: "3",
    type: "email",
    name: "Email (sales@kortex.ai)",
    status: "disconnected",
    statusLabel: "DISCONNECTED",
    detail: "Action requise: Reconnecter SMTP",
    subtext: "Dernière activité: il y a 2 jours",
  },
];

const StatusIcon = ({ status }: { status: ChannelStatus }) => {
  switch (status) {
    case "secure":
    case "healthy":
      return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
    case "warning":
      return <AlertTriangle className="h-4 w-4 text-amber-400" />;
    case "disconnected":
      return <XCircle className="h-4 w-4 text-red-400" />;
  }
};

const StatusDot = ({ status }: { status: ChannelStatus }) => {
  const colors = {
    secure: "bg-emerald-500",
    healthy: "bg-emerald-500",
    warning: "bg-amber-500",
    disconnected: "bg-red-500",
  };

  return (
    <span className="relative flex h-2.5 w-2.5">
      {(status === "secure" || status === "healthy") && (
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${colors[status]} opacity-75`} />
      )}
      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${colors[status]}`} />
    </span>
  );
};

export function ChannelHealthSection() {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-emerald-400" />
        <h2 className="text-lg font-semibold text-white">Santé des Canaux</h2>
        <span className="text-xs text-[#A1A1AA] ml-2">Infrastructure de Chasse</span>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-[#131316] rounded-xl border border-white/[0.05] overflow-hidden"
      >
        <div className="divide-y divide-white/[0.05]">
          {channels.map((channel, index) => (
            <motion.div
              key={channel.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + index * 0.1 }}
              className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-white/[0.05] flex items-center justify-center">
                  {channel.type === "linkedin" ? (
                    <Linkedin className="h-5 w-5 text-[#0A66C2]" />
                  ) : (
                    <Mail className="h-5 w-5 text-[#A1A1AA]" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">{channel.name}</span>
                    <StatusDot status={channel.status} />
                    <span className={`text-xs font-mono px-2 py-0.5 rounded ${
                      channel.status === "disconnected" 
                        ? "bg-red-500/10 text-red-400" 
                        : channel.status === "warning"
                        ? "bg-amber-500/10 text-amber-400"
                        : "bg-emerald-500/10 text-emerald-400"
                    }`}>
                      {channel.statusLabel}
                    </span>
                  </div>
                  <p className="text-sm text-[#A1A1AA]">{channel.detail}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs text-[#666]">{channel.subtext}</span>
                {channel.status === "disconnected" ? (
                  <Button size="sm" variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10">
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Reconnecter
                  </Button>
                ) : (
                  <Button size="sm" variant="ghost" className="text-[#A1A1AA] hover:text-white">
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
