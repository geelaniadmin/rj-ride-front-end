"use client";

import React, { useMemo, useState } from "react";
import { useTenantStore } from "@/stores/tenantStore";
import { useRosterStore } from "@/stores/rosterStore";
import { useToastStore } from "@/stores/toastStore";
import { Card } from "@/components/ui/Card";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { PII } from "@/components/ui/PII";
import { Select } from "@/components/ui/Select";
import { FormField } from "@/components/ui/FormField";
import { Users, Plus, Shield, MapPin, Sun, Moon } from "lucide-react";
import { Employee, Gender, DriverShift, SafetyFlag } from "@/lib/types";

export const EmployeeListTab: React.FC = () => {
  const activeTenantId = useTenantStore((s) => s.activeTenantId);
  const employees = useRosterStore((s) => s.employees);
  const addEmployee = useRosterStore((s) => s.addEmployee);
  const removeEmployee = useRosterStore((s) => s.removeEmployee);
  const addToast = useToastStore((s) => s.addToast);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmp, setNewEmp] = useState({
    employeeId: "",
    name: "",
    phone: "",
    email: "",
    gender: "MALE" as Gender,
    homeAddress: "",
    homeLat: "",
    homeLng: "",
    officeAddress: "",
    officeLat: "",
    officeLng: "",
    officeZone: "",
    shift: "DAY" as DriverShift,
    safetyFlags: [] as SafetyFlag[],
  });

  const tenantEmployees = useMemo(
    () => employees.filter((e) => e.tenantId === activeTenantId),
    [employees, activeTenantId]
  );

  const handleAdd = () => {
    if (!newEmp.name.trim() || !newEmp.employeeId.trim()) {
      addToast("Name and Employee ID are required", "error");
      return;
    }

    addEmployee({
      tenantId: activeTenantId,
      employeeId: newEmp.employeeId,
      name: newEmp.name,
      phone: newEmp.phone,
      email: newEmp.email || undefined,
      gender: newEmp.gender,
      homeLat: parseFloat(newEmp.homeLat) || 0,
      homeLng: parseFloat(newEmp.homeLng) || 0,
      homeAddress: newEmp.homeAddress,
      officeLat: parseFloat(newEmp.officeLat) || 0,
      officeLng: parseFloat(newEmp.officeLng) || 0,
      officeAddress: newEmp.officeAddress,
      officeZone: newEmp.officeZone || undefined,
      shift: newEmp.shift,
      safetyFlags: newEmp.safetyFlags,
      active: true,
    });

    addToast(`Employee ${newEmp.name} added`, "success");
    setShowAddModal(false);
    setNewEmp({
      employeeId: "",
      name: "",
      phone: "",
      email: "",
      gender: "MALE",
      homeAddress: "",
      homeLat: "",
      homeLng: "",
      officeAddress: "",
      officeLat: "",
      officeLng: "",
      officeZone: "",
      shift: "DAY",
      safetyFlags: [],
    });
  };

  const columns: Column[] = [
    {
      key: "employeeId",
      header: "Employee ID",
      sortable: true,
    },
    {
      key: "name",
      header: "Name",
      sortable: true,
      render: (val: unknown) => <PII value={val as string} type="name" />,
    },
    {
      key: "phone",
      header: "Phone",
      render: (val: unknown) => val ? <PII value={val as string} type="phone" /> : "-",
    },
    {
      key: "gender",
      header: "Gender",
      sortable: true,
      render: (val: unknown) => (
        <Badge variant={(val as string) === "FEMALE" ? "purple" : "blue"}>
          {val as string}
        </Badge>
      ),
    },
    {
      key: "shift",
      header: "Shift",
      sortable: true,
      render: (val: unknown) => {
        const s = val as string;
        return (
          <Badge variant={s === "NIGHT" ? "purple" : s === "DAY" ? "amber" : "blue"}>
            {s}
          </Badge>
        );
      },
    },
    {
      key: "officeZone",
      header: "Zone",
      sortable: true,
    },
    {
      key: "safetyFlags",
      header: "Safety",
      render: (val: unknown) => {
        const flags = val as SafetyFlag[];
        if (!flags || flags.length === 0) return <span className="text-text-secondary text-xs">—</span>;
        return (
          <div className="flex gap-1 flex-wrap">
            {flags.includes("LONE_FEMALE") && <Badge variant="red" className="text-[9px]">Female</Badge>}
            {flags.includes("NIGHT_SHIFT") && <Badge variant="purple" className="text-[9px]">Night</Badge>}
            {flags.includes("SPECIAL_NEEDS") && <Badge variant="amber" className="text-[9px]">Needs</Badge>}
            {flags.includes("SENSITIVE") && <Badge variant="red" className="text-[9px]">Sensitive</Badge>}
          </div>
        );
      },
    },
    {
      key: "active",
      header: "Status",
      render: (val: unknown) => (
        <Badge variant={val ? "green" : "amber"}>
          {val ? "Active" : "Inactive"}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Card padding="lg" header={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-brand-blue" />
            <h3 className="font-semibold">Employees ({tenantEmployees.length})</h3>
          </div>
          <Button size="sm" onClick={() => setShowAddModal(true)}>
            <Plus className="w-3 h-3 mr-1" /> Add Employee
          </Button>
        </div>
      }>
        <div className="mb-3 flex items-center gap-2 text-xs text-text-secondary">
          <Shield className="w-3 h-3" />
          <span>All PII is encrypted at rest and masked by default. Tap the eye icon to reveal.</span>
        </div>
        <DataTable
          columns={columns}
          data={tenantEmployees as unknown as Record<string, unknown>[]}
          pageSize={10}
          emptyMessage="No employees registered. Upload a roster CSV or add manually."
        />
      </Card>

      {/* Add Employee Modal */}
      {showAddModal && (
        <Modal open={true} onClose={() => setShowAddModal(false)} title="Add Employee" size="lg">
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Employee ID" required>
                <input
                  type="text"
                  value={newEmp.employeeId}
                  onChange={(e) => setNewEmp((p) => ({ ...p, employeeId: e.target.value }))}
                  placeholder="e.g., EMP001"
                  className="w-full px-3 py-2 bg-ops-bg border border-border rounded-lg text-sm text-text-primary"
                />
              </FormField>
              <FormField label="Full Name" required>
                <input
                  type="text"
                  value={newEmp.name}
                  onChange={(e) => setNewEmp((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g., John Doe"
                  className="w-full px-3 py-2 bg-ops-bg border border-border rounded-lg text-sm text-text-primary"
                />
              </FormField>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField label="Phone">
                <input
                  type="text"
                  value={newEmp.phone}
                  onChange={(e) => setNewEmp((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="+91..."
                  className="w-full px-3 py-2 bg-ops-bg border border-border rounded-lg text-sm text-text-primary"
                />
              </FormField>
              <FormField label="Gender">
                <Select
                  value={newEmp.gender}
                  onChange={(e) => setNewEmp((p) => ({ ...p, gender: e.target.value as Gender }))}
                  options={[
                    { value: "MALE", label: "Male" },
                    { value: "FEMALE", label: "Female" },
                    { value: "OTHER", label: "Other" },
                  ]}
                />
              </FormField>
              <FormField label="Shift">
                <Select
                  value={newEmp.shift}
                  onChange={(e) => setNewEmp((p) => ({ ...p, shift: e.target.value as DriverShift }))}
                  options={[
                    { value: "DAY", label: "Day" },
                    { value: "NIGHT", label: "Night" },
                    { value: "FLEX", label: "Flex" },
                  ]}
                />
              </FormField>
            </div>

            <FormField label="Office Zone">
              <input
                type="text"
                value={newEmp.officeZone}
                onChange={(e) => setNewEmp((p) => ({ ...p, officeZone: e.target.value }))}
                placeholder="e.g., ZONE_A"
                className="w-full px-3 py-2 bg-ops-bg border border-border rounded-lg text-sm text-text-primary"
              />
            </FormField>

            <div className="border-t border-border pt-4">
              <p className="text-sm font-medium text-text-primary mb-2 flex items-center gap-2">
                <MapPin className="w-4 h-4" /> Home Location
              </p>
              <div className="grid grid-cols-3 gap-4">
                <FormField label="Address">
                  <input
                    type="text"
                    value={newEmp.homeAddress}
                    onChange={(e) => setNewEmp((p) => ({ ...p, homeAddress: e.target.value }))}
                    placeholder="123 Main St"
                    className="w-full px-3 py-2 bg-ops-bg border border-border rounded-lg text-sm text-text-primary"
                  />
                </FormField>
                <FormField label="Latitude">
                  <input
                    type="number"
                    step="any"
                    value={newEmp.homeLat}
                    onChange={(e) => setNewEmp((p) => ({ ...p, homeLat: e.target.value }))}
                    placeholder="12.9719"
                    className="w-full px-3 py-2 bg-ops-bg border border-border rounded-lg text-sm text-text-primary"
                  />
                </FormField>
                <FormField label="Longitude">
                  <input
                    type="number"
                    step="any"
                    value={newEmp.homeLng}
                    onChange={(e) => setNewEmp((p) => ({ ...p, homeLng: e.target.value }))}
                    placeholder="77.5937"
                    className="w-full px-3 py-2 bg-ops-bg border border-border rounded-lg text-sm text-text-primary"
                  />
                </FormField>
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <p className="text-sm font-medium text-text-primary mb-2 flex items-center gap-2">
                <MapPin className="w-4 h-4" /> Office Location
              </p>
              <div className="grid grid-cols-3 gap-4">
                <FormField label="Address">
                  <input
                    type="text"
                    value={newEmp.officeAddress}
                    onChange={(e) => setNewEmp((p) => ({ ...p, officeAddress: e.target.value }))}
                    placeholder="456 Oak Ave"
                    className="w-full px-3 py-2 bg-ops-bg border border-border rounded-lg text-sm text-text-primary"
                  />
                </FormField>
                <FormField label="Latitude">
                  <input
                    type="number"
                    step="any"
                    value={newEmp.officeLat}
                    onChange={(e) => setNewEmp((p) => ({ ...p, officeLat: e.target.value }))}
                    placeholder="12.9344"
                    className="w-full px-3 py-2 bg-ops-bg border border-border rounded-lg text-sm text-text-primary"
                  />
                </FormField>
                <FormField label="Longitude">
                  <input
                    type="number"
                    step="any"
                    value={newEmp.officeLng}
                    onChange={(e) => setNewEmp((p) => ({ ...p, officeLng: e.target.value }))}
                    placeholder="77.6101"
                    className="w-full px-3 py-2 bg-ops-bg border border-border rounded-lg text-sm text-text-primary"
                  />
                </FormField>
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <p className="text-sm font-medium text-text-primary mb-2 flex items-center gap-2">
                <Shield className="w-4 h-4" /> Safety Flags
              </p>
              <div className="flex flex-wrap gap-3">
                {(["LONE_FEMALE", "NIGHT_SHIFT", "SPECIAL_NEEDS", "SENSITIVE"] as SafetyFlag[]).map((flag) => (
                  <label key={flag} className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newEmp.safetyFlags.includes(flag)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewEmp((p) => ({ ...p, safetyFlags: [...p.safetyFlags, flag] }));
                        } else {
                          setNewEmp((p) => ({ ...p, safetyFlags: p.safetyFlags.filter((f) => f !== flag) }));
                        }
                      }}
                      className="w-4 h-4"
                    />
                    {flag === "LONE_FEMALE" ? "Lone Female" :
                     flag === "NIGHT_SHIFT" ? "Night Shift" :
                     flag === "SPECIAL_NEEDS" ? "Special Needs" : "Sensitive"}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleAdd} variant="primary">Add Employee</Button>
              <Button onClick={() => setShowAddModal(false)} variant="ghost">Cancel</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

EmployeeListTab.displayName = "EmployeeListTab";
