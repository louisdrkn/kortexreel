import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Eye, EyeOff, Key, Zap, Loader2 } from "lucide-react";
import { CRMIntegration, TriggerRule } from "./CRMIntegrationHub";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  integration: CRMIntegration;
  onConnect: (apiKey: string, trigger: TriggerRule) => void;
}

export function CRMConnectionModal({ open, onOpenChange, integration, onConnect }: Props) {
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [trigger, setTrigger] = useState<TriggerRule>("after_validation");
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    if (!apiKey.trim()) {
      toast({
        title: "Clé API requise",
        description: "Veuillez entrer votre clé API pour continuer",
        variant: "destructive",
      });
      return;
    }

    setIsConnecting(true);
    
    // Simulate API validation
    await new Promise((r) => setTimeout(r, 1500));
    
    setIsConnecting(false);
    toast({
      title: "Connexion réussie",
      description: `${integration.name} est maintenant connecté à Kortex`,
    });
    
    onConnect(apiKey, trigger);
    setApiKey("");
  };

  const getApiKeyPlaceholder = () => {
    switch (integration.id) {
      case "hubspot":
        return "pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx";
      case "salesforce":
        return "00D5g00000XXXXX!AQEAXXXXXXXXXX";
      case "pipedrive":
        return "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
      case "slack":
        return "xoxb-xxxxxxxxxxxx-xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxx";
      case "zapier":
        return "https://hooks.zapier.com/hooks/catch/xxxxx/xxxxx/";
      default:
        return "Votre clé API";
    }
  };

  const getApiKeyLabel = () => {
    if (integration.id === "zapier") return "URL du Webhook Zapier";
    return "Clé API";
  };

  const getApiKeyHelp = () => {
    switch (integration.id) {
      case "hubspot":
        return "Trouvez votre clé dans Paramètres → Intégrations → Clés API privées";
      case "salesforce":
        return "Générez un token dans Configuration → Apps → Connected Apps";
      case "pipedrive":
        return "Paramètres → Personnel → API → Clé API";
      case "slack":
        return "Créez une app Slack et obtenez le Bot Token";
      case "zapier":
        return "Créez un Zap avec le trigger 'Webhooks by Zapier' → Catch Hook";
      default:
        return "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
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
              <DialogTitle>Connecter {integration.name}</DialogTitle>
              <DialogDescription>{integration.description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* API Key Input */}
          <div className="space-y-2">
            <Label htmlFor="api-key" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              {getApiKeyLabel()}
            </Label>
            <div className="relative">
              <Input
                id="api-key"
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={getApiKeyPlaceholder()}
                className="pr-10 font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">{getApiKeyHelp()}</p>
          </div>

          {/* Trigger Selection */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Envoyer vers {integration.name} quand...
            </Label>
            <RadioGroup
              value={trigger}
              onValueChange={(v) => setTrigger(v as TriggerRule)}
              className="space-y-2"
            >
              <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:border-primary/30 transition-colors">
                <RadioGroupItem value="on_detection" id="on_detection" />
                <Label htmlFor="on_detection" className="flex-1 cursor-pointer font-normal">
                  <span className="font-medium">Dès la détection</span>
                  <p className="text-xs text-muted-foreground">
                    Synchronise automatiquement chaque nouveau prospect détecté
                  </p>
                </Label>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:border-primary/30 transition-colors">
                <RadioGroupItem value="after_validation" id="after_validation" />
                <Label htmlFor="after_validation" className="flex-1 cursor-pointer font-normal">
                  <span className="font-medium">Après validation manuelle</span>
                  <p className="text-xs text-muted-foreground">
                    Vous choisissez quels prospects envoyer au CRM
                  </p>
                </Label>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:border-primary/30 transition-colors">
                <RadioGroupItem value="on_proposal" id="on_proposal" />
                <Label htmlFor="on_proposal" className="flex-1 cursor-pointer font-normal">
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
          <Button onClick={handleConnect} disabled={isConnecting || !apiKey.trim()}>
            {isConnecting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Connexion...
              </>
            ) : (
              "Connecter"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
