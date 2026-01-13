import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowRight, Zap, Table2, Save } from "lucide-react";
import { CRMIntegration, FieldMapping, TriggerRule } from "./CRMIntegrationHub";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  integration: CRMIntegration;
  onSave: (mappings: FieldMapping[], trigger: TriggerRule) => void;
}

// Kortex fields that can be synced
const KORTEX_FIELDS = [
  { id: "company_name", label: "Nom de l'entreprise", icon: "🏢" },
  { id: "contact_email", label: "Email du contact", icon: "📧" },
  { id: "contact_name", label: "Nom du contact", icon: "👤" },
  { id: "signal_detected", label: "Signal détecté", icon: "📡" },
  { id: "proposal_link", label: "Lien vers la propale", icon: "📄" },
  { id: "fit_score", label: "Score de compatibilité", icon: "⭐" },
  { id: "company_website", label: "Site web", icon: "🌐" },
  { id: "linkedin_url", label: "Profil LinkedIn", icon: "💼" },
  { id: "detection_date", label: "Date de détection", icon: "📅" },
];

// Simulated CRM fields per integration
const CRM_FIELDS: Record<string, { id: string; label: string }[]> = {
  hubspot: [
    { id: "company", label: "Entreprise" },
    { id: "email", label: "Email" },
    { id: "firstname", label: "Prénom" },
    { id: "lastname", label: "Nom" },
    { id: "jobtitle", label: "Poste" },
    { id: "notes", label: "Notes" },
    { id: "website", label: "Site web" },
    { id: "linkedin_url", label: "LinkedIn" },
    { id: "lead_source", label: "Source du lead" },
    { id: "lead_status", label: "Statut du lead" },
    { id: "custom_score", label: "Score (custom)" },
    { id: "custom_signal", label: "Signal (custom)" },
  ],
  salesforce: [
    { id: "Account.Name", label: "Account Name" },
    { id: "Contact.Email", label: "Contact Email" },
    { id: "Contact.FirstName", label: "Contact First Name" },
    { id: "Contact.LastName", label: "Contact Last Name" },
    { id: "Lead.Description", label: "Lead Description" },
    { id: "Lead.Website", label: "Lead Website" },
    { id: "Lead.LeadSource", label: "Lead Source" },
    { id: "Opportunity.Description", label: "Opportunity Description" },
    { id: "Custom_Signal__c", label: "Custom Signal (custom)" },
    { id: "Custom_Score__c", label: "Custom Score (custom)" },
  ],
  pipedrive: [
    { id: "org_name", label: "Organisation" },
    { id: "person_name", label: "Nom de la personne" },
    { id: "email", label: "Email" },
    { id: "phone", label: "Téléphone" },
    { id: "note", label: "Note" },
    { id: "deal_title", label: "Titre du deal" },
    { id: "deal_value", label: "Valeur du deal" },
    { id: "custom_field_signal", label: "Signal (custom)" },
    { id: "custom_field_score", label: "Score (custom)" },
  ],
  slack: [
    { id: "channel_message", label: "Message dans le canal" },
    { id: "dm_message", label: "Message direct" },
    { id: "thread_reply", label: "Réponse dans un thread" },
  ],
  zapier: [
    { id: "field_1", label: "Champ personnalisé 1" },
    { id: "field_2", label: "Champ personnalisé 2" },
    { id: "field_3", label: "Champ personnalisé 3" },
    { id: "field_4", label: "Champ personnalisé 4" },
    { id: "field_5", label: "Champ personnalisé 5" },
    { id: "field_6", label: "Champ personnalisé 6" },
  ],
};

