"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, keys, isApiError } from "@ride/shared";
import type { components } from "@ride/shared/api/schema.d";
import { useToastStore } from "@/stores/toastStore";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FormField } from "@/components/ui/FormField";
import { Drawer } from "@/components/ui/Drawer";
import { Plus, Pencil, Trash2, RefreshCw } from "lucide-react";

type RecurringRule = components["schemas"]["RecurringRule"];
type RecurringRuleInput = components["schemas"]["RecurringRuleInput"];
type ConfigCustomer = components["schemas"]["ConfigCustomer"];
type ConfigVehicleType = components["schemas"]["ConfigVehicleType"];

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const DEFAULT_INPUT: RecurringRuleInput = {
  customerId: "",
  freq: "DAILY",
  time: "08:00",
  vehicleSlots: [{ vehicleTypeId: "", slotRef: "slot-1" }],
  stops: [],
  reference: undefined,
};

export const RecurringCreation: React.FC<{ onDone?: () => void }> = () => {
  const addToast = useToastStore((s) => s.addToast);
  const qc = useQueryClient();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RecurringRuleInput>(DEFAULT_INPUT);

  const { data: rules, isLoading } = useQuery({
    queryKey: keys.trips.recurringRules.list(),
    queryFn: async () => {
      const { data: res, error: err } = await apiClient.GET("/v1/trips/recurring-rules", {});
      if (err) throw err;
      return res?.result ?? [];
    },
  });

  const { data: customers } = useQuery({
    queryKey: keys.config.customers.list(),
    queryFn: async () => {
      const { data: res, error: err } = await apiClient.GET("/v1/config/customers", {});
      if (err) throw err;
      return res?.result?.results ?? [];
    },
  });

  const { data: vehicleTypes } = useQuery({
    queryKey: keys.config.vehicleTypes.list(),
    queryFn: async () => {
      const { data: res, error: err } = await apiClient.GET("/v1/config/vehicle-types", {});
      if (err) throw err;
      return res?.result?.results ?? [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingId) {
        const { data: res, error: err } = await apiClient.PATCH("/v1/trips/recurring-rules/{id}", {
          params: { path: { id: editingId } },
          body: form,
        });
        if (err) throw err;
        return res?.result;
      } else {
        const { data: res, error: err } = await apiClient.POST("/v1/trips/recurring-rules", {
          body: form,
        });
        if (err) throw err;
        return res?.result;
      }
    },
    onSuccess: () => {
      addToast(editingId ? "Rule updated" : "Rule created", "success");
      void qc.invalidateQueries({ queryKey: keys.trips.recurringRules.list() });
      setDrawerOpen(false);
      setEditingId(null);
      setForm(DEFAULT_INPUT);
    },
    onError: (err) => {
      addToast(isApiError(err) ? err.message : "Save failed", "error");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error: err } = await apiClient.DELETE("/v1/trips/recurring-rules/{id}", {
        params: { path: { id } },
      });
      if (err) throw err;
    },
    onSuccess: () => {
      addToast("Rule deleted", "success");
      void qc.invalidateQueries({ queryKey: keys.trips.recurringRules.list() });
    },
    onError: (err) => {
      addToast(isApiError(err) ? err.message : "Delete failed", "error");
    },
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(DEFAULT_INPUT);
    setDrawerOpen(true);
  };

  const openEdit = (rule: RecurringRule) => {
    setEditingId(rule.id);
    setForm({
      customerId: rule.customerId,
      freq: rule.freq as "DAILY" | "WEEKLY",
      daysOfWeek: rule.daysOfWeek,
      startDate: rule.startDate,
      endDate: rule.endDate,
      time: rule.time,
      vehicleSlots: [{ vehicleTypeId: "", slotRef: "slot-1" }],
      stops: [],
    });
    setDrawerOpen(true);
  };

  const toggleDay = (day: number) => {
    const current = form.daysOfWeek ?? [];
    const next = current.includes(day) ? current.filter((d) => d !== day) : [...current, day];
    setForm((f) => ({ ...f, daysOfWeek: next }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">
          Configure auto-recurring trip rules. The scheduler creates trips daily/weekly at the set time.
        </p>
        <Button size="sm" onClick={openCreate}>
          <Plus className="w-3 h-3 mr-1" /> New Rule
        </Button>
      </div>

      {isLoading ? (
        <div className="py-4 text-center text-sm text-text-secondary">Loading rules…</div>
      ) : !rules?.length ? (
        <Card padding="lg" className="text-center py-8 text-text-secondary">
          <RefreshCw className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No recurring rules yet.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {rules.map((rule: RecurringRule) => {
            const customer = (customers as ConfigCustomer[] | undefined)?.find((c) => c.id === rule.customerId);
            return (
              <Card key={rule.id} padding="md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      {customer?.name ?? rule.customerId} · {rule.freq}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {rule.time}
                      {rule.daysOfWeek?.length ? ` — ${rule.daysOfWeek.map((d) => DAYS_OF_WEEK[d]).join(", ")}` : ""}
                      {rule.startDate && ` · from ${rule.startDate}`}
                      {rule.endDate && ` to ${rule.endDate}`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(rule)}>
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-danger"
                      onClick={() => deleteMutation.mutate(rule.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Drawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setEditingId(null); }}
        title={editingId ? "Edit Rule" : "New Recurring Rule"}
      >
        <div className="space-y-4 p-4">
          <FormField label="Customer">
            <Select
              value={form.customerId}
              onChange={(e) => setForm((f) => ({ ...f, customerId: e.target.value }))}
              options={(customers as ConfigCustomer[] ?? []).map((c) => ({ value: c.id, label: c.name }))}
            />
          </FormField>

          <FormField label="Frequency">
            <Select
              value={form.freq}
              onChange={(e) => setForm((f) => ({ ...f, freq: e.target.value as "DAILY" | "WEEKLY" }))}
              options={[{ value: "DAILY", label: "Daily" }, { value: "WEEKLY", label: "Weekly" }]}
            />
          </FormField>

          {form.freq === "WEEKLY" && (
            <FormField label="Days of Week">
              <div className="flex gap-1 flex-wrap">
                {DAYS_OF_WEEK.map((day, i) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(i)}
                    className={`px-2 py-1 text-xs rounded border transition-colors ${
                      form.daysOfWeek?.includes(i) ? "bg-brand-blue text-white border-brand-blue" : "border-border text-text-secondary"
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </FormField>
          )}

          <FormField label="Time">
            <Input
              type="time"
              value={form.time}
              onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-2">
            <FormField label="Start Date">
              <Input
                type="date"
                value={form.startDate ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value || undefined }))}
              />
            </FormField>
            <FormField label="End Date">
              <Input
                type="date"
                value={form.endDate ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value || undefined }))}
              />
            </FormField>
          </div>

          <FormField label="Vehicle Type">
            <Select
              value={form.vehicleSlots[0]?.vehicleTypeId ?? ""}
              onChange={(e) => setForm((f) => ({
                ...f,
                vehicleSlots: [{ vehicleTypeId: e.target.value, slotRef: "slot-1" }],
              }))}
              options={(vehicleTypes as ConfigVehicleType[] ?? []).map((v) => ({ value: v.id, label: v.name }))}
            />
          </FormField>

          <Button
            onClick={() => saveMutation.mutate()}
            variant="primary"
            className="w-full"
            disabled={!form.customerId || !form.time || saveMutation.isPending}
          >
            {saveMutation.isPending ? "Saving…" : editingId ? "Update Rule" : "Create Rule"}
          </Button>
        </div>
      </Drawer>
    </div>
  );
};

RecurringCreation.displayName = "RecurringCreation";
