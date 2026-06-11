'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { AlertCircle } from 'lucide-react';
import { RateCard } from '@/stores/rateCardStore';

interface SupersedeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  oldRateCard?: RateCard;
  newVersion?: number;
}

export function SupersedeModal({ isOpen, onClose, onConfirm, oldRateCard, newVersion }: SupersedeModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Supersede existing rate card?">
      <div className="space-y-4">
        <div className="flex gap-3 p-4 bg-orange-50 border border-orange-200 rounded">
          <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-orange-800">
            <p className="font-semibold mb-1">This will supersede an active rate card</p>
            <p>
              Rate card <span className="font-mono font-semibold">{oldRateCard?.id}</span> version{' '}
              <span className="font-mono font-semibold">{oldRateCard?.version}</span> will be marked as superseded.
            </p>
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded text-sm space-y-2">
          <div>
            <p className="text-[#8B8FA8] mb-1">Current rate card</p>
            <p className="font-mono text-[#1B2A4A] font-semibold">{oldRateCard?.id}</p>
          </div>
          <div>
            <p className="text-[#8B8FA8] mb-1">New version</p>
            <p className="font-mono text-[#1B2A4A] font-semibold">v{newVersion}</p>
          </div>
        </div>

        <p className="text-xs text-[#8B8FA8]">
          All new quotes will use the new rate card. Existing trips remain locked to their original rate card version.
        </p>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>Confirm + Supersede</Button>
        </div>
      </div>
    </Modal>
  );
}
