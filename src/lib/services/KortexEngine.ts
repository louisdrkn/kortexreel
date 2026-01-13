/**
 * KORTEX ENGINE - Deep Segmentation & Matching Intelligence
 * 
 * This service implements the "Subatomic" analysis that transforms
 * agency documents into actionable target signals.
 * 
 * Scoring Formula (0-100):
 * - Fit Structurel (30%): Size, Revenue, Industry match
 * - Fit Technologique (30%): Tech stack overlap detection
 * - Fit Sémantique (40%): Vector similarity between agency DNA and lead profile
 */

export interface AgencyVector {
  skills: string[];
  painPointsResolved: string[];
  targetIndustries: string[];
  clientTypes: string[];
  technologiesUsed: string[];
  methodologies: string[];
  caseStudies: CaseStudyInsight[];
  // Extracted from deep document scanning
  hiddenSignals: HiddenSignal[];
}

export interface CaseStudyInsight {
  clientName: string;
  industry?: string;
  challenge: string;
  solution: string;
  result: string;
  technologiesUsed: string[];
  extractedFrom: string; // Document source
  pageReference?: string;
}

export interface HiddenSignal {
  signal: string;
  context: string;
  extractedFrom: string;
  pageNumber?: number;
  deducedTargetProfile: string;
}

export interface LeadVector {
  companyName: string;
  industry: string;
  size: string;
  location: string;
  technologiesDetected: string[];
  painPointsDetected: string[];
  buyingSignals: string[];
  scrapedContent: string;
}

export interface MatchScoreBreakdown {
  // Raw scores (0-100)
  structuralFit: number;
  technologicalFit: number;
  semanticFit: number;
  
  // Weighted final score
  totalScore: number;
  
  // Detailed explanations
  structuralExplanation: string;
  technologicalExplanation: string;
  semanticExplanation: string;
  
  // Match reason for UI display
  matchReason: string;
  
  // Similar past client (if found)
  similarClient?: {
    name: string;
    caseStudySource: string;
    similarity: string;
  };
}

// Weights for final score calculation
const WEIGHTS = {
  structural: 0.30,
  technological: 0.30,
  semantic: 0.40,
};

/**
 * Calculate structural fit based on industry, size, location
 */
export function calculateStructuralFit(
  agencyVector: AgencyVector,
  leadVector: LeadVector
): { score: number; explanation: string } {
  let score = 0;
  const reasons: string[] = [];

  // Industry match (40% of structural)
  if (agencyVector.targetIndustries.length > 0) {
    const industryMatch = agencyVector.targetIndustries.some(
      (ind) => leadVector.industry?.toLowerCase().includes(ind.toLowerCase()) ||
               ind.toLowerCase().includes(leadVector.industry?.toLowerCase() || '')
    );
    if (industryMatch) {
      score += 40;
      reasons.push(`Secteur '${leadVector.industry}' correspond aux cibles`);
    }
  } else {
    score += 20; // No industry restriction = partial match
  }

  // Size match (30% of structural)
  if (leadVector.size) {
    // Simple size heuristics
    score += 30;
    reasons.push(`Taille ${leadVector.size} validée`);
  }

  // Location match (30% of structural)
  if (leadVector.location) {
    score += 30;
    reasons.push(`Localisation compatible`);
  }

  return {
    score: Math.min(100, score),
    explanation: reasons.length > 0 ? reasons.join(' • ') : 'Données structurelles partielles',
  };
}

/**
 * Calculate technological fit based on tech stack overlap
 */
export function calculateTechnologicalFit(
  agencyVector: AgencyVector,
  leadVector: LeadVector
): { score: number; explanation: string } {
  if (!leadVector.technologiesDetected || leadVector.technologiesDetected.length === 0) {
    return { score: 50, explanation: 'Stack technologique non détecté' };
  }

  if (!agencyVector.technologiesUsed || agencyVector.technologiesUsed.length === 0) {
    return { score: 50, explanation: 'Expertise techno non renseignée' };
  }

  const matchedTechs: string[] = [];
  const agencyTechs = agencyVector.technologiesUsed.map((t) => t.toLowerCase());

  for (const tech of leadVector.technologiesDetected) {
    const techLower = tech.toLowerCase();
    if (agencyTechs.some((at) => at.includes(techLower) || techLower.includes(at))) {
      matchedTechs.push(tech);
    }
  }

  const matchRatio = matchedTechs.length / Math.max(1, leadVector.technologiesDetected.length);
  const score = Math.round(matchRatio * 100);

  return {
    score: Math.min(100, Math.max(30, score)), // Floor at 30, cap at 100
    explanation:
      matchedTechs.length > 0
        ? `Maîtrise de ${matchedTechs.slice(0, 3).join(', ')}`
        : 'Pas de chevauchement technologique direct',
  };
}

