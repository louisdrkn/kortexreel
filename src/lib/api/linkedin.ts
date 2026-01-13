import { supabase } from '@/integrations/supabase/client';

type LinkedInResponse<T = any> = {
  success: boolean;
  error?: string;
  data?: T;
};

export interface LinkedInSearchParams {
  keywords?: string;
  geo?: string;
  industry?: string;
  companySize?: string;
  seniority?: string;
  title?: string;
  limit?: number;
}

export interface LinkedInPerson {
  id: string;
  name: string;
  industry: string;
  headcount: string;
  website: string;
  location: string;
  signals: string[];
  score: number;
  status: 'new' | 'contacted' | 'qualified' | 'meeting_set';
  contact: {
    name: string;
    title: string;
    linkedinUrl: string;
    photoUrl?: string;
  };
}

export const linkedinApi = {
  // Search for people on LinkedIn
  async searchPeople(params: LinkedInSearchParams): Promise<LinkedInResponse<LinkedInPerson[]>> {
    const { data, error } = await supabase.functions.invoke('linkedin-search', {
      body: params,
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return data;
  },

  // Get company details
  async getCompany(companyUrl?: string, companyName?: string): Promise<LinkedInResponse> {
    const { data, error } = await supabase.functions.invoke('linkedin-company', {
      body: { companyUrl, companyName },
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return data;
  },

  // Get person profile
  async getProfile(profileUrl?: string, username?: string): Promise<LinkedInResponse> {
    const { data, error } = await supabase.functions.invoke('linkedin-profile', {
      body: { profileUrl, username },
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return data;
  },
};
