'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function Modal({ isOpen, onClose, title, children, footer, className = '' }: ModalProps) {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
      <div className={`relative bg-white rounded-lg shadow-lg max-w-md w-full mx-4 ${className}`}>
        {title && (
          <div className="flex items-center justify-between border-b border-[#E0E0E0] p-4">
            <h2 className="text-lg font-semibold text-[#3D434A]">{title}</h2>
            <button onClick={onClose} className="text-[#8B8FA8] hover:text-[#3D434A]">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        <div className="p-4">{children}</div>
        {footer && <div className="border-t border-[#E0E0E0] p-4">{footer}</div>}
      </div>
    </div>
  );
}
