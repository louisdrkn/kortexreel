// Business types with associated services
export type BusinessType = 
  | 'agency-web'
  | 'agency-seo'
  | 'agency-marketing'
  | 'consulting'
  | 'esn-tech'
  | 'studio-design'
  | 'freelance'
  | 'other';

export type BusinessSize = 'solo' | 'boutique' | 'pme' | 'enterprise';

export type PricingTier = 'access' | 'standard' | 'premium';

export type WritingTone = 'corporate' | 'direct' | 'empathetic' | 'luxury';

export const BUSINESS_TYPES: Record<BusinessType, { label: string; icon: string }> = {
  'agency-web': { label: 'Agence Web', icon: '🌐' },
  'agency-seo': { label: 'Agence SEO', icon: '🔍' },
  'agency-marketing': { label: 'Agence Marketing / Ads', icon: '📈' },
  'consulting': { label: 'Cabinet de Conseil', icon: '💼' },
  'esn-tech': { label: 'ESN / Tech', icon: '💻' },
  'studio-design': { label: 'Studio Design', icon: '🎨' },
  'freelance': { label: 'Freelance', icon: '🚀' },
  'other': { label: 'Autre / Spécifique', icon: '✨' },
};

export const BUSINESS_SIZES: Record<BusinessSize, { label: string; description: string }> = {
  'solo': { label: 'Solo', description: 'Indépendant' },
  'boutique': { label: 'Boutique', description: '2-10 personnes' },
  'pme': { label: 'PME', description: '10-50 personnes' },
  'enterprise': { label: 'Grande Entreprise', description: '50+ personnes' },
};

export const PRICING_TIERS: Record<PricingTier, { label: string; description: string; icon: string; defaultPrice: number }> = {
  'access': { label: 'Accessible', description: 'Tarifs compétitifs', icon: '💰', defaultPrice: 3000 },
  'standard': { label: 'Standard', description: 'Prix marché', icon: '⚖️', defaultPrice: 8000 },
  'premium': { label: 'Premium', description: 'Haut de gamme', icon: '💎', defaultPrice: 15000 },
};

export const WRITING_TONES: Record<WritingTone, { label: string; description: string; icon: string }> = {
  'corporate': { label: 'Corporatif', description: 'Sérieux et rassurant', icon: '👔' },
  'direct': { label: 'Direct & Punchy', description: 'Orienté résultats', icon: '⚡' },
  'empathetic': { label: 'Empathique', description: 'Orienté humain', icon: '🤝' },
  'luxury': { label: 'Luxe', description: 'Raffiné, peu de mots', icon: '💎' },
};

// Services by business type
export const SERVICES_BY_TYPE: Record<BusinessType, string[]> = {
  'agency-web': [
    'Site Vitrine',
    'Site E-commerce',
    'Application Web',
    'Refonte de site',
    'Maintenance & Support',
    'Hébergement',
    'Intégration API',
  ],
  'agency-seo': [
    'Audit SEO',
    'Stratégie de contenu',
    'Netlinking',
    'SEO Local',
    'SEO Technique',
    'Formation SEO',
    'Suivi mensuel',
  ],
  'agency-marketing': [
    'Campagne Google Ads',
    'Social Ads (Meta)',
    'Stratégie Marketing',
    'Email Marketing',
    'Marketing Automation',
    'Branding',
    'Community Management',
  ],
  'consulting': [
    'Diagnostic stratégique',
    'Accompagnement transformation',
    'Formation dirigeants',
    'Coaching',
    'Audit organisationnel',
    'Conduite du changement',
    'Mission interim management',
  ],
  'esn-tech': [
    'Développement sur mesure',
    'Architecture technique',
    'DevOps & Cloud',
    'Migration de données',
    'Intégration SI',
    'TMA / Support',
    'Cybersécurité',
  ],
  'studio-design': [
    'Identité visuelle',
    'UI/UX Design',
    'Motion Design',
    'Direction artistique',
    'Packaging',
    'Print & Édition',
    'Design System',
  ],
  'freelance': [
    'Prestation sur mesure',
    'Conseil expert',
    'Accompagnement projet',
    'Formation',
    'Audit',
    'Mission ponctuelle',
    'Abonnement mensuel',
  ],
  'other': [], // Services are custom for "other" type
};

