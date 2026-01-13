import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { 
  MessageSquare, Mail, Linkedin, Copy, Check, Loader2, Sparkles, 
  ArrowRight, RefreshCw, Send, Users, Building2, Target, PartyPopper,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PremiumEmptyState } from "@/components/ui/premium-empty-state";
import confetti from "canvas-confetti";

interface Lead {
  id: string;
  company_name: string | null;
  contact_info: unknown;
  linkedin_data: unknown;
  pipeline_stage: string;
  notes: string | null;
  qualification_score: number | null;
}

interface GeneratedMessage {
  type: "linkedin_note" | "linkedin_message" | "email";
  subject?: string;
  body: string;
  icebreaker: string;
}

export default function OutreachSequence() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const leadId = searchParams.get("leadId");
  
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isLoadingLeads, setIsLoadingLeads] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  const [messages, setMessages] = useState<Record<string, GeneratedMessage>>({});
  const [activeTab, setActiveTab] = useState("linkedin_note");
  const [copiedType, setCopiedType] = useState<string | null>(null);
  
  const [orgId, setOrgId] = useState<string | null>(null);

  // Load user's org and leads
  useEffect(() => {
    const loadData = async () => {
      setIsLoadingLeads(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("org_id")
          .eq("id", user.id)
          .single();

        if (!profile?.org_id) return;
        setOrgId(profile.org_id);

        // Load all leads with status 'detected' or 'enriched' (not yet contacted)
        const { data: leadsData, error } = await supabase
          .from("leads")
          .select("*")
          .eq("org_id", profile.org_id)
          .in("pipeline_stage", ["detected", "enriched"])
          .order("created_at", { ascending: false });

        if (error) throw error;
        setLeads(leadsData || []);

        // If leadId is in URL, select that lead
        if (leadId && leadsData) {
          const targetLead = leadsData.find(l => l.id === leadId);
          if (targetLead) {
            setSelectedLead(targetLead);
          }
        }
      } catch (error) {
        console.error("Error loading leads:", error);
      } finally {
        setIsLoadingLeads(false);
      }
    };

    loadData();
  }, [leadId]);

  // Generate messages for selected lead
  const generateMessages = async () => {
    if (!selectedLead) return;

    setIsGenerating(true);
    try {
      const contactInfo = selectedLead.contact_info as Record<string, unknown> || {};
      const linkedinData = selectedLead.linkedin_data as Record<string, unknown> || {};

      const { data, error } = await supabase.functions.invoke("generate-outreach", {
        body: {
          prospect: {
            companyName: selectedLead.company_name,
            contactName: contactInfo.name || linkedinData.name,
            contactTitle: contactInfo.title || linkedinData.title,
            matchReason: contactInfo.match_reason || linkedinData.match_reason,
            painPoints: contactInfo.pain_points || linkedinData.pain_points,
            signals: contactInfo.signals || linkedinData.signals,
          }
        }
      });

      if (error) throw error;

      if (data?.messages) {
        const messageMap: Record<string, GeneratedMessage> = {};
        data.messages.forEach((msg: GeneratedMessage) => {
          messageMap[msg.type] = msg;
        });
        setMessages(messageMap);
      }
    } catch (error) {
      console.error("Generation error:", error);
      
      // Fallback mock data
      const contactInfo = selectedLead.contact_info as Record<string, unknown> || {};
      const contactName = (contactInfo.name as string) || "Décideur";
      const companyName = selectedLead.company_name || "l'entreprise";
      
      setMessages({
        linkedin_note: {
          type: "linkedin_note",
          body: `Bonjour ${contactName},\n\nVotre approche chez ${companyName} m'interpelle. J'accompagne des dirigeants sur des problématiques similaires.\n\nOuvert à un échange de 15 min ?`,
          icebreaker: "Note courte pour invitation",
        },
        linkedin_message: {
          type: "linkedin_message", 
          body: `Bonjour ${contactName},\n\nJ'ai remarqué que ${companyName} est en pleine croissance. C'est exactement le type de contexte où nous avons pu apporter de la valeur à d'autres entreprises de votre secteur.\n\nNos clients ont notamment pu:\n• Gagner du temps sur leurs processus\n• Améliorer leur efficacité commerciale\n• Structurer leur approche marché\n\nSeriez-vous disponible pour un échange de 15 minutes cette semaine ?\n\nCordialement`,
          icebreaker: "Message personnalisé basé sur les signaux détectés",
        },
        email: {
          type: "email",
          subject: `${companyName} x [Votre Agence] - Opportunité de collaboration`,
          body: `Bonjour ${contactName},\n\nJe me permets de vous contacter car j'ai pu observer la dynamique de ${companyName}.\n\nNous accompagnons des entreprises comme la vôtre sur des problématiques de croissance et d'optimisation commerciale, avec des résultats concrets.\n\nSeriez-vous disponible pour un appel de 15 minutes afin d'explorer comment nous pourrions vous aider ?\n\nBien cordialement`,
          icebreaker: "Email de premier contact personnalisé",
        },
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Copy message to clipboard
  const handleCopy = async (type: string) => {
    const msg = messages[type];
    if (!msg) return;

    const text = msg.subject ? `Objet: ${msg.subject}\n\n${msg.body}` : msg.body;
    await navigator.clipboard.writeText(text);
    
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
    
    toast({ title: "Copié !", description: "Message copié dans le presse-papier" });
  };

  // Mark as contacted with confetti
  const handleMarkAsContacted = async () => {
    if (!selectedLead) return;

    setIsSending(true);
    try {
      const { error } = await supabase
        .from("leads")
        .update({ 
          pipeline_stage: "contacted",
          notes: `[${new Date().toISOString()}] Marqué comme contacté depuis Séquence Approche`
        })
        .eq("id", selectedLead.id);

      if (error) throw error;

      // 🎉 Confetti celebration!
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      toast({
        title: "🎉 Prospect contacté !",
        description: `${selectedLead.company_name} a été marqué comme contacté`,
      });

      // Remove from list and select next
      const newLeads = leads.filter(l => l.id !== selectedLead.id);
      setLeads(newLeads);
      
      if (newLeads.length > 0) {
        setSelectedLead(newLeads[0]);
        setMessages({});
      } else {
        setSelectedLead(null);
        setMessages({});
      }
    } catch (error) {
      console.error("Error updating lead:", error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  // Send LinkedIn connection via Unipile
  const handleSendLinkedIn = async () => {
    if (!selectedLead || !orgId) return;

    const linkedinData = selectedLead.linkedin_data as Record<string, unknown> || {};
    const contactInfo = selectedLead.contact_info as Record<string, unknown> || {};
    const linkedinUrl = (linkedinData.profile_url as string) || (contactInfo.linkedin_url as string);

    if (!linkedinUrl) {
      toast({
        title: "URL LinkedIn manquante",
        description: "Aucune URL LinkedIn trouvée pour ce prospect",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      const message = messages.linkedin_note?.body || messages.linkedin_message?.body;

      const { data, error } = await supabase.functions.invoke("send-connection-request", {
        body: {
          lead_id: selectedLead.id,
          linkedin_url: linkedinUrl,
          message: message?.substring(0, 300), // LinkedIn limit
          org_id: orgId,
        }
      });

      if (error) throw error;

      if (data.success) {
        // 🎉 Confetti celebration!
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });

        toast({
          title: "🚀 Invitation envoyée !",
          description: data.message || "Invitation LinkedIn envoyée avec succès",
        });

        // Update local state
        const newLeads = leads.filter(l => l.id !== selectedLead.id);
        setLeads(newLeads);
        
        if (newLeads.length > 0) {
          setSelectedLead(newLeads[0]);
          setMessages({});
        } else {
          setSelectedLead(null);
        }
      } else {
        toast({
          title: "Erreur",
          description: data.error || "Échec de l'envoi",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error sending LinkedIn:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer l'invitation",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  // Update message content
  const handleMessageChange = (type: string, newBody: string) => {
    setMessages(prev => ({
      ...prev,
      [type]: { ...prev[type], body: newBody }
    }));
  };

  // No leads available
  if (!isLoadingLeads && leads.length === 0 && !selectedLead) {
    return (
      <PremiumEmptyState
        icon={Send}
        iconColor="amber"
        title="Aucun prospect à contacter"
        subtitle="Transférez des prospects depuis le Radar vers la Fiche Prospect pour commencer à les engager."
        ctaLabel="Aller au Radar"
        ctaIcon={Target}
        onCtaClick={() => navigate("/radar/scan")}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Left Sidebar - Prospect List */}
        <div className="w-80 border-r border-border bg-muted/30 flex flex-col">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Prospects à engager
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {leads.length} prospect{leads.length > 1 ? "s" : ""} en attente
            </p>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {isLoadingLeads ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                leads.map((lead) => {
                  const contactInfo = lead.contact_info as Record<string, unknown> || {};
                  const linkedinData = lead.linkedin_data as Record<string, unknown> || {};
                  const contactName = (contactInfo.name as string) || (linkedinData.name as string) || "Décideur";
                  const contactTitle = (contactInfo.title as string) || (linkedinData.title as string) || "";

                  return (
                    <button
                      key={lead.id}
                      onClick={() => {
                        setSelectedLead(lead);
                        setMessages({});
                      }}
                      className={`w-full text-left p-3 rounded-lg transition-all ${
                        selectedLead?.id === lead.id
                          ? "bg-primary/10 border border-primary/30"
                          : "hover:bg-muted border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {lead.company_name || "Entreprise"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {contactName} {contactTitle && `• ${contactTitle}`}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right Panel - Message Generator */}
        <div className="flex-1 flex flex-col">
          {selectedLead ? (
            <>
              {/* Header with prospect context */}
              <div className="p-6 border-b border-border bg-card">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-7 w-7 text-primary" />
                    </div>
                    <div>
                      <h1 className="text-xl font-semibold text-foreground">
                        {selectedLead.company_name || "Entreprise"}
                      </h1>
                      {(() => {
                        const contactInfo = selectedLead.contact_info as Record<string, unknown> || {};
                        const linkedinData = selectedLead.linkedin_data as Record<string, unknown> || {};
                        const name = (contactInfo.name as string) || (linkedinData.name as string);
                        const title = (contactInfo.title as string) || (linkedinData.title as string);
                        return (
                          <p className="text-muted-foreground">
                            {name && <span className="font-medium">{name}</span>}
                            {title && <span> • {title}</span>}
                          </p>
                        );
                      })()}
                    </div>
                  </div>

                  <Button
                    onClick={generateMessages}
                    disabled={isGenerating}
                    className="gap-2"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Génération...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Générer l'approche
                      </>
                    )}
                  </Button>
                </div>

                {/* Match reason card */}
                {(() => {
                  const contactInfo = selectedLead.contact_info as Record<string, unknown> || {};
                  const linkedinData = selectedLead.linkedin_data as Record<string, unknown> || {};
                  const matchReason = (contactInfo.match_reason as string) || (linkedinData.match_reason as string);
                  
                  if (!matchReason) return null;
                  
                  return (
                    <div className="mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="h-4 w-4 text-amber-500" />
                        <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                          Pourquoi ça match ?
                        </span>
                      </div>
                      <p className="text-sm text-foreground/80">{matchReason}</p>
                    </div>
                  );
                })()}
              </div>

              {/* Message Editor Tabs */}
              <div className="flex-1 p-6 overflow-auto">
                {Object.keys(messages).length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                      <Sparkles className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Prêt à rédiger ?
                    </h3>
                    <p className="text-muted-foreground max-w-md mb-6">
                      Cliquez sur "Générer l'approche" pour créer des messages personnalisés 
                      basés sur les informations du prospect.
                    </p>
                    <Button onClick={generateMessages} disabled={isGenerating}>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Générer l'approche
                    </Button>
                  </div>
                ) : (
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                    <TabsList className="grid w-full grid-cols-3 mb-4">
                      <TabsTrigger value="linkedin_note" className="gap-2">
                        <Linkedin className="h-4 w-4" />
                        Note LinkedIn
                      </TabsTrigger>
                      <TabsTrigger value="linkedin_message" className="gap-2">
                        <Linkedin className="h-4 w-4" />
                        Message LinkedIn
                      </TabsTrigger>
                      <TabsTrigger value="email" className="gap-2">
                        <Mail className="h-4 w-4" />
                        Email Froid
                      </TabsTrigger>
                    </TabsList>

                    {["linkedin_note", "linkedin_message", "email"].map((type) => (
                      <TabsContent key={type} value={type} className="flex-1 flex flex-col mt-0">
                        <Card className="flex-1 flex flex-col">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <CardTitle className="text-base">
                                  {type === "linkedin_note" && "Note d'invitation LinkedIn"}
                                  {type === "linkedin_message" && "Message LinkedIn"}
                                  {type === "email" && "Email de prospection"}
                                </CardTitle>
                                {messages[type]?.subject && (
                                  <CardDescription className="font-medium mt-1">
                                    Objet: {messages[type].subject}
                                  </CardDescription>
                                )}
                              </div>
                              <Badge variant="secondary" className="gap-1">
                                <Sparkles className="h-3 w-3" />
                                {messages[type]?.icebreaker || "Personnalisé"}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="flex-1 flex flex-col">
                            <Textarea
                              value={messages[type]?.body || ""}
                              onChange={(e) => handleMessageChange(type, e.target.value)}
                              className="flex-1 min-h-[200px] resize-none font-mono text-sm"
                              placeholder="Votre message apparaîtra ici..."
                            />
                          </CardContent>
                        </Card>
                      </TabsContent>
                    ))}
                  </Tabs>
                )}
              </div>

              {/* Action Buttons */}
              {Object.keys(messages).length > 0 && (
                <div className="p-4 border-t border-border bg-card flex items-center justify-between gap-4">
                  <Button
                    variant="outline"
                    onClick={() => handleCopy(activeTab)}
                    className="gap-2"
                  >
                    {copiedType === activeTab ? (
                      <>
                        <Check className="h-4 w-4 text-emerald-500" />
                        Copié !
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copier le message
                      </>
                    )}
                  </Button>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={handleSendLinkedIn}
                      disabled={isSending}
                      className="gap-2"
                    >
                      <Linkedin className="h-4 w-4 text-[#0A66C2]" />
                      Envoyer via LinkedIn
                    </Button>

                    <Button
                      onClick={handleMarkAsContacted}
                      disabled={isSending}
                      className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                    >
                      {isSending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <PartyPopper className="h-4 w-4" />
                      )}
                      Marquer comme Contacté
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Sélectionnez un prospect
                </h3>
                <p className="text-muted-foreground">
                  Choisissez un prospect dans la liste pour générer une séquence d'approche personnalisée.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
