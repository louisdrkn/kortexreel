import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Company } from '../types';

interface RippleResult {
  action: 'exclude' | 'validate';
  affectedAttributes: string[];
  adjustedWeights: Record<string, number>;
  companiesRemoved: number;
  companiesAffected: string[];
  newSearchSuggestion?: string;
}

interface NeuralFeedback {
  isProcessing: boolean;
  lastRipple: RippleResult | null;
  message: string | null;
  removedCount: number;
}

export function useNeuralLoop(projectId: string | undefined, userId: string | undefined) {
  const { toast } = useToast();
  const [feedback, setFeedback] = useState<NeuralFeedback>({
    isProcessing: false,
    lastRipple: null,
    message: null,
    removedCount: 0,
  });

  // Exclude a company and trigger the ripple effect
  const excludeCompany = useCallback(async (company: Company): Promise<RippleResult | null> => {
    if (!projectId || !userId || !company.id) {
      toast({
        title: 'Erreur',
        description: 'Données manquantes pour l\'exclusion',
        variant: 'destructive',
      });
      return null;
    }

    setFeedback(prev => ({ ...prev, isProcessing: true, message: 'Analyse en cours...' }));

    try {
      console.log('[NEURAL-LOOP] 🚫 Excluding company:', company.name);

      const { data, error } = await supabase.functions.invoke('recalibrate-pool', {
        body: {
          projectId,
          companyId: company.id,
          action: 'exclude',
          userId,
        },
      });

      if (error) throw error;

      if (data.success) {
        const result = data.result as RippleResult;
        
        setFeedback({
          isProcessing: false,
          lastRipple: result,
          message: buildFeedbackMessage(result, 'exclude'),
          removedCount: result.companiesRemoved,
        });

        return result;
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('[NEURAL-LOOP] Exclude error:', error);
      setFeedback(prev => ({ ...prev, isProcessing: false, message: null }));
      toast({
        title: 'Erreur',
        description: 'Impossible de traiter l\'exclusion',
        variant: 'destructive',
      });
      return null;
    }
  }, [projectId, userId, toast]);

  // Validate a company and boost similar attributes
  const validateCompany = useCallback(async (company: Company): Promise<RippleResult | null> => {
    if (!projectId || !userId || !company.id) {
      toast({
        title: 'Erreur',
        description: 'Données manquantes pour la validation',
        variant: 'destructive',
      });
      return null;
    }

    setFeedback(prev => ({ ...prev, isProcessing: true, message: 'Apprentissage en cours...' }));

    try {
      console.log('[NEURAL-LOOP] ✅ Validating company:', company.name);

      const { data, error } = await supabase.functions.invoke('recalibrate-pool', {
        body: {
          projectId,
          companyId: company.id,
          action: 'validate',
          userId,
        },
      });

      if (error) throw error;

      if (data.success) {
        const result = data.result as RippleResult;
        
        setFeedback({
          isProcessing: false,
          lastRipple: result,
          message: buildFeedbackMessage(result, 'validate'),
          removedCount: 0,
        });

        return result;
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('[NEURAL-LOOP] Validate error:', error);
      setFeedback(prev => ({ ...prev, isProcessing: false, message: null }));
      toast({
        title: 'Erreur',
        description: 'Impossible de traiter la validation',
        variant: 'destructive',
      });
      return null;
    }
  }, [projectId, userId, toast]);

  // Clear the feedback message
  const clearFeedback = useCallback(() => {
    setFeedback(prev => ({ ...prev, message: null, lastRipple: null }));
  }, []);

  return {
    excludeCompany,
    validateCompany,
    feedback,
    clearFeedback,
  };
}

// Build human-readable feedback message
function buildFeedbackMessage(result: RippleResult, action: 'exclude' | 'validate'): string {
  const parts: string[] = [];

  if (action === 'exclude') {
    if (result.affectedAttributes.length > 0) {
      parts.push(`J'ai compris. Je réduis la priorité de "${result.affectedAttributes[0]}"...`);
    }
    if (result.companiesRemoved > 0) {
      parts.push(`${result.companiesRemoved} profil${result.companiesRemoved > 1 ? 's' : ''} similaire${result.companiesRemoved > 1 ? 's' : ''} retiré${result.companiesRemoved > 1 ? 's' : ''} de votre file.`);
    }
  } else {
    if (result.affectedAttributes.length > 0) {
      parts.push(`J'augmente la priorité de "${result.affectedAttributes[0]}"...`);
    }
    parts.push('Je rechercherai plus de profils similaires.');
  }

  return parts.join(' ');
}
