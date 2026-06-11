import React from 'react';

interface LoadingSkeletonProps {
  width?: string;
  height?: string;
  className?: string;
}

export function LoadingSkeleton({ width = 'w-full', height = 'h-4', className = '' }: LoadingSkeletonProps) {
  return <div className={`${width} ${height} bg-gray-200 rounded animate-pulse ${className}`} />;
}

export function LoadingSkeletonRow() {
  return (
    <div className="space-y-2 p-4">
      <LoadingSkeleton width="w-full" height="h-4" />
      <LoadingSkeleton width="w-5/6" height="h-4" />
      <LoadingSkeleton width="w-4/6" height="h-4" />
    </div>
  );
}
