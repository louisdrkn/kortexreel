import { FolderOpen, FileText, Users, Calendar, Settings } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePOD } from "@/contexts/PODContext";
import { useNavigate } from "react-router-dom";

export default function DataRoom() {
  const { agencyDNA, targetAccounts, meetingCaptures } = usePOD();
  const navigate = useNavigate();

  const stats = [
    {
      label: "Documents ingérés",
      value: agencyDNA.extractedContent?.documents?.length || 0,
      icon: FileText,
    },
    {
      label: "Prospects identifiés",
      value: targetAccounts.length,
      icon: Users,
    },
    {
      label: "RDV capturés",
      value: meetingCaptures.length,
      icon: Calendar,
    },
  ];

  return (
    <div className="min-h-screen bg-background p-6 lg:p-10">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
            <FolderOpen className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Data Room</h1>
            <p className="text-muted-foreground">Gestion des documents & paramètres</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6">
          {stats.map((stat) => (
            <Card key={stat.label} className="border-border shadow-soft">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                    <stat.icon className="h-6 w-6 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Agency DNA Summary */}
        <Card className="border-border shadow-soft">
          <CardHeader>
            <CardTitle>ADN Agence</CardTitle>
            <CardDescription>Résumé de votre configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-medium mb-2">Site web</p>
                <p className="text-sm text-muted-foreground">
                  {agencyDNA.websiteUrl || "Non configuré"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Clients passés</p>
                <div className="flex flex-wrap gap-1">
                  {agencyDNA.trackRecord?.pastClients?.slice(0, 5).map((client) => (
                    <Badge key={client.id} variant="secondary" className="text-xs">
                      {client.name}
                    </Badge>
                  )) || <span className="text-sm text-muted-foreground">Aucun</span>}
                </div>
              </div>
            </div>

            {agencyDNA.pitch && (
              <div>
                <p className="text-sm font-medium mb-2">Pitch</p>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {agencyDNA.pitch}
                </p>
              </div>
            )}

            <Button variant="outline" onClick={() => navigate("/strategie/cerveau")}>
              <Settings className="h-4 w-4 mr-2" />
              Modifier la configuration
            </Button>
          </CardContent>
        </Card>

        {/* Recent Prospects */}
        {targetAccounts.length > 0 && (
          <Card className="border-border shadow-soft">
            <CardHeader>
              <CardTitle>Prospects récents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {targetAccounts.slice(0, 5).map((account) => (
                  <div 
                    key={account.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/radar/prospect?id=${account.id}`)}
                  >
                    <div>
                      <p className="font-medium">{account.name}</p>
                      <p className="text-sm text-muted-foreground">{account.industry}</p>
                    </div>
                    <Badge variant={account.status === "hot" ? "default" : "secondary"}>
                      {account.score}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
