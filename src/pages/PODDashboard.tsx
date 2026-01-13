import { Brain, Target, Radar, FileText, ArrowRight, CheckCircle2, Circle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { usePOD } from "@/contexts/PODContext";
import { useNavigate } from "react-router-dom";

export default function PODDashboard() {
  const { agencyDNA, targetCriteria, targetAccounts, meetingCaptures } = usePOD();
  const navigate = useNavigate();

  // Calculate phase completion
  const phase1Complete = Boolean(
    agencyDNA.websiteUrl || 
    agencyDNA.pitch || 
    agencyDNA.trackRecord?.pastClients?.length
  );
  const phase1Progress = [
    agencyDNA.websiteUrl,
    agencyDNA.pitch,
    agencyDNA.trackRecord?.pastClients?.length,
    targetCriteria.industries.length,
    targetCriteria.headcount.length,
  ].filter(Boolean).length * 20;

  const phase2Progress = targetAccounts.length > 0 ? 50 : 0;
  const phase3Progress = meetingCaptures.length > 0 ? 33 : 0;

  const phases = [
    {
      number: 1,
      title: "Stratégie & ADN",
      description: "Ingestion massive & définition de cible",
      color: "emerald",
      progress: phase1Progress,
      actions: [
        { label: "Cerveau Agence", href: "/strategie/cerveau", done: Boolean(agencyDNA.pitch || agencyDNA.websiteUrl) },
        { label: "Définition Cible", href: "/strategie/cible", done: targetCriteria.industries.length > 0 },
      ],
    },
    {
      number: 2,
      title: "Radar & Conquête",
      description: "Détection des signaux & capture de RDV",
      color: "amber",
      progress: phase2Progress,
      actions: [
        { label: "Scanner le Marché", href: "/radar/scan", done: targetAccounts.length > 0 },
        { label: "Capturer un RDV", href: "/radar/rdv", done: meetingCaptures.length > 0 },
      ],
    },
    {
      number: 3,
      title: "Closing",
      description: "Génération de propositions",
      color: "rose",
      progress: phase3Progress,
      actions: [
        { label: "Générer une Propale", href: "/closing/propale", done: false },
      ],
    },
  ];

  const getColorClasses = (color: string) => ({
    bg: `bg-${color}-500/10`,
    text: `text-${color}-500`,
    border: `border-${color}-500/20`,
  });

  return (
    <div className="min-h-screen bg-background p-6 lg:p-10">
      <div className="max-w-6xl mx-auto space-y-10">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-foreground">
            Plan Opérationnel de Développement
          </h1>
          <p className="text-lg text-muted-foreground">
            Votre cockpit de pilotage commercial
          </p>
        </div>

        {/* Phase Cards */}
        <div className="grid gap-6">
          {phases.map((phase) => (
            <Card 
              key={phase.number} 
              className={`border-border shadow-soft overflow-hidden`}
            >
              <div className="flex">
                {/* Phase Number */}
                <div className={`w-2 ${
                  phase.color === "emerald" ? "bg-emerald-500" :
                  phase.color === "amber" ? "bg-amber-500" : "bg-rose-500"
                }`} />
                
                <div className="flex-1 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                        phase.color === "emerald" ? "bg-emerald-500/10" :
                        phase.color === "amber" ? "bg-amber-500/10" : "bg-rose-500/10"
                      }`}>
                        <span className={`text-xl font-bold ${
                          phase.color === "emerald" ? "text-emerald-500" :
                          phase.color === "amber" ? "text-amber-500" : "text-rose-500"
                        }`}>
                          {phase.number}
                        </span>
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold">{phase.title}</h2>
                        <p className="text-muted-foreground">{phase.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold">{phase.progress}%</span>
                      <p className="text-xs text-muted-foreground">Complété</p>
                    </div>
                  </div>

                  <Progress value={phase.progress} className="h-2 mb-6" />

                  <div className="flex flex-wrap gap-3">
                    {phase.actions.map((action) => (
                      <Button
                        key={action.label}
                        variant={action.done ? "secondary" : "default"}
                        onClick={() => navigate(action.href)}
                        className="gap-2"
                      >
                        {action.done ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <Circle className="h-4 w-4" />
                        )}
                        {action.label}
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card className="border-border shadow-subtle">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Brain className="h-8 w-8 text-emerald-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {agencyDNA.extractedContent?.documents?.length || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Documents ingérés</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-subtle">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Target className="h-8 w-8 text-emerald-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {targetCriteria.industries.length + targetCriteria.headcount.length}
                  </p>
                  <p className="text-sm text-muted-foreground">Critères définis</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-subtle">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Radar className="h-8 w-8 text-amber-500" />
                <div>
                  <p className="text-2xl font-bold">{targetAccounts.length}</p>
                  <p className="text-sm text-muted-foreground">Prospects chauds</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-subtle">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-rose-500" />
                <div>
                  <p className="text-2xl font-bold">{meetingCaptures.length}</p>
                  <p className="text-sm text-muted-foreground">RDV capturés</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
