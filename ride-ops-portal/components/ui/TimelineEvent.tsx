import React from 'react';
import { LucideIcon } from 'lucide-react';
import { timeAgo } from '@/lib/utils';

interface TimelineEventProps {
  icon: LucideIcon;
  timestamp: string;
  title: string;
  description?: string;
  className?: string;
}

export function TimelineEvent({ icon: Icon, timestamp, title, description, className = '' }: TimelineEventProps) {
  return (
    <div className={`flex gap-4 ${className}`}>
      <div className="flex flex-col items-center">
        <div className="w-8 h-8 rounded-full bg-[#2563EB] text-white flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4" />
        </div>
        <div className="w-0.5 h-12 bg-[#E0E0E0] mt-2" />
      </div>
      <div className="pb-4">
        <p className="font-medium text-[#3D434A]">{title}</p>
        <p className="text-xs text-[#8B8FA8]">{timeAgo(timestamp)}</p>
        {description && <p className="text-sm text-[#6B7F99] mt-1">{description}</p>}
      </div>
    </div>
  );
}
