import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, AlertTriangle, TrendingDown, Clock, Target, Edit3 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { SalesPack } from "@/types/sales-pack";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { marked } from "marked";
import DOMPurify from "dompurify";

interface ProposalTabProps {
  salesPack: SalesPack;
  onUpdateProposal: (content: string) => void;
}

// Configure marked for safe rendering
marked.setOptions({
  breaks: true,
  gfm: true,
});

// Secure markdown to HTML converter using marked library + DOMPurify
function renderMarkdown(content: string): string {
  // Use marked for proper markdown parsing
  const rawHtml = marked.parse(content) as string;
  
  // Sanitize the output with strict allowed tags
  return DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'strong', 'em', 'ul', 'ol', 'li', 'br', 'blockquote', 'code', 'pre'],
    ALLOWED_ATTR: ['class']
  });
}

export function ProposalTab({ salesPack, onUpdateProposal }: ProposalTabProps) {
  const { proposal } = salesPack;
  const { gapAnalysis } = proposal;
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(proposal.content);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(proposal.content);
    toast({
      title: "Copié !",
      description: "La propale a été copiée dans le presse-papiers.",
    });
  };

  const handleSaveEdit = () => {
    onUpdateProposal(editContent);
    setIsEditing(false);
    toast({
      title: "Modifications enregistrées",
      description: "Votre proposition a été mise à jour.",
    });
  };

  const hasGapAnalysis = gapAnalysis.currentSituation || gapAnalysis.missedOpportunity;

  return (
    <div className="space-y-8 p-2">
      {/* Gap Analysis Section */}
      {hasGapAnalysis && (
        <Card className="border-warning/30 bg-gradient-to-br from-warning/5 to-warning/10 shadow-soft">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2 text-warning">
              <AlertTriangle className="h-5 w-5" />
              L'Opportunité Manquée
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              {gapAnalysis.currentSituation && (
                <div className="space-y-2 p-4 rounded-lg bg-card/50">
                  <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                    <Target className="h-4 w-4" />
                    Situation actuelle
                  </div>
                  <p className="text-sm leading-relaxed">{gapAnalysis.currentSituation}</p>
                </div>
              )}
              {gapAnalysis.missedOpportunity && (
                <div className="space-y-2 p-4 rounded-lg bg-card/50">
                  <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                    <TrendingDown className="h-4 w-4" />
                    Ce que le client perd
                  </div>
                  <p className="text-sm leading-relaxed">{gapAnalysis.missedOpportunity}</p>
                </div>
              )}
              {gapAnalysis.potentialLoss && (
                <div className="space-y-2 p-4 rounded-lg bg-destructive/5 border border-destructive/20">
                  <div className="flex items-center gap-2 text-sm font-semibold text-destructive">
                    <TrendingDown className="h-4 w-4" />
                    Perte estimée
                  </div>
                  <p className="text-lg font-bold text-destructive">{gapAnalysis.potentialLoss}</p>
                </div>
              )}
              {gapAnalysis.urgency && (
                <div className="space-y-2 p-4 rounded-lg bg-card/50">
                  <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    Urgence
                  </div>
                  <p className="text-sm leading-relaxed">{gapAnalysis.urgency}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Proposal - Paper-like appearance */}
      <div className="bg-card rounded-xl shadow-medium border border-border overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-4 border-b border-border bg-muted/30">
          <CardTitle className="text-lg font-semibold">Proposition commerciale</CardTitle>
          <div className="flex items-center gap-2">
            <Button 
              variant={isEditing ? "default" : "outline"} 
              size="sm" 
              onClick={() => {
                if (isEditing) {
                  handleSaveEdit();
                } else {
                  setEditContent(proposal.content);
                  setIsEditing(true);
                }
              }}
            >
              <Edit3 className="h-3.5 w-3.5 mr-1.5" />
              {isEditing ? 'Enregistrer' : 'Modifier'}
            </Button>
            {isEditing && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsEditing(false)}
              >
                Annuler
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={copyToClipboard}>
              <Copy className="h-3.5 w-3.5 mr-1.5" />
              Copier
            </Button>
          </div>
        </div>

        {/* Content - A4 paper simulation */}
        <div className="bg-gradient-to-b from-background to-muted/20 p-8 lg:p-12">
          <div className="max-w-4xl mx-auto bg-card rounded-lg shadow-lg border border-border/50 overflow-hidden">
            {/* Paper content */}
            <div className="px-10 py-12 lg:px-16 lg:py-16">
              {isEditing ? (
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="min-h-[600px] font-mono text-sm leading-loose border-0 shadow-none focus-visible:ring-0 bg-transparent resize-y"
                  showCharCount
                  placeholder="Votre proposition..."
                />
              ) : (
                <article 
                  className="prose prose-slate max-w-none
                    prose-headings:font-semibold prose-headings:tracking-tight
                    prose-h1:text-2xl prose-h1:mt-10 prose-h1:mb-5
                    prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4 prose-h2:border-b prose-h2:border-border prose-h2:pb-2
                    prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-3
                    prose-p:leading-relaxed prose-p:mb-4 prose-p:text-foreground/90
                    prose-li:my-1 prose-li:leading-relaxed
                    prose-ul:my-4 prose-ul:space-y-1
                    prose-ol:my-4 prose-ol:space-y-1
                    prose-strong:font-semibold prose-strong:text-foreground
                    dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(proposal.content) }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
