import { useState, useEffect } from "react";
import { useAgency } from "@/contexts/AgencyContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { toast } from "@/hooks/use-toast";
import { PdfDropzone } from "@/components/PdfDropzone";
import { 
  Building2, 
  Package, 
  Palette, 
  Save, 
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Plus,
  X
} from "lucide-react";
import { 
  BusinessType, 
  BusinessSize, 
  PricingTier, 
  WritingTone,
  BUSINESS_TYPES,
  BUSINESS_SIZES,
  PRICING_TIERS,
  WRITING_TONES,
  SERVICES_BY_TYPE,
} from "@/types/agency";
import { cn } from "@/lib/utils";

export default function Configuration() {
  const { config, updateConfig, isConfigured } = useAgency();
  const [currentStep, setCurrentStep] = useState(1);
  
  // Local state
  const [agencyName, setAgencyName] = useState(config.profile.name);
  const [businessType, setBusinessType] = useState<BusinessType | null>(config.profile.businessType);
  const [customBusinessDescription, setCustomBusinessDescription] = useState(config.profile.customBusinessDescription || '');
  const [businessSize, setBusinessSize] = useState<BusinessSize | null>(config.profile.businessSize);
  const [pricingTier, setPricingTier] = useState<PricingTier | null>(config.style.pricingTier);
  const [basePrice, setBasePrice] = useState(config.style.basePrice || 8000);
  const [selectedServices, setSelectedServices] = useState<string[]>(config.style.selectedServices);
  const [customServices, setCustomServices] = useState<string[]>(config.style.customServices || []);
  const [newCustomService, setNewCustomService] = useState('');
  const [writingTone, setWritingTone] = useState<WritingTone | null>(config.style.writingTone);
  const [methodology, setMethodology] = useState(config.profile.methodology);
  const [sampleProposal, setSampleProposal] = useState(config.style.sampleProposal);

  // Update price when tier changes
  useEffect(() => {
    if (pricingTier) {
      setBasePrice(PRICING_TIERS[pricingTier].defaultPrice);
    }
  }, [pricingTier]);

  // Reset services when business type changes
  useEffect(() => {
    if (businessType && businessType !== 'other') {
      const availableServices = SERVICES_BY_TYPE[businessType];
      setSelectedServices(prev => prev.filter(s => availableServices.includes(s)));
    }
  }, [businessType]);

  const toggleService = (service: string) => {
    setSelectedServices(prev => 
      prev.includes(service) 
        ? prev.filter(s => s !== service)
        : [...prev, service]
    );
  };

  const addCustomService = () => {
    if (newCustomService.trim() && !customServices.includes(newCustomService.trim())) {
      setCustomServices(prev => [...prev, newCustomService.trim()]);
      setNewCustomService('');
    }
  };

  const removeCustomService = (service: string) => {
    setCustomServices(prev => prev.filter(s => s !== service));
  };

  const handlePdfTextExtracted = (text: string) => {
    setSampleProposal(prev => prev ? `${prev}\n\n---\n\n${text}` : text);
    toast({
      title: "Style extrait avec succès ✨",
      description: "Le texte de vos documents a été ajouté comme référence de style.",
    });
  };

  const handleSave = () => {
    updateConfig({
      profile: {
        ...config.profile,
        name: agencyName,
        businessType,
        businessSize,
        customBusinessDescription,
        methodology,
      },
      style: {
        ...config.style,
        pricingTier,
        basePrice,
        selectedServices,
        customServices,
        writingTone,
        sampleProposal,
      },
    });
    toast({
      title: "Configuration sauvegardée ✨",
      description: "Votre assistant IA est maintenant prêt à générer des propales.",
    });
  };

  const canProceed = (step: number) => {
    switch (step) {
      case 1: 
        const hasValidBusinessType = businessType === 'other' 
          ? customBusinessDescription.trim().length > 0 
          : !!businessType;
        return hasValidBusinessType && !!businessSize && !!agencyName;
      case 2: 
        const hasServices = businessType === 'other' 
          ? customServices.length > 0 
          : selectedServices.length > 0;
        return !!pricingTier && hasServices;
      case 3: return !!writingTone;
      default: return true;
    }
  };

  const steps = [
    { number: 1, title: "Identité", icon: Building2 },
    { number: 2, title: "Offre", icon: Package },
    { number: 3, title: "Style", icon: Palette },
  ];

  // Price formatting
  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card px-8 py-6 shadow-subtle">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <div>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1 block">
              Paramètres
            </span>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Configuration</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Assemblez votre assistant IA en quelques clics
            </p>
          </div>
          {isConfigured && (
            <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-success/10 border border-success/20">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span className="text-sm font-medium text-success">Prêt à générer</span>
            </div>
          )}
        </div>
      </header>

      {/* Progress Steps */}
      <div className="border-b border-border bg-card/50 px-8 py-5">
        <div className="flex items-center justify-center gap-3 max-w-xl mx-auto">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center">
              <button
                onClick={() => setCurrentStep(step.number)}
                className={cn(
                  "flex items-center gap-2.5 px-5 py-2.5 rounded-xl transition-all duration-200 font-medium",
                  currentStep === step.number
                    ? "bg-primary text-primary-foreground shadow-soft"
                    : currentStep > step.number
                    ? "bg-success/10 text-success border border-success/20"
                    : "bg-card text-muted-foreground border border-border hover:border-primary/30 hover:text-foreground"
                )}
              >
                {currentStep > step.number ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <step.icon className="h-4 w-4" />
                )}
                <span className="text-sm">{step.title}</span>
              </button>
              {index < steps.length - 1 && (
                <ChevronRight className="h-4 w-4 mx-3 text-border" />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 py-10 px-8 max-w-3xl mx-auto w-full">
        {/* Step 1: Identity */}
        {currentStep === 1 && (
          <div className="space-y-8 animate-fade-in">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">🏢</span>
                  Qui êtes-vous ?
                </CardTitle>
                <CardDescription>
                  Définissez votre identité en quelques clics
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Agency Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">Nom de votre structure</Label>
                  <Input
                    id="name"
                    placeholder="Ex: Studio Créatif Paris"
                    value={agencyName}
                    onChange={(e) => setAgencyName(e.target.value)}
                    className="text-lg h-12"
                  />
                </div>

                {/* Business Type */}
                <div className="space-y-3">
                  <Label>Quel est votre métier ?</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {(Object.entries(BUSINESS_TYPES) as [BusinessType, { label: string; icon: string }][]).map(([key, { label, icon }]) => (
                      <button
                        key={key}
                        onClick={() => setBusinessType(key)}
                        className={cn(
                          "flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left",
                          businessType === key
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50 hover:bg-muted/50"
                        )}
                      >
                        <span className="text-2xl">{icon}</span>
                        <span className="font-medium text-sm">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Business Description (shown when "other" is selected) */}
                {businessType === 'other' && (
                  <div className="space-y-2 animate-fade-in">
                    <Label htmlFor="customBusiness">Décrivez votre activité précisément</Label>
                    <Textarea
                      id="customBusiness"
                      placeholder="Ex: Je vends des piscines en béton projeté pour particuliers haut de gamme..."
                      value={customBusinessDescription}
                      onChange={(e) => setCustomBusinessDescription(e.target.value)}
                      className="min-h-[150px]"
                      showCharCount
                    />
                    <p className="text-xs text-muted-foreground">
                      Cette description sera utilisée comme contexte prioritaire par l'IA
                    </p>
                  </div>
                )}

                {/* Business Size */}
                <div className="space-y-3">
                  <Label>Quelle est votre taille ?</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {(Object.entries(BUSINESS_SIZES) as [BusinessSize, { label: string; description: string }][]).map(([key, { label, description }]) => (
                      <button
                        key={key}
                        onClick={() => setBusinessSize(key)}
                        className={cn(
                          "flex flex-col items-center p-4 rounded-xl border-2 transition-all text-center",
                          businessSize === key
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50 hover:bg-muted/50"
                        )}
                      >
                        <span className="font-semibold">{label}</span>
                        <span className="text-xs text-muted-foreground mt-1">{description}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button 
                onClick={() => setCurrentStep(2)} 
                disabled={!canProceed(1)}
                className="gap-2"
              >
                Continuer
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Offer & Pricing */}
        {currentStep === 2 && (
          <div className="space-y-8 animate-fade-in">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">💼</span>
                  Votre offre
                </CardTitle>
                <CardDescription>
                  Sélectionnez vos services et positionnement
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Services */}
                {businessType !== 'other' && (
                  <div className="space-y-3">
                    <Label>Vos services clés</Label>
                    <p className="text-sm text-muted-foreground">
                      Sélectionnez les services que vous proposez
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {businessType && SERVICES_BY_TYPE[businessType].map((service) => (
                        <button
                          key={service}
                          onClick={() => toggleService(service)}
                          className={cn(
                            "px-4 py-2 rounded-full text-sm font-medium transition-all",
                            selectedServices.includes(service)
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                          )}
                        >
                          {selectedServices.includes(service) && "✓ "}
                          {service}
                        </button>
                      ))}
                    </div>
                    {!businessType && (
                      <p className="text-sm text-warning">
                        Sélectionnez d'abord votre métier à l'étape 1
                      </p>
                    )}
                  </div>
                )}

                {/* Custom Services (for "other" business type) */}
                {businessType === 'other' && (
                  <div className="space-y-3">
                    <Label>Vos services personnalisés</Label>
                    <p className="text-sm text-muted-foreground">
                      Ajoutez vos propres services
                    </p>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Ex: Installation piscine béton"
                        value={newCustomService}
                        onChange={(e) => setNewCustomService(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addCustomService()}
                      />
                      <Button onClick={addCustomService} variant="outline" size="icon">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {customServices.map((service) => (
                        <div
                          key={service}
                          className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium"
                        >
                          {service}
                          <button onClick={() => removeCustomService(service)}>
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                    {customServices.length === 0 && (
                      <p className="text-sm text-muted-foreground italic">
                        Ajoutez au moins un service pour continuer
                      </p>
                    )}
                  </div>
                )}

                {/* Pricing Tier */}
                <div className="space-y-4">
                  <Label>Votre positionnement prix</Label>
                  <div className="grid grid-cols-3 gap-4">
                    {(Object.entries(PRICING_TIERS) as [PricingTier, { label: string; description: string; icon: string; defaultPrice: number }][]).map(([key, { label, description, icon }]) => (
                      <button
                        key={key}
                        onClick={() => setPricingTier(key)}
                        className={cn(
                          "flex flex-col items-center p-6 rounded-xl border-2 transition-all",
                          pricingTier === key
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50 hover:bg-muted/50"
                        )}
                      >
                        <span className="text-3xl mb-2">{icon}</span>
                        <span className="font-semibold">{label}</span>
                        <span className="text-xs text-muted-foreground mt-1">{description}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price Slider & Input */}
                {pricingTier && (
                  <div className="space-y-4 p-4 rounded-xl bg-muted/30 border border-border animate-fade-in">
                    <div className="flex items-center justify-between">
                      <Label>Budget moyen par projet</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={basePrice}
                          onChange={(e) => setBasePrice(Number(e.target.value))}
                          className="w-32 text-right font-semibold"
                          min={500}
                          max={100000}
                          step={500}
                        />
                        <span className="text-muted-foreground">€</span>
                      </div>
                    </div>
                    <Slider
                      value={[basePrice]}
                      onValueChange={(value) => setBasePrice(value[0])}
                      min={500}
                      max={50000}
                      step={500}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>500 €</span>
                      <span>50 000 €</span>
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      💡 Ce montant servira de base pour vos devis générés
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button 
                variant="outline" 
                onClick={() => setCurrentStep(1)}
              >
                Retour
              </Button>
              <Button 
                onClick={() => setCurrentStep(3)} 
                disabled={!canProceed(2)}
                className="gap-2"
              >
                Continuer
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Writing Style */}
        {currentStep === 3 && (
          <div className="space-y-8 animate-fade-in">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">✍️</span>
                  Style d'écriture
                </CardTitle>
                <CardDescription>
                  Comment l'IA doit-elle s'exprimer ?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Writing Tone */}
                <div className="space-y-3">
                  <Label>Quel ton doit employer l'IA ?</Label>
                  <div className="grid grid-cols-2 gap-4">
                    {(Object.entries(WRITING_TONES) as [WritingTone, { label: string; description: string; icon: string }][]).map(([key, { label, description, icon }]) => (
                      <button
                        key={key}
                        onClick={() => setWritingTone(key)}
                        className={cn(
                          "flex items-start gap-4 p-5 rounded-xl border-2 transition-all text-left",
                          writingTone === key
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50 hover:bg-muted/50"
                        )}
                      >
                        <span className="text-3xl">{icon}</span>
                        <div>
                          <span className="font-semibold block">{label}</span>
                          <span className="text-sm text-muted-foreground">{description}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* PDF Upload for Style Training */}
                <div className="space-y-3">
                  <Label>
                    Entraîner le style avec vos documents{" "}
                    <span className="text-muted-foreground">(optionnel)</span>
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Uploadez d'anciennes propales gagnantes pour que l'IA s'en inspire
                  </p>
                  <PdfDropzone onTextExtracted={handlePdfTextExtracted} />
                </div>

                {/* Optional: Methodology */}
                <div className="space-y-2">
                  <Label htmlFor="methodology">
                    Méthodologie <span className="text-muted-foreground">(optionnel)</span>
                  </Label>
                  <Textarea
                    id="methodology"
                    placeholder="Décrivez brièvement votre approche unique...

Ex: Nous utilisons une méthodologie en 3 phases : Audit, Conception, Implémentation. Chaque projet démarre par un workshop de cadrage..."
                    className="min-h-[180px]"
                    value={methodology}
                    onChange={(e) => setMethodology(e.target.value)}
                    showCharCount
                  />
                </div>

                {/* Optional: Sample Proposal */}
                <div className="space-y-2">
                  <Label htmlFor="sample">
                    Exemple de style{" "}
                    <span className="text-muted-foreground">(extrait automatiquement ou manuel)</span>
                  </Label>
                  <Textarea
                    id="sample"
                    placeholder="Le texte de vos PDF uploadés apparaîtra ici automatiquement...

Vous pouvez aussi coller manuellement un extrait de propale gagnante pour que l'IA s'inspire de votre style d'écriture."
                    className="min-h-[250px] font-mono text-sm"
                    value={sampleProposal}
                    onChange={(e) => setSampleProposal(e.target.value)}
                    showCharCount
                  />
                  {sampleProposal && (
                    <p className="text-xs text-muted-foreground">
                      {sampleProposal.length.toLocaleString()} caractères de référence de style
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button 
                variant="outline" 
                onClick={() => setCurrentStep(2)}
              >
                Retour
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={!canProceed(3)}
                variant="magic"
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Sauvegarder la configuration
              </Button>
            </div>

            {/* Preview Card */}
            {canProceed(3) && (
              <Card className="bg-muted/30 border-dashed">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Aperçu du contexte généré
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">
                    <strong>{agencyName || 'Votre agence'}</strong> est{' '}
                    {businessType === 'other' ? (
                      <strong>{customBusinessDescription || 'une activité spécifique'}</strong>
                    ) : (
                      <>une <strong>{businessType && BUSINESS_TYPES[businessType].label}</strong></>
                    )}{' '}
                    de taille <strong>{businessSize && BUSINESS_SIZES[businessSize].label}</strong>, 
                    positionnée <strong>{pricingTier && PRICING_TIERS[pricingTier].label}</strong>{' '}
                    (budget moyen : <strong>{formatPrice(basePrice)}</strong>).
                    {(selectedServices.length > 0 || customServices.length > 0) && (
                      <> Services : <strong>{[...selectedServices, ...customServices].join(', ')}</strong>.</>
                    )}
                    {' '}Ton : <strong>{writingTone && WRITING_TONES[writingTone].label}</strong>.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
