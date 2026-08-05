'use client';

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useId,
  useState,
} from 'react';
import styles from './guide-code-tabs.module.css';

type GuideCodeLanguage = 'javascript' | 'react';

const STORAGE_KEY = 'eazip-docs-integration';

const GuideCodeTabsContext = createContext<{
  language: GuideCodeLanguage;
  panelId: string;
} | null>(null);

export function GuideCodeTabs({
  children,
  defaultValue = 'javascript',
}: {
  children: ReactNode;
  defaultValue?: GuideCodeLanguage;
}) {
  const [language, setLanguage] = useState<GuideCodeLanguage>(defaultValue);
  const panelId = useId();

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === 'javascript' || stored === 'react') setLanguage(stored);
    } catch {
      // The tabs remain usable when storage is unavailable.
    }
  }, []);

  const selectLanguage = (next: GuideCodeLanguage) => {
    setLanguage(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Persisting the preference is optional.
    }
    window.gtag?.('event', 'guide_code_language_selected', {
      language: next,
      source_page: window.location.pathname,
    });
  };

  return (
    <GuideCodeTabsContext.Provider value={{ language, panelId }}>
      <div className={styles.tabs}>
        <div className={styles.tabList} role="tablist" aria-label="Choose a code example">
          {(['javascript', 'react'] as const).map((value) => (
            <button
              key={value}
              id={`${panelId}-${value}-tab`}
              type="button"
              role="tab"
              aria-selected={language === value}
              aria-controls={`${panelId}-${value}-panel`}
              className={styles.tab}
              data-active={language === value}
              onClick={() => selectLanguage(value)}
            >
              {value === 'javascript' ? 'JavaScript' : 'React'}
            </button>
          ))}
        </div>
        {children}
      </div>
    </GuideCodeTabsContext.Provider>
  );
}

export function GuideCodeTab({
  value,
  children,
}: {
  value: GuideCodeLanguage;
  children: ReactNode;
}) {
  const context = useContext(GuideCodeTabsContext);
  if (!context) throw new Error('GuideCodeTab must be rendered inside GuideCodeTabs');

  return (
    <div
      id={`${context.panelId}-${value}-panel`}
      role="tabpanel"
      aria-labelledby={`${context.panelId}-${value}-tab`}
      hidden={context.language !== value}
      className={styles.panel}
    >
      {children}
    </div>
  );
}
