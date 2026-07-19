'use client';

import React from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';
import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastStore {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = Math.random().toString(36).substr(2, 9);
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
    if (toast.duration !== 0) {
      setTimeout(() => {
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
      }, toast.duration || 3000);
    }
  },
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

const typeClasses: Record<ToastType, { bg: string; border: string; icon: React.ReactNode }> = {
  success: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    icon: <CheckCircle className="w-5 h-5 text-green-600" />,
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: <AlertCircle className="w-5 h-5 text-red-600" />,
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: <AlertTriangle className="w-5 h-5 text-amber-600" />,
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: <Info className="w-5 h-5 text-blue-600" />,
  },
};

interface SingleToastProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

function SingleToast({ toast, onRemove }: SingleToastProps) {
  const config = typeClasses[toast.type];
  return (
    <div className={`${config.bg} border ${config.border} rounded-lg p-4 flex items-start gap-3 animation-slide-up`}>
      <div className="flex-shrink-0">{config.icon}</div>
      <p className="flex-1 text-sm text-[#3D434A]">{toast.message}</p>
      <button onClick={() => onRemove(toast.id)} className="text-[#8B8FA8] hover:text-[#3D434A]">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function ToastProvider() {
  const { toasts, removeToast } = useToastStore();
  return (
    <div className="fixed bottom-4 right-4 z-40 space-y-2 max-w-sm">
      {toasts.map((toast) => (
        <SingleToast key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
}
