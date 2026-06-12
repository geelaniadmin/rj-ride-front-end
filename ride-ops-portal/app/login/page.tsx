'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useOpsSessionStore } from '@/stores/opsSessionStore';
import { ShieldCheck, Calculator, Crown } from 'lucide-react';

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
  const router = useRouter();

  const handleLogin = (role: 'control-room' | 'rate-manager' | 'super-admin', displayName: string) => {
    setSession({ role, name: displayName, tenantId: 'T1' });
    router.push(`/${role}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-page-bg to-[#E8ECEF] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-[#2563EB] text-white font-bold text-lg mb-4">
            R
          </div>
          <h1 className="text-4xl font-bold text-[#1B2A4A] mb-2">Ride Ops Portal</h1>
          <p className="text-[#8B8FA8]">Select your role to continue</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {roles.map(({ id, name, description, icon: Icon, color, bgColor, displayName }) => (
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
          <p>Demo credentials — click any role card to log in</p>
        </div>
      </div>
    </div>
  );
}
