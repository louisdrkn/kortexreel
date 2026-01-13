import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProject } from '@/contexts/ProjectContext';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import type { Prospect } from '@/components/crm/ProspectTable';

// Extended prospect data from Radar (AI metadata included)
export interface RadarProspectData {
  company_name: string;
  contact_name: string;
  first_name?: string;
  last_name?: string;
  job_title: string;
  linkedin_url: string;
  context_score?: number;
  email?: string;
  phone?: string;
  // Company metadata
  company_website?: string;
  company_domain?: string;
  company_industry?: string;
  company_headcount?: string;
  company_location?: string;
  company_logo_url?: string;
  // AI Analysis metadata (THE SNAPSHOT)
  ai_match_score?: number;
  match_reason?: string;
  strategic_analysis?: string;
  custom_hook?: string;
  pain_points?: string[];
  buying_signals?: string[];
  description_long?: string;
  // ZERO-DÉCHET validation badges
  validated_by_cible?: boolean;
  validated_by_cerveau?: boolean;
  // Alternative contact
  alternative_contact?: {
    full_name: string;
    job_title: string;
    linkedin_url?: string;
    email?: string;
  };
}

export function useProspects() {
  const { user, session, ensureSession } = useAuth();
  const { currentProject } = useProject();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isLaunching, setIsLaunching] = useState<string | null>(null);

  const effectiveUserId = user?.id ?? session?.user?.id ?? null;

  // Fetch the user's org_id from their profile
  const { data: orgId } = useQuery({
    queryKey: ['user-org-id', effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('id', effectiveUserId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching org_id:', error);
      }

      // Happy path
      if (data?.org_id) return data.org_id;

      // Self-heal: ensure org/profile/role exists, then return org id
      try {
        const { data: newOrgId, error: rpcError } = await supabase.rpc('ensure_user_org');
        if (rpcError) {
          console.error('Error ensuring org:', rpcError);
          return null;
        }
        if (newOrgId) {
          queryClient.invalidateQueries({ queryKey: ['user-org-id'] });
          return newOrgId;
        }
      } catch (e) {
        console.error('Error ensuring org (exception):', e);
      }

      return null;
    },
    enabled: !!effectiveUserId,
  });

  const currentProjectId = currentProject?.id ?? null;

  // Fetch leads from the leads table (with AI metadata) — scoped to current project (ZERO-CRASH)
  const {
    data: prospects = [],
    isLoading,
    isError,
    error: prospectsError,
    refetch,
  } = useQuery({
    queryKey: ['prospects', orgId, currentProjectId],
    queryFn: async () => {
      if (!orgId || !currentProjectId) return [];

      console.log('[useProspects] Fetching leads for project:', currentProjectId);

      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('org_id', orgId)
        .eq('project_id', currentProjectId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[useProspects] Error fetching prospects:', error);
        throw error;
      }

      console.log('[useProspects] Fetched', data?.length || 0, 'leads');

      return (data || []).map((lead) => {
        const contactInfo = (lead.contact_info as Record<string, unknown> | null) ?? null;
        const linkedinData = (lead.linkedin_data as Record<string, unknown> | null) ?? null;

        const contactName =
          (contactInfo?.full_name as string) ||
          (contactInfo?.name as string) ||
          'Décideur non identifié';

        const jobTitle = (contactInfo?.job_title as string) || 'Poste non renseigné';

        return {
          id: lead.id,
          company_name: lead.company_name,
          contact_name: contactName,
          job_title: jobTitle,
          linkedin_url: (linkedinData?.url as string) || (contactInfo?.linkedin_url as string) || null,
          email: (contactInfo?.email as string) || null,
          phone: (contactInfo?.phone as string) || null,
          pipeline_stage: lead.pipeline_stage,
          qualification_score: lead.qualification_score,
          created_at: lead.created_at,
          project_id: lead.project_id,
          // AI metadata (THE SNAPSHOT imported from Radar)
          ai_metadata: (contactInfo?.ai_metadata as Record<string, unknown> | null) ?? null,
        } as Prospect;
      });
    },
    enabled: !!orgId && !!currentProjectId,
    retry: 1,
  });

  // FAIL-SAFE: Helper function to get org_id with self-healing RPC
  const getOrFetchOrgId = useCallback(async (userId: string): Promise<string | null> => {
    // STRATEGY 1: Use cached orgId from React Query
    if (orgId) {
      return orgId;
    }

    if (!userId) {
      console.error('[useProspects] No user ID available');
      return null;
    }

    console.log('[useProspects] OrgId not in cache, trying fallbacks...');

    // STRATEGY 2: Fetch from profiles table
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('id', userId)
        .maybeSingle();

      if (profile?.org_id) {
        console.log('[useProspects] ✅ OrgId from profiles:', profile.org_id);
        return profile.org_id;
      }
    } catch (err) {
      console.warn('[useProspects] Profile fetch failed:', err);
    }

    // STRATEGY 3: Fetch from user_roles table
    try {
      const { data: userRole } = await supabase
        .from('user_roles')
        .select('org_id')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();

      if (userRole?.org_id) {
        console.log('[useProspects] ✅ OrgId from user_roles:', userRole.org_id);
        return userRole.org_id;
      }
    } catch (err) {
      console.warn('[useProspects] user_roles fetch failed:', err);
    }

    // STRATEGY 4 (SELF-HEAL): Call RPC to create missing org/profile/role
    try {
      console.log('[useProspects] 🔧 Calling ensure_user_org RPC (self-heal)...');
      const { data: newOrgId, error: rpcError } = await supabase.rpc('ensure_user_org');

      if (rpcError) {
        console.error('[useProspects] ensure_user_org RPC error:', rpcError);
      } else if (newOrgId) {
        console.log('[useProspects] ✅ OrgId created via self-heal:', newOrgId);
        // Invalidate queries to refresh the cached orgId
        queryClient.invalidateQueries({ queryKey: ['user-org-id'] });
        return newOrgId;
      }
    } catch (err) {
      console.error('[useProspects] Self-heal RPC failed:', err);
    }

    console.error('[useProspects] ❌ All strategies failed - no org_id found');
    return null;
  }, [orgId, queryClient]);

  // Check if a prospect already exists (by linkedin_url) — scoped to org + current project
  const checkProspectExists = useCallback(async (linkedinUrl: string): Promise<string | null> => {
    if (!linkedinUrl) return null;
    if (!currentProject?.id) return null;

    let currentSession = session;
    if (!currentSession) {
      currentSession = await ensureSession();
    }
    if (!currentSession) return null;

    const effectiveOrgId = await getOrFetchOrgId(currentSession.user.id);
    if (!effectiveOrgId) return null;

    const { data: existingLead } = await supabase
      .from('leads')
      .select('id')
      .eq('org_id', effectiveOrgId)
      .eq('project_id', currentProject.id)
      .contains('linkedin_data', { url: linkedinUrl })
      .maybeSingle();

    return existingLead?.id || null;
  }, [session, ensureSession, getOrFetchOrgId, currentProject?.id]);

  // Add a prospect to the CRM with FULL SNAPSHOT (AI metadata included)
  const addProspect = useCallback(async (
    prospectData: RadarProspectData,
    options?: { redirectToFiche?: boolean }
  ): Promise<{ success: boolean; prospectId?: string }> => {
    console.log('[addProspect] Starting transfer...', { company: prospectData.company_name });

    // STEP 0: project_id required
    if (!currentProject?.id) {
      console.error('[addProspect] CRITICAL: No project selected');
      toast({
        title: 'Aucun projet sélectionné',
        description: "Choisissez un projet avant de transférer un prospect.",
        variant: 'destructive',
      });
      return { success: false };
    }

    // Step 1: Ensure valid session
    let currentSession = session;
    if (!currentSession) {
      console.log('[addProspect] No session in state, calling ensureSession...');
      currentSession = await ensureSession();
    }

    if (!currentSession?.user?.id) {
      console.error('[addProspect] CRITICAL: No valid session after ensureSession');
      toast({
        title: 'Session expirée',
        description: 'Veuillez vous reconnecter',
        variant: 'destructive',
      });
      return { success: false };
    }

    console.log('[addProspect] Session OK:', currentSession.user.id);

    // Step 2: Get orgId with defensive fallback
    const effectiveOrgId = await getOrFetchOrgId(currentSession.user.id);

    if (!effectiveOrgId) {
      console.error('[addProspect] CRITICAL: No org_id found for user', currentSession.user.id);
      toast({
        title: 'Organisation introuvable',
        description: 'Rechargez la page ou reconnectez-vous',
        variant: 'destructive',
      });
      return { success: false };
    }

    console.log('[addProspect] OrgId OK:', effectiveOrgId, 'ProjectId OK:', currentProject.id);

    try {
      // Check for duplicate by linkedin_url for this org + project
      if (prospectData.linkedin_url) {
        const { data: existingLead } = await supabase
          .from('leads')
          .select('id')
          .eq('org_id', effectiveOrgId)
          .eq('project_id', currentProject.id)
          .contains('linkedin_data', { url: prospectData.linkedin_url })
          .maybeSingle();

        if (existingLead) {
          toast({
            title: 'Déjà sauvegardé',
            description: 'Ce prospect est déjà dans votre Fiche Prospect',
          });
          return { success: true, prospectId: existingLead.id };
        }
      }

      // Parse first/last name if not provided
      let firstName = prospectData.first_name;
      let lastName = prospectData.last_name;

      if (!firstName && !lastName && prospectData.contact_name) {
        const nameParts = prospectData.contact_name.trim().split(' ');
        if (nameParts.length >= 2) {
          firstName = nameParts[0];
          lastName = nameParts.slice(1).join(' ');
        } else {
          firstName = prospectData.contact_name;
          lastName = '';
        }
      }

      // Build THE SNAPSHOT - Full AI metadata capture
      const aiMetadata = {
        match_score: prospectData.ai_match_score,
        match_reason: prospectData.match_reason,
        strategic_analysis: prospectData.strategic_analysis,
        custom_hook: prospectData.custom_hook,
        pain_points: prospectData.pain_points,
        buying_signals: prospectData.buying_signals,
        description_long: prospectData.description_long,
        validated_by_cible: prospectData.validated_by_cible,
        validated_by_cerveau: prospectData.validated_by_cerveau,
        alternative_contact: prospectData.alternative_contact,
        captured_at: new Date().toISOString(),
      };

      const payload = {
        org_id: effectiveOrgId,
        project_id: currentProject.id, // <-- LA CLÉ CRITIQUE
        company_name: prospectData.company_name,
        contact_info: {
          full_name: prospectData.contact_name,
          first_name: firstName,
          last_name: lastName,
          job_title: prospectData.job_title,
          linkedin_url: prospectData.linkedin_url,
          email: prospectData.email || null,
          phone: prospectData.phone || null,
          // Company metadata
          company_website: prospectData.company_website,
          company_domain: prospectData.company_domain,
          company_industry: prospectData.company_industry,
          company_headcount: prospectData.company_headcount,
          company_location: prospectData.company_location,
          company_logo_url: prospectData.company_logo_url,
          // AI metadata THE SNAPSHOT
          ai_metadata: aiMetadata,
        },
        linkedin_data: {
          url: prospectData.linkedin_url,
        },
        qualification_score: prospectData.ai_match_score || prospectData.context_score || 0,
        pipeline_stage: 'detected' as const,
      };

      console.log('[addProspect] Payload ready:', JSON.stringify(payload, null, 2));

      const { data, error } = await supabase
        .from('leads')
        .insert(payload)
        .select('id');

      if (error) {
        console.error('[addProspect] Supabase Insert Error:', error);
        console.error('[addProspect] Error code:', error.code);
        console.error('[addProspect] Error details:', error.details);
        toast({
          title: 'Échec du transfert',
          description: `${error.message} (Code: ${error.code})`,
          variant: 'destructive',
        });
        return { success: false };
      }

      console.log('[addProspect] Insert response:', data);

      const newId = data?.[0]?.id;
      if (!newId) {
        console.error('Supabase Insert Error: no row returned', { data });
        toast({
          title: 'Échec du transfert',
          description: "Insertion non confirmée (aucun ID retourné)",
          variant: 'destructive',
        });
        return { success: false };
      }

      // Confirmation read (prevents false-positive success UI)
      const { data: confirm, error: confirmError } = await supabase
        .from('leads')
        .select('id')
        .eq('id', newId)
        .maybeSingle();

      if (confirmError || !confirm?.id) {
        console.error('Supabase Insert Confirm Error:', confirmError);
        toast({
          title: 'Échec du transfert',
          description: 'Insertion non visible (RLS / org).',
          variant: 'destructive',
        });
        return { success: false };
      }

      toast({
        title: '✅ Dossier sauvegardé !',
        description: `${prospectData.contact_name} (${prospectData.company_name}) transféré vers Fiche Prospect`,
      });

      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['user-org-id'] });
      queryClient.invalidateQueries({ queryKey: ['prospects'] });
      refetch();

      // Optional: Redirect to Fiche Prospect
      if (options?.redirectToFiche) {
        navigate(`/radar/prospects?highlight=${newId}`);
      }

      return { success: true, prospectId: newId };
    } catch (error) {
      console.error('Error adding prospect:', error);
      toast({
        title: 'Échec du transfert',
        description: error instanceof Error ? error.message : 'Impossible d\'ajouter le prospect',
        variant: 'destructive',
      });
      return { success: false };
    }
  }, [session, ensureSession, getOrFetchOrgId, toast, refetch, queryClient, navigate, currentProject?.id]);

  // Reject a prospect (delete or mark as rejected)
  const rejectProspect = useCallback(async (prospect: Prospect) => {
    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', prospect.id);

      if (error) throw error;

      toast({
        title: 'Prospect rejeté',
        description: `${prospect.contact_name} a été supprimé du pipeline`,
      });

      refetch();
    } catch (error) {
      console.error('Error rejecting prospect:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de rejeter le prospect',
        variant: 'destructive',
      });
    }
  }, [toast, refetch]);

  // Validate and launch LinkedIn invitation
  const validateAndLaunch = useCallback(async (prospect: Prospect) => {
    if (!prospect.linkedin_url) {
      toast({
        title: 'Erreur',
        description: 'URL LinkedIn manquante',
        variant: 'destructive',
      });
      return;
    }

    // Self-healing session retrieval (anti state-drift)
    let currentSession = session;
    if (!currentSession) {
      currentSession = await ensureSession();
    }

    if (!currentSession) {
      toast({
        title: 'Session expirée',
        description: 'Rechargement…',
      });
      window.location.reload();
      return;
    }

    // Get orgId with FAIL-SAFE fallback mechanism (including self-heal RPC)
    const effectiveOrgId = await getOrFetchOrgId(currentSession.user.id);

    if (!effectiveOrgId) {
      toast({
        title: 'Synchronisation en cours',
        description: 'Rechargement…',
      });
      window.location.reload();
      return;
    }

    setIsLaunching(prospect.id);

    try {
      // Step 1: Update status to "qualified"
      await supabase
        .from('leads')
        .update({ pipeline_stage: 'enriched' }) // enriched = qualified
        .eq('id', prospect.id);

      // Step 2: Call send-connection-request Edge Function
      console.log('🚀 Sending LinkedIn invitation for:', prospect.contact_name);

      const { data, error } = await supabase.functions.invoke('send-connection-request', {
        body: {
          lead_id: prospect.id,
          linkedin_url: prospect.linkedin_url,
          org_id: effectiveOrgId,
          message: `Bonjour, je souhaite échanger avec vous au sujet de ${prospect.company_name}.`,
        },
        headers: {
          Authorization: `Bearer ${currentSession.access_token}`,
        },
      });

      if (error) throw error;

      if (!data.success) {
        // Handle specific error codes
        if (data.error_code === 'NO_LINKEDIN_ACCOUNT') {
          toast({
            title: 'LinkedIn non connecté',
            description: 'Allez dans Paramètres > Infrastructure pour connecter votre compte LinkedIn',
            variant: 'destructive',
          });
          // Revert status
          await supabase
            .from('leads')
            .update({ pipeline_stage: 'detected' })
            .eq('id', prospect.id);
          return;
        }
        throw new Error(data.error || 'Erreur inconnue');
      }

      toast({
        title: '🚀 Invitation envoyée!',
        description: `Une demande de connexion LinkedIn a été envoyée à ${prospect.contact_name}`,
      });

      refetch();
    } catch (error) {
      console.error('Error launching prospect:', error);
      toast({
        title: 'Erreur d\'envoi',
        description: error instanceof Error ? error.message : 'Impossible d\'envoyer l\'invitation',
        variant: 'destructive',
      });

      // Revert status on error
      try {
        await supabase
          .from('leads')
          .update({ pipeline_stage: 'detected' })
          .eq('id', prospect.id);
      } catch {
        // ignore
      }
    } finally {
      setIsLaunching(null);
    }
  }, [session, ensureSession, getOrFetchOrgId, toast, refetch]);

  return {
    prospects,
    isLoading,
    isError,
    error: prospectsError,
    isLaunching,
    addProspect,
    checkProspectExists,
    rejectProspect,
    validateAndLaunch,
    refetch,
  };
}
