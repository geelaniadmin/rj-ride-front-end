'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useOpsSessionStore } from '@/stores/opsSessionStore';
import { useLanguageStore } from '@/stores/languageStore';
import { t } from '@/lib/translations';
import { ShieldCheck, Calculator, Crown, Globe } from 'lucide-react';

const roles = [
  {
    id: 'control-room',
    name: 'Control Room',
    description: 'Manage live operations and handle emergencies',
    icon: ShieldCheck,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    displayName: 'Preethi',
  },
  {
    id: 'rate-manager',
    name: 'Rate Manager',
    description: 'Create and manage rate cards and pricing',
    icon: Calculator,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    displayName: 'Rate Mgr',
  },
  {
    id: 'super-admin',
    name: 'Super Admin',
    description: 'System administration and tenant management',
    icon: Crown,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    displayName: 'Geelani',
  },
];

export default function LoginPage() {
  const { setSession } = useOpsSessionStore();
  const { language, toggleLanguage } = useLanguageStore();
  const router = useRouter();

  const handleLogin = (role: 'control-room' | 'rate-manager' | 'super-admin', displayName: string) => {
    setSession({ role, name: displayName, tenantId: 'T1' });
    router.push(`/${role}`);
  };

  const roleTexts = {
    controlRoom: t('controlRoom', language),
    rateManager: t('rateManager', language),
    superAdmin: t('superAdmin', language),
    manageLiveOperations: t('manageLiveOperations', language),
    createAndManageRateCards: t('createAndManageRateCards', language),
    systemAdministration: t('systemAdministration', language),
  };

  const localizedRoles = [
    {
      id: 'control-room',
      name: roleTexts.controlRoom,
      description: roleTexts.manageLiveOperations,
      icon: ShieldCheck,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      displayName: t('preethi', language),
    },
    {
      id: 'rate-manager',
      name: roleTexts.rateManager,
      description: roleTexts.createAndManageRateCards,
      icon: Calculator,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      displayName: t('rateMgr', language),
    },
    {
      id: 'super-admin',
      name: roleTexts.superAdmin,
      description: roleTexts.systemAdministration,
      icon: Crown,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      displayName: t('geelani', language),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-page-bg to-[#E8ECEF] flex items-center justify-center p-4">
      <div className="absolute top-6 right-6">
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-border hover:bg-gray-50 transition-colors text-sm font-medium text-[#3D434A]"
          title="Toggle language / 言語を切り替える"
        >
          <Globe className="w-4 h-4" />
          <span>{language.toUpperCase()}</span>
        </button>
      </div>

      <div className="w-full max-w-2xl">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-[#2563EB] text-white font-bold text-lg mb-4">
            R
          </div>
          <h1 className="text-4xl font-bold text-[#1B2A4A] mb-2">Ride Ops Portal</h1>
          <p className="text-[#8B8FA8]">{t('selectYourRoleToConinue', language)}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {localizedRoles.map(({ id, name, description, icon: Icon, color, bgColor, displayName }) => (
            <button
              key={id}
              onClick={() => handleLogin(id as any, displayName)}
              className="group relative bg-white border-2 border-border rounded-lg p-6 hover:border-brand-blue hover:shadow-lg transition-all"
            >
              <div className={`${bgColor} w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <Icon className={`w-6 h-6 ${color}`} />
              </div>
              <h3 className="text-lg font-semibold text-[#1B2A4A] mb-2">{name}</h3>
              <p className="text-sm text-[#8B8FA8] mb-4">{description}</p>
              <div className="text-xs font-medium text-[#8B8FA8] bg-gray-50 rounded px-2 py-1 inline-block">
                {displayName}
              </div>
            </button>
          ))}
        </div>

        <div className="mt-8 text-center text-xs text-[#8B8FA8]">
          <p>{t('demoCredentials', language)}</p>
        </div>
      </div>
    </div>
  );
}
