import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'header';
  padding?: 'sm' | 'md' | 'lg';
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

const paddingClasses = {
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export function Card({
  children,
  className = '',
  variant = 'default',
  padding = 'md',
  header,
  footer,
}: CardProps) {
  const baseClass = 'bg-card-bg rounded-xl border border-card-border';
  const variantClass = variant === 'header' ? 'shadow-sm' : '';

  return (
    <div className={`${baseClass} ${variantClass} ${className}`}>
      {header && <div className="border-b border-border px-4 py-3">{header}</div>}
      <div className={paddingClasses[padding]}>{children}</div>
      {footer && <div className="border-t border-border px-4 py-3">{footer}</div>}
    </div>
  );
}
