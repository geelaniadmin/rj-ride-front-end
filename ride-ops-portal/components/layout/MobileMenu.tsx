'use client';

import React from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { usePathname } from 'next/navigation';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<any>;
  badge?: number;
}

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  items: NavItem[];
}

export function MobileMenu({ isOpen, onClose, title, items }: MobileMenuProps) {
  const pathname = usePathname();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 md:hidden">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Drawer */}
      <div className="absolute left-0 top-0 bottom-0 w-72 bg-[#1B2A4A] text-white shadow-lg flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between h-16">
          <h2 className="text-sm font-bold">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded -m-2 touch-target">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto space-y-1 p-3">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-4 py-4 rounded-lg transition-colors touch-target ${
                  isActive
                    ? 'bg-white/10 border-l-2 border-[#2563EB] text-white'
                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm font-medium flex-1">{item.label}</span>
                {item.badge && item.badge > 0 && (
                  <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-red-600 rounded-full ml-auto">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
