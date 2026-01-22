'use client';

import { useLanguage } from './useLanguage';
import translations from '@/lib/translations.json';
import { LocalizedString } from '@/lib/types';
import { useState, useEffect } from 'react';
import { translateProduct } from '@/ai/flows/translate-product';

type Translations = typeof translations;
type LanguageCode = keyof Translations;
type TranslationKey = keyof Translations['en'];

export const useTranslation = () => {
  const { language } = useLanguage();
  const langCode = (language?.code?.toLowerCase() as LanguageCode) || 'en';

  const t = (keyOrObject: TranslationKey | LocalizedString | string | null | undefined): string => {
    if (!keyOrObject) {
      return '';
    }

    // If it's a LocalizedString object
    if (typeof keyOrObject === 'object' && ('en' in keyOrObject || langCode in keyOrObject)) {
        const localized = keyOrObject as LocalizedString;
        return localized[langCode] || localized.en || '';
    }
    
    // If it's a simple string key for the JSON file
    if (typeof keyOrObject === 'string' && keyOrObject in translations.en) {
      const key = keyOrObject as TranslationKey;
      if (translations[langCode] && key in translations[langCode]) {
        return translations[langCode][key];
      }
      return translations.en[key] || key;
    }
    
    // If it's a dynamic string that can't be found, return it as is.
    if (typeof keyOrObject === 'string') {
        return keyOrObject;
    }


    return '';
  };

  return { t, lang: langCode };
};
