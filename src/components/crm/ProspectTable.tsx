import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Linkedin, 
  Trash2, 
  Rocket, 
  Loader2, 
  Building2,
  User,
  Mail,
  Phone,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
  Brain,
  Search
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEnrichProspect } from '@/hooks/useEnrichProspect';

export interface Prospect {
  id: string;
  company_name: string | null;
  contact_name: string;
  job_title: string;
  linkedin_url: string | null;
  email?: string | null;
  phone?: string | null;
  pipeline_stage: string;
  qualification_score: number | null;
  created_at: string;
  project_id?: string | null; // <-- Ajouté pour debug/affichage
  // AI metadata (THE SNAPSHOT from Radar)
  ai_metadata?: {
    match_score?: number;
    match_reason?: string;
    strategic_analysis?: string;
    custom_hook?: string;
    pain_points?: string[];
    buying_signals?: string[];
    description_long?: string;
    validated_by_cible?: boolean;
    validated_by_cerveau?: boolean;
    alternative_contact?: {
      full_name: string;
      job_title: string;
      linkedin_url?: string;
    };
    captured_at?: string;
  } | null;
}

interface ProspectTableProps {
  prospects: Prospect[];
  isLoading: boolean;
  onReject: (prospect: Prospect) => void;
  onValidateAndLaunch: (prospect: Prospect) => Promise<void>;
  isLaunching: string | null;
  onProspectClick?: (prospect: Prospect) => void;
  highlightId?: string | null;
  onEnrichComplete?: () => void; // Callback pour rafraîchir après enrichissement
}

