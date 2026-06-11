import React from 'react';
import { Card } from './Card';

interface KpiCardProps {
  label: string;
  value: string | number;
  unit?: string;
  icon?: React.ReactNode;
  trend?: { direction: 'up' | 'down'; value: string };
  className?: string;
}

export function KpiCard({ label, value, unit, icon, trend, className = '' }: KpiCardProps) {
  return (
    <Card className={`${className}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-[#8B8FA8] mb-2">{label}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#3D434A]">{value}</span>
            {unit && <span className="text-sm text-[#8B8FA8]">{unit}</span>}
          </div>
          {trend && (
            <p className={`text-xs mt-2 ${trend.direction === 'up' ? 'text-green-600' : 'text-red-600'}`}>
              {trend.direction === 'up' ? '↑' : '↓'} {trend.value}
            </p>
          )}
        </div>
        {icon && <div className="text-[#2563EB]">{icon}</div>}
      </div>
    </Card>
  );
}
