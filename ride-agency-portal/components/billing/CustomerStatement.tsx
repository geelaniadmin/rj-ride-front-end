"use client";

import React, { useMemo, useState } from "react";
import { useBillingStore } from "@/stores/billingStore";
import { useCustomerStore } from "@ride/shared";
import { useTenantStore } from "@ride/shared";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FormField } from "@/components/ui/FormField";
import { Badge } from "@/components/ui/Badge";
import { useToastStore } from "@/stores/toastStore";
import { Download, Printer } from "lucide-react";

export const CustomerStatement: React.FC = () => {
  const activeTenantId = useTenantStore((s) => s.activeTenantId);
  const allCustomers = useCustomerStore((s) => s.customers) || [];
  const allBillingTrips = useBillingStore((s) => s.billableTrips);

  const customers = useMemo(() => allCustomers.filter((c) => c.tenantId === activeTenantId), [allCustomers, activeTenantId]);
  const addToast = useToastStore((s) => s.addToast);

  const [filters, setFilters] = useState({
    customerId: customers[0]?.id || "",
    dateFrom: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split("T")[0],
    dateTo: new Date().toISOString().split("T")[0],
  });

  const [selectedTrips, setSelectedTrips] = useState<string[]>([]);

  const trips = useMemo(() => {
    if (!filters.customerId) return [];
    let filtered = allBillingTrips.filter((t) => t.customerId === filters.customerId);
    if (filters.dateFrom && filters.dateTo) {
      const fromTime = new Date(filters.dateFrom).getTime();
      const toTime = new Date(filters.dateTo).getTime();
      filtered = filtered.filter((t) => {
        const tripTime = new Date(t.createdAt).getTime();
        return tripTime >= fromTime && tripTime <= toTime;
      });
    }
    return filtered;
  }, [filters.customerId, filters.dateFrom, filters.dateTo, allBillingTrips]);

  const customer = customers.find((c) => c.id === filters.customerId);

  const totals = useMemo(() => {
    const filteredTrips = selectedTrips.length > 0 ? trips.filter((t) => selectedTrips.includes(t.id)) : trips;
    return {
      trips: filteredTrips.length,
      subtotal: filteredTrips.reduce((sum, t) => sum + t.subtotal, 0),
      fees: filteredTrips.reduce((sum, t) => sum + t.operatorFee, 0),
      total: filteredTrips.reduce((sum, t) => sum + t.total, 0),
      currency: "INR",
    };
  }, [trips, selectedTrips]);

  const handleExportCSV = () => {
    const filteredTrips = selectedTrips.length > 0 ? trips.filter((t) => selectedTrips.includes(t.id)) : trips;

    const csv = [
      ["Customer Statement"],
      [customer?.name, "", "", ""],
      ["Date Range", filters.dateFrom, "to", filters.dateTo],
      ["Generated", new Date().toISOString().split("T")[0], "", ""],
      [""],
      ["Trip ID", "Cost", "Operator Fee", "Total"],
      ...filteredTrips.map((t) => [t.tripId, t.subtotal, t.operatorFee, t.total]),
      [""],
      ["TOTALS", totals.subtotal, totals.fees, totals.total],
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `statement-${filters.customerId}-${filters.dateFrom}.csv`;
    a.click();

    addToast("Statement exported as CSV", "success");
  };

  const handlePrint = () => {
    window.print();
    addToast("Print dialog opened", "info");
  };

  return (
    <div className="space-y-4 print:p-0">
      {/* Filters */}
      <Card padding="lg" header={<h3 className="font-semibold">🔍 Statement Filters</h3>} className="print:hidden">
        <div className="space-y-4">
          <FormField label="Customer" required>
            <Select
              options={customers.map((c) => ({ value: c.id, label: `${c.name} (${c.code})` }))}
              value={filters.customerId}
              onChange={(e) => {
                setFilters((p) => ({ ...p, customerId: e.target.value }));
                setSelectedTrips([]);
              }}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="From Date" required>
              <Input type="date" value={filters.dateFrom} onChange={(e) => setFilters((p) => ({ ...p, dateFrom: e.target.value }))} />
            </FormField>
            <FormField label="To Date" required>
              <Input type="date" value={filters.dateTo} onChange={(e) => setFilters((p) => ({ ...p, dateTo: e.target.value }))} />
            </FormField>
          </div>

          <div className="flex gap-2 justify-end">
            <Button onClick={handleExportCSV} variant="secondary">
              <Download className="w-4 h-4 mr-1" /> Export CSV
            </Button>
            <Button onClick={handlePrint} variant="secondary">
              <Printer className="w-4 h-4 mr-1" /> Print
            </Button>
          </div>
        </div>
      </Card>

      {/* Statement Header */}
      {customer && (
        <Card padding="lg" className="print:border-0 print:bg-transparent">
          <div className="space-y-2 text-sm">
            <p className="text-xl font-bold text-text-primary">Statement of Charges</p>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-text-secondary">Customer</p>
                <p className="text-text-primary">{customer.name}</p>
              </div>
              <div>
                <p className="text-text-secondary">Code</p>
                <p className="text-text-primary">{customer.code}</p>
              </div>
              <div>
                <p className="text-text-secondary">Period</p>
                <p className="text-text-primary">
                  {filters.dateFrom && filters.dateTo && (
                    <>
                      {new Date(filters.dateFrom).toLocaleDateString()} to {new Date(filters.dateTo).toLocaleDateString()}
                    </>
                  )}
                </p>
              </div>
              <div>
                <p className="text-text-secondary">Generated</p>
                <p className="text-text-primary">{new Date().toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Trip List */}
      <Card padding="lg" header={<h3 className="font-semibold">🚗 Trips ({trips.length})</h3>}>
        {trips.length === 0 ? (
          <p className="text-sm text-text-tertiary text-center py-4">No trips in this period</p>
        ) : (
          <div className="space-y-2 print:space-y-0">
            {trips.map((trip) => (
              <label key={trip.id} className="flex items-center gap-2 p-3 bg-ops-bg rounded border border-border cursor-pointer hover:border-border print:border-0 print:bg-transparent print:p-1">
                <input
                  type="checkbox"
                  checked={selectedTrips.includes(trip.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedTrips([...selectedTrips, trip.id]);
                    } else {
                      setSelectedTrips(selectedTrips.filter((t) => t !== trip.id));
                    }
                  }}
                  className="w-4 h-4 rounded print:hidden"
                />
                <div className="flex-1 grid grid-cols-4 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-text-secondary">Trip</p>
                    <p className="text-text-primary">{trip.tripId}</p>
                  </div>
                  <div>
                    <p className="text-xs text-text-secondary">Date</p>
                    <p className="text-text-primary">{new Date(trip.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-text-secondary">Amount</p>
                    <p className="text-text-primary">{trip.currency} {trip.subtotal.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-text-secondary">Total</p>
                    <p className="text-green-400 font-medium">{trip.currency} {trip.total.toLocaleString()}</p>
                  </div>
                </div>
              </label>
            ))}
          </div>
        )}
      </Card>

      {/* Summary */}
      {trips.length > 0 && (
        <Card padding="lg" className="print:border-0 print:bg-transparent print:p-0">
          <div className="space-y-3 text-sm">
            <div className="border-t border-border pt-3 print:border-t-2 print:border-black print:pt-2">
              <div className="flex items-center justify-between mb-2 print:text-sm">
                <span className="text-text-secondary">Trip Count</span>
                <span className="text-text-primary">{totals.trips}</span>
              </div>
              <div className="flex items-center justify-between mb-2 print:text-sm">
                <span className="text-text-secondary">Subtotal</span>
                <span className="text-text-primary">{totals.currency} {totals.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between mb-2 print:text-sm">
                <span className="text-text-secondary">Operator Platform Fee</span>
                <span className="text-amber-400">{totals.currency} {totals.fees.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-base font-bold print:text-lg print:border-t print:border-black print:pt-2">
                <span className="text-text-primary">Total Charges</span>
                <span className="text-green-400">{totals.currency} {totals.total.toLocaleString()}</span>
              </div>
            </div>

            {customer?.defaultCostCenter && (
              <div className="text-xs text-text-secondary pt-2">
                <p className="font-medium">Cost Center: {customer.defaultCostCenter}</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Footer */}
      <Card padding="lg" className="text-xs text-text-secondary print:border-0 print:bg-transparent print:text-black print:p-0 print:mt-4">
        <p>This is an automatically generated statement. For disputes, contact customer support within 7 days of receipt.</p>
      </Card>
    </div>
  );
};

CustomerStatement.displayName = "CustomerStatement";
