import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Filter,
  RefreshCw,
  Search,
  Brain,
  Target,
  CheckCircle2,
  X,
  Sparkles,
  AlertTriangle,
  TrendingUp,
  Shield,
  Radar,
  Rocket,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ProspectTable, Prospect } from '@/components/crm/ProspectTable';
import { useProspects } from '@/hooks/useProspects';
import { useProject } from '@/contexts/ProjectContext';
import { PremiumEmptyState } from '@/components/ui/premium-empty-state';
import { cn } from '@/lib/utils';

// Strategic Analysis Panel (imported from Radar)
function StrategicAnalysisPanel({
  prospect,
  onClose,
}: {
  prospect: Prospect;
  onClose: () => void;
}) {
  const ai = prospect.ai_metadata as Record<string, unknown> | null | undefined;
  if (!ai) return null;

  const matchScore = typeof ai.match_score === 'number' ? (ai.match_score as number) : null;
  const validatedByCible = !!ai.validated_by_cible;
  const validatedByCerveau = !!ai.validated_by_cerveau;

  const painPoints = Array.isArray(ai.pain_points) ? (ai.pain_points as string[]) : [];
  const buyingSignals = Array.isArray(ai.buying_signals) ? (ai.buying_signals as string[]) : [];

  const alternativeContact =
    ai.alternative_contact && typeof ai.alternative_contact === 'object'
      ? (ai.alternative_contact as Record<string, unknown>)
      : null;

  const altName = (alternativeContact?.full_name as string | undefined) ?? null;
  const altJob = (alternativeContact?.job_title as string | undefined) ?? null;
  const altInitial = (altName?.trim()?.[0] ?? '?').toUpperCase();

  const contactLabel = prospect.contact_name || 'Décideur non identifié';
  const companyLabel = prospect.company_name || 'Entreprise inconnue';

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, height: 0 }}
      animate={{ opacity: 1, y: 0, height: 'auto' }}
      exit={{ opacity: 0, y: -20, height: 0 }}
      className="bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 rounded-2xl border border-violet-200 shadow-lg shadow-violet-100/50 overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 border-b border-violet-100 flex items-center justify-between bg-white/50">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-violet-100">
            <Brain className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Analyse Stratégique Importée</h3>
            <p className="text-sm text-slate-500">{contactLabel} • {companyLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {typeof matchScore === 'number' && (
            <Badge
              className={cn(
                'font-bold',
                matchScore >= 85
                  ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                  : matchScore >= 70
                    ? 'bg-amber-100 text-amber-700 border-amber-200'
                    : 'bg-slate-100 text-slate-600'
              )}
            >
              Score: {matchScore}%
            </Badge>
          )}
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* ZERO-DÉCHET Validation Badges */}
        {(validatedByCible || validatedByCerveau) && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-100">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <div className="flex items-center gap-2 flex-wrap">
              {validatedByCible && (
                <Badge variant="outline" className="bg-white border-emerald-200 text-emerald-700">
                  <Target className="h-3 w-3 mr-1" />
                  Validé par Cible
                </Badge>
              )}
              {validatedByCerveau && (
                <Badge variant="outline" className="bg-white border-violet-200 text-violet-700">
                  <Brain className="h-3 w-3 mr-1" />
                  Validé par Cerveau
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Match Reason */}
        {typeof ai.match_reason === 'string' && ai.match_reason.trim().length > 0 && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-100">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-700">Pourquoi ce prospect ?</span>
            </div>
            <p className="text-sm text-slate-700">{ai.match_reason as string}</p>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Strategic Analysis */}
          {typeof ai.strategic_analysis === 'string' && ai.strategic_analysis.trim().length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Target className="h-4 w-4 text-violet-500" />
                Analyse Stratégique
              </h4>
              <p className="text-sm text-slate-600 bg-white p-3 rounded-lg border border-slate-100">
                {ai.strategic_analysis as string}
              </p>
            </div>
          )}

          {/* Custom Hook */}
          {typeof ai.custom_hook === 'string' && ai.custom_hook.trim().length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-fuchsia-500" />
                Accroche Personnalisée
              </h4>
              <p className="text-sm text-slate-600 bg-white p-3 rounded-lg border border-slate-100 italic">"{ai.custom_hook as string}"</p>
            </div>
          )}
        </div>

        {/* Pain Points & Buying Signals */}
        <div className="grid md:grid-cols-2 gap-6">
          {painPoints.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Points de Douleur
              </h4>
              <ul className="space-y-1">
                {painPoints.slice(0, 3).map((pain, idx) => (
                  <li
                    key={idx}
                    className="text-sm text-slate-600 bg-white p-2 rounded-lg border border-slate-100 flex items-start gap-2"
                  >
                    <span className="text-amber-500">•</span>
                    {pain}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {buyingSignals.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                Signaux d'Achat
              </h4>
              <div className="flex flex-wrap gap-2">
                {buyingSignals.slice(0, 4).map((signal, idx) => (
                  <Badge
                    key={idx}
                    variant="outline"
                    className="bg-white border-emerald-200 text-emerald-700 text-xs"
                  >
                    {signal}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Alternative Contact */}
        {altName && (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="h-4 w-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-600">Contact Alternatif (Plan B)</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-medium">
                {altInitial}
              </div>
              <div>
                <p className="font-medium text-slate-700">{altName}</p>
                <p className="text-sm text-slate-500">{altJob || 'Poste non renseigné'}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function FicheProspect() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentProject } = useProject();
  const projectId = currentProject?.id ?? null;

  const highlightId = searchParams.get('highlight');

  const {
    prospects,
    isLoading,
    isError,
    error: prospectsError,
    isLaunching,
    rejectProspect,
    validateAndLaunch,
    refetch,
  } = useProspects();

  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [projectProspects, setProjectProspects] = useState<Prospect[]>([]);

  // HARD RESET: purge list when project changes (prevents "old project" bleed)
  useEffect(() => {
    setProjectProspects([]);
    setSelectedProspect(null);
  }, [projectId]);

  // Sync query data into local state (lets us blank immediately on project switch)
  useEffect(() => {
    if (!isLoading) {
      setProjectProspects(prospects);
    }
  }, [prospects, isLoading]);

  // Debug: if we fetch 0 results, log the project ID used
  useEffect(() => {
    if (!isLoading && !prospectsError && projectId && projectProspects.length === 0) {
      console.log('Projet ID utilisé:', projectId);
    }
  }, [isLoading, prospectsError, projectId, projectProspects.length]);

  // Auto-select highlighted prospect (from Radar redirect)
  useEffect(() => {
    if (highlightId && projectProspects.length > 0) {
      const prospect = projectProspects.find((p) => p.id === highlightId);
      if (prospect && prospect.ai_metadata) {
        setSelectedProspect(prospect);
      }
    }
  }, [highlightId, projectProspects]);

  // Filter prospects based on search and stage (DEFENSIVE)
  const filteredProspects = projectProspects.filter((prospect) => {
    const q = searchQuery.trim().toLowerCase();

    const company = (prospect.company_name ?? '').toLowerCase();
    const contact = String((prospect as unknown as { contact_name?: unknown })?.contact_name ?? '').toLowerCase();
    const title = String((prospect as unknown as { job_title?: unknown })?.job_title ?? '').toLowerCase();

    const matchesSearch = !q || company.includes(q) || contact.includes(q) || title.includes(q);
    const matchesStage = stageFilter === 'all' || prospect.pipeline_stage === stageFilter;

    return matchesSearch && matchesStage;
  });

  // Stats
  const stats = {
    total: projectProspects.length,
    detected: projectProspects.filter((p) => p.pipeline_stage === 'detected').length,
    enriched: projectProspects.filter((p) => p.pipeline_stage === 'enriched').length,
    contacted: projectProspects.filter((p) => p.pipeline_stage === 'contacted').length,
  };

  // Handle row click to show strategic analysis
  const handleProspectClick = (prospect: Prospect) => {
    if (prospect?.id && prospect.ai_metadata) {
      setSelectedProspect(selectedProspect?.id === prospect.id ? null : prospect);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6 lg:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-200/50">
              <Users className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Tour de Contrôle</h1>
              <p className="text-slate-500">Gérez vos prospects importés du Radar</p>
            </div>
          </div>

          <Button 
            variant="outline" 
            onClick={() => refetch()}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Actualiser
          </Button>
        </motion.div>

        {/* Strategic Analysis Panel (if selected) */}
        <AnimatePresence>
          {selectedProspect && selectedProspect.ai_metadata && (
            <StrategicAnalysisPanel 
              prospect={selectedProspect} 
              onClose={() => setSelectedProspect(null)} 
            />
          )}
        </AnimatePresence>

        {/* Stats Cards */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <p className="text-sm text-slate-500 mb-1">Total</p>
            <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
          </div>
          <div className="bg-blue-50 rounded-xl border border-blue-100 p-4">
            <p className="text-sm text-blue-600 mb-1">Détectés</p>
            <p className="text-2xl font-bold text-blue-700">{stats.detected}</p>
          </div>
          <div className="bg-amber-50 rounded-xl border border-amber-100 p-4">
            <p className="text-sm text-amber-600 mb-1">Qualifiés</p>
            <p className="text-2xl font-bold text-amber-700">{stats.enriched}</p>
          </div>
          <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-4">
            <p className="text-sm text-emerald-600 mb-1">Contactés</p>
            <p className="text-2xl font-bold text-emerald-700">{stats.contacted}</p>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Rechercher par entreprise, contact ou titre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white"
            />
          </div>
          
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-full sm:w-48 bg-white">
              <Filter className="h-4 w-4 mr-2 text-slate-400" />
              <SelectValue placeholder="Filtrer par statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="detected">Détectés</SelectItem>
              <SelectItem value="enriched">Qualifiés</SelectItem>
              <SelectItem value="contacted">Contactés</SelectItem>
              <SelectItem value="negotiation">Négociation</SelectItem>
            </SelectContent>
          </Select>
        </motion.div>

        {/* Prospect Table or Premium Empty State */}
        {isError ? (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Erreur de chargement prospects</AlertTitle>
              <AlertDescription>
                {prospectsError instanceof Error
                  ? prospectsError.message
                  : `Erreur backend: ${JSON.stringify(prospectsError)}`}
              </AlertDescription>
            </Alert>

            <PremiumEmptyState
              icon={Radar}
              iconColor="violet"
              title="Impossible de charger la Fiche Prospect"
              subtitle="Le backend a refusé ou la connexion a échoué. Copiez l'erreur ci-dessus (debug) puis réessayez."
              ctaLabel="Retour au Radar"
              ctaIcon={Rocket}
              onCtaClick={() => navigate('/radar/scan')}
            />

            <div className="text-center text-sm text-muted-foreground">
              Projet ID : <span className="font-mono">{projectId ?? 'undefined'}</span>
            </div>
          </div>
        ) : !isLoading && filteredProspects.length === 0 ? (
          <div>
            <PremiumEmptyState
              icon={Radar}
              iconColor="violet"
              title="Votre Tronc est vide"
              subtitle="Alimentez-le depuis le Radar : transférez un prospect pour créer un dossier exploitable."
              ctaLabel="Lancer une détection Radar"
              ctaIcon={Rocket}
              onCtaClick={() => navigate('/radar/scan')}
            />
            <div className="mt-6 text-center text-sm text-muted-foreground">
              Aucun prospect trouvé pour le Projet ID :{' '}
              <span className="font-mono">{projectId ?? 'undefined'}</span>
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-4"
          >
            <ProspectTable
              prospects={filteredProspects}
              isLoading={isLoading}
              onReject={rejectProspect}
              onValidateAndLaunch={validateAndLaunch}
              isLaunching={isLaunching}
              onProspectClick={handleProspectClick}
              highlightId={highlightId}
              onEnrichComplete={refetch}
            />
          </motion.div>
        )}

        {/* Legend - only show when we have prospects */}
        {filteredProspects.length > 0 && <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-sm text-slate-500 bg-slate-50 rounded-lg p-4"
        >
          <p className="font-medium text-slate-700 mb-2">Légende des statuts:</p>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Détecté</Badge>
              <span>— Importé du Radar</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Qualifié</Badge>
              <span>— Validé, en cours d'envoi</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Contacté</Badge>
              <span>— Invitation LinkedIn envoyée</span>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-400 italic flex items-center gap-2">
            <Brain className="h-3 w-3" />
            Cliquez sur un prospect avec une icône 🧠 pour voir son analyse stratégique importée du Radar.
          </p>
        </motion.div>}
      </div>
    </div>
  );
}
