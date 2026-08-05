'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export type HomepageIntegration = 'react' | 'core';

type IntegrationPreference = {
  integration: HomepageIntegration;
  setIntegration: (integration: HomepageIntegration) => void;
};

const IntegrationPreferenceContext = createContext<IntegrationPreference | null>(null);

export function IntegrationPreferenceProvider({ children }: { children: ReactNode }) {
  const [integration, setIntegration] = useState<HomepageIntegration>('react');
  const value = useMemo(() => ({ integration, setIntegration }), [integration]);

  return (
    <IntegrationPreferenceContext.Provider value={value}>
      {children}
    </IntegrationPreferenceContext.Provider>
  );
}

export function useIntegrationPreference(): IntegrationPreference {
  const value = useContext(IntegrationPreferenceContext);
  if (!value) throw new Error('useIntegrationPreference must be used inside IntegrationPreferenceProvider');
  return value;
}
