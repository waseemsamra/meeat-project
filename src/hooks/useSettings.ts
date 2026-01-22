
'use client';

import { useContext } from 'react';
import { SettingsContext } from '@/context/SettingsProvider';

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