function getStageStyle(stage: string) {
  switch (stage) {
    case 'detected':
      return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', label: 'Détecté' };
    case 'enriched':
      return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'Enrichi' };
    case 'contacted':
      return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Contacté' };
    case 'negotiation':
      return { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', label: 'Négociation' };
    case 'closed':
      return { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300', label: 'Fermé' };
    default:
      return { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', label: stage };
  }
}

export function ProspectTable({ 
  prospects, 
  isLoading, 
  onReject, 
  onValidateAndLaunch,
  isLaunching,
  onProspectClick,
  highlightId,
  onEnrichComplete
}: ProspectTableProps) {
  const { enrichProspect, isEnriching } = useEnrichProspect();
  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Entreprise</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Titre</TableHead>
              <TableHead>LinkedIn</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Téléphone</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3].map((i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                <TableCell><Skeleton className="h-5 w-36" /></TableCell>
                <TableCell><Skeleton className="h-8 w-8 rounded" /></TableCell>
                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                <TableCell><Skeleton className="h-8 w-24" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (prospects.length === 0) {
    return null; // Empty state handled by parent component (FicheProspect)
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50 hover:bg-slate-50">
            <TableHead className="font-semibold text-slate-700">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-slate-400" />
                Entreprise
              </div>
            </TableHead>
            <TableHead className="font-semibold text-slate-700">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-slate-400" />
                Contact
              </div>
            </TableHead>
            <TableHead className="font-semibold text-slate-700">Titre</TableHead>
            <TableHead className="font-semibold text-slate-700">
              <div className="flex items-center gap-2">
                <Linkedin className="h-4 w-4 text-slate-400" />
                LinkedIn
              </div>
            </TableHead>
            <TableHead className="font-semibold text-slate-700">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-slate-400" />
                Email
              </div>
            </TableHead>
            <TableHead className="font-semibold text-slate-700">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-slate-400" />
                Téléphone
              </div>
            </TableHead>
            <TableHead className="font-semibold text-slate-700">Statut</TableHead>
            <TableHead className="font-semibold text-slate-700 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {prospects.map((prospect, index) => {
            const stageStyle = getStageStyle(prospect.pipeline_stage);
            const isThisLaunching = isLaunching === prospect.id;
            const isContacted = prospect.pipeline_stage === 'contacted';
            const hasAiMetadata = !!prospect.ai_metadata;
            const isHighlighted = highlightId === prospect.id;

            const companyMissing = !prospect.company_name;

            const contactName = prospect.contact_name ?? 'Décideur non identifié';
            const contactMissing =
              !prospect.contact_name ||
              prospect.contact_name === 'Non renseigné' ||
              prospect.contact_name === 'Décideur non identifié';

            const jobTitle = prospect.job_title ?? 'Poste non renseigné';
            const jobMissing =
              !prospect.job_title ||
              prospect.job_title === 'Non renseigné' ||
              prospect.job_title === 'Poste non renseigné';

            return (
              <motion.tr
                key={prospect.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => prospect.id && hasAiMetadata && onProspectClick?.(prospect)}
                className={cn(
                  "group transition-colors",
                  isContacted && "bg-emerald-50/30",
                  hasAiMetadata && "cursor-pointer hover:bg-violet-50/50",
                  isHighlighted && "bg-violet-100/50 ring-2 ring-violet-300"
                )}
              >
                <TableCell className="font-medium text-slate-900">
                  <div className="flex items-center gap-2">
                    {companyMissing ? (
                      <Badge variant="outline" className="bg-muted/60 text-muted-foreground border-border">
                        Entreprise inconnue
                      </Badge>
                    ) : (
                      <span>{prospect.company_name}</span>
                    )}

                    {hasAiMetadata && (
                      <span title="Analyse IA disponible" className="text-violet-500">
                        <Brain className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </div>
                </TableCell>

                <TableCell className="text-slate-700">
                  {contactMissing ? (
                    <Badge variant="outline" className="bg-muted/60 text-muted-foreground border-border">
                      Cible à définir
                    </Badge>
                  ) : (
                    <span>{contactName}</span>
                  )}
                </TableCell>

                <TableCell className="text-slate-600 text-sm max-w-[200px] truncate">
                  {jobMissing ? (
                    <span className="text-slate-400 text-xs italic">Poste non renseigné</span>
                  ) : (
                    jobTitle
                  )}
                </TableCell>

                <TableCell>
                  {prospect.linkedin_url ? (
                    <a
                      href={prospect.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 p-2 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors text-blue-600"
                    >
                      <Linkedin className="h-4 w-4" />
                    </a>
                  ) : (
                    <span className="text-slate-400 text-sm">—</span>
                  )}
                </TableCell>

                <TableCell>
                  {prospect.email ? (
                    <a
                      href={`mailto:${prospect.email}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-violet-600 hover:text-violet-700 text-sm"
                    >
                      {prospect.email}
                    </a>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async (e) => {
                        e.stopPropagation();
                        // Parse le nom complet en prénom/nom
                        const [firstName = '', ...lastParts] = (prospect.contact_name || 'Contact Demo').split(' ');
                        const lastName = lastParts.join(' ') || 'Prospect';
                        
                        const result = await enrichProspect(
                          prospect.id,
                          firstName,
                          lastName,
                          prospect.company_name || 'Entreprise',
                          undefined
                        );
                        
                        if (result && onEnrichComplete) {
                          onEnrichComplete();
                        }
                      }}
                      disabled={isEnriching === prospect.id}
                      className="text-violet-600 hover:text-violet-700 hover:bg-violet-50 gap-1.5 h-7 px-2"
                    >
                      {isEnriching === prospect.id ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span className="text-xs">Recherche...</span>
                        </>
                      ) : (
                        <>
                          <Search className="h-3 w-3" />
                          <span className="text-xs">Enrichir</span>
                        </>
                      )}
                    </Button>
                  )}
                </TableCell>

                <TableCell>
                  {prospect.phone ? (
                    <a
                      href={`tel:${prospect.phone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-slate-700 text-sm"
                    >
                      {prospect.phone}
                    </a>
                  ) : (
                    <span className="text-slate-400 text-xs italic">—</span>
                  )}
                </TableCell>

                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs font-medium",
                      stageStyle.bg,
                      stageStyle.text,
                      stageStyle.border
                    )}
                  >
                    {isContacted && <CheckCircle2 className="h-3 w-3 mr-1" />}
                    {stageStyle.label}
                  </Badge>
                </TableCell>

                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {/* Reject Button */}
                    {!isContacted && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onReject(prospect);
                        }}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}

                    {/* Validate & Launch Button */}
                    {!isContacted && prospect.linkedin_url && (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onValidateAndLaunch(prospect);
                        }}
                        disabled={isThisLaunching || !prospect.linkedin_url}
                        className={cn(
                          "gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white",
                          isThisLaunching && "opacity-75"
                        )}
                      >
                        {isThisLaunching ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Envoi...
                          </>
                        ) : (
                          <>
                            <Rocket className="h-3 w-3" />
                            Valider & Lancer
                          </>
                        )}
                      </Button>
                    )}

                    {/* Already contacted indicator */}
                    {isContacted && (
                      <div className="flex items-center gap-1.5 text-emerald-600 text-sm">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Invitation envoyée</span>
                      </div>
                    )}
                  </div>
                </TableCell>
              </motion.tr>
            );
          })}
        </TableBody>
      </Table>

      {/* 
        NOTE DÉVELOPPEUR:
        Une fois la connexion Unipile acceptée par le prospect, 
        nous utiliserons un webhook pour récupérer l'email et le téléphone 
        depuis son profil LinkedIn et mettre à jour cette fiche.
      */}
    </div>
  );
}
