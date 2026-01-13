import { useState } from "react";
import { useAgency } from "@/contexts/AgencyContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "@/hooks/use-toast";
import { Sparkles, FileDown, AlertCircle, CheckCircle2, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { Proposal } from "@/types/agency";
import { 
  SalesPack, 
  DocumentDensity, 
  OutputLanguage, 
  DENSITY_OPTIONS, 
  LANGUAGE_OPTIONS 
} from "@/types/sales-pack";
import { supabase } from "@/integrations/supabase/client";
import { CommandCenter } from "@/components/sales-pack/CommandCenter";
import { exportToWord } from "@/lib/docx-export";

export default function GenerateProposal() {
  const { config, isConfigured, addProposal, getGeneratedContext, getGeneratedStyle } = useAgency();
  const [clientName, setClientName] = useState("");
  const [clientBrief, setClientBrief] = useState("");
  const [salesPack, setSalesPack] = useState<SalesPack | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // New options
  const [density, setDensity] = useState<DocumentDensity>('standard');
  const [language, setLanguage] = useState<OutputLanguage>('fr');

  const generateProposal = async () => {
    if (!clientBrief.trim()) {
      toast({
        title: "Brief requis",
        description: "Veuillez entrer le brief client.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setSalesPack(null);

    try {
      const agencyContext = getGeneratedContext();
      const writingStyle = getGeneratedStyle();

      const { data, error } = await supabase.functions.invoke('generate-proposal', {
        body: {
          clientNeed: clientBrief,
          clientName: clientName || "Prospect",
          agencyContext,
          writingStyle,
          services: config.style.selectedServices,
          basePrice: config.style.basePrice,
          density,
          language,
        },
      });

      if (error) {
        console.error("Edge function error:", error);
        throw new Error(error.message || "Erreur lors de la génération");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const pack = data?.salesPack as SalesPack;

      if (pack) {
        setSalesPack(pack);
        
        // Save proposal
        const newProposal: Proposal = {
          id: crypto.randomUUID(),
          clientName: clientName || "Client sans nom",
          clientBrief,
          generatedContent: pack.proposal.content,
          createdAt: new Date(),
          status: "draft",
          estimatedValue: pack.pricing.find(p => p.tier === 'recommended')?.price 
            ? parseInt(pack.pricing.find(p => p.tier === 'recommended')!.price) 
            : undefined,
        };
        addProposal(newProposal);

        toast({
          title: "Pack vente généré !",
          description: "Proposition + Prix + Emails prêts.",
        });
      }
    } catch (error) {
      console.error("Generation error:", error);
      toast({
        title: "Erreur de génération",
        description: error instanceof Error ? error.message : "Une erreur est survenue. Réessayez.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const exportToPDF = () => {
    if (!salesPack) return;
    
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      const pricingHtml = salesPack.pricing.length > 0 ? `
        <h2 style="margin-top: 32px;">Options de tarification</h2>
        <div style="display: flex; gap: 16px; margin-top: 16px;">
          ${salesPack.pricing.map(pkg => `
            <div style="flex: 1; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; ${pkg.tier === 'recommended' ? 'border-color: #3b82f6; background: #eff6ff;' : ''}">
              <h3 style="margin: 0 0 8px 0;">${pkg.name}</h3>
              <p style="font-size: 24px; font-weight: bold; margin: 0 0 8px 0;">${pkg.price}€</p>
              <p style="font-size: 12px; color: #6b7280; margin: 0 0 12px 0;">${pkg.description}</p>
              <ul style="font-size: 12px; padding-left: 16px; margin: 0;">
                ${pkg.features.map(f => `<li>${f}</li>`).join('')}
              </ul>
            </div>
          `).join('')}
        </div>
      ` : '';

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Proposition - ${clientName || "Client"}</title>
          <style>
            body { font-family: 'Inter', system-ui, sans-serif; line-height: 1.6; max-width: 900px; margin: 40px auto; padding: 20px; }
            h1 { font-size: 24px; margin-bottom: 8px; }
            h2 { font-size: 20px; margin-top: 24px; }
            h3 { font-size: 16px; margin-top: 16px; }
            p { margin: 12px 0; }
            ul, ol { margin: 12px 0; padding-left: 24px; }
            @media print { body { margin: 0; padding: 20px; } }
          </style>
        </head>
        <body>
          ${salesPack.proposal.content.replace(/\n/g, "<br>")}
          ${pricingHtml}
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleExportWord = async () => {
    if (!salesPack) return;
    
    try {
      await exportToWord(salesPack, clientName || "Client");
      toast({
        title: "Export Word réussi",
        description: "Le fichier .docx a été téléchargé.",
      });
    } catch (error) {
      console.error("Word export error:", error);
      toast({
        title: "Erreur d'export",
        description: "Impossible de générer le fichier Word.",
        variant: "destructive",
      });
    }
  };

  if (!isConfigured) {
    return (
      <div className="flex flex-col min-h-screen">
        <header className="border-b border-border bg-card px-8 py-6">
          <h1 className="text-2xl font-semibold tracking-tight">Command Center</h1>
        </header>
        <div className="flex-1 flex items-center justify-center p-8">
          <Card className="max-w-md w-full">
            <CardContent className="flex flex-col items-center py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warning/10 mb-4">
                <AlertCircle className="h-6 w-6 text-warning" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Configuration requise</h2>
              <p className="text-muted-foreground mb-6">
                Avant de générer des packs vente, configurez votre identité d'agence et vos services.
              </p>
              <Link to="/config">
                <Button variant="accent">
                  Configurer mon agence
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card px-8 py-6 shadow-subtle">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1 block">
              Génération
            </span>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Command Center</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Générez un pack vente complet : Propale + Prix + Emails
            </p>
          </div>
          {salesPack && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-success/10 border border-success/20">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span className="text-sm font-medium text-success">Pack généré</span>
              </div>
              <Button variant="outline" size="sm" onClick={exportToPDF}>
                <FileDown className="h-4 w-4 mr-1.5" />
                PDF
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportWord}>
                <FileText className="h-4 w-4 mr-1.5" />
                Word
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Main content - Split view */}
      <div className="flex-1 grid lg:grid-cols-[440px_1fr] divide-x divide-border">
        {/* Left panel - Input */}
        <div className="p-6 space-y-5 overflow-auto bg-card/50">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Brief client</CardTitle>
              <CardDescription>
                Email, notes de réunion ou cahier des charges
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="clientName" className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                  Nom du client / Projet
                </Label>
                <Input
                  id="clientName"
                  placeholder="Ex: Startup XYZ"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="brief" className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                  Besoin exprimé
                </Label>
                <Textarea
                  id="brief"
                  placeholder="Collez ici le besoin du client :

• Email ou demande reçue
• Notes de call / réunion
• Cahier des charges
• Points clés du projet..."
                  className="min-h-[200px]"
                  value={clientBrief}
                  onChange={(e) => setClientBrief(e.target.value)}
                  showCharCount
                />
              </div>

              {/* Document Density */}
              <div className="space-y-3">
                <Label className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Profondeur du document</Label>
                <RadioGroup
                  value={density}
                  onValueChange={(v) => setDensity(v as DocumentDensity)}
                  className="space-y-2"
                >
                  {DENSITY_OPTIONS.map((option) => (
                    <div
                      key={option.value}
                      className={`flex items-start space-x-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                        density === option.value 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-muted-foreground/30'
                      }`}
                      onClick={() => setDensity(option.value)}
                    >
                      <RadioGroupItem value={option.value} id={option.value} className="mt-0.5" />
                      <div className="flex-1 space-y-0.5">
                        <label htmlFor={option.value} className="text-sm font-medium cursor-pointer">
                          {option.label}
                        </label>
                        <p className="text-xs text-muted-foreground">
                          {option.description} • <span className="text-primary">{option.pages}</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {/* Language Selection */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Langue de sortie</Label>
                <Select value={language} onValueChange={(v) => setLanguage(v as OutputLanguage)}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGE_OPTIONS.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        <span className="flex items-center gap-2">
                          <span>{lang.flag}</span>
                          <span>{lang.label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={generateProposal}
                disabled={isGenerating || !clientBrief.trim()}
                variant="magic"
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Sparkles className="h-4 w-4 animate-pulse" />
                    Génération en cours...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Générer le Pack Vente
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Quick stats when pack is generated */}
          {salesPack && (
            <Card className="bg-card">
              <CardContent className="py-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-accent">1</div>
                    <div className="text-xs text-muted-foreground">Propale</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-accent">{salesPack.pricing.length}</div>
                    <div className="text-xs text-muted-foreground">Options prix</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-accent">2</div>
                    <div className="text-xs text-muted-foreground">Emails</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right panel - Command Center */}
        <div className="p-6 overflow-auto">
          <CommandCenter 
            salesPack={salesPack} 
            isGenerating={isGenerating}
            onUpdateSalesPack={setSalesPack}
          />
        </div>
      </div>
    </div>
  );
}
