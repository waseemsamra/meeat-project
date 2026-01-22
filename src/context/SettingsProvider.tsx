
'use client';

import React, { createContext, useMemo } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import type { Currency } from '@/lib/types';
import { collection, query, where } from 'firebase/firestore';

interface SettingsContextType {
  defaultCurrency: Currency | null;
  isLoading: boolean;
}

export const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const firestore = useFirestore();

  const currenciesQuery = useMemo(() => 
    firestore 
      ? query(collection(firestore, 'currencies'), where('isDefault', '==', true)) 
      : null,
    [firestore]
  );

  const { data: currencies, isLoading } = useCollection<Currency>(currenciesQuery);

  const defaultCurrency = useMemo(() => {
    return currencies && currencies.length > 0 ? currencies[0] : null;
  }, [currencies]);

  const value = {
    defaultCurrency,
    isLoading
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};
