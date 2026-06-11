import React from 'react';
import { AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

type AlertType = 'warning' | 'error' | 'info';

const typeClasses: Record<AlertType, { bg: string; border: string; icon: React.ReactNode; text: string }> = {
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: <AlertTriangle className="w-5 h-5 text-amber-600" />,
    text: 'text-amber-800',
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: <AlertCircle className="w-5 h-5 text-red-600" />,
    text: 'text-red-800',
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: <Info className="w-5 h-5 text-blue-600" />,
    text: 'text-blue-800',
  },
};

interface AlertBannerProps {
  type?: AlertType;
  message: string;
  onDismiss?: () => void;
  className?: string;
}

export function AlertBanner({ type = 'info', message, onDismiss, className = '' }: AlertBannerProps) {
  const config = typeClasses[type];
  return (
    <div className={`${config.bg} border ${config.border} rounded-lg p-4 flex items-start gap-3 ${className}`}>
      <div className="flex-shrink-0">{config.icon}</div>
      <p className={`flex-1 text-sm ${config.text}`}>{message}</p>
      {onDismiss && (
        <button onClick={onDismiss} className="text-[#8B8FA8] hover:text-[#3D434A]">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
