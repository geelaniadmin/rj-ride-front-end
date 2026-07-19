'use client';

import React from 'react';
import { useLanguageStore, t } from '@ride/shared';
import { AlertBanner } from '@/components/ui/AlertBanner';

export default function RateManagerAuditPage() {
  const language = useLanguageStore((s) => s.language);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#1B2A4A]">{t('auditLog', language)}</h1>
        <p className="text-sm text-[#8B8FA8] mt-1">{t('immutableRecordRateCards', language)}</p>
      </div>

      <AlertBanner
        type="info"
        message="Rate card mutation history (created/superseded/deactivated) is not yet exposed via a dedicated audit endpoint. Changes are recorded server-side. This view will surface the audit log when the endpoint becomes available."
      />
    </div>
  );
}
