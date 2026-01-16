export interface AgencyDNA {
  pitch?: string;
  methodology?: string;
  companyName?: string;
  website?: string;
  extractedContent?: {
    websiteContent?: string;
  };
  [key: string]: unknown;
}

export interface TargetDefinition {
  targetDescription?: string;
  [key: string]: unknown;
}

export interface StrategizeRequest {
  projectId: string;
  force_analyze?: boolean;
}

export interface ResetRequest {
  projectId: string;
}

export interface StrategicPillar {
  name: string;
  description: string;
}

export interface StrategicIdentity {
  verification_citation?: string;
  consciousness_summary?: string[];
  strategic_pillars?: StrategicPillar[];
  unique_value_proposition?: string;
  core_pain_points?: string[];
  symptom_profile?: Record<string, unknown>;
  ideal_prospect_profile?: string;
  exclusion_criteria?: string;
  observable_symptoms?: string[];
  [key: string]: unknown;
}

export interface GeminiGenerationConfig {
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
  stopSequences?: string[];
  responseMimeType?: string;
  [key: string]: unknown;
}
