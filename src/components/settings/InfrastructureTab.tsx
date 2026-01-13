import { useState, useEffect } from "react";
import { 
  Brain, Globe, Mail, Eye, EyeOff, 
  CheckCircle2, XCircle, Loader2, AlertTriangle,
  Database, HardDrive, RefreshCw, Sparkles, Users, Radio
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { LinkedInConnectionCard } from "./LinkedInConnectionCard";

interface ApiConnection {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  placeholder: string;
  keyField: string;
}

const API_CONNECTIONS: ApiConnection[] = [
  {
    id: "firecrawl",
    name: "Web Scraper Engine (Firecrawl)",
    description: "Permet à Kortex de lire et analyser les sites web des prospects.",
    icon: Globe,
    iconBg: "bg-orange-500/10",
    iconColor: "text-orange-400",
    placeholder: "fc-...",
    keyField: "firecrawl_api_key",
  },
  {
    id: "magileads",
    name: "Persona Finder (Magileads)",
    description: "Trouve les décideurs (CEO, DRH, etc.) dans les entreprises cibles.",
    icon: Users,
    iconBg: "bg-purple-500/10",
    iconColor: "text-purple-400",
    placeholder: "Votre clé API Magileads",
    keyField: "magileads_api_key",
  },
  {
    id: "hunter",
    name: "Email Discovery (Hunter.io)",
    description: "Requis pour trouver et vérifier les adresses emails pro.",
    icon: Mail,
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-400",
    placeholder: "Votre clé API Hunter.io",
    keyField: "hunter_api_key",
  },
];

export const InfrastructureTab = () => {
  const { toast } = useToast();
  const [apiSettings, setApiSettings] = useState<Record<string, string>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [orgId, setOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [storageStatus, setStorageStatus] = useState<'checking' | 'ok' | 'error'>('checking');
  const [storageDiagnostic, setStorageDiagnostic] = useState<string>("");

  // Load API settings on mount
  useEffect(() => {
    loadApiSettings();
    checkStorageStatus();
  }, []);

  const loadApiSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's org_id from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('id', user.id)
        .single();

      if (profile?.org_id) {
        setOrgId(profile.org_id);

        // Get organization api_settings
        const { data: org } = await supabase
          .from('organizations')
          .select('api_settings')
          .eq('id', profile.org_id)
          .single();

        if (org?.api_settings && typeof org.api_settings === 'object') {
          setApiSettings(org.api_settings as Record<string, string>);
        }
      }
    } catch (error) {
      console.error('Error loading API settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkStorageStatus = async () => {
    try {
      setStorageStatus('checking');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setStorageStatus('error');
        setStorageDiagnostic("Utilisateur non authentifié");
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('id', user.id)
        .single();

      const orgIdForStorage = profile?.org_id || orgId;

      const requiredBuckets = ['project-files', 'knowledge-vault'] as const;

      const bucketResults = await Promise.all(
        requiredBuckets.map(async (bucketName) => {
          const prefix =
            bucketName === 'project-files'
              ? `${user.id}/`
              : orgIdForStorage
                ? `${orgIdForStorage}/`
                : '';

          const { error } = await supabase.storage
            .from(bucketName)
            .list(prefix, { limit: 1 });

          return { name: bucketName, accessible: !error };
        })
      );

      const inaccessible = bucketResults.filter(b => !b.accessible).map(b => b.name);

      if (inaccessible.length > 0) {
        setStorageStatus('error');
        setStorageDiagnostic(`Buckets inaccessibles: ${inaccessible.join(', ')}. Vérifiez les policies RLS.`);
      } else {
        setStorageStatus('ok');
        setStorageDiagnostic(`${bucketResults.length} buckets opérationnels. Système prêt.`);
      }
    } catch (error) {
      setStorageStatus('error');
      setStorageDiagnostic('Impossible de vérifier le stockage');
    }
  };

  const saveApiKey = async (keyField: string, value: string) => {
    if (!orgId) {
      toast({
        title: "Erreur",
        description: "Organisation non trouvée. Reconnectez-vous.",
        variant: "destructive",
      });
      return;
    }

    setSaving(prev => ({ ...prev, [keyField]: true }));

    try {
      const updatedSettings = { ...apiSettings, [keyField]: value };
      
      const { error } = await supabase
        .from('organizations')
        .update({ api_settings: updatedSettings })
        .eq('id', orgId);

      if (error) throw error;

      setApiSettings(updatedSettings);
      toast({
        title: "Connexion établie",
        description: "La clé API a été enregistrée avec succès.",
      });
    } catch (error) {
      console.error('Error saving API key:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder la clé API.",
        variant: "destructive",
      });
    } finally {
      setSaving(prev => ({ ...prev, [keyField]: false }));
    }
  };

  const disconnectApi = async (keyField: string) => {
    if (!orgId) return;

    setSaving(prev => ({ ...prev, [keyField]: true }));

    try {
      const updatedSettings = { ...apiSettings };
      delete updatedSettings[keyField];
      
      const { error } = await supabase
        .from('organizations')
        .update({ api_settings: updatedSettings })
        .eq('id', orgId);

      if (error) throw error;

      setApiSettings(updatedSettings);
      toast({
        title: "Déconnexion réussie",
        description: "La clé API a été supprimée.",
      });
    } catch (error) {
      console.error('Error disconnecting API:', error);
      toast({
        title: "Erreur",
        description: "Impossible de déconnecter le service.",
        variant: "destructive",
      });
    } finally {
      setSaving(prev => ({ ...prev, [keyField]: false }));
    }
  };

  const toggleShowKey = (keyField: string) => {
    setShowKeys(prev => ({ ...prev, [keyField]: !prev[keyField] }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#8B5CF6]" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-white">Infrastructure & Connexions</h1>
        <p className="text-[#A1A1AA] text-sm mt-1">
          Configurez les 4 piliers de votre système Kortex
        </p>
      </div>

      {/* Status Overview */}
      <div className="bg-[#121214] border border-[#27272A] rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-[#8B5CF6]" />
            <h3 className="font-semibold text-white">État du Système</h3>
          </div>
          <Badge 
            className={`${
              Object.keys(apiSettings).length >= 5
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : Object.keys(apiSettings).length >= 3
                ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                : "bg-red-500/10 text-red-400 border-red-500/20"
            }`}
          >
            {Object.keys(apiSettings).length} / 5 connectés
          </Badge>
        </div>
        <div className="grid grid-cols-5 gap-3">
          {API_CONNECTIONS.map((api) => (
            <div 
              key={api.id}
              className={`flex items-center gap-2 p-3 rounded-lg border ${
                apiSettings[api.keyField]
                  ? "bg-emerald-500/5 border-emerald-500/20"
                  : "bg-[#18181B] border-[#27272A]"
              }`}
            >
              {apiSettings[api.keyField] ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
              ) : (
                <XCircle className="h-4 w-4 text-[#52525B] flex-shrink-0" />
              )}
              <span className={`text-xs truncate ${
                apiSettings[api.keyField] ? "text-emerald-400" : "text-[#71717A]"
              }`}>
                {api.name.split(' ')[0]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* API Connection Cards */}
      <div className="space-y-4">
        {API_CONNECTIONS.map((api) => (
          <ApiConnectionCard
            key={api.id}
            api={api}
            value={apiSettings[api.keyField] || ""}
            showKey={showKeys[api.keyField] || false}
            saving={saving[api.keyField] || false}
            isConnected={!!apiSettings[api.keyField]}
            onSave={(value) => saveApiKey(api.keyField, value)}
            onDisconnect={() => disconnectApi(api.keyField)}
            onToggleShow={() => toggleShowKey(api.keyField)}
          />
        ))}
      </div>

      {/* Canaux de Prospection Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Radio className="h-5 w-5 text-[#8B5CF6]" />
          <h3 className="font-semibold text-white text-lg">Canaux de Prospection</h3>
        </div>
        <p className="text-[#71717A] text-sm -mt-2">
          Connectez vos comptes pour envoyer des messages automatiquement
        </p>
        
        <LinkedInConnectionCard
          orgId={orgId}
          apiSettings={apiSettings}
          onConnectionChange={loadApiSettings}
        />
      </div>

      {/* Storage Diagnostic */}
      <div className="bg-[#121214] border border-[#27272A] rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${
              storageStatus === 'ok' 
                ? "bg-emerald-500/10" 
                : storageStatus === 'error'
                ? "bg-red-500/10"
                : "bg-[#27272A]"
            }`}>
              {storageStatus === 'checking' ? (
                <Loader2 className="h-6 w-6 animate-spin text-[#A1A1AA]" />
              ) : storageStatus === 'ok' ? (
                <HardDrive className="h-6 w-6 text-emerald-400" />
              ) : (
                <AlertTriangle className="h-6 w-6 text-red-400" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h3 className="font-semibold text-white">Système de Stockage</h3>
                <Badge 
                  className={`text-xs ${
                    storageStatus === 'ok'
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : storageStatus === 'error'
                      ? "bg-red-500/10 text-red-400 border-red-500/20"
                      : "bg-[#27272A] text-[#71717A] border-[#3F3F46]"
                  }`}
                >
                  {storageStatus === 'ok' ? "Opérationnel" : storageStatus === 'error' ? "Problème" : "Vérification..."}
                </Badge>
              </div>
              <p className="text-sm text-[#71717A] mt-1">{storageDiagnostic}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={checkStorageStatus}
            className="border-[#3F3F46] bg-transparent text-white hover:bg-white/10 hover:text-white"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Revérifier
          </Button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-[#8B5CF6]/5 border border-[#8B5CF6]/20 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <Database className="h-5 w-5 text-[#8B5CF6] mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-white text-sm">Sécurité des clés API</h4>
            <p className="text-[#A1A1AA] text-sm mt-1">
              Vos clés sont chiffrées et stockées de manière sécurisée. Elles ne sont jamais exposées côté client 
              et sont utilisées uniquement par les fonctions serveur pour exécuter vos opérations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Individual API Connection Card Component
interface ApiConnectionCardProps {
  api: ApiConnection;
  value: string;
  showKey: boolean;
  saving: boolean;
  isConnected: boolean;
  onSave: (value: string) => void;
  onDisconnect: () => void;
  onToggleShow: () => void;
}

const ApiConnectionCard = ({
  api,
  value,
  showKey,
  saving,
  isConnected,
  onSave,
  onDisconnect,
  onToggleShow,
}: ApiConnectionCardProps) => {
  const [inputValue, setInputValue] = useState(value);
  const [isEditing, setIsEditing] = useState(!isConnected);

  useEffect(() => {
    setInputValue(value);
    setIsEditing(!value);
  }, [value]);

  const handleSave = () => {
    if (inputValue.trim()) {
      onSave(inputValue.trim());
      setIsEditing(false);
    }
  };

  const handleDisconnect = () => {
    onDisconnect();
    setInputValue("");
    setIsEditing(true);
  };

  return (
    <div className="bg-[#18181B] border border-[#27272A] rounded-xl p-6">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={`h-12 w-12 rounded-lg ${api.iconBg} flex items-center justify-center flex-shrink-0`}>
          <api.icon className={`h-6 w-6 ${api.iconColor}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="font-semibold text-white">{api.name}</h3>
            {isConnected && (
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Connecté
              </Badge>
            )}
          </div>
          <p className="text-sm text-[#71717A] mb-4">{api.description}</p>

          {/* Input Section */}
          {isEditing ? (
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Input
                  type={showKey ? "text" : "password"}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={api.placeholder}
                  className="bg-[#121214] border-[#3F3F46] text-white placeholder:text-[#52525B] focus:border-[#8B5CF6] focus:ring-[#8B5CF6]/20 h-11 rounded-lg pr-10"
                />
                <button
                  type="button"
                  onClick={onToggleShow}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-white transition-colors"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button
                onClick={handleSave}
                disabled={!inputValue.trim() || saving}
                className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white h-11 px-6 rounded-lg"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Connecter"
                )}
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-[#121214] border border-[#27272A] rounded-lg px-4 py-2.5">
                <span className="text-[#71717A] font-mono text-sm">
                  {showKey ? value : "••••••••••••••••"}
                </span>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={onToggleShow}
                className="border-[#3F3F46] bg-transparent text-white hover:bg-white/10 h-11 w-11 rounded-lg"
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsEditing(true)}
                className="border-[#3F3F46] bg-transparent text-white hover:bg-white/10 h-11 rounded-lg"
              >
                Modifier
              </Button>
              <Button
                variant="outline"
                onClick={handleDisconnect}
                disabled={saving}
                className="border-red-500/30 bg-transparent text-red-400 hover:bg-red-500/10 h-11 rounded-lg"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Déconnecter"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InfrastructureTab;
