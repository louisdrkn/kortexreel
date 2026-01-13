import { useAgency } from "@/contexts/AgencyContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Sparkles, TrendingUp, Clock, AlertCircle, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const { proposals, isConfigured, config } = useAgency();

  const stats = {
    total: proposals.length,
    won: proposals.filter(p => p.status === 'won').length,
    pending: proposals.filter(p => p.status === 'draft' || p.status === 'sent').length,
    totalValue: proposals
      .filter(p => p.status === 'won')
      .reduce((acc, p) => acc + (p.estimatedValue || 0), 0),
  };

  const recentProposals = proposals.slice(0, 5);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="border-b border-border bg-card px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              {config.profile.name ? `Bienvenue, ${config.profile.name}` : 'Bienvenue sur Propale-Fast'}
            </p>
          </div>
          <Link to="/generate">
            <Button variant="magic" size="lg">
              <Sparkles className="h-4 w-4" />
              Nouvelle Propale
            </Button>
          </Link>
        </div>
      </header>

      <div className="flex-1 p-8 space-y-8">
        {/* Configuration Alert */}
        {!isConfigured && (
          <Card className="border-warning/50 bg-warning/5 animate-fade-in">
            <CardContent className="flex items-center gap-4 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning/10">
                <AlertCircle className="h-5 w-5 text-warning" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Configuration requise</p>
                <p className="text-sm text-muted-foreground">
                  Configurez votre agence pour commencer à générer des propales.
                </p>
              </div>
              <Link to="/config">
                <Button variant="outline" size="sm">
                  Configurer
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="animate-slide-up" style={{ animationDelay: '0ms' }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Propales créées
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card className="animate-slide-up" style={{ animationDelay: '50ms' }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Propales gagnées
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success">{stats.won}</div>
            </CardContent>
          </Card>

          <Card className="animate-slide-up" style={{ animationDelay: '100ms' }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                En attente
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.pending}</div>
            </CardContent>
          </Card>

          <Card className="animate-slide-up" style={{ animationDelay: '150ms' }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                CA généré
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {new Intl.NumberFormat('fr-FR', {
                  style: 'currency',
                  currency: 'EUR',
                  maximumFractionDigits: 0,
                }).format(stats.totalValue)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Proposals */}
        <Card className="animate-slide-up" style={{ animationDelay: '200ms' }}>
          <CardHeader>
            <CardTitle>Propales récentes</CardTitle>
            <CardDescription>
              Vos dernières propositions commerciales générées
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentProposals.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
                  <FileText className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground mb-4">
                  Aucune propale créée pour l'instant
                </p>
                <Link to="/generate">
                  <Button variant="accent">
                    <Sparkles className="h-4 w-4" />
                    Créer ma première propale
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentProposals.map((proposal) => (
                  <div
                    key={proposal.id}
                    className="flex items-center justify-between rounded-lg border border-border p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                        <FileText className="h-5 w-5 text-accent" />
                      </div>
                      <div>
                        <p className="font-medium">{proposal.clientName}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(proposal.createdAt).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {proposal.estimatedValue && (
                        <span className="text-sm font-medium">
                          {new Intl.NumberFormat('fr-FR', {
                            style: 'currency',
                            currency: 'EUR',
                            maximumFractionDigits: 0,
                          }).format(proposal.estimatedValue)}
                        </span>
                      )}
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          proposal.status === 'won'
                            ? 'bg-success/10 text-success'
                            : proposal.status === 'lost'
                            ? 'bg-destructive/10 text-destructive'
                            : proposal.status === 'sent'
                            ? 'bg-accent/10 text-accent'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {proposal.status === 'won'
                          ? 'Gagnée'
                          : proposal.status === 'lost'
                          ? 'Perdue'
                          : proposal.status === 'sent'
                          ? 'Envoyée'
                          : 'Brouillon'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
