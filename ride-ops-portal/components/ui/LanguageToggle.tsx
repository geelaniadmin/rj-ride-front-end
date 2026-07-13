'use client';

import React from 'react';
import { useLanguageStore } from '@/stores/languageStore';
import { t } from '@/lib/translations';
import { Globe } from 'lucide-react';

export function LanguageToggle() {
  const { language, toggleLanguage } = useLanguageStore();

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-sm font-medium text-[#3D434A]"
      title={t('toggleLanguage', language)}
    >
      <Globe className="w-4 h-4" />
      <span>{language.toUpperCase()}</span>
    </button>
  );
}
