'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  side?: 'left' | 'right';
  className?: string;
}

export function Drawer({ isOpen, onClose, title, children, footer, side = 'right', className = '' }: DrawerProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sideClass = side === 'left' ? 'left-0' : 'right-0';

  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
      <div
        className={`fixed ${sideClass} top-0 h-full w-96 bg-white shadow-lg flex flex-col animation-slide-in-right ${className}`}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-[#E0E0E0] p-4">
            <h2 className="text-lg font-semibold text-[#3D434A]">{title}</h2>
            <button onClick={onClose} className="text-[#8B8FA8] hover:text-[#3D434A]">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">{children}</div>
        {footer && <div className="border-t border-[#E0E0E0] p-4">{footer}</div>}
      </div>
    </div>
  );
}
