'use client';

import React, { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { maskPii } from '@/lib/utils';
import { useOpsSessionStore } from '@/stores/opsSessionStore';

type PiiType = 'name' | 'phone' | 'email' | 'id' | 'pnr' | 'licence';

interface PiiFieldProps {
  value: string;
  type?: PiiType;
  className?: string;
}

export function PiiField({ value, type = 'name', className = '' }: PiiFieldProps) {
  const [revealed, setRevealed] = useState(false);
  const { session } = useOpsSessionStore();
  const isRateManager = session?.role === 'rate-manager';

  useEffect(() => {
    if (revealed && !isRateManager) {
      const timer = setTimeout(() => setRevealed(false), 10000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [revealed, isRateManager]);

  const display = isRateManager ? '***' : revealed ? value : maskPii(value);
  const canReveal = !isRateManager && value;

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <span className="text-sm text-[#3D434A] font-mono">{display}</span>
      {canReveal && (
        <button
          onClick={() => setRevealed(!revealed)}
          className="text-[#8B8FA8] hover:text-[#3D434A] p-1"
          title={revealed ? 'Hide' : 'Reveal'}
        >
          {revealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      )}
    </div>
  );
}
