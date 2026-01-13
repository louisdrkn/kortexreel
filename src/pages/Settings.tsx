import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  User, Link2, CreditCard, ShieldCheck, Bell, 
  Upload, Lock, RefreshCw, LogOut, Copy, 
  RotateCcw, Trash2, Check, ExternalLink,
  AlertTriangle, Linkedin, Database, Server, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { InfrastructureTab } from "@/components/settings/InfrastructureTab";
import { LinkedInConnectionCard } from "@/components/settings/LinkedInConnectionCard";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

type SettingsTab = "profile" | "infrastructure" | "integrations" | "billing" | "security" | "notifications";

const menuItems: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
  { id: "profile", label: "Profil & Identité", icon: User },
  { id: "infrastructure", label: "Infrastructure", icon: Server },
  { id: "integrations", label: "Intégrations", icon: Link2 },
  { id: "billing", label: "Facturation & Plan", icon: CreditCard },
  { id: "security", label: "Sécurité & API", icon: ShieldCheck },
  { id: "notifications", label: "Notifications", icon: Bell },
];

const Settings = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Organization data state
  const [orgId, setOrgId] = useState<string | null>(null);
  const [apiSettings, setApiSettings] = useState<Record<string, string>>({});
  const [isLoadingOrg, setIsLoadingOrg] = useState(true);

  // Fetch organization data
  const fetchOrganization = async () => {
    if (!user) return;
    
    try {
      // Get user's org_id from profiles
      const { data: profile } = await supabase
        .from("profiles")
        .select("org_id")
        .eq("id", user.id)
        .single();
      
      if (profile?.org_id) {
        setOrgId(profile.org_id);
        
        // Get organization settings
        const { data: org } = await supabase
          .from("organizations")
          .select("api_settings")
          .eq("id", profile.org_id)
          .single();
        
        if (org?.api_settings) {
          setApiSettings(org.api_settings as Record<string, string>);
        }
      }
    } catch (error) {
      console.error("Error fetching organization:", error);
    } finally {
      setIsLoadingOrg(false);
    }
  };

  useEffect(() => {
    fetchOrganization();
  }, [user]);

  const handleSave = () => {
    toast({
      title: "Modifications enregistrées",
      description: "Vos paramètres ont été mis à jour avec succès.",
    });
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copié dans le presse-papier" });
  };
  
  const handleConnectionChange = () => {
    // Refresh organization data after LinkedIn connection change
    fetchOrganization();
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-white">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="w-[280px] min-h-screen border-r border-[#27272A] bg-[#09090B] p-6 flex-shrink-0">
          <h2 className="text-xl font-semibold text-white mb-8">Réglages</h2>
          <nav className="space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  activeTab === item.id
                    ? "bg-white/10 text-white"
                    : "text-[#A1A1AA] hover:text-white hover:bg-white/5"
                }`}
              >
                <item.icon className="h-5 w-5" strokeWidth={1.5} />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 p-10 overflow-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="max-w-3xl"
            >
              {activeTab === "profile" && <ProfileTab onSave={handleSave} />}
              {activeTab === "infrastructure" && <InfrastructureTab />}
              {activeTab === "integrations" && (
                <IntegrationsTab 
                  orgId={orgId} 
                  apiSettings={apiSettings} 
                  onConnectionChange={handleConnectionChange}
                  isLoading={isLoadingOrg}
                />
              )}
              {activeTab === "billing" && <BillingTab />}
              {activeTab === "security" && <SecurityTab onCopy={handleCopy} />}
              {activeTab === "notifications" && <NotificationsTab />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

// TAB: Profil
const ProfileTab = ({ onSave }: { onSave: () => void }) => (
  <div className="space-y-8">
    <div>
      <h1 className="text-2xl font-semibold text-white">Identité du Pilote</h1>
      <p className="text-[#A1A1AA] text-sm mt-1">Gérez vos informations personnelles</p>
    </div>

    <div className="bg-[#121214] border border-[#27272A] rounded-xl p-8">
      {/* Avatar */}
      <div className="flex items-center gap-5 mb-10">
        <div className="h-16 w-16 rounded-full bg-[#27272A] flex items-center justify-center">
          <span className="text-xl font-semibold text-white">JD</span>
        </div>
        <div>
          <Button 
            variant="outline" 
            size="sm" 
            className="border-[#3F3F46] bg-transparent text-white hover:bg-white/10 hover:text-white"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </Button>
          <p className="text-xs text-[#71717A] mt-2">JPG, PNG. Max 2MB.</p>
        </div>
      </div>

      {/* Form Grid */}
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label className="text-[#A1A1AA] text-sm">Prénom</Label>
          <Input 
            defaultValue="Jean" 
            className="bg-[#18181B] border-[#3F3F46] text-white placeholder:text-[#52525B] focus:border-[#8B5CF6] focus:ring-[#8B5CF6]/20 h-11 rounded-lg"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-[#A1A1AA] text-sm">Nom</Label>
          <Input 
            defaultValue="Test" 
            className="bg-[#18181B] border-[#3F3F46] text-white placeholder:text-[#52525B] focus:border-[#8B5CF6] focus:ring-[#8B5CF6]/20 h-11 rounded-lg"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-[#A1A1AA] text-sm">Email Professionnel</Label>
          <div className="relative">
            <Input 
              defaultValue="jean@test.com" 
              disabled
              className="bg-[#18181B]/50 border-[#27272A] text-[#71717A] cursor-not-allowed h-11 rounded-lg pr-10"
            />
            <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#52525B]" />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-[#A1A1AA] text-sm">Titre du poste</Label>
          <Input 
            defaultValue="CEO" 
            className="bg-[#18181B] border-[#3F3F46] text-white placeholder:text-[#52525B] focus:border-[#8B5CF6] focus:ring-[#8B5CF6]/20 h-11 rounded-lg"
          />
        </div>
      </div>

      <div className="flex justify-end mt-10">
        <Button 
          onClick={onSave} 
          className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white px-6 h-11 rounded-lg font-medium"
        >
          Sauvegarder
        </Button>
      </div>
    </div>
  </div>
);

// TAB: Intégrations (with real LinkedIn connection)
interface IntegrationsTabProps {
  orgId: string | null;
  apiSettings: Record<string, string>;
  onConnectionChange: () => void;
  isLoading: boolean;
}

const IntegrationsTab = ({ orgId, apiSettings, onConnectionChange, isLoading }: IntegrationsTabProps) => {
  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">Intégrations</h1>
          <p className="text-[#A1A1AA] text-sm mt-1">Connectez vos outils externes</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#8B5CF6]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Intégrations</h1>
        <p className="text-[#A1A1AA] text-sm mt-1">Connectez vos outils externes pour automatiser votre prospection</p>
      </div>

      <div className="grid gap-6">
        {/* REAL LinkedIn Connection Card */}
        <LinkedInConnectionCard 
          orgId={orgId}
          apiSettings={apiSettings}
          onConnectionChange={onConnectionChange}
        />

        {/* CRM Integration (placeholder for future) */}
        <div className="bg-[#18181B] border border-[#27272A] rounded-xl p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-lg bg-[#FF7A59]/10 flex items-center justify-center">
                <Database className="h-6 w-6 text-[#FF7A59]" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-white">CRM Sync</h3>
                  <Badge className="bg-[#27272A] text-[#71717A] border-[#3F3F46] text-xs">
                    Bientôt disponible
                  </Badge>
                </div>
                <p className="text-sm text-[#71717A] mt-1">
                  Synchronisez automatiquement vos leads avec HubSpot, Salesforce, Pipedrive...
                </p>
              </div>
            </div>
            <Button 
              size="sm"
              disabled
              className="bg-[#27272A] text-[#71717A] cursor-not-allowed"
            >
              Bientôt
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// TAB: Facturation
const BillingTab = () => {
  const invoices = [
    { date: "01 Dec 2024", amount: "99€", status: "Payé" },
    { date: "01 Nov 2024", amount: "99€", status: "Payé" },
    { date: "01 Oct 2024", amount: "99€", status: "Payé" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Facturation & Plan</h1>
        <p className="text-[#A1A1AA] text-sm mt-1">Gérez votre abonnement et vos factures</p>
      </div>

      {/* Usage */}
      <div className="bg-[#121214] border border-[#27272A] rounded-xl p-6">
        <Label className="text-[#A1A1AA] text-sm">Crédits de Recherche (Mensuel)</Label>
        <div className="mt-4 space-y-3">
          <div className="h-2 bg-[#27272A] rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#8B5CF6] rounded-full transition-all duration-500"
              style={{ width: "45%" }}
            />
          </div>
          <p className="text-sm text-[#E4E4E7]">
            <span className="text-white font-medium">450</span> / 1000 crédits utilisés
          </p>
        </div>
      </div>

      {/* Plan */}
      <div className="bg-[#121214] border border-[#27272A] rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-white">Plan Pro</h3>
              <Badge className="bg-[#8B5CF6]/10 text-[#8B5CF6] border-[#8B5CF6]/20">
                Actuel
              </Badge>
            </div>
            <p className="text-2xl font-bold text-white mt-2">
              99€ <span className="text-base font-normal text-[#71717A]">/ mois</span>
            </p>
          </div>
          <Button 
            variant="outline"
            className="border-[#3F3F46] bg-transparent text-white hover:bg-white/10 hover:text-white"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Gérer sur Stripe
          </Button>
        </div>
      </div>

      {/* Invoices */}
      <div className="bg-[#121214] border border-[#27272A] rounded-xl p-6">
        <h3 className="font-semibold text-white mb-4">Historique des factures</h3>
        <div className="space-y-1">
          {invoices.map((invoice, i) => (
            <div 
              key={i} 
              className="flex items-center justify-between py-3 border-b border-[#27272A] last:border-0"
            >
              <span className="text-sm text-[#A1A1AA]">{invoice.date}</span>
              <span className="font-medium text-white">{invoice.amount}</span>
              <Badge 
                variant="outline" 
                className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
              >
                <Check className="h-3 w-3 mr-1" />
                {invoice.status}
              </Badge>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-[#A1A1AA] hover:text-white hover:bg-white/5"
              >
                PDF
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// TAB: Sécurité
const SecurityTab = ({ onCopy }: { onCopy: (text: string) => void }) => {
  const apiKey = "sk_live_kortex_a1b2c3d4e5f6g7h8i9j0...";
  const [isTestingBrain, setIsTestingBrain] = useState(false);
  const [brainResponse, setBrainResponse] = useState<string | null>(null);
  const { toast } = useToast();

  const testKortexBrain = async () => {
    setIsTestingBrain(true);
    setBrainResponse(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('kortex-brain', {
        body: { userQuery: "Dis bonjour à Kortex et présente-toi en une phrase." }
      });
      
      if (error) throw error;
      
      console.log('[Kortex Brain] Response:', data);
      setBrainResponse(data.result);
      toast({
        title: "Kortex Brain est vivant !",
        description: "Le cerveau IA a répondu avec succès.",
      });
    } catch (error) {
      console.error('[Kortex Brain] Error:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Erreur lors du test",
        variant: "destructive",
      });
    } finally {
      setIsTestingBrain(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Sécurité & API</h1>
        <p className="text-[#A1A1AA] text-sm mt-1">Protégez votre compte et gérez vos clés</p>
      </div>

      {/* Kortex Brain Test */}
      <div className="bg-[#121214] border border-[#8B5CF6]/30 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-lg bg-[#8B5CF6]/10 flex items-center justify-center">
            <Server className="h-5 w-5 text-[#8B5CF6]" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Kortex Brain</h3>
            <p className="text-sm text-[#71717A]">Intelligence artificielle GPT-4o-mini</p>
          </div>
        </div>
        
        <Button 
          onClick={testKortexBrain}
          disabled={isTestingBrain}
          className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white h-10 rounded-lg mb-4"
        >
          {isTestingBrain ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Test en cours...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Tester la connexion
            </>
          )}
        </Button>

        {brainResponse && (
          <div className="mt-4 p-4 bg-[#18181B] border border-[#27272A] rounded-lg">
            <p className="text-xs text-[#71717A] mb-2">Réponse du cerveau :</p>
            <p className="text-sm text-[#E4E4E7]">{brainResponse}</p>
          </div>
        )}
      </div>

      {/* Password */}
      <div className="bg-[#121214] border border-[#27272A] rounded-xl p-6">
        <h3 className="font-semibold text-white mb-6">Changer le mot de passe</h3>
        <div className="space-y-5">
          <div className="space-y-2">
            <Label className="text-[#A1A1AA] text-sm">Mot de passe actuel</Label>
            <Input 
              type="password" 
              className="bg-[#18181B] border-[#3F3F46] text-white focus:border-[#8B5CF6] focus:ring-[#8B5CF6]/20 h-11 rounded-lg"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[#A1A1AA] text-sm">Nouveau mot de passe</Label>
              <Input 
                type="password" 
                className="bg-[#18181B] border-[#3F3F46] text-white focus:border-[#8B5CF6] focus:ring-[#8B5CF6]/20 h-11 rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#A1A1AA] text-sm">Confirmer</Label>
              <Input 
                type="password" 
                className="bg-[#18181B] border-[#3F3F46] text-white focus:border-[#8B5CF6] focus:ring-[#8B5CF6]/20 h-11 rounded-lg"
              />
            </div>
          </div>
          <Button className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white h-11 rounded-lg">
            Mettre à jour
          </Button>
        </div>
      </div>

      {/* API Keys */}
      <div className="bg-[#121214] border border-[#27272A] rounded-xl p-6">
        <h3 className="font-semibold text-white mb-2">Clé API</h3>
        <p className="text-sm text-[#71717A] mb-5">
          Utilisez cette clé pour intégrer Kortex à vos outils
        </p>
        <div className="flex items-center gap-2">
          <Input 
            value={apiKey}
            readOnly
            className="bg-[#18181B] border-[#3F3F46] text-[#A1A1AA] font-mono text-sm h-11 rounded-lg flex-1"
          />
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => onCopy(apiKey)}
            className="border-[#3F3F46] bg-transparent text-white hover:bg-white/10 h-11 w-11 rounded-lg"
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="icon"
            className="border-[#3F3F46] bg-transparent text-white hover:bg-white/10 h-11 w-11 rounded-lg"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-[#121214] border border-red-900/50 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="h-5 w-5 text-red-400" />
          <h3 className="font-semibold text-red-400">Zone Danger</h3>
        </div>
        <p className="text-sm text-[#71717A] mb-5">
          La suppression de votre compte est définitive. Toutes vos données seront perdues.
        </p>
        <Button 
          variant="destructive" 
          className="bg-red-600 hover:bg-red-700 text-white h-11 rounded-lg"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Supprimer mon compte
        </Button>
      </div>
    </div>
  );
};

// TAB: Notifications
const NotificationsTab = () => {
  const notifications = [
    { 
      label: "Nouveaux leads détectés", 
      description: "Recevoir une alerte quand le Radar trouve des prospects", 
      enabled: true 
    },
    { 
      label: "Rapports hebdomadaires", 
      description: "Résumé de votre activité chaque lundi", 
      enabled: true 
    },
    { 
      label: "Mises à jour produit", 
      description: "Nouvelles fonctionnalités et améliorations", 
      enabled: false 
    },
    { 
      label: "Tips & Conseils", 
      description: "Astuces pour optimiser votre prospection", 
      enabled: false 
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Notifications</h1>
        <p className="text-[#A1A1AA] text-sm mt-1">Configurez vos préférences de communication</p>
      </div>

      <div className="bg-[#121214] border border-[#27272A] rounded-xl p-6">
        <div className="space-y-6">
          {notifications.map((notif, i) => (
            <div 
              key={i} 
              className={`flex items-center justify-between ${
                i !== notifications.length - 1 ? "pb-6 border-b border-[#27272A]" : ""
              }`}
            >
              <div>
                <p className="font-medium text-white">{notif.label}</p>
                <p className="text-sm text-[#71717A] mt-0.5">{notif.description}</p>
              </div>
              <Switch 
                defaultChecked={notif.enabled}
                className="data-[state=checked]:bg-[#8B5CF6]"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Settings;
