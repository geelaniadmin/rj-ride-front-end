"use client";

import React from "react";
import { useDriverStore, useVehicleStore } from "@ride/shared";
import { Modal } from "@/components/ui/Modal";
import { PiiField } from "@/components/ui/PiiField";
import { Truck, Printer } from "lucide-react";

interface ReceiptModalProps {
  open: boolean;
  onClose: () => void;
  trip: {
    tripId: string;
    customerId: string;
    vehicleType: string;
    stops: Array<{ address: string; type: string }>;
    lockedPrice: number;
    lockedRateCardVersion: number;
    scheduledAt: string;
    assignedDriverId?: string;
    assignedVehicleId?: string;
    createdAt: string;
  } | null;
  vendorName: string;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ open, onClose, trip, vendorName }) => {
  const drivers = useDriverStore((s) => s.drivers);
  const vehicles = useVehicleStore((s) => s.vehicles);

  if (!trip) return null;

  const driver = trip.assignedDriverId ? drivers.find((d) => d.id === trip.assignedDriverId) : undefined;
  const vehicle = trip.assignedVehicleId ? vehicles.find((v) => v.id === trip.assignedVehicleId) : undefined;

  const grossFare = Math.round(trip.lockedPrice);
  const operatorFee = Math.round(grossFare * 0.15);
  const netToVendor = grossFare - operatorFee;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal open={open} onClose={onClose} title="" size="lg">
      <div className="space-y-6" id="receipt-content">
        {/* Header */}
        <div className="text-center border-b border-border pb-5">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-10 h-10 bg-sidebar-bg rounded-lg flex items-center justify-center">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-lg font-bold text-text-primary">RIDE</p>
              <p className="text-xs text-text-muted">{vendorName}</p>
            </div>
          </div>
          <h2 className="text-xl font-bold text-text-primary mt-2">Trip Receipt</h2>
          <p className="text-xs text-text-muted font-mono mt-1">{trip.tripId}</p>
          <p className="text-xs text-text-muted">{new Date(trip.scheduledAt).toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
        </div>

        {/* Route */}
        <div>
          <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Route</h4>
          <div className="space-y-2">
            {trip.stops.map((stop, idx) => (
              <div key={idx} className="flex items-start gap-3 text-sm">
                <div className="flex flex-col items-center mt-1">
                  <div className={`w-2.5 h-2.5 rounded-full ${idx === 0 ? "bg-success" : idx === trip.stops.length - 1 ? "bg-danger" : "bg-warning"}`} />
                  {idx < trip.stops.length - 1 && <div className="w-0.5 h-6 bg-border" />}
                </div>
                <div>
                  <p className="text-text-primary">{stop.address}</p>
                  <p className="text-xs text-text-muted">{stop.type}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Driver & Vehicle */}
        {(driver || vehicle) && (
          <div>
            <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Assignment</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {driver && (
                <div className="p-3 bg-ops-bg rounded-lg">
                  <p className="text-xs text-text-muted mb-1">Driver</p>
                  <p className="text-text-primary font-medium"><PiiField value={driver.name} /></p>
                  <p className="text-xs text-text-muted"><PiiField value={driver.phone} /></p>
                </div>
              )}
              {vehicle && (
                <div className="p-3 bg-ops-bg rounded-lg">
                  <p className="text-xs text-text-muted mb-1">Vehicle</p>
                  <p className="text-text-primary font-medium font-mono text-xs">{vehicle.registrationNo}</p>
                  <p className="text-xs text-text-muted">{vehicle.make} {vehicle.model}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Fare Breakdown */}
        <div>
          <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Fare Breakdown</h4>
          <div className="p-4 bg-ops-bg rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Gross Fare</span>
              <span className="text-text-primary font-medium">₹{grossFare.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Operator Fee (15%)</span>
              <span className="text-danger font-medium">-₹{operatorFee.toLocaleString()}</span>
            </div>
            <div className="border-t border-border pt-2 flex justify-between text-sm">
              <span className="font-semibold text-text-primary">Net to Vendor</span>
              <span className="font-bold text-success text-base">₹{netToVendor.toLocaleString()}</span>
            </div>
          </div>
          <p className="text-xs text-text-muted mt-2">
            Price was locked at {new Date(trip.scheduledAt).toLocaleString()} — rate card v{trip.lockedRateCardVersion}
          </p>
        </div>

        {/* Footer */}
        <div className="border-t border-border pt-4 text-center">
          <p className="text-xs text-text-muted">Powered by RIDE — Rezolv Integrated Dispatch Engine</p>
        </div>
      </div>

      {/* Action */}
      <div className="flex gap-3 pt-2 print:hidden">
        <button
          onClick={handlePrint}
          className="flex-1 px-4 py-2.5 bg-sidebar-bg text-white rounded-lg font-medium text-sm hover:bg-sidebar-bg/90 transition-colors flex items-center justify-center gap-2"
        >
          <Printer className="w-4 h-4" /> Print Receipt
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2.5 border border-border text-text-primary rounded-lg font-medium text-sm hover:bg-ops-bg transition-colors"
        >
          Close
        </button>
      </div>
    </Modal>
  );
};

export default ReceiptModal;
