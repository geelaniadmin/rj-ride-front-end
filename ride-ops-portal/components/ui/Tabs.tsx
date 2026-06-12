import React from 'react';
import { Badge } from './Badge';

export interface TabDefinition {
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: TabDefinition[];
  activeIndex: number;
  onChange: (index: number) => void;
  className?: string;
}

export function Tabs({ tabs, activeIndex, onChange, className = '' }: TabsProps) {
  return (
    <div className={`flex gap-4 border-b border-border ${className}`}>
      {tabs.map((tab, idx) => (
        <button
          key={idx}
          onClick={() => onChange(idx)}
          className={`py-3 px-1 text-sm font-medium transition-colors relative ${
            idx === activeIndex
              ? 'text-[#2563EB] border-b-2 border-[#2563EB]'
              : 'text-[#8B8FA8] hover:text-[#3D434A]'
          }`}
        >
          <span className="flex items-center gap-2">
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <Badge variant="blue">{tab.count}</Badge>
            )}
          </span>
        </button>
      ))}
    </div>
  );
}
