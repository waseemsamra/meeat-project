
'use client';

import React, { createContext, useState, useMemo, useEffect } from 'react';
import type { Language } from '@/lib/types';
import { useCollection, useFirestore } from '@/firebase';
import { collection } from 'firebase/firestore';

type LanguageDirection = 'ltr' | 'rtl';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  currency: string;
  setCurrency: (currency: string) => void;
  languageDirection: LanguageDirection;
}

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const defaultLanguage: Language = {
  id: 'en',
  name: 'English',
  code: 'EN',
};

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const firestore = useFirestore();
  const { data: languages } = useCollection<Language>(useMemo(() => firestore ? collection(firestore, 'languages') : null, [firestore]));

  const [language, setLanguage] = useState<Language>(defaultLanguage);
  const [currency, setCurrency] = useState('AED');
  const [languageDirection, setLanguageDirection] = useState<LanguageDirection>('ltr');

  useEffect(() => {
    // Add any right-to-left language names (lowercase) to this array.
    const rtlLanguages = ['arabic', 'urdu'];
    setLanguageDirection(rtlLanguages.includes(language.name.toLowerCase()) ? 'rtl' : 'ltr');
  }, [language]);

  const value = {
    language,
    setLanguage,
    currency,
    setCurrency,
    languageDirection,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};
