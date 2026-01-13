import { motion } from "framer-motion";
import { Target, Users, MessageSquare, Calendar, Power, ChevronRight } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";

interface Mission {
  id: string;
  target: string;
  prospectCount: number;
  strategy: string;
  strategyVersion: string;
  funnel: {
    contacted: number;
    opened: number;
    replied: number;
  };
  rdvGenerated: number;
  isActive: boolean;
}

const missions: Mission[] = [
  {
    id: "1",
    target: "CEO SaaS France",
    prospectCount: 142,
    strategy: "Approche 'Pain Point'",
    strategyVersion: "Icebreaker V2",
    funnel: { contacted: 25, opened: 10, replied: 3 },
    rdvGenerated: 4,
    isActive: true,
  },
  {
    id: "2",
    target: "DG PME Industrie",
    prospectCount: 89,
    strategy: "Approche 'Social Proof'",
    strategyVersion: "Case Study V1",
    funnel: { contacted: 45, opened: 18, replied: 5 },
    rdvGenerated: 2,
    isActive: true,
  },
  {
    id: "3",
    target: "Head of Sales Tech",
    prospectCount: 67,
    strategy: "Approche 'Trigger Event'",
    strategyVersion: "Funding Alert",
    funnel: { contacted: 12, opened: 4, replied: 1 },
    rdvGenerated: 0,
    isActive: false,
  },
];

const FunnelBar = ({ funnel }: { funnel: Mission["funnel"] }) => {
  return (
    <div className="flex items-center gap-1 w-48">
      <div className="flex-1 h-2 bg-white/[0.05] rounded-full overflow-hidden flex">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${funnel.contacted}%` }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="h-full bg-violet-500/60"
        />
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${funnel.opened}%` }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="h-full bg-violet-500/80"
        />
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${funnel.replied}%` }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="h-full bg-emerald-500"
        />
      </div>
      <div className="flex items-center gap-2 text-xs font-mono ml-2">
        <span className="text-[#A1A1AA]">{funnel.contacted}%</span>
        <ChevronRight className="h-3 w-3 text-[#666]" />
        <span className="text-[#A1A1AA]">{funnel.opened}%</span>
        <ChevronRight className="h-3 w-3 text-[#666]" />
        <span className="text-emerald-400">{funnel.replied}%</span>
      </div>
    </div>
  );
};

export function MissionsSection() {
  const [missionStates, setMissionStates] = useState<Record<string, boolean>>(
    missions.reduce((acc, m) => ({ ...acc, [m.id]: m.isActive }), {})
  );

  const toggleMission = (id: string) => {
    setMissionStates((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Target className="h-5 w-5 text-violet-400" />
        <h2 className="text-lg font-semibold text-white">Missions en Cours</h2>
        <span className="text-xs text-[#A1A1AA] ml-2">Campagnes Actives</span>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-[#131316] rounded-xl border border-white/[0.05] overflow-hidden"
      >
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-white/[0.05] text-xs font-medium text-[#666] uppercase tracking-wider">
          <div className="col-span-3">Cible</div>
          <div className="col-span-3">Stratégie</div>
          <div className="col-span-4">Pipeline</div>
          <div className="col-span-1 text-center">RDV</div>
          <div className="col-span-1 text-center">Actif</div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-white/[0.05]">
          {missions.map((mission, index) => (
            <motion.div
              key={mission.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + index * 0.1 }}
              className={`grid grid-cols-12 gap-4 px-4 py-4 items-center hover:bg-white/[0.02] transition-colors ${
                !missionStates[mission.id] ? "opacity-50" : ""
              }`}
            >
              {/* Target */}
              <div className="col-span-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-[#A1A1AA]" />
                  <span className="text-white font-medium">{mission.target}</span>
                </div>
                <span className="text-xs text-violet-400 ml-6">
                  {mission.prospectCount} prospects
                </span>
              </div>

              {/* Strategy */}
              <div className="col-span-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-[#A1A1AA]" />
                  <span className="text-white text-sm">{mission.strategy}</span>
                </div>
                <span className="text-xs text-[#666] ml-6">
                  {mission.strategyVersion}
                </span>
              </div>

              {/* Pipeline */}
              <div className="col-span-4">
                <FunnelBar funnel={mission.funnel} />
              </div>

              {/* RDV Generated */}
              <div className="col-span-1 text-center">
                <div className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/10 rounded-md">
                  <Calendar className="h-3 w-3 text-emerald-400" />
                  <span className="text-emerald-400 font-mono font-bold">
                    {mission.rdvGenerated}
                  </span>
                </div>
              </div>

              {/* Active Switch */}
              <div className="col-span-1 flex justify-center">
                <Switch
                  checked={missionStates[mission.id]}
                  onCheckedChange={() => toggleMission(mission.id)}
                  className="data-[state=checked]:bg-emerald-500"
                />
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