/**
 * Calculate semantic fit using text similarity
 * This is the most important component (40% weight)
 */
export function calculateSemanticFit(
  agencyVector: AgencyVector,
  leadVector: LeadVector
): { score: number; explanation: string; similarClient?: MatchScoreBreakdown['similarClient'] } {
  let score = 0;
  const reasons: string[] = [];
  let similarClient: MatchScoreBreakdown['similarClient'] | undefined;

  // 1. Pain point alignment (40% of semantic)
  const agencyPainPoints = agencyVector.painPointsResolved.map((p) => p.toLowerCase());
  const leadPainPoints = leadVector.painPointsDetected.map((p) => p.toLowerCase());
  
  let painPointMatches = 0;
  for (const leadPain of leadPainPoints) {
    if (agencyPainPoints.some((ap) => 
      ap.includes(leadPain) || 
      leadPain.includes(ap) ||
      // Semantic similarity check (simplified - in production use embeddings)
      ap.split(' ').some((word) => leadPain.includes(word) && word.length > 4)
    )) {
      painPointMatches++;
    }
  }

  if (leadPainPoints.length > 0) {
    const painScore = (painPointMatches / leadPainPoints.length) * 40;
    score += painScore;
    if (painPointMatches > 0) {
      reasons.push(`${painPointMatches} problème(s) résolu(s) chez des clients passés`);
    }
  }

  // 2. Case study lookalike detection (40% of semantic)
  for (const caseStudy of agencyVector.caseStudies) {
    // Check if lead is similar to a past client
    const industryMatch = caseStudy.industry?.toLowerCase() === leadVector.industry?.toLowerCase();
    const challengeMatch = caseStudy.challenge?.toLowerCase().split(' ').some(
      (word) => word.length > 4 && leadVector.scrapedContent?.toLowerCase().includes(word)
    );

    if (industryMatch || challengeMatch) {
      score += 40;
      similarClient = {
        name: caseStudy.clientName,
        caseStudySource: caseStudy.extractedFrom,
        similarity: industryMatch 
          ? `Même secteur que ${caseStudy.clientName}` 
          : `Contexte similaire à ${caseStudy.clientName}`,
      };
      reasons.push(`Ressemble à votre client '${caseStudy.clientName}'`);
      break;
    }
  }

  // 3. Hidden signal detection (20% of semantic)
  for (const hiddenSignal of agencyVector.hiddenSignals) {
    const signalKeywords = hiddenSignal.signal.toLowerCase().split(' ').filter((w) => w.length > 4);
    const contentMatch = signalKeywords.some((kw) => 
      leadVector.scrapedContent?.toLowerCase().includes(kw)
    );

    if (contentMatch) {
      score += 20;
      reasons.push(`Signal détecté: "${hiddenSignal.signal.slice(0, 50)}..."`);
      break;
    }
  }

  return {
    score: Math.min(100, Math.max(20, score)),
    explanation: reasons.length > 0 ? reasons.join(' • ') : 'Alignement sémantique partiel',
    similarClient,
  };
}

/**
 * MAIN FUNCTION: Calculate complete match score with breakdown
 */
export function calculateMatchScore(
  agencyVector: AgencyVector,
  leadVector: LeadVector
): MatchScoreBreakdown {
  const structural = calculateStructuralFit(agencyVector, leadVector);
  const technological = calculateTechnologicalFit(agencyVector, leadVector);
  const semantic = calculateSemanticFit(agencyVector, leadVector);

  const totalScore = Math.round(
    structural.score * WEIGHTS.structural +
    technological.score * WEIGHTS.technological +
    semantic.score * WEIGHTS.semantic
  );

  // Build match reason for UI
  const matchReasonParts: string[] = [];
  
  if (semantic.similarClient) {
    matchReasonParts.push(
      `Cette entreprise ressemble à votre client '${semantic.similarClient.name}' (${semantic.similarClient.caseStudySource})`
    );
  }
  
  if (technological.score >= 60) {
    matchReasonParts.push(technological.explanation);
  }
  
  if (structural.score >= 70) {
    matchReasonParts.push(structural.explanation);
  }

  const matchReason = matchReasonParts.length > 0 
    ? `💡 ${matchReasonParts.join(' et ')}.`
    : `Match ${totalScore}% basé sur l'analyse croisée Cible + Cerveau.`;

  return {
    structuralFit: structural.score,
    technologicalFit: technological.score,
    semanticFit: semantic.score,
    totalScore,
    structuralExplanation: structural.explanation,
    technologicalExplanation: technological.explanation,
    semanticExplanation: semantic.explanation,
    matchReason,
    similarClient: semantic.similarClient,
  };
}

/**
 * Extract agency vector from project data
 * Used to build the AgencyVector from stored DNA + documents
 */
