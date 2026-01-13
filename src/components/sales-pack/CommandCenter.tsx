import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, DollarSign, Mail, Sparkles, Loader2 } from "lucide-react";
import { SalesPack, EMPTY_SALES_PACK } from "@/types/sales-pack";
import { ProposalTab } from "./ProposalTab";
import { PricingTab } from "./PricingTab";
import { EmailsTab } from "./EmailsTab";

interface CommandCenterProps {
  salesPack: SalesPack | null;
  isGenerating: boolean;
  onUpdateSalesPack: (pack: SalesPack) => void;
}

export function CommandCenter({ salesPack, isGenerating, onUpdateSalesPack }: CommandCenterProps) {
  const pack = salesPack || EMPTY_SALES_PACK;
  const hasContent = salesPack !== null;

  const updateProposal = (content: string) => {
    onUpdateSalesPack({
      ...pack,
      proposal: { ...pack.proposal, content },
    });
  };

  const updateEmails = (emails: typeof pack.emails) => {
    onUpdateSalesPack({
      ...pack,
      emails,
    });
  };

  // Loading state
  if (isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="relative">
          <div className="h-16 w-16 rounded-full border-4 border-muted animate-pulse" />
          <Sparkles className="h-6 w-6 text-accent absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
        </div>
        <p className="text-muted-foreground mt-4 font-medium">L'IA prépare votre pack vente...</p>
        <p className="text-xs text-muted-foreground mt-1">Propale + Pricing + Emails</p>
      </div>
    );
  }

  // Empty state
  if (!hasContent) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
          <Sparkles className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground font-medium">
          Votre Command Center
        </p>
        <p className="text-xs text-muted-foreground mt-2 max-w-xs">
          Entrez le brief client et générez un pack complet : proposition, stratégie de prix et emails de relance.
        </p>
      </div>
    );
  }

  return (
    <Tabs defaultValue="proposal" className="h-full">
      <TabsList className="grid w-full grid-cols-3 mb-4">
        <TabsTrigger value="proposal" className="gap-2">
          <FileText className="h-4 w-4" />
          <span className="hidden sm:inline">Document</span>
        </TabsTrigger>
        <TabsTrigger value="pricing" className="gap-2">
          <DollarSign className="h-4 w-4" />
          <span className="hidden sm:inline">Prix</span>
        </TabsTrigger>
        <TabsTrigger value="emails" className="gap-2">
          <Mail className="h-4 w-4" />
          <span className="hidden sm:inline">Emails</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="proposal" className="mt-0">
        <ProposalTab salesPack={pack} onUpdateProposal={updateProposal} />
      </TabsContent>

      <TabsContent value="pricing" className="mt-0">
        <PricingTab packages={pack.pricing} />
      </TabsContent>

      <TabsContent value="emails" className="mt-0">
        <EmailsTab emails={pack.emails} onUpdateEmails={updateEmails} />
      </TabsContent>
    </Tabs>
  );
}
