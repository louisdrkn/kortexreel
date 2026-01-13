import { motion } from "framer-motion";
import { Brain, Sparkles, RefreshCw, Copy, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const personalities = [
  { id: "hunter", label: "🎯 Chasseur Agressif", description: "Direct, orienté action, urgent" },
  { id: "consultant", label: "🧠 Consultant Expert", description: "Éducatif, valeur ajoutée, patient" },
  { id: "peer", label: "🤝 Peer-to-Peer", description: "Conversationnel, égalitaire, curieux" },
  { id: "authority", label: "👔 Autorité Sectorielle", description: "Crédibilité, insights exclusifs" },
];

const sampleMessages = {
  hunter: "Bonjour [Name], j'ai vu que vous recrutez 3 SDRs. Chez nous, nos clients ont divisé par 4 leur temps de prospection. 15 min cette semaine pour en discuter ?",
  consultant: "Bonjour [Name], j'ai analysé votre stack commerciale. 3 points d'optimisation ressortent, notamment sur le scoring de vos leads entrants. Je vous partage mon analyse ?",
  peer: "Hey [Name] ! Je vois qu'on évolue dans le même écosystème SaaS. Curieux de savoir comment vous gérez la qualification de vos prospects inbound ?",
  authority: "Bonjour [Name], nous venons de publier notre étude sur les pratiques commerciales B2B 2024. Votre secteur y figure. Souhaitez-vous recevoir les insights clés ?",
};

export function AIBrainSection() {
  const [selectedPersonality, setSelectedPersonality] = useState("hunter");
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const currentPersonality = personalities.find((p) => p.id === selectedPersonality)!;
  const currentMessage = sampleMessages[selectedPersonality as keyof typeof sampleMessages];

  const handleCopy = () => {
    navigator.clipboard.writeText(currentMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Brain className="h-5 w-5 text-violet-400" />
        <h2 className="text-lg font-semibold text-white">Le Cerveau</h2>
        <span className="text-xs text-[#A1A1AA] ml-2">Configuration IA</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Personality Selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#131316] rounded-xl border border-white/[0.05] p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-4 w-4 text-violet-400" />
            <span className="text-white font-medium">Personnalité Active</span>
          </div>

          {/* Custom Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="w-full flex items-center justify-between px-4 py-3 bg-[#18181B] border border-white/[0.1] rounded-lg text-left hover:border-violet-500/50 transition-colors"
            >
              <div>
                <span className="text-white font-medium">{currentPersonality.label}</span>
                <p className="text-xs text-[#A1A1AA] mt-0.5">{currentPersonality.description}</p>
              </div>
              <ChevronDown className={`h-4 w-4 text-[#A1A1AA] transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>

            {isOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute z-10 w-full mt-2 bg-[#18181B] border border-white/[0.1] rounded-lg overflow-hidden shadow-xl"
              >
                {personalities.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedPersonality(p.id);
                      setIsOpen(false);
                    }}
                    className={`w-full px-4 py-3 text-left hover:bg-white/[0.05] transition-colors ${
                      selectedPersonality === p.id ? "bg-violet-500/10 border-l-2 border-violet-500" : ""
                    }`}
                  >
                    <span className="text-white font-medium">{p.label}</span>
                    <p className="text-xs text-[#A1A1AA] mt-0.5">{p.description}</p>
                  </button>
                ))}
              </motion.div>
            )}
          </div>

          <div className="mt-4">
            <Button className="w-full bg-violet-600 hover:bg-violet-700 text-white">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retrain Model
            </Button>
            <p className="text-xs text-[#666] text-center mt-2">
              Ré-entraîner avec vos PDFs uploadés
            </p>
          </div>
        </motion.div>

        {/* Message Preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[#131316] rounded-xl border border-white/[0.05] p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-white font-medium">Aperçu du Message</span>
            </div>
            <span className="text-xs text-[#666]">Dernier généré</span>
          </div>

          <div className="relative">
            <motion.div
              key={selectedPersonality}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="bg-[#0C0C0E] rounded-lg p-4 border border-white/[0.05]"
            >
              <p className="text-[#A1A1AA] text-sm leading-relaxed font-mono">
                {currentMessage}
              </p>
            </motion.div>

            <button
              onClick={handleCopy}
              className="absolute top-2 right-2 p-2 hover:bg-white/[0.1] rounded-md transition-colors"
            >
              <Copy className={`h-4 w-4 ${copied ? "text-emerald-400" : "text-[#666]"}`} />
            </button>
          </div>

          <div className="flex items-center justify-between mt-4 text-xs">
            <span className="text-[#666]">
              Ton: <span className="text-violet-400">{currentPersonality.description.split(",")[0]}</span>
            </span>
            <span className="text-[#666]">
              {currentMessage.length} caractères
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
