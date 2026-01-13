import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Settings2 } from "lucide-react";
import { CRMConnectionModal } from "./CRMConnectionModal";
import { CRMFieldMapping } from "./CRMFieldMapping";

export interface CRMIntegration {
  id: string;
  name: string;
  logo: string;
  color: string;
  description: string;
  connected: boolean;
  apiKey?: string;
  fieldMappings?: FieldMapping[];
  trigger?: TriggerRule;
}

export interface FieldMapping {
  kortexField: string;
  crmField: string;
}

export type TriggerRule = "on_detection" | "after_validation" | "on_proposal";

const CRM_INTEGRATIONS: CRMIntegration[] = [
  {
    id: "hubspot",
    name: "HubSpot",
    logo: "https://www.hubspot.com/hubfs/HubSpot_Logos/HubSpot-Inversed-Favicon.png",
    color: "#FF7A59",
    description: "CRM & Marketing Automation",
    connected: false,
  },
  {
    id: "salesforce",
    name: "Salesforce",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Salesforce.com_logo.svg/1280px-Salesforce.com_logo.svg.png",
    color: "#00A1E0",
    description: "Enterprise CRM Leader",
    connected: false,
  },
  {
    id: "pipedrive",
    name: "Pipedrive",
    logo: "https://www.pipedrive.com/favicon.ico",
    color: "#25292C",
    description: "Sales Pipeline CRM",
    connected: false,
  },
  {
    id: "slack",
    name: "Slack",
    logo: "https://a.slack-edge.com/80588/marketing/img/meta/favicon-32.png",
    color: "#4A154B",
    description: "Notifications & Alertes",
    connected: false,
  },
  {
    id: "zapier",
    name: "Zapier",
    logo: "https://zapier.com/favicon.ico",
    color: "#FF4A00",
    description: "Automatisation universelle",
    connected: false,
  },
];

export function CRMIntegrationHub() {
  const [integrations, setIntegrations] = useState<CRMIntegration[]>(() => {
    const saved = localStorage.getItem("crm_integrations");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return CRM_INTEGRATIONS;
      }
    }
    return CRM_INTEGRATIONS;
  });

  const [selectedCRM, setSelectedCRM] = useState<CRMIntegration | null>(null);
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [showMappingModal, setShowMappingModal] = useState(false);

  const saveIntegrations = (updated: CRMIntegration[]) => {
    setIntegrations(updated);
    localStorage.setItem("crm_integrations", JSON.stringify(updated));
  };

  const handleToggle = (integration: CRMIntegration) => {
    if (!integration.connected) {
      setSelectedCRM(integration);
      setShowConnectionModal(true);
    } else {
      // Disconnect
      const updated = integrations.map((i) =>
        i.id === integration.id
          ? { ...i, connected: false, apiKey: undefined, fieldMappings: undefined, trigger: undefined }
          : i
      );
      saveIntegrations(updated);
    }
  };

  const handleConnect = (apiKey: string, trigger: TriggerRule) => {
    if (!selectedCRM) return;

    const updated = integrations.map((i) =>
      i.id === selectedCRM.id
        ? { ...i, connected: true, apiKey, trigger, fieldMappings: getDefaultMappings() }
        : i
    );
    saveIntegrations(updated);
    setShowConnectionModal(false);
    
    // Open mapping modal after connection
    const connectedIntegration = updated.find((i) => i.id === selectedCRM.id);
    if (connectedIntegration) {
      setSelectedCRM(connectedIntegration);
      setShowMappingModal(true);
    }
  };

  const handleOpenMapping = (integration: CRMIntegration) => {
    setSelectedCRM(integration);
    setShowMappingModal(true);
  };

  const handleSaveMapping = (mappings: FieldMapping[], trigger: TriggerRule) => {
    if (!selectedCRM) return;

    const updated = integrations.map((i) =>
      i.id === selectedCRM.id ? { ...i, fieldMappings: mappings, trigger } : i
    );
    saveIntegrations(updated);
    setShowMappingModal(false);
  };

  const connectedCount = integrations.filter((i) => i.connected).length;

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
            <Settings2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Connecteurs & Intégrations CRM</h2>
            <p className="text-muted-foreground text-sm">
              Synchronisez vos prospects avec vos outils de vente
            </p>
          </div>
        </div>
        {connectedCount > 0 && (
          <Badge variant="default" className="bg-emerald-500">
            {connectedCount} connecté{connectedCount > 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      {/* CRM Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {integrations.map((integration) => (
          <Card
            key={integration.id}
            className={`relative transition-all duration-200 ${
              integration.connected
                ? "border-emerald-500/50 bg-emerald-500/5"
                : "border-border hover:border-primary/30"
            }`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
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
                    <CardTitle className="text-base flex items-center gap-2">
                      {integration.name}
                      {integration.connected && (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      )}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {integration.description}
                    </CardDescription>
                  </div>
                </div>
                <Switch
                  checked={integration.connected}
                  onCheckedChange={() => handleToggle(integration)}
                />
              </div>
            </CardHeader>

            {integration.connected && (
              <CardContent className="pt-0">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenMapping(integration)}
                    className="flex-1 text-xs"
                  >
                    <Settings2 className="h-3 w-3 mr-1" />
                    Configurer le mapping
                  </Button>
                </div>
                {integration.trigger && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Trigger: {getTriggerLabel(integration.trigger)}
                  </p>
                )}
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Connection Modal */}
      {selectedCRM && (
        <CRMConnectionModal
          open={showConnectionModal}
          onOpenChange={setShowConnectionModal}
          integration={selectedCRM}
          onConnect={handleConnect}
        />
      )}

      {/* Field Mapping Modal */}
      {selectedCRM && selectedCRM.connected && (
        <CRMFieldMapping
          open={showMappingModal}
          onOpenChange={setShowMappingModal}
          integration={selectedCRM}
          onSave={handleSaveMapping}
        />
      )}
    </div>
  );
}

function getDefaultMappings(): FieldMapping[] {
  return [
    { kortexField: "company_name", crmField: "" },
    { kortexField: "contact_email", crmField: "" },
    { kortexField: "contact_name", crmField: "" },
    { kortexField: "signal_detected", crmField: "" },
    { kortexField: "proposal_link", crmField: "" },
    { kortexField: "fit_score", crmField: "" },
  ];
}

function getTriggerLabel(trigger: TriggerRule): string {
  switch (trigger) {
    case "on_detection":
      return "Dès la détection";
    case "after_validation":
      return "Après validation manuelle";
    case "on_proposal":
      return "Quand la propale est générée";
    default:
      return trigger;
  }
}
