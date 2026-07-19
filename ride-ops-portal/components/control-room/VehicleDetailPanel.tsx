'use client';

import React from 'react';
import { X } from 'lucide-react';

interface VehicleDetailPanelProps {
  vehicleId: string;
  onClose: () => void;
}

export function VehicleDetailPanel({ vehicleId, onClose }: VehicleDetailPanelProps) {
  return (
    <div className="fixed right-0 top-16 h-[calc(100vh-64px)] w-96 bg-white border-l border-border shadow-lg z-30 overflow-y-auto">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold text-[#3D434A]">Vehicle Details</h3>
        <button onClick={onClose} className="text-[#8B8FA8] hover:text-[#3D434A]">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="p-4 space-y-4">
        <div>
          <p className="text-xs text-[#8B8FA8] mb-1">Vehicle ID</p>
          <p className="font-mono text-[#3D434A]">{vehicleId}</p>
        </div>
        <p className="text-sm text-[#8B8FA8]">Live vehicle details load from API when available.</p>
      </div>
    </div>
  );
}
