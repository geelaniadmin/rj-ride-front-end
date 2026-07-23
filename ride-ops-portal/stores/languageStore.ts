/**
 * Re-exports the shared language store from lib/shared.
 * The shared persist key is 'ride-language' so all 3 portals
 * share the same language preference across tabs.
 */
export { useLanguageStore } from '@/lib/shared';
export type { Language } from '@/lib/shared';
