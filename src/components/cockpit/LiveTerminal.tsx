import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Terminal, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogEntry {
  id: number;
  timestamp: string;
  type: "scan" | "analysis" | "write" | "action" | "success";
  message: string;
  status: "OK" | "DONE" | "SENT" | "PROCESSING";
}

// Typewriter hook
function useTypewriter(text: string, speed: number = 15) {
  const [displayedText, setDisplayedText] = useState("");
  
  useEffect(() => {
    let index = 0;
    setDisplayedText("");
    
    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.slice(0, index + 1));
        index++;
      } else {
        clearInterval(interval);
      }
    }, speed);
    
    return () => clearInterval(interval);
  }, [text, speed]);
  
  return displayedText;
}

const logTemplates: Omit<LogEntry, "id" | "timestamp">[] = [
  { type: "scan", message: "SCANNING > LinkedIn Profile: Jean Dupont...", status: "OK" },
  { type: "analysis", message: "ANALYSIS > Pain points identified: \"Manque de temps\"...", status: "OK" },
  { type: "write", message: "WRITING > Generating personalized cold email (Model v4)...", status: "DONE" },
  { type: "action", message: "ACTION > Email scheduled for 10:00 AM.", status: "SENT" },
  { type: "scan", message: "SCANNING > Company website: techcorp.fr...", status: "OK" },
  { type: "analysis", message: "ANALYSIS > Decision maker detected: CTO...", status: "OK" },
  { type: "scan", message: "SCANNING > LinkedIn Profile: Marie Martin...", status: "OK" },
  { type: "write", message: "WRITING > Proposal section: ROI Analysis...", status: "DONE" },
  { type: "success", message: "SUCCESS > Lead scored: 94% match with ICP.", status: "OK" },
  { type: "action", message: "ACTION > Added to pipeline: €12,500 potential.", status: "DONE" },
  { type: "scan", message: "SCANNING > Weak signals: Hiring activity detected...", status: "OK" },
  { type: "analysis", message: "ANALYSIS > Intent score calculated: HIGH...", status: "OK" },
];

export function LiveTerminal() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const logIdRef = useRef(0);

  const getTimestamp = () => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;
  };

  const getTypeColor = (type: LogEntry["type"]) => {
    switch (type) {
      case "scan": return "text-cyan-400";
      case "analysis": return "text-amber-400";
      case "write": return "text-cockpit-violet";
      case "action": return "text-blue-400";
      case "success": return "text-cockpit-success";
    }
  };

  const getStatusColor = (status: LogEntry["status"]) => {
    switch (status) {
      case "OK": return "text-cockpit-success";
      case "DONE": return "text-cockpit-success";
      case "SENT": return "text-blue-400";
      case "PROCESSING": return "text-amber-400";
    }
  };

  // Add new logs periodically
  useEffect(() => {
    const addLog = () => {
      const template = logTemplates[Math.floor(Math.random() * logTemplates.length)];
      const newLog: LogEntry = {
        ...template,
        id: logIdRef.current++,
        timestamp: getTimestamp(),
      };

      setIsTyping(true);
      
      setTimeout(() => {
        setLogs((prev) => [...prev.slice(-15), newLog]);
        setIsTyping(false);
      }, 300);
    };

    // Initial logs
    for (let i = 0; i < 5; i++) {
      setTimeout(() => addLog(), i * 400);
    }

    // Continue adding logs
    const interval = setInterval(addLog, 2500);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="h-full flex flex-col bg-[#0D0D0F] rounded-lg overflow-hidden">
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-black/40 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5 text-cockpit-muted" />
          <span className="text-xs font-medium text-cockpit-muted">LIVE OPERATIONS</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Circle className="h-2 w-2 fill-cockpit-success text-cockpit-success animate-pulse" />
            <span className="text-[10px] text-cockpit-muted">RUNNING</span>
          </div>
          <span className="text-[10px] text-cockpit-muted tabular-nums">
            {logs.length} ops
          </span>
        </div>
      </div>

      {/* Log Output */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-3 font-mono text-[11px] leading-relaxed scroll-smooth"
        style={{ maxHeight: "160px" }}
      >
        {logs.map((log, index) => (
          <TypewriterLogLine key={log.id} log={log} isLatest={index === logs.length - 1} />
        ))}
        
        {/* Typing indicator */}
        {isTyping && (
          <div className="flex items-center gap-1 py-0.5 text-cockpit-muted">
            <motion.span 
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            >
              ▊
            </motion.span>
          </div>
        )}
      </div>
    </div>
  );
}

// Typewriter log line component
function TypewriterLogLine({ log, isLatest }: { log: LogEntry; isLatest: boolean }) {
  const fullText = log.message;
  const displayedText = useTypewriter(isLatest ? fullText : fullText, isLatest ? 8 : 0);
  
  const getTypeColor = (type: LogEntry["type"]) => {
    switch (type) {
      case "scan": return "text-cyan-400";
      case "analysis": return "text-amber-400";
      case "write": return "text-cockpit-violet";
      case "action": return "text-blue-400";
      case "success": return "text-cockpit-success";
    }
  };

  const getStatusColor = (status: LogEntry["status"]) => {
    switch (status) {
      case "OK": return "text-cockpit-success";
      case "DONE": return "text-cockpit-success";
      case "SENT": return "text-blue-400";
      case "PROCESSING": return "text-amber-400";
    }
  };
  
  const textToShow = isLatest ? displayedText : fullText;
  const isComplete = textToShow.length === fullText.length;
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.15 }}
      className="flex items-start gap-2 py-0.5"
    >
      <span className="text-cockpit-muted shrink-0">[{log.timestamp}]</span>
      <span className={cn("shrink-0", getTypeColor(log.type))}>
        {textToShow.split(">")[0]}{textToShow.includes(">") ? ">" : ""}
      </span>
      <span className="text-white/70">
        {textToShow.split(">").slice(1).join(">")}
        {isLatest && !isComplete && <span className="animate-pulse">▊</span>}
      </span>
      {isComplete && (
        <motion.span 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={cn("shrink-0 ml-auto", getStatusColor(log.status))}
        >
          [{log.status}]
        </motion.span>
      )}
    </motion.div>
  );
}
