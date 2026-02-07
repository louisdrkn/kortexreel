// Types for the Radar V2 module

export interface GoogleMapsData {
  placeId: string;
  url: string;
  rating: number;
  userRatingsTotal: number;
  formattedAddress: string;
}

export interface Company {
  id: string;
  name: string;
  website?: string;
  domain?: string;
  logoUrl?: string;
  industry?: string;
  headcount?: string;
  location?: string;
  score?: number;
  status: "hot" | "warm" | "cold" | "detected";
  signals?: string[];
  tags?: string[];
  googleMaps?: GoogleMapsData;
  // Deep analysis fields
  descriptionLong?: string;
  painPoints?: string[];
  buyingSignals?: string[];
  strategicAnalysis?: string;
  customHook?: string;
  matchExplanation?: string;
  analysisStatus?:
    | "pending"
    | "analyzing"
    | "completed"
    | "failed"
    | "archived"
    | "excluded"
    | "validated"
    | "buffer"
    | "deduced"
    | "enriched"
    | "discovered";
  analyzedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  // PRECISION ENGINE V3: Dual Contact Structure
  decisionMaker?: DecisionMaker; // 👑 Contact Principal
  alternativeContact?: DecisionMaker; // 🛡️ Alternative Suggérée
  targetingAnalysis?: TargetingAnalysis; // Analyse de ciblage
  // ZERO-DÉCHET: Match Origin badges
  validatedByCible?: boolean;
  validatedByCerveau?: boolean;
  matchReason?: string;
  strategicCategory?: "PERFECT_MATCH" | "OPPORTUNITY" | "OUT_OF_SCOPE";
}

export interface DecisionMaker {
  firstName?: string;
  lastName?: string;
  fullName: string;
  email?: string;
  linkedinUrl?: string;
  jobTitle: string;
  photoUrl?: string;
  confidenceScore?: number;
  // PRECISION ENGINE V3 fields
  matchScore?: number;
  matchReason?: string;
  whyThisRole?: string; // Tooltip explicatif stratégique
  scoreBreakdown?: {
    titleMatch: number;
    tenureBonus: number;
    activityBonus: number;
    total: number;
  };
}

// PRECISION ENGINE: Targeting Analysis
export interface TargetingAnalysis {
  productSold: string;
  targetDepartment: string;
  primaryJobTitle: string;
  primaryReason: string;
  alternativeJobTitle: string;
  alternativeReason: string;
  companySizeEstimate: string;
  confidenceLevel: number;
}

export interface SniperSearchPhases {
  phase1: { status: string; titles: string[] };
  phase2: {
    status: string;
    candidatesFound: number;
    candidatesRejected: number;
  };
  phase3: { status: string; scoredCandidates: number };
}

export interface DecisionMakerAlternative {
  fullName: string;
  jobTitle: string;
  linkedinUrl?: string;
}

export interface RadarState {
  companies: Company[];
  selectedCompany: Company | null;
  isSheetOpen: boolean;
  isScanning: boolean;
  scanProgress: number;
  scanStep:
    | "idle"
    | "analyzing"
    | "searching"
    | "validating"
    | "enriching"
    | "complete"
    | "error";
  error: string | null;
}

export interface AnalysisResult {
  descriptionLong: string;
  painPoints: string[];
  buyingSignals: string[];
  strategicAnalysis: string;
  customHook: string;
  matchScore: number;
  matchExplanation: string;
  logoUrl?: string;
}

export interface FindDecisionMakerResult {
  success: boolean;
  // PRECISION ENGINE V3: Dual Contact Structure
  primaryContact?: DecisionMaker; // 👑 Contact Principal (Le Décideur)
  alternativeContact?: DecisionMaker; // 🛡️ Alternative Suggérée (Le Relais)
  targetingAnalysis?: TargetingAnalysis;
  // Legacy compatibility
  decisionMaker?: DecisionMaker;
  alternatives?: DecisionMakerAlternative[];
  error?: string;
  // Search metadata
  targetJobTitles?: string[];
  searchPhases?: SniperSearchPhases;
  searchDetails?: {
    companySearched: string;
    companyCleaned: string;
    domainUsed: string;
    keywordsUsed: string[];
    contactsFound: number;
  };
}
