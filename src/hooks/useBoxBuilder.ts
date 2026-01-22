
"use client";

import { useContext } from 'react';
import { BoxBuilderContext } from '@/context/BoxBuilderProvider';

export const useBoxBuilder = () => {
  const context = useContext(BoxBuilderContext);
  if (context === undefined) {
    throw new Error('useBoxBuilder must be used within a BoxBuilderProvider');
  }
  
  return context;
};
