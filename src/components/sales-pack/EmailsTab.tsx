import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Send, Clock, Mail } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { SalesEmails } from "@/types/sales-pack";

interface EmailsTabProps {
  emails: SalesEmails;
  onUpdateEmails: (emails: SalesEmails) => void;
}

export function EmailsTab({ emails, onUpdateEmails }: EmailsTabProps) {
  const copyEmail = (type: 'delivery' | 'followUp') => {
    const text = type === 'delivery' ? emails.delivery : emails.followUp;
    navigator.clipboard.writeText(text);
    toast({
      title: "Copié !",
      description: `Email ${type === 'delivery' ? 'de livraison' : 'de relance'} copié.`,
    });
  };

  const copyAll = () => {
    const text = `=== EMAIL DE LIVRAISON ===\n\n${emails.delivery}\n\n=== EMAIL DE RELANCE J+3 ===\n\n${emails.followUp}`;
    navigator.clipboard.writeText(text);
    toast({
      title: "Copié !",
      description: "Tous les emails copiés.",
    });
  };

  if (!emails.delivery && !emails.followUp) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <Mail className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground">Aucun email généré</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-2">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Emails d'accompagnement</h3>
          <p className="text-sm text-muted-foreground mt-1">Prêts à envoyer avec votre proposition</p>
        </div>
        <Button variant="outline" size="sm" onClick={copyAll}>
          <Copy className="h-3.5 w-3.5 mr-1.5" />
          Copier tout
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Delivery Email */}
        <Card className="shadow-soft">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center">
                  <Send className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <CardTitle className="text-base">Email de livraison</CardTitle>
                  <CardDescription>Pour envoyer votre proposition</CardDescription>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => copyEmail('delivery')}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Textarea
              value={emails.delivery}
              onChange={(e) => onUpdateEmails({ ...emails, delivery: e.target.value })}
              className="min-h-[280px]"
              placeholder="Email de livraison..."
              showCharCount
            />
          </CardContent>
        </Card>

        {/* Follow-up Email */}
        <Card className="shadow-soft">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <CardTitle className="text-base">Relance J+3</CardTitle>
                  <CardDescription>Pour réactiver le client</CardDescription>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => copyEmail('followUp')}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Textarea
              value={emails.followUp}
              onChange={(e) => onUpdateEmails({ ...emails, followUp: e.target.value })}
              className="min-h-[280px]"
              placeholder="Email de relance..."
              showCharCount
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
