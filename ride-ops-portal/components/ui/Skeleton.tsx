'use client';

import React from 'react';

export function KpiCardSkeleton() {
  return (
    <div className="p-4 border border-border rounded-lg bg-white animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="h-3 bg-gray-200 rounded w-20 mb-2"></div>
          <div className="h-8 bg-gray-200 rounded w-32"></div>
        </div>
        <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
      </div>
    </div>
  );
}

export function DataTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2 border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex gap-4 p-4 bg-gray-50 border-b animate-pulse">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-4 bg-gray-200 rounded flex-1"></div>
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 p-4 border-b animate-pulse">
          {[1, 2, 3, 4, 5].map((j) => (
            <div key={j} className="h-4 bg-gray-100 rounded flex-1"></div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="w-full h-80 border border-border rounded-lg bg-white p-4 animate-pulse flex items-end gap-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="flex-1 bg-gray-200 rounded"
          style={{ height: `${Math.random() * 60 + 20}%` }}
        ></div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="p-6 border border-border rounded-lg bg-white animate-pulse space-y-4">
      <div className="h-6 bg-gray-200 rounded w-32"></div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-3 bg-gray-100 rounded w-24"></div>
            <div className="h-4 bg-gray-200 rounded w-48"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
