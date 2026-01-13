import { supabase } from '@/integrations/supabase/client';

export interface DecisionMaker {
  first_name: string;
  last_name: string;
  full_name: string;
  email?: string;
  linkedin_url?: string;
  job_title: string;
  company_name: string;
  confidence_score: number;
}

export interface DecisionMakerAlternative {
  full_name: string;
  job_title: string;
  linkedin_url?: string;
}

export interface FindDecisionMakerResult {
  success: boolean;
  decision_maker?: DecisionMaker;
  alternatives?: DecisionMakerAlternative[];
  error?: string;
  search_details?: {
    company_searched: string;
    keywords_used: string[];
    contacts_found: number;
  };
}

export interface FindDecisionMakerParams {
  company_name?: string;
  domain?: string;
  siren?: string;
  job_title_keywords: string[];
  magileads_api_key?: string;
}

/**
 * Find the best decision maker for a company based on job title keywords
 * Uses Magileads API if configured, falls back to OSINT search via Firecrawl
 */
export async function findDecisionMaker(params: FindDecisionMakerParams): Promise<FindDecisionMakerResult> {
  const { data, error } = await supabase.functions.invoke('find-decision-maker', {
    body: params,
  });

  if (error) {
    console.error('Error calling find-decision-maker:', error);
    return {
      success: false,
      error: error.message || 'Failed to find decision maker',
    };
  }

  return data as FindDecisionMakerResult;
}

/**
 * Get recommended job title keywords based on target role
 */
export function getJobTitleKeywords(targetRole: string): string[] {
  const roleKeywordsMap: Record<string, string[]> = {
    // HR / People
    'drh': ['DRH', 'Directeur RH', 'Directeur Ressources Humaines', 'Head of HR', 'Head of People', 'CHRO', 'VP HR'],
    'rh': ['DRH', 'Responsable RH', 'HR Manager', 'Head of HR'],
    'recrutement': ['Responsable Recrutement', 'Talent Acquisition', 'Head of Recruitment'],
    
    // Marketing / Growth
    'marketing': ['CMO', 'Directeur Marketing', 'Head of Marketing', 'VP Marketing', 'Marketing Director'],
    'digital': ['Directeur Digital', 'CDO', 'Head of Digital', 'Digital Director'],
    'growth': ['Head of Growth', 'Growth Manager', 'CMO'],
    
    // Sales / Commercial
    'commercial': ['Directeur Commercial', 'Head of Sales', 'VP Sales', 'Sales Director', 'CRO'],
    'sales': ['Head of Sales', 'Sales Director', 'VP Sales', 'CRO'],
    
    // Tech / IT
    'tech': ['CTO', 'Directeur Technique', 'VP Engineering', 'Head of Engineering'],
    'it': ['DSI', 'Directeur IT', 'CIO', 'Head of IT'],
    'produit': ['CPO', 'Head of Product', 'VP Product', 'Product Director'],
    
    // Finance
    'finance': ['CFO', 'Directeur Financier', 'Finance Director', 'VP Finance'],
    'daf': ['DAF', 'Directeur Administratif et Financier', 'CFO'],
    
    // Operations
    'operations': ['COO', 'Directeur des Opérations', 'Head of Operations', 'VP Operations'],
    
    // General / CEO
    'ceo': ['CEO', 'PDG', 'Président', 'Directeur Général', 'Founder', 'Co-founder'],
    'direction': ['CEO', 'PDG', 'Directeur Général', 'Gérant', 'Founder'],
    'founder': ['Founder', 'Co-founder', 'Fondateur', 'CEO', 'PDG'],
    
    // Default fallback
    'default': ['CEO', 'PDG', 'Directeur', 'Head of', 'VP', 'Founder'],
  };

  const normalizedRole = targetRole.toLowerCase().trim();
  
  // Check for exact match
  if (roleKeywordsMap[normalizedRole]) {
    return roleKeywordsMap[normalizedRole];
  }
  
  // Check for partial matches
  for (const [key, keywords] of Object.entries(roleKeywordsMap)) {
    if (normalizedRole.includes(key) || key.includes(normalizedRole)) {
      return keywords;
    }
  }
  
  // Return default keywords if no match
  return roleKeywordsMap['default'];
}

/**
 * Validate if a LinkedIn URL is properly formatted
 */
export function isValidLinkedInUrl(url: string): boolean {
  if (!url) return false;
  const linkedInPattern = /^https?:\/\/(www\.)?(linkedin\.com\/(in|sales\/people)\/[\w-]+)/i;
  return linkedInPattern.test(url);
}

/**
 * Convert standard LinkedIn URL to Sales Navigator URL
 */
export function toSalesNavUrl(linkedinUrl: string): string {
  if (!linkedinUrl) return '';
  
  // Already a Sales Nav URL
  if (linkedinUrl.includes('/sales/')) {
    return linkedinUrl;
  }
  
  // Extract username from standard LinkedIn URL
  const match = linkedinUrl.match(/linkedin\.com\/in\/([\w-]+)/i);
  if (match && match[1]) {
    return `https://www.linkedin.com/sales/people/${match[1]}`;
  }
  
  return linkedinUrl;
}
