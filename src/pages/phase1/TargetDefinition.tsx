import { useState } from "react";
import {
  Building2,
  Loader2,
  Sparkles,
  Target,
  User,
  Wand2,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { usePOD } from "@/contexts/PODContext";
import { useProject } from "@/contexts/ProjectContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SaveButton } from "@/components/SaveButton";
import { AutoSaveIndicator } from "@/components/ui/auto-save-indicator";
import { useAutoSaveProject } from "@/hooks/useAutoSaveProject";
import {
  FUNCTIONS,
  type FunctionType,
  HEADCOUNT_RANGES,
  type HeadcountRange,
  INDUSTRIES,
  type Industry,
  SENIORITY_LEVELS,
  type SeniorityLevel,
  WEAK_SIGNALS,
} from "@/types/pod";

export default function TargetDefinition() {
  const {
    agencyDNA,
    targetCriteria,
    updateTargetCriteria,
    saveTargetCriteria,
    isSaving,
    targetCriteriaStatus,
    lastSavedAt,
  } = usePOD();
  const { currentProject } = useProject();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingSignals, setIsGeneratingSignals] = useState(false);
  const [animatingSignals, setAnimatingSignals] = useState<string[]>([]);

  const toggleArrayItem = <T,>(array: T[], item: T): T[] => {
    return array.includes(item)
      ? array.filter((i) => i !== item)
      : [...array, item];
  };

  // Auto-saved inputs
  const {
    localData: geographyInput,
    setLocalData: setGeographyInput,
  } = useAutoSaveProject({
    data: targetCriteria.geography.join(", "),
    onSave: async (val) => {
      await updateTargetCriteria({
        geography: val.split(",").map((s) => s.trim()).filter(Boolean),
      }, true);
    },
  });

  const {
    localData: customSignalsInput,
    setLocalData: setCustomSignalsInput,
  } = useAutoSaveProject({
    data: targetCriteria.customSignals?.join(", ") || "",
    onSave: async (val) => {
      await updateTargetCriteria({
        customSignals: val.split(",").map((s) => s.trim()).filter(Boolean),
      }, true);
    },
  });

  const handleAISuggest = async () => {
    if (!agencyDNA.trackRecord?.pastClients?.length && !agencyDNA.pitch) {
      toast({
        title: "Données insuffisantes",
        description:
          "Renseignez d'abord le Cerveau Agence pour des suggestions pertinentes",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "generate-target-criteria",
        {
          body: {
            agencyDNA: {
              pitch: agencyDNA.pitch,
              methodology: agencyDNA.methodology,
              pastClients: agencyDNA.trackRecord?.pastClients,
              dreamClients: agencyDNA.trackRecord?.dreamClients,
            },
          },
        },
      );

      if (error) throw error;

      if (data?.criteria) {
        updateTargetCriteria(data.criteria);
        toast({
          title: "Critères générés",
          description: "L'IA a analysé votre ADN",
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de générer les critères",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAutoGenerateSignals = async () => {
    setIsGeneratingSignals(true);
    setAnimatingSignals([]);

    try {
      // Fetch document content from database
      let documentContent = "";
      if (currentProject?.id) {
        const { data: docs } = await supabase
          .from("company_documents")
          .select("extracted_content")
          .eq("project_id", currentProject.id);

        if (docs?.length) {
          documentContent = docs
            .map((d) => d.extracted_content)
            .filter(Boolean)
            .join("\n\n---\n\n");
        }
      }

      // Build target description from current selections
      const targetDescription = [
        targetCriteria.industries.length > 0
          ? `Secteurs: ${
            targetCriteria.industries.map((i) =>
              INDUSTRIES.find((ind) => ind.value === i)?.label
            ).join(", ")
          }`
          : null,
        targetCriteria.headcount.length > 0
          ? `Taille: ${
            targetCriteria.headcount.map((h) =>
              HEADCOUNT_RANGES.find((r) => r.value === h)?.label
            ).join(", ")
          }`
          : null,
        targetCriteria.functions.length > 0
          ? `Fonctions: ${
            targetCriteria.functions.map((f) =>
              FUNCTIONS.find((fn) => fn.value === f)?.label
            ).join(", ")
          }`
          : null,
      ].filter(Boolean).join(". ");

      const { data, error } = await supabase.functions.invoke(
        "generate-weak-signals",
        {
          body: {
            documentContent,
            targetDescription,
            agencyPitch: agencyDNA.pitch,
            industries: targetCriteria.industries,
          },
        },
      );

      if (error) throw error;

      if (data?.selectedSignals || data?.customKeywords) {
        // Animate signals being checked one by one
        const signals = data.selectedSignals || [];

        for (let i = 0; i < signals.length; i++) {
          await new Promise((resolve) => setTimeout(resolve, 200));
          setAnimatingSignals((prev) => [...prev, signals[i]]);
        }

        // Wait a bit then apply all changes
        await new Promise((resolve) => setTimeout(resolve, 300));

        updateTargetCriteria({
          weakSignals: signals,
          customSignals: data.customKeywords || [],
        });

        toast({
          title: "Signaux générés",
          description: data.reasoning ||
            "L'IA a analysé votre stratégie commerciale",
        });
      }
    } catch (error) {
      console.error("Error generating signals:", error);
      toast({
        title: "Erreur",
        description: "Impossible de générer les signaux automatiquement",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingSignals(false);
      setAnimatingSignals([]);
    }
  };

  const handleSave = async () => {
    await saveTargetCriteria();
    toast({
      title: "Critères sauvegardés",
      description: "Vos données de ciblage ont été enregistrées",
    });
  };

  return (
    <div className="min-h-screen bg-background p-6 lg:p-10">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10">
              <Target className="h-6 w-6 text-emerald-500" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">
                Définition de la Cible
              </h1>
              <p className="text-muted-foreground">
                Critères LinkedIn Sales Navigator
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <AutoSaveIndicator
              status={targetCriteriaStatus}
              lastSavedAt={lastSavedAt}
            />
            <Button
              onClick={handleAISuggest}
              disabled={isGenerating}
              variant="outline"
            >
              {isGenerating
                ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyse...
                  </>
                )
                : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Suggérer avec l'IA
                  </>
                )}
            </Button>
            <SaveButton onSave={handleSave} isSaving={isSaving} />
          </div>
        </div>

        {/* Firmographic Filters */}
        <Card className="border-border shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Qualification Entreprise
            </CardTitle>
            <CardDescription>
              Filtres firmographiques - Quel type d'entreprise cibler ?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Headcount */}
            <div className="space-y-3">
              <Label>Effectif (Headcount)</Label>
              <div className="flex flex-wrap gap-2">
                {HEADCOUNT_RANGES.map((range) => (
                  <Badge
                    key={range.value}
                    variant={targetCriteria.headcount.includes(range.value)
                      ? "default"
                      : "outline"}
                    className="cursor-pointer transition-all hover:bg-primary/80"
                    onClick={() =>
                      updateTargetCriteria({
                        headcount: toggleArrayItem(
                          targetCriteria.headcount,
                          range.value,
                        ),
                      }, true)}
                  >
                    {range.label}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Industries */}
            <div className="space-y-3">
              <Label>Secteurs d'activité</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {INDUSTRIES.map((industry) => (
                  <div
                    key={industry.value}
                    className="flex items-center space-x-2"
                  >
                    <Checkbox
                      id={industry.value}
                      checked={targetCriteria.industries.includes(
                        industry.value,
                      )}
                      onCheckedChange={() =>
                        updateTargetCriteria({
                          industries: toggleArrayItem(
                            targetCriteria.industries,
                            industry.value,
                          ),
                        }, true)}
                    />
                    <label
                      htmlFor={industry.value}
                      className="text-sm font-medium leading-none cursor-pointer"
                    >
                      {industry.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Geography */}
            <div className="space-y-3">
              <Label>Géographie</Label>
              <Input
                placeholder="France, Belgique, Suisse..."
                value={geographyInput}
                onChange={(e) => setGeographyInput(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Persona Filters */}
        <Card className="border-border shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Qualification du Persona
            </CardTitle>
            <CardDescription>
              Qui est le décideur ? Règle d'or : Petite boite → CEO / Grosse
              boite → Directeur
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Functions */}
            <div className="space-y-3">
              <Label>Fonction</Label>
              <div className="flex flex-wrap gap-2">
                {FUNCTIONS.map((func) => (
                  <Badge
                    key={func.value}
                    variant={targetCriteria.functions.includes(func.value)
                      ? "default"
                      : "outline"}
                    className="cursor-pointer transition-all hover:bg-primary/80"
                    onClick={() =>
                      updateTargetCriteria({
                        functions: toggleArrayItem(
                          targetCriteria.functions,
                          func.value,
                        ),
                      }, true)}
                  >
                    {func.label}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Seniority */}
            <div className="space-y-3">
              <Label>Niveau Hiérarchique</Label>
              <div className="flex flex-wrap gap-2">
                {SENIORITY_LEVELS.map((level) => (
                  <Badge
                    key={level.value}
                    variant={targetCriteria.seniority.includes(level.value)
                      ? "default"
                      : "outline"}
                    className="cursor-pointer transition-all hover:bg-primary/80"
                    onClick={() =>
                      updateTargetCriteria({
                        seniority: toggleArrayItem(
                          targetCriteria.seniority,
                          level.value,
                        ),
                      }, true)}
                  >
                    {level.label}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Weak Signals */}
        <Card className="border-border shadow-soft">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-amber-500" />
                  Signaux Faibles
                </CardTitle>
                <CardDescription>
                  Le cœur de la pertinence. On ne veut pas 10 000 prospects, on
                  veut les 100 qui émettent ce bruit.
                </CardDescription>
              </div>
              <Button
                onClick={handleAutoGenerateSignals}
                disabled={isGeneratingSignals}
                variant="outline"
                className="border-amber-500/50 text-amber-600 hover:bg-amber-500/10"
              >
                {isGeneratingSignals
                  ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyse stratégique...
                    </>
                  )
                  : (
                    <>
                      <Wand2 className="h-4 w-4 mr-2" />
                      Générer les Signaux Pertinents
                    </>
                  )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {WEAK_SIGNALS.map((signal) => {
                const isSelected = targetCriteria.weakSignals.includes(
                  signal.value,
                );
                const isAnimating = animatingSignals.includes(signal.value);

                return (
                  <div
                    key={signal.value}
                    className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all duration-300 ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    } ${
                      isAnimating
                        ? "animate-pulse ring-2 ring-amber-500 ring-offset-2"
                        : ""
                    }`}
                    onClick={() =>
                      updateTargetCriteria({
                        weakSignals: toggleArrayItem(
                          targetCriteria.weakSignals,
                          signal.value,
                        ),
                      }, true)}
                  >
                    <Checkbox
                      checked={isSelected}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="font-medium text-sm">{signal.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {signal.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-2 pt-4">
              <Label>Signaux personnalisés</Label>
              <Input
                placeholder="Ex: 'Incendie récent' si vous vendez des extincteurs..."
                value={customSignalsInput}
                onChange={(e) => setCustomSignalsInput(e.target.value)}
              />
              {targetCriteria.customSignals?.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {targetCriteria.customSignals.map((signal, idx) => (
                    <Badge
                      key={idx}
                      variant="secondary"
                      className="bg-amber-500/10 text-amber-700"
                    >
                      {signal}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card className="border-primary/20 bg-primary/5 shadow-soft">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-4">
              <Target className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Résumé du ciblage</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Effectifs</p>
                <p className="font-medium">
                  {targetCriteria.headcount.length || "Non défini"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Secteurs</p>
                <p className="font-medium">
                  {targetCriteria.industries.length || "Non défini"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Fonctions</p>
                <p className="font-medium">
                  {targetCriteria.functions.length || "Non défini"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Signaux</p>
                <p className="font-medium">
                  {(targetCriteria.weakSignals.length || 0) +
                      (targetCriteria.customSignals?.length || 0) ||
                    "Non défini"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
