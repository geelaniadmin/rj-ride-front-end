'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyStateCard({ icon: Icon, title, description, actionLabel, onAction }: EmptyStateCardProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="mb-4 p-4 bg-gray-100 rounded-lg">
        <Icon className="w-8 h-8 text-[#8B8FA8]" />
      </div>
      <h3 className="text-lg font-semibold text-[#1B2A4A] mb-2">{title}</h3>
      <p className="text-sm text-[#8B8FA8] text-center max-w-sm mb-6">{description}</p>
      {actionLabel && onAction && <Button onClick={onAction}>{actionLabel}</Button>}
    </div>
  );
}
