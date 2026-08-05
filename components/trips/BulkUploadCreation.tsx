"use client";

import React, { useState } from "react";
import { useTripStore } from "@/stores/tripStore";
import { useCustomerStore } from "@ride/shared";
import { useVehicleTypeStore } from "@/stores/vehicleTypeStore";
import { useTenantStore } from "@ride/shared";
import { useToastStore } from "@/stores/toastStore";
import { getOffers } from "@/lib/quote";
import { parseCSV, ParsedBulkRow, BulkTripRow } from "@/lib/csvParser";
import { createTripVehicle } from "@/lib/tripHelpers";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { Upload } from "lucide-react";

interface BulkUploadCreationProps {
  onCreated?: () => void;
}

export const BulkUploadCreation: React.FC<BulkUploadCreationProps> = ({ onCreated }) => {
  const activeTenantId = useTenantStore((s) => s.activeTenantId);
  const allCustomers = useCustomerStore((s) => s.customers) || [];
  const customers = allCustomers.filter((c) => c.tenantId === activeTenantId);
  const allVTs = useVehicleTypeStore((s) => s.vehicleTypes) || [];
  const vts = allVTs.filter((v) => v.tenantId === activeTenantId);

  const addTrip = useTripStore((s) => s.addTrip);
  const addToast = useToastStore((s) => s.addToast);

  const [parsedRows, setParsedRows] = useState<ParsedBulkRow[]>([]);
  const [isCommitting, setIsCommitting] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const rows = parseCSV(content);
        setParsedRows(rows);
        addToast(`Parsed ${rows.filter((r) => r.errors.length === 0).length} valid rows`, "info");
      } catch (err) {
        addToast(`Error parsing file: ${err instanceof Error ? err.message : "Unknown error"}`, "error");
      }
    };
    reader.readAsText(file);
  };

  const handleCommit = async () => {
    const validRows = parsedRows.filter((r) => r.errors.length === 0);

    if (validRows.length === 0) {
      addToast("No valid rows to commit", "error");
      return;
    }

    setIsCommitting(true);

    try {
      let createdCount = 0;
      const errors: string[] = [];

      for (const parsedRow of validRows) {
        try {
          const row = parsedRow.data;
          const customer = customers.find((c) => c.code === row.customer_code);

          if (!customer) {
            errors.push(`Row ${parsedRow.index}: Customer code "${row.customer_code}" not found`);
            continue;
          }

          // Parse vehicle types from comma-separated list
          const vehicleTypeNames = row.vehicle_types.split(",").map((v) => v.trim());
          const vehicleTypeIds = vehicleTypeNames
            .map((name) => vts.find((vt) => vt.name.toLowerCase() === name.toLowerCase())?.id)
            .filter(Boolean) as string[];

          if (vehicleTypeIds.length === 0) {
            errors.push(`Row ${parsedRow.index}: No valid vehicle types found for "${row.vehicle_types}"`);
            continue;
          }

          // Create trip vehicles with offers
          const vehicles = vehicleTypeIds.map((vtId) => {
            const vehicle = createTripVehicle(vtId);
            const offers = getOffers({
              tenantId: activeTenantId,
              vendorId: "V1", // TODO: configurable
              customerId: customer.id,
              vehicleTypeId: vtId,
              quotedAt: row.schedule_date,
              currency: "INR",
              distance: 10, // Default distance for bulk trips
            });

            if (offers.length > 0) {
              const offer = offers[0]!;
              return {
                ...vehicle,
                priceId: offer.priceId,
                lockedPrice: offer.price,
                lockedRateCardVersion: offer.rateCardVersion,
              };
            }
            return vehicle;
          });

          // Create trip
          const tripId = addTrip({
            tenantId: activeTenantId,
            customerId: customer.id,
            createdVia: "BULK_UPLOAD",
            stops: [
              {
                seq: 0,
                type: "PICKUP",
                locationType: "ADDRESS",
                address: row.pickup_address,
                lat: parseFloat(row.pickup_lat),
                lng: parseFloat(row.pickup_lng),
              },
              {
                seq: 1,
                type: "DROP",
                locationType: "ADDRESS",
                address: row.drop_address,
                lat: parseFloat(row.drop_lat),
                lng: parseFloat(row.drop_lng),
              },
            ],
            vehicles,
            schedule: { type: "ONE_OFF", when: `${row.schedule_date}T08:00:00Z` },
            status: "DRAFT",
            autoAssign: false,
            reference: row.reference,
          });

          createdCount++;
        } catch (err) {
          errors.push(`Row ${parsedRow.index}: ${err instanceof Error ? err.message : "Unknown error"}`);
        }
      }

      if (createdCount > 0) {
        addToast(`Created ${createdCount} trips`, "success");
      }
      if (errors.length > 0) {
        addToast(`${errors.length} rows failed: ${errors.slice(0, 3).join("; ")}...`, "error");
      }

      if (createdCount > 0) {
        onCreated?.();
      }
    } finally {
      setIsCommitting(false);
    }
  };

  const validRows = parsedRows.filter((r) => r.errors.length === 0);
  const invalidRows = parsedRows.filter((r) => r.errors.length > 0);

  const columns: Column[] = [
    { key: "index", header: "Row", sortable: true },
    { key: "customer_code", header: "Customer", sortable: true },
    { key: "vehicle_types", header: "Vehicles", sortable: false },
    {
      key: "schedule_date",
      header: "Date",
      sortable: true,
    },
    {
      key: "errors",
      header: "Status",
      render: (val): React.ReactNode => {
        const errors = val as string[];
        return errors && errors.length > 0 ? (
          <Badge variant="red">Invalid</Badge>
        ) : (
          <Badge variant="green">Valid</Badge>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* File Upload */}
      <Card padding="lg" header={<h3 className="font-semibold">Upload CSV File</h3>}>
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Required columns: customer_code, pickup_address, pickup_lat, pickup_lng, drop_address, drop_lat, drop_lng, vehicle_types, schedule_date
          </p>

          <label className="block">
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-indigo-500 transition-colors">
              <Upload className="w-8 h-8 mx-auto mb-2 text-text-secondary" />
              <p className="text-sm text-text-primary mb-1">Click to select CSV file</p>
              <p className="text-xs text-text-secondary">or drag and drop</p>
            </div>
            <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      </Card>

      {/* Preview */}
      {parsedRows.length > 0 && (
        <Card padding="lg" header={<h3 className="font-semibold">Preview ({parsedRows.length} rows)</h3>}>
          <div className="space-y-4">
            {validRows.length > 0 && (
              <div>
                <p className="text-sm font-medium text-green-400 mb-3">Valid rows: {validRows.length}</p>
                <DataTable
                  columns={columns}
                  data={validRows.map((r) => ({
                    ...r.data,
                    index: r.index,
                    errors: r.errors,
                  })) as Record<string, unknown>[]}
                  pageSize={5}
                  emptyMessage="No valid rows"
                />
              </div>
            )}

            {invalidRows.length > 0 && (
              <div>
                <p className="text-sm font-medium text-red-400 mb-3">Invalid rows: {invalidRows.length}</p>
                <div className="space-y-2">
                  {invalidRows.map((row) => (
                    <div key={row.index} className="p-3 bg-red-900/20 border border-red-700/40 rounded text-xs">
                      <p className="font-medium text-red-300">Row {row.index}:</p>
                      <ul className="mt-1 list-disc list-inside text-red-200 space-y-1">
                        {row.errors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Actions */}
      {validRows.length > 0 && (
        <div className="flex gap-2">
          <Button onClick={handleCommit} variant="primary" loading={isCommitting}>
            Create {validRows.length} Trip{validRows.length !== 1 ? "s" : ""}
          </Button>
        </div>
      )}
    </div>
  );
};

BulkUploadCreation.displayName = "BulkUploadCreation";
