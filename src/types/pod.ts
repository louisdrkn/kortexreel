// POD Types - Complete Sales Intelligence Platform

export type HeadcountRange =
  | "1-10"
  | "11-50"
  | "51-200"
  | "201-500"
  | "501-1000"
  | "1000+";
export type Industry =
  | "technology"
  | "marketing"
  | "consulting"
  | "finance"
  | "healthcare"
  | "retail"
  | "manufacturing"
  | "media"
  | "education"
  | "other";
export type SeniorityLevel =
  | "cxo"
  | "vp"
  | "director"
  | "manager"
  | "individual";
export type FunctionType =
  | "marketing"
  | "sales"
  | "hr"
  | "it"
  | "finance"
  | "operations"
  | "product"
  | "engineering";
export type WeakSignal =
  | "hiring_sales"
  | "hiring_marketing"
  | "funding"
  | "new_exec"
  | "expansion"
  | "product_launch"
  | "acquisition";

export const HEADCOUNT_RANGES: { value: HeadcountRange; label: string }[] = [
  { value: "1-10", label: "1-10" },
  { value: "11-50", label: "11-50" },
  { value: "51-200", label: "51-200" },
  { value: "201-500", label: "201-500" },
  { value: "501-1000", label: "501-1000" },
  { value: "1000+", label: "1000+" },
];

export const INDUSTRIES: { value: Industry; label: string }[] = [
  { value: "technology", label: "Technologie" },
  { value: "marketing", label: "Marketing & Communication" },
  { value: "consulting", label: "Conseil" },
  { value: "finance", label: "Finance & Assurance" },
  { value: "healthcare", label: "Santé" },
  { value: "retail", label: "Retail & E-commerce" },
  { value: "manufacturing", label: "Industrie" },
  { value: "media", label: "Média & Entertainment" },
  { value: "education", label: "Éducation" },
  { value: "other", label: "Autre" },
];

export const SENIORITY_LEVELS: { value: SeniorityLevel; label: string }[] = [
  { value: "cxo", label: "C-Level (CEO, CMO, CTO...)" },
  { value: "vp", label: "VP / Vice President" },
  { value: "director", label: "Director" },
  { value: "manager", label: "Manager" },
  { value: "individual", label: "Contributeur individuel" },
];

export const FUNCTIONS: { value: FunctionType; label: string }[] = [
  { value: "marketing", label: "Marketing" },
  { value: "sales", label: "Sales / Commercial" },
  { value: "hr", label: "RH / Recrutement" },
  { value: "it", label: "IT / DSI" },
  { value: "finance", label: "Finance / DAF" },
  { value: "operations", label: "Operations" },
  { value: "product", label: "Product" },
  { value: "engineering", label: "Engineering" },
];

export const WEAK_SIGNALS: {
  value: WeakSignal;
  label: string;
  description: string;
}[] = [
  {
    value: "hiring_sales",
    label: "Recrutement Commercial",
    description: "L'entreprise recrute des commerciaux",
  },
  {
    value: "hiring_marketing",
    label: "Recrutement Marketing",
    description: "L'entreprise recrute en marketing",
  },
  {
    value: "funding",
    label: "Levée de fonds",
    description: "Levée récente ou annoncée",
  },
  {
    value: "new_exec",
    label: "Nouveau Dirigeant",
    description: "Nomination récente à un poste clé",
  },
  {
    value: "expansion",
    label: "Expansion",
    description: "Ouverture de nouveaux marchés/bureaux",
  },
  {
    value: "product_launch",
    label: "Lancement Produit",
    description: "Nouveau produit ou service lancé",
  },
  {
    value: "acquisition",
    label: "Acquisition",
    description: "A acquis ou fusionné avec une autre entreprise",
  },
];

export interface PastClient {
  id: string;
  name: string;
  description?: string;
}

export interface AgencyDNA {
  websiteUrl?: string;
  pitch?: string;
  methodology?: string;
  trackRecord?: {
    pastClients?: PastClient[];
    dreamClients?: string[];
  };
  extractedContent?: {
    websiteContent?: string;
    branding?: any;
    documents?: { name: string; content: string }[];
  };
}

export interface TargetCriteria {
  headcount: HeadcountRange[];
  industries: Industry[];
  geography: string[];
  seniority: SeniorityLevel[];
  functions: FunctionType[];
  weakSignals: WeakSignal[];
  customSignals?: string[];
  painPoints?: string[];
  techRequirements?: string[];
}

export interface TargetAccount {
  id: string;
  name: string;
  industry: string;
  headcount: string;
  website?: string;
  signals: string[];
  score: number;
  status: "hot" | "warm" | "cold";
}

export interface Contact {
  id: string;
  name: string;
  title: string;
  email?: string;
  linkedinUrl?: string;
  status: "identified" | "contacted" | "responded" | "meeting_scheduled";
}

export interface OutreachSequence {
  id: string;
  accountId: string;
  messages: {
    type: string;
    subject?: string;
    body: string;
    icebreaker: string;
  }[];
  createdAt: string;
  status: "draft" | "active" | "completed";
}

export interface MeetingCapture {
  id: string;
  accountId: string;
  date: string;
  attendees: string[];
  notes: string;
  confirmedNeeds: string[];
  objections: string[];
  nextSteps: string;
  outcome: "qualified" | "follow_up" | "not_interested" | "wrong_timing";
  budget?: string;
  timeline?: string;
}
