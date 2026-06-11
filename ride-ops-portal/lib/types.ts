import { OpsRole } from '@/stores/opsSessionStore';

export type { OpsRole };

export interface ThemeColor {
  bg: string;
  badge: string;
  icon: string;
}

export const roleColors: Record<OpsRole, ThemeColor> = {
  'control-room': {
    bg: 'bg-emerald-50',
    badge: 'bg-emerald-100 text-emerald-700',
    icon: 'text-emerald-600',
  },
  'rate-manager': {
    bg: 'bg-purple-50',
    badge: 'bg-purple-100 text-purple-700',
    icon: 'text-purple-600',
  },
  'super-admin': {
    bg: 'bg-amber-50',
    badge: 'bg-amber-100 text-amber-700',
    icon: 'text-amber-600',
  },
};

export const roleDisplayNames: Record<OpsRole, string> = {
  'control-room': 'Control Room',
  'rate-manager': 'Rate Manager',
  'super-admin': 'Super Admin',
};