export interface AgencyProfile {
  id?: string;
  name: string;
  businessType: BusinessType | null;
  businessSize: BusinessSize | null;
  customBusinessDescription: string; // For "other" business type
  methodology: string;
  tone: string;
  arguments: string;
}

export interface AgencyStyle {
  pricingTier: PricingTier | null;
  basePrice: number; // Modifiable price based on tier
  writingTone: WritingTone | null;
  selectedServices: string[];
  customServices: string[]; // For "other" business type
  sampleProposal: string;
  preferredStructure: string;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  priceMin: number;
  priceMax: number;
  deliverables: string[];
}

export interface AgencyConfig {
  profile: AgencyProfile;
  services: Service[];
  style: AgencyStyle;
}

export interface Proposal {
  id: string;
  clientName: string;
  clientBrief: string;
  generatedContent: string;
  createdAt: Date;
  status: 'draft' | 'sent' | 'won' | 'lost';
  estimatedValue?: number;
}

// Helper function to generate context from config
export function generateAgencyContext(config: AgencyConfig): string {
  const { profile, style } = config;
  
  if (!profile.businessType || !profile.businessSize || !style.pricingTier) {
    return '';
  }

  let businessTypeLabel: string;
  if (profile.businessType === 'other' && profile.customBusinessDescription) {
    businessTypeLabel = profile.customBusinessDescription;
  } else {
    businessTypeLabel = BUSINESS_TYPES[profile.businessType].label;
  }
  
  const businessSizeLabel = BUSINESS_SIZES[profile.businessSize].label;
  const pricingLabel = PRICING_TIERS[style.pricingTier].label;
  
  // Combine selected services and custom services
  const allServices = [...style.selectedServices, ...style.customServices];
  const servicesText = allServices.length > 0 
    ? allServices.join(', ')
    : 'services personnalisés';

  let context = `Nous sommes ${profile.name || 'une agence'}, ${profile.businessType === 'other' ? businessTypeLabel : `une ${businessTypeLabel}`} de taille ${businessSizeLabel}. `;
  context += `Notre positionnement prix est ${pricingLabel} (budget moyen : ${style.basePrice.toLocaleString('fr-FR')}€). `;
  context += `Nos services principaux sont : ${servicesText}. `;
  
  if (profile.methodology) {
    context += `\n\nNotre méthodologie : ${profile.methodology}`;
  }
  
  if (profile.arguments) {
    context += `\n\nNos arguments clés : ${profile.arguments}`;
  }

  return context;
}

export function generateWritingStyle(config: AgencyConfig): string {
  const { style } = config;
  
  if (!style.writingTone) {
    return 'Adopte un ton professionnel et convaincant.';
  }

  const toneDescriptions: Record<WritingTone, string> = {
    'corporate': 'Adopte un ton corporatif, sérieux et rassurant. Utilise un vocabulaire professionnel et structuré. Inspire confiance et crédibilité.',
    'direct': 'Adopte un ton direct et punchy. Va droit au but. Mets en avant les résultats concrets et les bénéfices mesurables. Sois percutant.',
    'empathetic': 'Adopte un ton empathique et humain. Montre que tu comprends les défis du client. Crée une connexion émotionnelle. Sois accessible et bienveillant.',
    'luxury': 'Adopte un ton raffiné et luxueux. Utilise peu de mots mais choisis-les avec soin. Suggère l\'excellence et l\'exclusivité. Sois élégant et mesuré.',
  };

  let styleText = toneDescriptions[style.writingTone];
  
  if (style.sampleProposal) {
    styleText += '\n\nVoici un exemple de style à imiter :\n' + style.sampleProposal.substring(0, 2000);
  }
  
  if (style.preferredStructure) {
    styleText += '\n\nStructure à suivre : ' + style.preferredStructure;
  }

  return styleText;
}
