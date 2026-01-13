import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Phone, Calendar, FileText, Save, ArrowRight, CheckCircle2, AlertCircle, Plus, X, CalendarCheck, Radar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePOD } from "@/contexts/PODContext";
import { useToast } from "@/hooks/use-toast";
import { PremiumEmptyState } from "@/components/ui/premium-empty-state";
import type { MeetingCapture } from "@/types/pod";

export default function RDVCapture() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { targetAccounts, addMeetingCapture } = usePOD();
  const { toast } = useToast();
  
  const accountId = searchParams.get("accountId");
  const account = targetAccounts.find(a => a.id === accountId);
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    attendees: "",
    notes: "",
    confirmedNeeds: [] as string[],
    objections: [] as string[],
    nextSteps: "",
    outcome: "follow_up" as MeetingCapture["outcome"],
    budget: "",
    timeline: "",
  });

  const [newNeed, setNewNeed] = useState("");
  const [newObjection, setNewObjection] = useState("");

  const addNeed = () => {
    if (newNeed.trim()) {
      setFormData(prev => ({
        ...prev,
        confirmedNeeds: [...prev.confirmedNeeds, newNeed.trim()]
      }));
      setNewNeed("");
    }
  };

  const addObjection = () => {
    if (newObjection.trim()) {
      setFormData(prev => ({
        ...prev,
        objections: [...prev.objections, newObjection.trim()]
      }));
      setNewObjection("");
    }
  };

  const removeNeed = (index: number) => {
    setFormData(prev => ({
      ...prev,
      confirmedNeeds: prev.confirmedNeeds.filter((_, i) => i !== index)
    }));
  };

  const removeObjection = (index: number) => {
    setFormData(prev => ({
      ...prev,
      objections: prev.objections.filter((_, i) => i !== index)
    }));
  };

  const handleSave = () => {
    if (!accountId) return;

    const capture: MeetingCapture = {
      id: crypto.randomUUID(),
      accountId,
      date: formData.date,
      attendees: formData.attendees.split(",").map(s => s.trim()).filter(Boolean),
      notes: formData.notes,
      confirmedNeeds: formData.confirmedNeeds,
      objections: formData.objections,
      nextSteps: formData.nextSteps,
      outcome: formData.outcome,
      budget: formData.budget || undefined,
      timeline: formData.timeline || undefined,
    };

    addMeetingCapture(capture);
    toast({ title: "RDV capturé", description: "Les notes sont sauvegardées pour la propale" });
    navigate(`/closing/propale?accountId=${accountId}`);
  };

  if (!account) {
    return (
      <PremiumEmptyState
        icon={CalendarCheck}
        iconColor="emerald"
        title="L'Agenda du succès"
        subtitle="Dès qu'un prospect mordra à l'hameçon, vos rendez-vous qualifiés apparaîtront ici automatiquement."
        ctaLabel="Trouver ma première cible"
        ctaIcon={Radar}
        onCtaClick={() => navigate("/radar/scan")}
        variant="success"
        showGhostBackground
      />
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 lg:p-10">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10">
            <Phone className="h-6 w-6 text-amber-500" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Capture RDV</h1>
            <p className="text-muted-foreground">{account.name}</p>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-6">
          {/* Basic Info */}
          <Card className="border-border shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Informations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date du RDV</Label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Résultat</Label>
                  <Select
                    value={formData.outcome}
                    onValueChange={(value: MeetingCapture["outcome"]) => 
                      setFormData(prev => ({ ...prev, outcome: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="qualified">Qualifié - Propale à envoyer</SelectItem>
                      <SelectItem value="follow_up">Suivi nécessaire</SelectItem>
                      <SelectItem value="not_interested">Pas intéressé</SelectItem>
                      <SelectItem value="wrong_timing">Mauvais timing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Participants (séparés par des virgules)</Label>
                <Input
                  placeholder="Jean Dupont (CEO), Marie Martin (DAF)..."
                  value={formData.attendees}
                  onChange={(e) => setFormData(prev => ({ ...prev, attendees: e.target.value }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card className="border-border shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Notes de Discussion
              </CardTitle>
              <CardDescription>
                Capturez les points clés de la conversation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Résumez les points importants de la discussion..."
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="min-h-[160px]"
              />
            </CardContent>
          </Card>

          {/* Needs & Objections */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Confirmed Needs */}
            <Card className="border-border shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  Besoins Confirmés
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Ajouter un besoin..."
                    value={newNeed}
                    onChange={(e) => setNewNeed(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addNeed()}
                  />
                  <Button size="icon" variant="outline" onClick={addNeed}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.confirmedNeeds.map((need, i) => (
                    <Badge key={i} variant="secondary" className="gap-1 py-1.5">
                      {need}
                      <button onClick={() => removeNeed(i)} className="ml-1 hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Objections */}
            <Card className="border-border shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                  Objections Soulevées
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Ajouter une objection..."
                    value={newObjection}
                    onChange={(e) => setNewObjection(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addObjection()}
                  />
                  <Button size="icon" variant="outline" onClick={addObjection}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.objections.map((obj, i) => (
                    <Badge key={i} variant="outline" className="gap-1 py-1.5">
                      {obj}
                      <button onClick={() => removeObjection(i)} className="ml-1 hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Budget & Timeline */}
          <Card className="border-border shadow-soft">
            <CardHeader>
              <CardTitle className="text-base">Budget & Timing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Budget évoqué</Label>
                  <Input
                    placeholder="Ex: 15-20k€, Pas défini..."
                    value={formData.budget}
                    onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Timeline projet</Label>
                  <Input
                    placeholder="Ex: Q1 2025, Dans 3 mois..."
                    value={formData.timeline}
                    onChange={(e) => setFormData(prev => ({ ...prev, timeline: e.target.value }))}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Prochaines étapes</Label>
                <Textarea
                  placeholder="Que doit-il se passer ensuite ?"
                  value={formData.nextSteps}
                  onChange={(e) => setFormData(prev => ({ ...prev, nextSteps: e.target.value }))}
                  className="min-h-[80px]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => navigate("/radar/scan")}>
              Retour au Radar
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Sauvegarder & Générer Propale
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
