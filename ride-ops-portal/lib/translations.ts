/**
 * Ops-portal-specific translations (extending shared translations from @ride/shared).
 * Re-exports the shared `t()` helper so existing ops components continue to work.
 */
export { t } from '@ride/shared';

/**
 * Ops-portal-specific translation keys that aren't in the shared dictionary.
 * These are merged with shared translations at the component level.
 */
export const opsTranslations = {
  en: {
    defaultURL: 'Default URL',
    naMock: 'N/A (Mock)',
  },
  ja: {
    defaultURL: 'デフォルトURL',
    naMock: 'N/A（モック）',
  },
};

/**
 * Ops-portal-specific helper for keys not in shared translations.
 */
export function opsT(key: keyof typeof opsTranslations.en, language: 'en' | 'ja'): string {
  return opsTranslations[language][key] || opsTranslations.en[key] || key;
}
