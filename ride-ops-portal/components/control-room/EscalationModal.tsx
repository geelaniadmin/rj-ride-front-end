'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useToastStore } from '@/components/ui/Toast';

interface EscalationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEscalate: () => void;
  alertId: string;
}

export function EscalationModal({ isOpen, onClose, onEscalate, alertId }: EscalationModalProps) {
  const addToast = useToastStore((s) => s.addToast);

  const handleEscalate = () => {
    onEscalate();
    addToast({
      type: 'success',
      message: 'SOS escalated to authorities',
      duration: 3000,
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Escalate Alert to Authorities">
      <div className="space-y-4">
        <p className="text-sm text-[#3D434A]">
          This will escalate the alert to local authorities. This action cannot be undone.
        </p>
        <p className="text-sm text-[#8B8FA8]">
          Alert ID: <span className="font-mono text-[#3D434A]">{alertId}</span>
        </p>
      </div>
      <div className="flex gap-3 mt-4">
        <Button variant="secondary" onClick={onClose} className="flex-1">
          Cancel
        </Button>
        <Button variant="danger" onClick={handleEscalate} className="flex-1">
          Escalate to L4
        </Button>
      </div>
    </Modal>
  );
}
