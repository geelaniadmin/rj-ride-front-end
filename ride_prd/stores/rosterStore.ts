"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Employee, RosterEntry, RosterChangeLog, RosterUpload, HrmsConnectorConfig, RosterSource, ID } from "@/lib/types";
import { id as idFn } from "@/lib/mock";
import { encryptedStorage } from "@ride/shared";

interface RosterStore {
  // ── Core Data ──
  employees: Employee[];
  rosterEntries: RosterEntry[];
  changeLogs: RosterChangeLog[];
  uploads: RosterUpload[];
  connectors: HrmsConnectorConfig[];

  // ── Employee CRUD ──
  addEmployee: (emp: Omit<Employee, "id">) => string;
  updateEmployee: (id: ID, updates: Partial<Employee>) => void;
  removeEmployee: (id: ID) => void;
  getEmployeesByTenant: (tenantId: ID) => Employee[];
  getEmployeeById: (id: ID) => Employee | undefined;

  // ── Roster CRUD ──
  addRosterEntry: (entry: Omit<RosterEntry, "id" | "createdAt" | "updatedAt">) => string;

  updateRosterEntry: (id: ID, updates: Partial<RosterEntry>, changedBy: string, reason?: string) => void;
  removeRosterEntry: (id: ID) => void;
  getRosterByDateRange: (tenantId: ID, dateFrom: string, dateTo: string) => RosterEntry[];
  getRosterByEmployee: (employeeId: ID) => RosterEntry[];
  getRosterByDate: (tenantId: ID, date: string) => RosterEntry[];

  // ── Change History ──
  getChangeLogs: (rosterEntryId: ID) => RosterChangeLog[];

  // ── Uploads ──
  addUpload: (upload: Omit<RosterUpload, "id" | "uploadedAt">) => string;

  // ── HRMS Connectors ──
  addConnector: (conn: Omit<HrmsConnectorConfig, "id">) => string;
  updateConnector: (id: ID, updates: Partial<HrmsConnectorConfig>) => void;
  removeConnector: (id: ID) => void;
  recordSync: (id: ID) => void;
}

export const useRosterStore = create<RosterStore>()(
  persist(
    (set, get) => ({
      employees: [],
      rosterEntries: [],
      changeLogs: [],
      uploads: [],
      connectors: [],

      // ── Employee CRUD ──
      addEmployee: (emp) => {
        const employeeId = idFn();
        set((state) => ({
          employees: [...state.employees, { ...emp, id: employeeId }],
        }));
        return employeeId;
      },

      updateEmployee: (id, updates) => {
        set((state) => ({
          employees: state.employees.map((e) => (e.id === id ? { ...e, ...updates } : e)),
        }));
      },

      removeEmployee: (id) => {
        set((state) => ({
          employees: state.employees.filter((e) => e.id !== id),
        }));
      },

      getEmployeesByTenant: (tenantId) => {
        return get().employees.filter((e) => e.tenantId === tenantId);
      },

      getEmployeeById: (id) => {
        return get().employees.find((e) => e.id === id);
      },

      // ── Roster CRUD ──
      addRosterEntry: (entry) => {
        const entryId = idFn();
        const now = new Date().toISOString();
        set((state) => ({
          rosterEntries: [
            ...state.rosterEntries,
            { ...entry, id: entryId, createdAt: now, updatedAt: now },
          ],
        }));
        return entryId;
      },

      updateRosterEntry: (id, updates, changedBy, reason) => {
        const existing = get().rosterEntries.find((e) => e.id === id);
        if (!existing) return;

        // Create change log entry
        const changeLog: RosterChangeLog = {
          id: idFn(),
          rosterEntryId: id,
          previousValues: {
            startTime: existing.startTime,
            endTime: existing.endTime,
          },
          newValues: updates as Partial<RosterEntry>,
          changedBy,
          changedAt: new Date().toISOString(),
          reason,
        };

        set((state) => ({
          rosterEntries: state.rosterEntries.map((e) =>
            e.id === id ? { ...e, ...updates, updatedAt: new Date().toISOString() } : e
          ),
          changeLogs: [...state.changeLogs, changeLog],
        }));
      },

      removeRosterEntry: (id) => {
        set((state) => ({
          rosterEntries: state.rosterEntries.filter((e) => e.id !== id),
        }));
      },

      getRosterByDateRange: (tenantId, dateFrom, dateTo) => {
        return get().rosterEntries.filter(
          (e) => e.date >= dateFrom && e.date <= dateTo && get().employees.find((emp) => emp.id === e.employeeId && emp.tenantId === tenantId)
        );
      },

      getRosterByEmployee: (employeeId) => {
        return get().rosterEntries.filter((e) => e.employeeId === employeeId);
      },

      getRosterByDate: (tenantId, date) => {
        return get().rosterEntries.filter(
          (e) => e.date === date && get().employees.find((emp) => emp.id === e.employeeId && emp.tenantId === tenantId)
        );
      },

      // ── Change History ──
      getChangeLogs: (rosterEntryId) => {
        return get().changeLogs.filter((l) => l.rosterEntryId === rosterEntryId);
      },

      // ── Uploads ──
      addUpload: (upload) => {
        const uploadId = idFn();
        set((state) => ({
          uploads: [
            ...state.uploads,
            { ...upload, id: uploadId, uploadedAt: new Date().toISOString() },
          ],
        }));
        return uploadId;
      },

      // ── HRMS Connectors ──
      addConnector: (conn) => {
        const connId = idFn();
        set((state) => ({
          connectors: [...state.connectors, { ...conn, id: connId }],
        }));
        return connId;
      },

      updateConnector: (id, updates) => {
        set((state) => ({
          connectors: state.connectors.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        }));
      },

      removeConnector: (id) => {
        set((state) => ({
          connectors: state.connectors.filter((c) => c.id !== id),
        }));
      },

      recordSync: (id) => {
        set((state) => ({
          connectors: state.connectors.map((c) =>
            c.id === id ? { ...c, lastSyncAt: new Date().toISOString() } : c
          ),
        }));
      },
    }),
    { name: "ride-rosters", storage: createJSONStorage(() => encryptedStorage()) }
  )
);