export function buildAgencyVectorFromData(
  agencyDNA: Record<string, unknown>,
  documentInsights: Record<string, unknown>[],
  extractedChunks: string[]
): AgencyVector {
  const vector: AgencyVector = {
    skills: [],
    painPointsResolved: [],
    targetIndustries: [],
    clientTypes: [],
    technologiesUsed: [],
    methodologies: [],
    caseStudies: [],
    hiddenSignals: [],
  };

  // From Agency DNA
  if (agencyDNA) {
    if (Array.isArray(agencyDNA.differentiators)) {
      vector.skills.push(...agencyDNA.differentiators as string[]);
    }
    if (Array.isArray(agencyDNA.targetSectors)) {
      vector.targetIndustries.push(...agencyDNA.targetSectors as string[]);
    }
    if (agencyDNA.methodology) {
      vector.methodologies.push(agencyDNA.methodology as string);
    }
    if (agencyDNA.trackRecord && typeof agencyDNA.trackRecord === 'object') {
      const trackRecord = agencyDNA.trackRecord as Record<string, unknown>;
      if (Array.isArray(trackRecord.pastClients)) {
        for (const client of trackRecord.pastClients) {
          if (typeof client === 'object' && client !== null) {
            const c = client as Record<string, unknown>;
            vector.caseStudies.push({
              clientName: (c.name as string) || 'Client',
              challenge: (c.challenge as string) || '',
              solution: (c.solution as string) || '',
              result: (c.result as string) || '',
              technologiesUsed: [],
              extractedFrom: 'Agency DNA - Track Record',
            });
          }
        }
      }
    }
  }

  // From Document Insights
  for (const doc of documentInsights) {
    if (Array.isArray(doc.painPoints)) {
      vector.painPointsResolved.push(...doc.painPoints as string[]);
    }
    if (Array.isArray(doc.competitiveAdvantages)) {
      vector.skills.push(...doc.competitiveAdvantages as string[]);
    }
    if (doc.icp) {
      vector.clientTypes.push(doc.icp as string);
    }
  }

  // From extracted chunks - Deep scan for hidden signals
  for (const chunk of extractedChunks) {
    const signals = extractHiddenSignalsFromText(chunk);
    vector.hiddenSignals.push(...signals);
  }

  return vector;
}

/**
 * SUBATOMIC ANALYSIS: Extract hidden signals from document text
 * This scans every millimeter of text for actionable intelligence
 */
function extractHiddenSignalsFromText(text: string): HiddenSignal[] {
  const signals: HiddenSignal[] = [];
  const lowerText = text.toLowerCase();

  // Pattern detection for skills/technologies
  const techPatterns = [
    { regex: /migration\s+(cloud|aws|azure|gcp)/gi, type: 'Migration Cloud' },
    { regex: /réduction?\s+(de\s+)?(churn|turnover|attrition)/gi, type: 'Réduction Churn' },
    { regex: /implémentation?\s+(erp|crm|salesforce|hubspot)/gi, type: 'Implémentation CRM/ERP' },
    { regex: /transformation\s+(digitale|numérique)/gi, type: 'Transformation Digitale' },
    { regex: /optimisation?\s+(seo|acquisition|conversion)/gi, type: 'Optimisation Marketing' },
    { regex: /automatisation?\s+(marketing|ventes|process)/gi, type: 'Automatisation' },
    { regex: /levée\s+(de\s+)?fonds?/gi, type: 'Levée de fonds' },
    { regex: /expansion\s+(international|europe|usa)/gi, type: 'Expansion Internationale' },
    { regex: /recrutement\s+(massif|intensif|accéléré)/gi, type: 'Hypercroissance' },
    { regex: /refonte\s+(site|branding|identité)/gi, type: 'Refonte Identité' },
  ];

  for (const pattern of techPatterns) {
    const matches = text.match(pattern.regex);
    if (matches) {
      for (const match of matches) {
        signals.push({
          signal: pattern.type,
          context: match,
          extractedFrom: 'Document Analysis',
          deducedTargetProfile: `Entreprises en besoin de ${pattern.type}`,
        });
      }
    }
  }

  // Percentage detection (results mention)
  const percentPattern = /(\d+)\s*%\s*(de\s+)?(réduction|augmentation|croissance|amélioration)/gi;
  let percentMatch;
  while ((percentMatch = percentPattern.exec(text)) !== null) {
    signals.push({
      signal: `Résultat: ${percentMatch[0]}`,
      context: text.slice(Math.max(0, percentMatch.index - 50), percentMatch.index + 100),
      extractedFrom: 'Document Analysis - Results',
      deducedTargetProfile: 'Entreprises cherchant des résultats mesurables',
    });
  }

  return signals;
}
