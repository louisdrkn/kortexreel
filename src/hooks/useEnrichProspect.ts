import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface EnrichResult {
  email: string;
  phone: string;
  source: string;
}

export function useEnrichProspect() {
  const [isEnriching, setIsEnriching] = useState<string | null>(null);
  const { toast } = useToast();

  const enrichProspect = async (
    leadId: string,
    firstName: string,
    lastName: string,
    companyName: string,
    companyUrl?: string
  ): Promise<EnrichResult | null> => {
    setIsEnriching(leadId);

    try {
      // Simule un délai réaliste (2-3 secondes pour l'effet "recherche")
      await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1000));

      const { data, error } = await supabase.functions.invoke('enrich-prospect', {
        body: {
          lead_id: leadId,
          first_name: firstName,
          last_name: lastName,
          company_name: companyName,
          company_url: companyUrl,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: '✅ Coordonnées trouvées !',
          description: `Email: ${data.data.email}`,
        });
        return data.data as EnrichResult;
      } else {
        throw new Error(data?.error || 'Enrichissement échoué');
      }
    } catch (error) {
      console.error('[useEnrichProspect] Erreur:', error);
      toast({
        title: 'Erreur d\'enrichissement',
        description: error instanceof Error ? error.message : 'Impossible d\'enrichir ce prospect',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsEnriching(null);
    }
  };

  return {
    enrichProspect,
    isEnriching,
  };
}
