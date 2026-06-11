import React from 'react';

export function LiveBadge() {
  return (
    <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
      <span className="w-2 h-2 rounded-full bg-green-600 animate-pulse" />
      LIVE
    </div>
  );
}
