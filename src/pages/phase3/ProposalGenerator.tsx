import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { FileText, Sparkles, Loader2, Download, Copy, Check, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePOD } from "@/contexts/PODContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  DENSITY_OPTIONS, 
  LANGUAGE_OPTIONS,
  type DocumentDensity,
  type OutputLanguage 
} from "@/types/sales-pack";
import { marked } from "marked";
import DOMPurify from "dompurify";

// Configure marked for safe rendering
marked.setOptions({
  breaks: true,
  gfm: true,
});

// Secure markdown to HTML converter using marked library + DOMPurify
function renderMarkdown(content: string): string {
  // Use marked for proper markdown parsing
  const rawHtml = marked.parse(content) as string;
  
  // Sanitize the output with strict allowed tags
  return DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'strong', 'em', 'ul', 'ol', 'li', 'br', 'blockquote', 'code', 'pre'],
    ALLOWED_ATTR: ['class']
  });
}

export default function ProposalGenerator() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { targetAccounts, agencyDNA, meetingCaptures } = usePOD();
  const { toast } = useToast();
  
  const accountId = searchParams.get("accountId");
  const account = accountId ? targetAccounts.find(a => a.id === accountId) : null;
  const meetingCapture = accountId ? meetingCaptures.find(m => m.accountId === accountId) : null;
  
  const [clientBrief, setClientBrief] = useState("");
  const [density, setDensity] = useState<DocumentDensity>("standard");
  const [language, setLanguage] = useState<OutputLanguage>("fr");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState("");
  const [copied, setCopied] = useState(false);

  const densityPages = {
    flash: "5 pages",
    standard: "20 pages",
    enterprise: "50 pages",
  };

  const handleGenerate = async () => {
    if (!clientBrief && !meetingCapture) {
      toast({
        title: "Brief requis",
        description: "Ajoutez un brief client ou capturez un RDV",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setGeneratedContent("");

    try {
      const { data, error } = await supabase.functions.invoke('generate-proposal', {
        body: {
          clientBrief: clientBrief || meetingCapture?.notes,
          account,
          meetingCapture,
          agencyDNA: {
            pitch: agencyDNA.pitch,
            methodology: agencyDNA.methodology,
            pastClients: agencyDNA.trackRecord?.pastClients,
          },
          density,
          language,
        }
      });

      if (error) throw error;

      if (data?.proposal) {
        setGeneratedContent(data.proposal);
        toast({ title: "Propale générée", description: "Votre proposition est prête" });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de générer la proposition",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copié" });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen">
        {/* Left Panel - Input */}
        <div className="w-1/2 border-r border-border p-6 lg:p-10 overflow-y-auto">
          <div className="max-w-xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10">
                <FileText className="h-6 w-6 text-rose-500" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-foreground">Générateur de Propale</h1>
                <p className="text-muted-foreground">
                  {account ? account.name : "Nouvelle proposition"}
                </p>
              </div>
            </div>

            {/* Context from RDV */}
            {meetingCapture && (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="secondary">RDV capturé</Badge>
                    <span className="text-sm text-muted-foreground">
                      {new Date(meetingCapture.date).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {meetingCapture.notes}
                  </p>
                  {meetingCapture.confirmedNeeds.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {meetingCapture.confirmedNeeds.map((need, i) => (
                        <Badge key={i} variant="outline" className="text-xs">{need}</Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Client Brief */}
            <div className="space-y-3">
              <Label>Brief Client / Notes de RDV</Label>
              <Textarea
                placeholder="Collez ici les notes de votre RDV, l'email du client, ou décrivez le besoin..."
                value={clientBrief}
                onChange={(e) => setClientBrief(e.target.value)}
                className="min-h-[200px]"
              />
            </div>

            {/* Settings */}
            <Card className="border-border shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Settings2 className="h-5 w-5 text-primary" />
                  Paramètres
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Density */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Densité du document</Label>
                    <Badge variant="outline">{densityPages[density]}</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {DENSITY_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setDensity(option.value)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          density === option.value
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <p className="font-medium text-sm">{option.label}</p>
                        <p className="text-xs text-muted-foreground">{option.pages}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Language */}
                <div className="space-y-2">
                  <Label>Langue de sortie</Label>
                  <Select value={language} onValueChange={(v: OutputLanguage) => setLanguage(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGE_OPTIONS.map((lang) => (
                        <SelectItem key={lang.value} value={lang.value}>
                          <span className="mr-2">{lang.flag}</span>
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Generate Button */}
            <Button 
              size="lg" 
              className="w-full" 
              onClick={handleGenerate}
              disabled={isGenerating || (!clientBrief && !meetingCapture)}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Génération en cours...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Générer la Propale
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Right Panel - Output */}
        <div className="w-1/2 bg-muted/30 p-6 lg:p-10 overflow-y-auto">
          <div className="max-w-3xl mx-auto">
            {!generatedContent && !isGenerating && (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <FileText className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground">
                    Votre propale apparaîtra ici
                  </p>
                </div>
              </div>
            )}

            {isGenerating && (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin mb-4" />
                  <p className="text-muted-foreground">Génération en cours...</p>
                  <p className="text-sm text-muted-foreground">
                    Assemblage ADN + Contexte + Brief...
                  </p>
                </div>
              </div>
            )}

            {generatedContent && !isGenerating && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Proposition Générée</h2>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleCopy}>
                      {copied ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button size="sm" onClick={() => navigate("/closing/export")}>
                      <Download className="h-4 w-4 mr-2" />
                      Exporter
                    </Button>
                  </div>
                </div>

                {/* Document Preview */}
                <Card className="bg-card shadow-paper">
                  <CardContent className="p-8 lg:p-12">
                    <div 
                      className="prose prose-slate prose-lg max-w-none"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(generatedContent) }}
                    />
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
