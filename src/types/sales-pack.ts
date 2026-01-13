// Sales Pack - Complete structured generation response

export type DocumentDensity = 'flash' | 'standard' | 'enterprise';
export type OutputLanguage = 'fr' | 'en-us' | 'en-uk' | 'es' | 'de' | 'it';

export const DENSITY_OPTIONS: { value: DocumentDensity; label: string; description: string; pages: string }[] = [
  { value: 'flash', label: 'Flash / Synthèse', description: 'Droit au but, concis', pages: '1-5 pages' },
  { value: 'standard', label: 'Standard / Détaillé', description: 'Structure classique complète', pages: '10-20 pages' },
  { value: 'enterprise', label: 'Enterprise / Appel d\'Offres', description: 'Ultra détaillé, sections RSE, risques, gouvernance', pages: '30-50 pages' },
];

export const LANGUAGE_OPTIONS: { value: OutputLanguage; label: string; flag: string }[] = [
  { value: 'fr', label: 'Français', flag: '🇫🇷' },
  { value: 'en-us', label: 'English (US)', flag: '🇺🇸' },
  { value: 'en-uk', label: 'English (UK)', flag: '🇬🇧' },
  { value: 'es', label: 'Español', flag: '🇪🇸' },
  { value: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { value: 'it', label: 'Italiano', flag: '🇮🇹' },
];

export interface PricingPackage {
  name: string;
  tier: 'essential' | 'recommended' | 'premium';
  price: string;
  description: string;
  features: string[];
  highlighted?: boolean;
}

export interface SalesEmails {
  delivery: string;
  followUp: string;
}

export interface GapAnalysis {
  currentSituation: string;
  missedOpportunity: string;
  potentialLoss: string;
  urgency: string;
}

export interface SalesPack {
  proposal: {
    content: string;
    gapAnalysis: GapAnalysis;
  };
  pricing: PricingPackage[];
  emails: SalesEmails;
}

// Default empty sales pack
export const EMPTY_SALES_PACK: SalesPack = {
  proposal: {
    content: '',
    gapAnalysis: {
      currentSituation: '',
      missedOpportunity: '',
      potentialLoss: '',
      urgency: '',
    },
  },
  pricing: [],
  emails: {
    delivery: '',
    followUp: '',
  },
};
