import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 ${className}`}>
      {Icon && <Icon className="w-12 h-12 text-[#8B8FA8] mb-4" />}
      <h3 className="text-lg font-semibold text-[#3D434A] mb-2">{title}</h3>
      {description && <p className="text-sm text-[#8B8FA8] mb-4 text-center max-w-md">{description}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-[#2563EB] text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
