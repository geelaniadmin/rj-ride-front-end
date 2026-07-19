"use client";

import React, { useState, useMemo } from "react";
import { useTenantStore } from "@/stores/tenantStore";
import { useCustomerStore } from "@/stores/customerStore";
import { useVehicleTypeStore } from "@/stores/vehicleTypeStore";
import { partnerApi, CreateTripFromPaxRequest, CreateTripFromVehicleCountRequest, ApiResponse } from "@/lib/api/partnerApi";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FormField } from "@/components/ui/FormField";
import { Badge } from "@/components/ui/Badge";
import { useToastStore } from "@/stores/toastStore";
import { Copy, Send } from "lucide-react";

export const ApiTester: React.FC = () => {
  const activeTenantId = useTenantStore((s) => s.activeTenantId);
  const allCustomers = useCustomerStore((s) => s.customers);
  const allVehicleTypes = useVehicleTypeStore((s) => s.vehicleTypes);
  const addToast = useToastStore((s) => s.addToast);

  const customers = useMemo(() => allCustomers?.filter((c) => c.tenantId === activeTenantId) || [], [allCustomers, activeTenantId]);
  const vehicleTypes = useMemo(() => allVehicleTypes?.filter((v) => v.tenantId === activeTenantId) || [], [allVehicleTypes, activeTenantId]);

  const [selectedMethod, setSelectedMethod] = useState<"API_PAX" | "API_VEHICLE_COUNT">("API_PAX");
  const [response, setResponse] = useState<ApiResponse<{ tripId: string }> | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [paxRequest, setPaxRequest] = useState<CreateTripFromPaxRequest>({
    customerId: customers[0]?.id || "",
    pickupAddress: "Kempegowda International Airport, Bangalore",
    pickupLat: 13.1979,
    pickupLng: 77.7064,
    dropAddress: "MG Road, Bangalore",
    dropLat: 13.0331,
    dropLng: 77.6456,
    scheduleDate: "2025-06-10",
    vehicleType: vehicleTypes[0]?.name || "Sedan",
    reference: `PAX-${Date.now()}`,
    pax: [
      { id: "P1", name: "John Doe", phone: "9876543210", pnr: "AA1234" },
      { id: "P2", name: "Jane Smith", phone: "9876543211", pnr: "AA1234" },
      { id: "P3", name: "Bob Johnson", phone: "9876543212", pnr: "AA1234" },
    ],
  });

  const [vehicleCountRequest, setVehicleCountRequest] = useState<CreateTripFromVehicleCountRequest>({
    customerId: customers[0]?.id || "",
    pickupAddress: "HAL Old Airport Road, Bangalore",
    pickupLat: 13.1939,
    pickupLng: 77.6425,
    dropAddress: "Marathahalli, Bangalore",
    dropLat: 13.0285,
    dropLng: 77.7597,
    scheduleDate: "2025-06-11",
    vehicleCount: 3,
    vehicleType: vehicleTypes[0]?.name || "Sedan",
    autoAssign: true,
    reference: `VEH-${Date.now()}`,
  });

  const handleTestApi = async () => {
    if (selectedMethod === "API_PAX") {
      if (!paxRequest.customerId || paxRequest.pax.length === 0) {
        addToast("Please fill required fields", "error");
        return;
      }

      setIsLoading(true);
      try {
        const result = partnerApi.createTripFromPax(activeTenantId, paxRequest);
        setResponse(result);
        if (result.error) {
          addToast(`API Error: ${result.error.message}`, "error");
        } else {
          addToast(`Trip created: ${result.result?.tripId}`, "success");
        }
      } finally {
        setIsLoading(false);
      }
    } else {
      if (!vehicleCountRequest.customerId || vehicleCountRequest.vehicleCount <= 0) {
        addToast("Please fill required fields", "error");
        return;
      }

      setIsLoading(true);
      try {
        const result = partnerApi.createTripFromVehicleCount(activeTenantId, vehicleCountRequest);
        setResponse(result);
        if (result.error) {
          addToast(`API Error: ${result.error.message}`, "error");
        } else {
          addToast(`Trip created: ${result.result?.tripId}`, "success");
        }
      } finally {
        setIsLoading(false);
      }
    }
  };

  const payloadJson = selectedMethod === "API_PAX" ? JSON.stringify(paxRequest, null, 2) : JSON.stringify(vehicleCountRequest, null, 2);

  return (
    <div className="space-y-4">
      {/* Method Selector */}
      <Card padding="lg" header={<h3 className="font-semibold text-text-primary">📋 API Method</h3>}>
        <div className="flex gap-2">
          {(["API_PAX", "API_VEHICLE_COUNT"] as const).map((method) => (
            <button
              key={method}
              onClick={() => setSelectedMethod(method)}
              className={`px-4 py-2 rounded text-sm font-medium transition-all ${
                selectedMethod === method ? "bg-brand-blue text-white" : "bg-ops-bg text-text-primary border border-border hover:bg-ops-bg/80"
              }`}
            >
              {method === "API_PAX" ? "Create Trip from Pax (RISMA)" : "Create Trip from Vehicle Count (CLASS)"}
            </button>
          ))}
        </div>
      </Card>

      {/* Request Builder */}
      <Card padding="lg" header={<h3 className="font-semibold text-text-primary">🔧 Request Builder</h3>}>
        <div className="space-y-4">
          {selectedMethod === "API_PAX" ? (
            <>
              <FormField label="Customer" required>
                <Select
                  options={customers.map((c) => ({ value: c.id, label: `${c.name} (${c.code})` }))}
                  value={paxRequest.customerId}
                  onChange={(e) => setPaxRequest((prev) => ({ ...prev, customerId: e.target.value }))}
                />
              </FormField>

              <FormField label="Vehicle Type" required>
                <Select
                  options={vehicleTypes.map((v) => ({ value: v.name, label: v.name }))}
                  value={paxRequest.vehicleType}
                  onChange={(e) => setPaxRequest((prev) => ({ ...prev, vehicleType: e.target.value }))}
                />
              </FormField>

              <FormField label="Schedule Date" required>
                <Input type="date" value={paxRequest.scheduleDate} onChange={(e) => setPaxRequest((prev) => ({ ...prev, scheduleDate: e.target.value }))} />
              </FormField>

              <FormField label="Pickup Address">
                <Input value={paxRequest.pickupAddress} onChange={(e) => setPaxRequest((prev) => ({ ...prev, pickupAddress: e.target.value }))} />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Pickup Lat">
                  <Input type="number" value={paxRequest.pickupLat} onChange={(e) => setPaxRequest((prev) => ({ ...prev, pickupLat: parseFloat(e.target.value) }))} />
                </FormField>
                <FormField label="Pickup Lng">
                  <Input type="number" value={paxRequest.pickupLng} onChange={(e) => setPaxRequest((prev) => ({ ...prev, pickupLng: parseFloat(e.target.value) }))} />
                </FormField>
              </div>

              <FormField label="Drop Address">
                <Input value={paxRequest.dropAddress} onChange={(e) => setPaxRequest((prev) => ({ ...prev, dropAddress: e.target.value }))} />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Drop Lat">
                  <Input type="number" value={paxRequest.dropLat} onChange={(e) => setPaxRequest((prev) => ({ ...prev, dropLat: parseFloat(e.target.value) }))} />
                </FormField>
                <FormField label="Drop Lng">
                  <Input type="number" value={paxRequest.dropLng} onChange={(e) => setPaxRequest((prev) => ({ ...prev, dropLng: parseFloat(e.target.value) }))} />
                </FormField>
              </div>

              <div className="bg-ops-sidebar rounded p-3 space-y-2 border border-ops-sidebar/80">
                <p className="text-xs font-medium text-white/90">Passengers ({paxRequest.pax.length})</p>
                <div className="space-y-1 text-xs text-white/70">
                  {paxRequest.pax.map((p, idx) => (
                    <div key={idx}>
                      {p.name} | {p.phone} | PNR: {p.pnr}
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <FormField label="Customer" required>
                <Select
                  options={customers.map((c) => ({ value: c.id, label: `${c.name} (${c.code})` }))}
                  value={vehicleCountRequest.customerId}
                  onChange={(e) => setVehicleCountRequest((prev) => ({ ...prev, customerId: e.target.value }))}
                />
              </FormField>

              <FormField label="Vehicle Type" required>
                <Select
                  options={vehicleTypes.map((v) => ({ value: v.name, label: v.name }))}
                  value={vehicleCountRequest.vehicleType}
                  onChange={(e) => setVehicleCountRequest((prev) => ({ ...prev, vehicleType: e.target.value }))}
                />
              </FormField>

              <FormField label="Vehicle Count" required>
                <Input
                  type="number"
                  min="1"
                  value={vehicleCountRequest.vehicleCount}
                  onChange={(e) => setVehicleCountRequest((prev) => ({ ...prev, vehicleCount: parseInt(e.target.value) }))}
                />
              </FormField>

              <FormField label="Auto Assign">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={vehicleCountRequest.autoAssign || false}
                    onChange={(e) => setVehicleCountRequest((prev) => ({ ...prev, autoAssign: e.target.checked }))}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm text-text-primary">Auto-assign vehicles to drivers</span>
                </label>
              </FormField>

              <FormField label="Schedule Date" required>
                <Input type="date" value={vehicleCountRequest.scheduleDate} onChange={(e) => setVehicleCountRequest((prev) => ({ ...prev, scheduleDate: e.target.value }))} />
              </FormField>

              <FormField label="Pickup Address">
                <Input value={vehicleCountRequest.pickupAddress} onChange={(e) => setVehicleCountRequest((prev) => ({ ...prev, pickupAddress: e.target.value }))} />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Pickup Lat">
                  <Input type="number" value={vehicleCountRequest.pickupLat} onChange={(e) => setVehicleCountRequest((prev) => ({ ...prev, pickupLat: parseFloat(e.target.value) }))} />
                </FormField>
                <FormField label="Pickup Lng">
                  <Input type="number" value={vehicleCountRequest.pickupLng} onChange={(e) => setVehicleCountRequest((prev) => ({ ...prev, pickupLng: parseFloat(e.target.value) }))} />
                </FormField>
              </div>

              <FormField label="Drop Address">
                <Input value={vehicleCountRequest.dropAddress} onChange={(e) => setVehicleCountRequest((prev) => ({ ...prev, dropAddress: e.target.value }))} />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Drop Lat">
                  <Input type="number" value={vehicleCountRequest.dropLat} onChange={(e) => setVehicleCountRequest((prev) => ({ ...prev, dropLat: parseFloat(e.target.value) }))} />
                </FormField>
                <FormField label="Drop Lng">
                  <Input type="number" value={vehicleCountRequest.dropLng} onChange={(e) => setVehicleCountRequest((prev) => ({ ...prev, dropLng: parseFloat(e.target.value) }))} />
                </FormField>
              </div>
            </>
          )}
        </div>
      </Card>

      {/* JSON Payload */}
      <Card padding="lg" header={<h3 className="font-semibold text-text-primary">📄 JSON Payload</h3>}>
        <div className="relative">
          <pre className="bg-ops-sidebar rounded p-3 text-xs text-white overflow-x-auto max-h-60 border border-ops-sidebar/80">{payloadJson}</pre>
          <button
            onClick={() => {
              navigator.clipboard.writeText(payloadJson);
              addToast("Payload copied", "success");
            }}
            className="absolute top-2 right-2 bg-brand-blue hover:bg-brand-blue/90 p-2 rounded text-white transition-colors"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
      </Card>

      {/* Send Button */}
      <Button onClick={handleTestApi} variant="primary" loading={isLoading} className="w-full">
        <Send className="w-4 h-4 mr-2" /> Send Request
      </Button>

      {/* Response */}
      {response !== null && (
        <Card padding="lg" header={<h3 className="font-semibold text-text-primary">✨ Response</h3>}>
          <div className="space-y-2">
            {response?.error ? (
              <>
                <div>
                  <p className="text-xs text-text-secondary">Error Code</p>
                  <Badge variant="red">{response.error.code}</Badge>
                </div>
                <div>
                  <p className="text-xs text-text-secondary">Message</p>
                  <p className="text-sm text-danger">{response.error.message}</p>
                </div>
              </>
            ) : response?.result ? (
              <>
                <div>
                  <p className="text-xs text-text-secondary">Trip ID</p>
                  <Badge variant="green">{response.result.tripId}</Badge>
                </div>
                <p className="text-xs text-text-secondary">Trip created successfully. Check the Trips list to confirm.</p>
              </>
            ) : null}
            <pre className="bg-ops-sidebar rounded p-3 text-xs text-text-primary overflow-x-auto max-h-40 mt-2">{JSON.stringify(response, null, 2)}</pre>
          </div>
        </Card>
      )}
    </div>
  );
};

ApiTester.displayName = "ApiTester";
