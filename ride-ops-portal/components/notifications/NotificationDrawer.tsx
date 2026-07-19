'use client';

import React from 'react';
import { Bell } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationDrawer({ isOpen, onClose }: NotificationDrawerProps) {
  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Notifications" side="right">
      <div className="flex flex-col h-full">
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center flex-1">
          <Bell className="w-10 h-10 text-text-muted mb-3" />
          <p className="text-sm text-text-muted">No notifications yet</p>
          <p className="text-xs text-text-muted mt-1">
            SOS events surface instantly via the realtime alert banner
          </p>
        </div>
      </div>
    </Drawer>
  );
}
