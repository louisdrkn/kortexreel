import { useState } from "react";
import { useAgency } from "@/contexts/AgencyContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { FileText, Search, Copy, FileDown, Eye, CheckCircle2, Clock, XCircle, Send } from "lucide-react";
import { Proposal } from "@/types/agency";

export default function History() {
  const { proposals, updateProposal } = useAgency();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);

  const filteredProposals = proposals.filter((proposal) => {
    const matchesSearch =
      proposal.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      proposal.clientBrief.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || proposal.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleStatusChange = (proposalId: string, newStatus: Proposal["status"]) => {
    updateProposal(proposalId, { status: newStatus });
    toast({
      title: "Statut mis à jour",
      description: `La propale a été marquée comme "${
        newStatus === "won"
          ? "gagnée"
          : newStatus === "lost"
          ? "perdue"
          : newStatus === "sent"
          ? "envoyée"
          : "brouillon"
      }".`,
    });
  };

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: "Copié !",
      description: "La propale a été copiée dans le presse-papier.",
    });
  };

  const getStatusIcon = (status: Proposal["status"]) => {
    switch (status) {
      case "won":
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case "lost":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "sent":
        return <Send className="h-4 w-4 text-accent" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (status: Proposal["status"]) => {
    switch (status) {
      case "won":
        return "Gagnée";
      case "lost":
        return "Perdue";
      case "sent":
        return "Envoyée";
      default:
        return "Brouillon";
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="border-b border-border bg-card px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Historique</h1>
            <p className="text-muted-foreground mt-1">
              {proposals.length} propale{proposals.length > 1 ? "s" : ""} générée
              {proposals.length > 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 p-8 space-y-6">
        {/* Filters */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par client ou contenu..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filtrer par statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="draft">Brouillons</SelectItem>
                  <SelectItem value="sent">Envoyées</SelectItem>
                  <SelectItem value="won">Gagnées</SelectItem>
                  <SelectItem value="lost">Perdues</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Proposals List */}
        {filteredProposals.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">
                {proposals.length === 0
                  ? "Aucune propale générée"
                  : "Aucune propale ne correspond à votre recherche"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredProposals.map((proposal) => (
              <Card
                key={proposal.id}
                className="hover:shadow-soft transition-shadow animate-fade-in"
              >
                <CardContent className="py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                        <FileText className="h-5 w-5 text-accent" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{proposal.clientName}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(proposal.createdAt).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      {proposal.estimatedValue && (
                        <span className="hidden sm:block text-sm font-medium">
                          {new Intl.NumberFormat("fr-FR", {
                            style: "currency",
                            currency: "EUR",
                            maximumFractionDigits: 0,
                          }).format(proposal.estimatedValue)}
                        </span>
                      )}

                      <Select
                        value={proposal.status}
                        onValueChange={(value) =>
                          handleStatusChange(proposal.id, value as Proposal["status"])
                        }
                      >
                        <SelectTrigger className="w-[130px]">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(proposal.status)}
                            <span>{getStatusLabel(proposal.status)}</span>
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              Brouillon
                            </div>
                          </SelectItem>
                          <SelectItem value="sent">
                            <div className="flex items-center gap-2">
                              <Send className="h-4 w-4" />
                              Envoyée
                            </div>
                          </SelectItem>
                          <SelectItem value="won">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4" />
                              Gagnée
                            </div>
                          </SelectItem>
                          <SelectItem value="lost">
                            <div className="flex items-center gap-2">
                              <XCircle className="h-4 w-4" />
                              Perdue
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setSelectedProposal(proposal)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => copyToClipboard(proposal.generatedContent)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* View Dialog */}
      <Dialog open={!!selectedProposal} onOpenChange={() => setSelectedProposal(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{selectedProposal?.clientName}</DialogTitle>
            <DialogDescription>
              Créée le{" "}
              {selectedProposal &&
                new Date(selectedProposal.createdAt).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            <Textarea
              value={selectedProposal?.generatedContent || ""}
              readOnly
              className="min-h-[400px] font-mono text-sm"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => copyToClipboard(selectedProposal?.generatedContent || "")}
            >
              <Copy className="h-4 w-4" />
              Copier
            </Button>
            <Button onClick={() => setSelectedProposal(null)}>Fermer</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
