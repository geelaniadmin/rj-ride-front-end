/**
 * Re-exports the shared language store from @ride/shared.
 * The shared persist key is 'ride-language' so all 3 portals
 * share the same language preference across tabs.
 */
export { useLanguageStore } from '@ride/shared';
export type { Language } from '@ride/shared';
