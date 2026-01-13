import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AgencyConfig, Proposal, generateAgencyContext, generateWritingStyle } from '@/types/agency';

interface AgencyContextType {
  config: AgencyConfig;
  setConfig: (config: AgencyConfig) => void;
  updateConfig: (partial: Partial<AgencyConfig>) => void;
  proposals: Proposal[];
  addProposal: (proposal: Proposal) => void;
  updateProposal: (id: string, updates: Partial<Proposal>) => void;
  isConfigured: boolean;
  getGeneratedContext: () => string;
  getGeneratedStyle: () => string;
}

const defaultConfig: AgencyConfig = {
  profile: {
    name: '',
    businessType: null,
    businessSize: null,
    customBusinessDescription: '',
    methodology: '',
    tone: '',
    arguments: '',
  },
  services: [],
  style: {
    pricingTier: null,
    basePrice: 8000,
    writingTone: null,
    selectedServices: [],
    customServices: [],
    sampleProposal: '',
    preferredStructure: '',
  },
};

const AgencyContext = createContext<AgencyContextType | undefined>(undefined);

export function AgencyProvider({ children }: { children: ReactNode }) {
  const [config, setConfigState] = useState<AgencyConfig>(() => {
    const saved = localStorage.getItem('propale-config');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Migration: merge with defaultConfig to handle new fields
      return {
        ...defaultConfig,
        ...parsed,
        profile: { ...defaultConfig.profile, ...parsed.profile },
        style: { ...defaultConfig.style, ...parsed.style },
      };
    }
    return defaultConfig;
  });

  const [proposals, setProposals] = useState<Proposal[]>(() => {
    const saved = localStorage.getItem('propale-proposals');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('propale-config', JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    localStorage.setItem('propale-proposals', JSON.stringify(proposals));
  }, [proposals]);

  const setConfig = (newConfig: AgencyConfig) => {
    setConfigState(newConfig);
  };

  const updateConfig = (partial: Partial<AgencyConfig>) => {
    setConfigState(prev => ({
      ...prev,
      ...partial,
      profile: partial.profile ? { ...prev.profile, ...partial.profile } : prev.profile,
      style: partial.style ? { ...prev.style, ...partial.style } : prev.style,
    }));
  };

  const addProposal = (proposal: Proposal) => {
    setProposals(prev => [proposal, ...prev]);
  };

  const updateProposal = (id: string, updates: Partial<Proposal>) => {
    setProposals(prev =>
      prev.map(p => (p.id === id ? { ...p, ...updates } : p))
    );
  };

  // Auto-generate context text from visual config
  const getGeneratedContext = () => generateAgencyContext(config);
  const getGeneratedStyle = () => generateWritingStyle(config);

  // Configuration is complete when key visual options are selected
  const isConfigured = Boolean(
    config.profile.name &&
    config.profile.businessType &&
    config.profile.businessSize &&
    config.style.pricingTier &&
    config.style.writingTone &&
    config.style.selectedServices.length > 0
  );

  return (
    <AgencyContext.Provider
      value={{
        config,
        setConfig,
        updateConfig,
        proposals,
        addProposal,
        updateProposal,
        isConfigured,
        getGeneratedContext,
        getGeneratedStyle,
      }}
    >
      {children}
    </AgencyContext.Provider>
  );
}

export function useAgency() {
  const context = useContext(AgencyContext);
  if (context === undefined) {
    throw new Error('useAgency must be used within an AgencyProvider');
  }
  return context;
}
