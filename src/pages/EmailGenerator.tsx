import { useState } from "react";
import { useAgency } from "@/contexts/AgencyContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Mail, Copy, Check, Sparkles, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const EMAIL_TYPES = [
  { value: "cold_email", label: "Prospection à froid (Cold Email)" },
  { value: "quote_followup", label: "Relance suite à un devis" },
  { value: "invoice_reminder", label: "Relance facture impayée" },
  { value: "testimonial_request", label: "Demande de témoignage/Avis" },
  { value: "thank_you", label: "Email de remerciement" },
  { value: "other", label: "Autre (Champ libre)" },
] as const;

const TONES = [
  { value: "professional", label: "Professionnel" },
  { value: "friendly", label: "Amical" },
  { value: "firm", label: "Ferme" },
  { value: "urgent", label: "Urgent" },
] as const;

type EmailType = typeof EMAIL_TYPES[number]["value"];
type Tone = typeof TONES[number]["value"];

export default function EmailGenerator() {
  const { config, getGeneratedContext } = useAgency();
  const { toast } = useToast();
  
  const [emailType, setEmailType] = useState<EmailType>("cold_email");
  const [customType, setCustomType] = useState("");
  const [context, setContext] = useState("");
  const [tone, setTone] = useState<Tone>("professional");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedEmail, setGeneratedEmail] = useState<{
    subjects: string[];
    body: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const isConfigured = config.profile.businessType !== undefined || config.profile.customBusinessDescription;

  const handleGenerate = async () => {
    if (!context.trim()) {
      toast({
        title: "Contexte requis",
        description: "Veuillez décrire le contexte ou le destinataire.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setGeneratedEmail(null);

    try {
      const typeLabel = emailType === "other" 
        ? customType 
        : EMAIL_TYPES.find(t => t.value === emailType)?.label;
      
      const toneLabel = TONES.find(t => t.value === tone)?.label;
      const agencyContext = getGeneratedContext();

      const { data, error } = await supabase.functions.invoke("generate-email", {
        body: {
          emailType: typeLabel,
          context,
          tone: toneLabel,
          agencyContext,
        },
      });

      if (error) throw error;

      setGeneratedEmail(data);
    } catch (error) {
      console.error("Error generating email:", error);
      toast({
        title: "Erreur",
        description: "Impossible de générer l'email. Réessayez.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedEmail) return;
    
    const fullContent = `Sujets proposés:\n${generatedEmail.subjects.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n\n---\n\n${generatedEmail.body}`;
    await navigator.clipboard.writeText(fullContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Copié !",
      description: "L'email a été copié dans le presse-papiers.",
    });
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Mail className="h-6 w-6 text-primary" />
          Générateur d'Emails
        </h1>
        <p className="text-muted-foreground mt-1">
          Créez des emails professionnels percutants en quelques secondes.
        </p>
      </div>

      {!isConfigured && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Configurez d'abord votre agence pour des emails personnalisés à votre style.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left: Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Paramètres de l'Email</CardTitle>
            <CardDescription>
              Définissez le type, le contexte et le ton de votre email.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Email Type */}
            <div className="space-y-2">
              <Label>Type d'email</Label>
              <Select value={emailType} onValueChange={(v) => setEmailType(v as EmailType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EMAIL_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {emailType === "other" && (
                <Textarea
                  placeholder="Décrivez le type d'email souhaité..."
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value)}
                  className="mt-2"
                />
              )}
            </div>

            {/* Context */}
            <div className="space-y-2">
              <Label>Contexte / Destinataire</Label>
              <Textarea
                placeholder="Ex: Le client s'appelle Marc, il dirige une PME dans le BTP, il hésite sur le prix de notre offre SEO à 3000€..."
                value={context}
                onChange={(e) => setContext(e.target.value)}
                className="min-h-[120px]"
              />
              <p className="text-xs text-muted-foreground">
                Plus vous donnez de détails, plus l'email sera personnalisé.
              </p>
            </div>

            {/* Tone */}
            <div className="space-y-2">
              <Label>Ton de l'email</Label>
              <Select value={tone} onValueChange={(v) => setTone(v as Tone)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TONES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Generate Button */}
            <Button 
              onClick={handleGenerate} 
              disabled={isGenerating || !context.trim()}
              className="w-full"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Génération en cours...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Générer l'Email
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Right: Result */}
        <Card className={!generatedEmail && !isGenerating ? "opacity-60" : ""}>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Email Généré</CardTitle>
              <CardDescription>
                Votre brouillon prêt à personnaliser.
              </CardDescription>
            </div>
            {generatedEmail && (
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {copied ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Copié
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copier
                  </>
                )}
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {isGenerating && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mb-4" />
                <p>L'IA rédige votre email...</p>
              </div>
            )}

            {!isGenerating && !generatedEmail && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Mail className="h-12 w-12 mb-4 opacity-50" />
                <p>Configurez et lancez la génération</p>
              </div>
            )}

            {generatedEmail && (
              <div className="space-y-6">
                {/* Subject Lines */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Sujets proposés</Label>
                  <div className="space-y-2">
                    {generatedEmail.subjects.map((subject, index) => (
                      <div 
                        key={index}
                        className="flex items-center gap-2 p-2 rounded-md bg-muted/50 text-sm"
                      >
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                          {index + 1}
                        </span>
                        <span>{subject}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Email Body */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Corps de l'email</Label>
                  <div className="rounded-lg border bg-card p-4 text-sm whitespace-pre-wrap leading-relaxed">
                    {generatedEmail.body}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
