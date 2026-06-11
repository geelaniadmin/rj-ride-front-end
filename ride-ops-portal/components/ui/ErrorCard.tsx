'use client';

import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from './Button';

interface ErrorCardProps {
  title: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorCard({ title, message, onRetry }: ErrorCardProps) {
  return (
    <div className="p-6 border border-red-200 bg-red-50 rounded-lg">
      <div className="flex items-start gap-4">
        <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-red-900 mb-1">{title}</h3>
          <p className="text-sm text-red-800 mb-4">{message}</p>
          {onRetry && (
            <Button size="sm" onClick={onRetry}>
              Retry
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
