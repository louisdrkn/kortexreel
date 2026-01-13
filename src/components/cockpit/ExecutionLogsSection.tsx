import { motion } from "framer-motion";
import { Terminal, User, Mail, Clock, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";

interface LogEntry {
  id: string;
  type: "enrichment" | "message" | "scheduled" | "success";
  text: string;
  timestamp: string;
}

const initialLogs: LogEntry[] = [
  { id: "1", type: "enrichment", text: "Lead 'Thomas D.' enrichi (Email Pro trouvé)", timestamp: "14:32:05" },
  { id: "2", type: "message", text: "Message LinkedIn envoyé à 'Sarah L.' (Délai respecté)", timestamp: "14:31:42" },
  { id: "3", type: "scheduled", text: "Relance J+3 programmée pour 'Marc O.'", timestamp: "14:30:18" },
  { id: "4", type: "success", text: "Réponse positive détectée de 'Julie M.' → Pipeline mis à jour", timestamp: "14:28:55" },
  { id: "5", type: "enrichment", text: "Scraping terminé: 23 nouveaux profils CEO SaaS", timestamp: "14:25:00" },
];

const LogIcon = ({ type }: { type: LogEntry["type"] }) => {
  switch (type) {
    case "enrichment":
      return <User className="h-3 w-3 text-violet-400" />;
    case "message":
      return <Mail className="h-3 w-3 text-blue-400" />;
    case "scheduled":
      return <Clock className="h-3 w-3 text-amber-400" />;
    case "success":
      return <CheckCircle2 className="h-3 w-3 text-emerald-400" />;
  }
};

export function ExecutionLogsSection() {
  const [logs, setLogs] = useState<LogEntry[]>(initialLogs);

  // Simulate new logs arriving
  useEffect(() => {
    const interval = setInterval(() => {
      const newLogTypes: LogEntry["type"][] = ["enrichment", "message", "scheduled"];
      const randomType = newLogTypes[Math.floor(Math.random() * newLogTypes.length)];
      const names = ["Alex P.", "Marie K.", "Pierre L.", "Emma V.", "Lucas R."];
      const randomName = names[Math.floor(Math.random() * names.length)];

      const messages = {
        enrichment: `Lead '${randomName}' enrichi (Email Pro trouvé)`,
        message: `Message LinkedIn envoyé à '${randomName}'`,
        scheduled: `Relance J+3 programmée pour '${randomName}'`,
        success: `Réponse positive de '${randomName}'`,
      };

      const now = new Date();
      const timestamp = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;

      setLogs((prev) => [
        { id: Date.now().toString(), type: randomType, text: messages[randomType], timestamp },
        ...prev.slice(0, 9),
      ]);
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Terminal className="h-5 w-5 text-[#A1A1AA]" />
        <h2 className="text-lg font-semibold text-white">Logs d'Exécution</h2>
        <div className="flex items-center gap-1 ml-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-xs text-emerald-400">Live</span>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-[#0C0C0E] rounded-xl border border-white/[0.05] p-4 font-mono text-sm max-h-48 overflow-y-auto"
      >
        <div className="space-y-2">
          {logs.map((log, index) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="flex items-start gap-3 text-[#A1A1AA]"
            >
              <span className="text-[#666] text-xs shrink-0">{log.timestamp}</span>
              <LogIcon type={log.type} />
              <span className={`${index === 0 ? "text-white" : ""}`}>
                {log.text}
              </span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