export function CRMFieldMapping({ open, onOpenChange, integration, onSave }: Props) {
  const { toast } = useToast();
  const [mappings, setMappings] = useState<FieldMapping[]>(
    integration.fieldMappings || getDefaultMappings()
  );
  const [trigger, setTrigger] = useState<TriggerRule>(integration.trigger || "after_validation");

  useEffect(() => {
    if (integration.fieldMappings) {
      setMappings(integration.fieldMappings);
    }
    if (integration.trigger) {
      setTrigger(integration.trigger);
    }
  }, [integration]);

  const crmFields = CRM_FIELDS[integration.id] || [];

  const handleMappingChange = (kortexField: string, crmField: string) => {
    setMappings((prev) =>
      prev.map((m) => (m.kortexField === kortexField ? { ...m, crmField } : m))
    );
  };

  const handleSave = () => {
    const mappedCount = mappings.filter((m) => m.crmField).length;
    
    toast({
      title: "Configuration sauvegardée",
      description: `${mappedCount} champ${mappedCount > 1 ? "s" : ""} mappé${mappedCount > 1 ? "s" : ""} vers ${integration.name}`,
    });
    
    onSave(mappings, trigger);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl p-2"
              style={{ backgroundColor: `${integration.color}15` }}
            >
              <img
                src={integration.logo}
                alt={integration.name}
                className="h-8 w-8 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${integration.name}&background=${integration.color.slice(1)}&color=fff`;
                }}
              />
            </div>
            <div>
              <DialogTitle className="flex items-center gap-2">
                <Table2 className="h-5 w-5" />
                Mapping des champs — {integration.name}
              </DialogTitle>
              <DialogDescription>
                Définissez où vos données Kortex doivent être envoyées dans votre CRM
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Field Mapping Table */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Correspondance des champs</Label>
            
            <div className="border border-border rounded-lg overflow-hidden">
              {/* Header */}
              <div className="grid grid-cols-[1fr,auto,1fr] gap-4 p-3 bg-muted/50 border-b border-border">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Données Kortex
                </div>
                <div className="w-8" />
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Champ {integration.name}
                </div>
              </div>

              {/* Rows */}
              <div className="divide-y divide-border">
                {KORTEX_FIELDS.map((field) => {
                  const mapping = mappings.find((m) => m.kortexField === field.id);
                  
                  return (
                    <div
                      key={field.id}
                      className="grid grid-cols-[1fr,auto,1fr] gap-4 p-3 items-center hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{field.icon}</span>
                        <span className="text-sm font-medium">{field.label}</span>
                      </div>
                      
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      
                      <Select
                        value={mapping?.crmField || ""}
                        onValueChange={(value) => handleMappingChange(field.id, value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="— Non mappé —" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">— Non mappé —</SelectItem>
                          {crmFields.map((crmField) => (
                            <SelectItem key={crmField.id} value={crmField.id}>
                              {crmField.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Trigger Selection */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Zap className="h-4 w-4" />
              Règle d'automatisation
            </Label>
            <RadioGroup
              value={trigger}
              onValueChange={(v) => setTrigger(v as TriggerRule)}
              className="space-y-2"
            >
              <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:border-primary/30 transition-colors">
                <RadioGroupItem value="on_detection" id="mapping_on_detection" />
                <Label htmlFor="mapping_on_detection" className="flex-1 cursor-pointer font-normal">
                  <span className="font-medium">Dès la détection</span>
                  <p className="text-xs text-muted-foreground">
                    Synchronise automatiquement chaque nouveau prospect
                  </p>
                </Label>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:border-primary/30 transition-colors">
                <RadioGroupItem value="after_validation" id="mapping_after_validation" />
                <Label htmlFor="mapping_after_validation" className="flex-1 cursor-pointer font-normal">
                  <span className="font-medium">Après validation manuelle</span>
                  <p className="text-xs text-muted-foreground">
                    Vous choisissez quels prospects envoyer au CRM
                  </p>
                </Label>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:border-primary/30 transition-colors">
                <RadioGroupItem value="on_proposal" id="mapping_on_proposal" />
                <Label htmlFor="mapping_on_proposal" className="flex-1 cursor-pointer font-normal">
                  <span className="font-medium">Quand la propale est générée</span>
                  <p className="text-xs text-muted-foreground">
                    Synchronise uniquement les prospects avec une proposition commerciale
                  </p>
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Sauvegarder le mapping
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function getDefaultMappings(): FieldMapping[] {
  return KORTEX_FIELDS.map((field) => ({
    kortexField: field.id,
    crmField: "",
  }));
}
