"use client";

import { useEffect } from "react";
import { seedTrips } from "@/lib/mock/seed";
import { useCustomerStore, useDriverStore, useVehicleStore, useVehicleTypeStore } from "@ride/shared";
import { useRosterStore } from "@/stores/rosterStore";
import { usePoolingStore } from "@/stores/poolingStore";

const SEED_CUSTOMERS = [
  {
    id: "C1",
    tenantId: "T1",
    name: "IndiGo Airlines",
    code: "INDIGO",
    billingCycle: "MONTHLY" as const,
    spocName: "Priya Sharma",
    phone: "+919123456789",
    email: "dispatcher@indigo.local",
    approvedVehicleTypeIds: ["VT1", "VT2", "VT3"],
    defaultCostCenter: "AIR-HUB-001",
    active: true,
  },
  {
    id: "C2",
    tenantId: "T1",
    name: "Acme Logistics Ltd",
    code: "ACME-LOG",
    billingCycle: "FORTNIGHTLY" as const,
    spocName: "Vikram Reddy",
    phone: "+919988776655",
    email: "transport@acme.local",
    approvedVehicleTypeIds: ["VT1", "VT2", "VT4"],
    defaultCostCenter: "LOG-KA-001",
    active: true,
  },
  {
    id: "C3",
    tenantId: "T1",
    name: "TechCorp India Pvt Ltd",
    code: "TECHCORP",
    billingCycle: "WEEKLY" as const,
    spocName: "Anjali Gupta",
    phone: "+919555666777",
    email: "admin@techcorp.local",
    approvedVehicleTypeIds: ["VT1", "VT2"],
    defaultCostCenter: "TECH-BNG-001",
    active: true,
  },
  {
    id: "C4",
    tenantId: "T2",
    name: "SpiceJet Airlines",
    code: "SPICEJET",
    billingCycle: "MONTHLY" as const,
    spocName: "Rohan Verma",
    phone: "+919111222333",
    email: "logistics@spicejet.local",
    approvedVehicleTypeIds: ["VT1", "VT2", "VT3"],
    defaultCostCenter: "AIR-BNG-001",
    active: true,
  },
  {
    id: "C5",
    tenantId: "T2",
    name: "Bangalore Tech Hub",
    code: "BTH-2024",
    billingCycle: "MONTHLY" as const,
    spocName: "Neha Singh",
    phone: "+919444555666",
    email: "transport@techub.local",
    approvedVehicleTypeIds: ["VT1"],
    defaultCostCenter: "TECH-HUB-001",
    active: true,
  },
  {
    id: "C6",
    tenantId: "T3",
    name: "Emirates Airlines",
    code: "EMIRATES",
    billingCycle: "MONTHLY" as const,
    spocName: "Fatima Al-Dosari",
    phone: "+971501234567",
    email: "dispatch@emirates.ae",
    approvedVehicleTypeIds: ["VT1", "VT2", "VT3"],
    defaultCostCenter: "AIR-UAE-001",
    active: true,
  },
];

/**
 * Seeds demo customer & trip data into Zustand stores on first mount.
 * Also listens for cross-tab storage changes from ops-portal.
 * Renders nothing — purely a side-effect initializer.
 */
// Seed data for vehicle types, vehicles, and drivers
const SEED_VEHICLE_TYPES = [
  { id: "VT1", tenantId: "T1", name: "Sedan", seatingCapacity: 4, ac: true, class: "Economy", active: true },
  { id: "VT2", tenantId: "T1", name: "SUV", seatingCapacity: 6, ac: true, class: "Premium", active: true },
  { id: "VT3", tenantId: "T1", name: "Tempo Traveller", seatingCapacity: 12, ac: true, class: "Luxury", active: true },
  { id: "VT4", tenantId: "T1", name: "Coach", seatingCapacity: 35, ac: true, class: "Luxury", active: true },
  { id: "VT5", tenantId: "T2", name: "Sedan", seatingCapacity: 4, ac: true, class: "Economy", active: true },
  { id: "VT6", tenantId: "T2", name: "SUV", seatingCapacity: 6, ac: true, class: "Premium", active: true },
  { id: "VT7", tenantId: "T3", name: "Limo", seatingCapacity: 6, ac: true, class: "Luxury", active: true },
  { id: "VT8", tenantId: "T3", name: "SUV", seatingCapacity: 6, ac: true, class: "Premium", active: true },
];

const SEED_VEHICLES = [
  { id: "VH1", tenantId: "T1", ownerVendorId: "V1", ownership: "OWN" as const, vehicleTypeId: "VT1", make: "Maruti", model: "Swift Dzire", year: 2023, registrationNo: "KA05AB1234", seatingCapacity: 4, ac: true, fuelType: "DIESEL" as const, traccarDeviceId: "TRA-001", documents: [{ kind: "REGISTRATION" as const, number: "KA05AB1234", expiry: "2027-12-31" }, { kind: "INSURANCE" as const, number: "POL-001", expiry: "2026-06-30" }], active: true },
  { id: "VH2", tenantId: "T1", ownerVendorId: "V1", ownership: "OWN" as const, vehicleTypeId: "VT2", make: "Mahindra", model: "XUV700", year: 2024, registrationNo: "KA05CD5678", seatingCapacity: 6, ac: true, fuelType: "DIESEL" as const, traccarDeviceId: "TRA-002", documents: [{ kind: "REGISTRATION" as const, number: "KA05CD5678", expiry: "2028-01-15" }], active: true },
  { id: "VH3", tenantId: "T1", ownerVendorId: "V1", ownership: "OWN" as const, vehicleTypeId: "VT3", make: "Force", model: "Tempo Traveller", year: 2023, registrationNo: "KA05EF9012", seatingCapacity: 12, ac: true, fuelType: "DIESEL" as const, documents: [{ kind: "REGISTRATION" as const, number: "KA05EF9012", expiry: "2027-08-20" }], active: true },
  { id: "VH4", tenantId: "T1", ownerVendorId: "V2", ownership: "SUB_VENDOR" as const, vehicleTypeId: "VT1", make: "Honda", model: "Amaze", year: 2023, registrationNo: "KA05GH3456", seatingCapacity: 4, ac: true, fuelType: "PETROL" as const, documents: [], active: true },
  { id: "VH5", tenantId: "T1", ownerVendorId: "V2", ownership: "SUB_VENDOR" as const, vehicleTypeId: "VT2", make: "Toyota", model: "Fortuner", year: 2024, registrationNo: "KA05IJ7890", seatingCapacity: 6, ac: true, fuelType: "DIESEL" as const, documents: [], active: true },
];

const SEED_DRIVERS = [
  { id: "D1", tenantId: "T1", vendorId: "V1", name: "Rajesh Kumar", phone: "+919111222333", licenceNo: "KA01AB1234", licenceClass: "HMV", documents: [{ kind: "LICENCE" as const, number: "KA01AB1234", expiry: "2028-05-15" }, { kind: "PSV_BADGE" as const, number: "PSV-001", expiry: "2026-03-20" }], languages: ["Hindi", "Kannada", "English"], assignedVehicleIds: ["VH1"], shift: "DAY" as const, rating: 4.5, available: true, active: true },
  { id: "D2", tenantId: "T1", vendorId: "V1", name: "Suresh Gowda", phone: "+919222333444", licenceNo: "KA01CD5678", licenceClass: "HMV", documents: [{ kind: "LICENCE" as const, number: "KA01CD5678", expiry: "2027-11-30" }], languages: ["Kannada", "English"], assignedVehicleIds: ["VH2"], shift: "DAY" as const, rating: 4.8, available: true, active: true },
  { id: "D3", tenantId: "T1", vendorId: "V1", name: "Anand Rao", phone: "+919333444555", licenceNo: "KA01EF9012", licenceClass: "HMV+PSV", documents: [{ kind: "LICENCE" as const, number: "KA01EF9012", expiry: "2026-09-01" }], languages: ["Kannada", "Telugu", "English"], assignedVehicleIds: ["VH3"], shift: "FLEX" as const, rating: 4.2, available: true, active: true },
  { id: "D4", tenantId: "T1", vendorId: "V2", name: "Venkatesh P", phone: "+919444555666", licenceNo: "KA01GH3456", licenceClass: "HMV", documents: [], languages: ["Kannada", "Hindi"], assignedVehicleIds: ["VH4"], shift: "NIGHT" as const, rating: 4.0, available: true, active: true },
  { id: "D5", tenantId: "T1", vendorId: "V2", name: "Manoj K", phone: "+919555666777", licenceNo: "KA01IJ7890", licenceClass: "HMV", documents: [], languages: ["Kannada", "English"], shift: "DAY" as const, rating: 4.6, available: false, active: true },
];

export const SeedInitializer: React.FC = () => {
  useEffect(() => {
    // Defer seeding to the next tick so Zustand persist rehydration completes first.
    // Otherwise persist asynchronously overwrites the seeded data after mount.
    const timer = setTimeout(() => {
      // ── CUSTOMERS: always refresh seed + deduplicate ──
      {
        const store = useCustomerStore.getState();
        const seedIds = new Set(['C1', 'C2', 'C3', 'C4', 'C5', 'C6']);
        const withoutStale = store.customers.filter((c) => !seedIds.has(c.id));
        useCustomerStore.getState().setCustomers([...SEED_CUSTOMERS, ...withoutStale]);
        useCustomerStore.getState().deduplicateCustomers();
      }

      // ── VEHICLE TYPES: always refresh seed + deduplicate ──
      {
        const store = useVehicleTypeStore.getState();
        const seedIds = new Set(['VT1', 'VT2', 'VT3', 'VT4', 'VT5', 'VT6', 'VT7', 'VT8']);
        const withoutStale = store.vehicleTypes.filter((v) => !seedIds.has(v.id));
        useVehicleTypeStore.getState().setVehicleTypes([...SEED_VEHICLE_TYPES, ...withoutStale]);
        useVehicleTypeStore.getState().deduplicateVehicleTypes();
      }

      // ── VEHICLES: always refresh seed + deduplicate ──
      {
        const store = useVehicleStore.getState();
        const seedIds = new Set(['VH1', 'VH2', 'VH3', 'VH4', 'VH5']);
        const withoutStale = store.vehicles.filter((v) => !seedIds.has(v.id));
        useVehicleStore.getState().setVehicles([...SEED_VEHICLES, ...withoutStale]);
        useVehicleStore.getState().deduplicateVehicles();
      }

      // ── DRIVERS: always refresh seed + deduplicate ──
      {
        const store = useDriverStore.getState();
        const seedIds = new Set(['D1', 'D2', 'D3', 'D4', 'D5']);
        const withoutStale = store.drivers.filter((d) => !seedIds.has(d.id));
        useDriverStore.getState().setDrivers([...SEED_DRIVERS, ...withoutStale]);
        useDriverStore.getState().deduplicateDrivers();
      }

      seedTrips();

      // ── ROSTER SEED: Demo employees for route planning ──
      {
        const store = useRosterStore.getState();
        if (store.employees.length === 0) {
          const today = new Date().toISOString().split("T")[0] || "2026-07-01";

          const empData = [
            { employeeId: "TCH001", name: "Arjun Mehta", phone: "+919555666001", gender: "MALE" as const, homeLat: 12.9352, homeLng: 77.6245, homeAddress: "JP Nagar, Bangalore", officeLat: 12.9344, officeLng: 77.6101, officeAddress: "TechCorp, BTM Layout", officeZone: "ZONE_A", shift: "DAY" as const, safetyFlags: [] as const },
            { employeeId: "TCH002", name: "Priya Reddy", phone: "+919555666002", gender: "FEMALE" as const, homeLat: 12.9286, homeLng: 77.6056, homeAddress: "BTM Layout, Bangalore", officeLat: 12.9344, officeLng: 77.6101, officeAddress: "TechCorp, BTM Layout", officeZone: "ZONE_A", shift: "DAY" as const, safetyFlags: ["LONE_FEMALE"] as const },
            { employeeId: "TCH003", name: "Rahul Verma", phone: "+919555666003", gender: "MALE" as const, homeLat: 12.9417, homeLng: 77.6154, homeAddress: "Jayanagar, Bangalore", officeLat: 12.9344, officeLng: 77.6101, officeAddress: "TechCorp, BTM Layout", officeZone: "ZONE_A", shift: "DAY" as const, safetyFlags: [] as const },
            { employeeId: "TCH004", name: "Sneha Kapoor", phone: "+919555666004", gender: "FEMALE" as const, homeLat: 12.9500, homeLng: 77.6300, homeAddress: "HSR Layout, Bangalore", officeLat: 12.9344, officeLng: 77.6101, officeAddress: "TechCorp, BTM Layout", officeZone: "ZONE_A", shift: "NIGHT" as const, safetyFlags: ["NIGHT_SHIFT", "LONE_FEMALE"] as const },
            { employeeId: "TCH005", name: "Vikram Singh", phone: "+919555666005", gender: "MALE" as const, homeLat: 12.9719, homeLng: 77.5937, homeAddress: "MG Road, Bangalore", officeLat: 12.9344, officeLng: 77.6101, officeAddress: "TechCorp, BTM Layout", officeZone: "ZONE_A", shift: "DAY" as const, safetyFlags: [] as const },
            { employeeId: "ACM001", name: "Kiran Patel", phone: "+919555666006", gender: "MALE" as const, homeLat: 12.9555, homeLng: 77.6444, homeAddress: "Koramangala, Bangalore", officeLat: 12.9600, officeLng: 77.6400, officeAddress: "Acme Logistics, Koramangala", officeZone: "ZONE_B", shift: "DAY" as const, safetyFlags: [] as const },
            { employeeId: "ACM002", name: "Deepa Nair", phone: "+919555666007", gender: "FEMALE" as const, homeLat: 12.9650, homeLng: 77.6350, homeAddress: "BTM Layout 2nd Stage", officeLat: 12.9600, officeLng: 77.6400, officeAddress: "Acme Logistics, Koramangala", officeZone: "ZONE_B", shift: "DAY" as const, safetyFlags: ["LONE_FEMALE"] as const },
            { employeeId: "ACM003", name: "Mohammed Ali", phone: "+919555666008", gender: "MALE" as const, homeLat: 12.9480, homeLng: 77.6560, homeAddress: "Ejipura, Bangalore", officeLat: 12.9600, officeLng: 77.6400, officeAddress: "Acme Logistics, Koramangala", officeZone: "ZONE_B", shift: "NIGHT" as const, safetyFlags: [] as const },
            { employeeId: "ACM004", name: "Lakshmi Iyer", phone: "+919555666009", gender: "FEMALE" as const, homeLat: 12.9400, homeLng: 77.6200, homeAddress: "Jayanagar 4th Block", officeLat: 12.9600, officeLng: 77.6400, officeAddress: "Acme Logistics, Koramangala", officeZone: "ZONE_B", shift: "NIGHT" as const, safetyFlags: ["NIGHT_SHIFT"] as const },
          ];

          for (const emp of empData) {
            const empId = store.addEmployee({
              tenantId: "T1",
              employeeId: emp.employeeId,
              name: emp.name,
              phone: emp.phone,
              gender: emp.gender,
              homeLat: emp.homeLat,
              homeLng: emp.homeLng,
              homeAddress: emp.homeAddress,
              officeLat: emp.officeLat,
              officeLng: emp.officeLng,
              officeAddress: emp.officeAddress,
              officeZone: emp.officeZone,
              shift: emp.shift,
              safetyFlags: [...emp.safetyFlags],
              active: true,
            });

            store.addRosterEntry({
              tenantId: "T1",
              employeeId: empId,
              date: today,
              startTime: emp.shift === "NIGHT" ? "22:00" : "08:00",
              endTime: emp.shift === "NIGHT" ? "06:00" : "17:00",
              source: "MANUAL_UPLOAD",
            });
          }
        }
      }

      // ── POOLING SEED: Default configs ──
      {
        const store = usePoolingStore.getState();
        if (store.configs.length === 0) {
          store.addConfig({
            tenantId: "T1",
            name: "Office Pooling (Sedan)",
            maxPassengersPerVehicle: 4,
            maxDetourPercent: 30,
            maxWaitMinutes: 10,
            safetyConstraints: [
              { type: "NO_LONE_FEMALE_LAST_DROP", enabled: true },
              { type: "SAME_GENDER_PREFERRED", enabled: false },
              { type: "NIGHT_SHIFT_ESCORT", enabled: true },
              { type: "MAX_TRAVEL_TIME", enabled: true, params: { maxMinutes: 90 } },
              { type: "NO_OVERNIGHT_ALONE", enabled: true },
            ],
            vehicleTypeId: "VT1",
            active: true,
          });

          store.addConfig({
            tenantId: "T1",
            name: "Night Shift Pooling (SUV)",
            maxPassengersPerVehicle: 6,
            maxDetourPercent: 40,
            maxWaitMinutes: 15,
            safetyConstraints: [
              { type: "NO_LONE_FEMALE_LAST_DROP", enabled: true },
              { type: "SAME_GENDER_PREFERRED", enabled: true },
              { type: "NIGHT_SHIFT_ESCORT", enabled: true },
              { type: "MAX_TRAVEL_TIME", enabled: true, params: { maxMinutes: 60 } },
              { type: "NO_OVERNIGHT_ALONE", enabled: true },
            ],
            vehicleTypeId: "VT2",
            active: true,
          });
        }
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Listen for rate card changes from ops-portal (cross-tab sync)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "ride-rate-cards") {
        // Rate cards were updated in ops-portal; reload would happen here in production
        // For now, just acknowledge the event
        console.debug("Rate cards updated from ops-portal");
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  return null;
};

SeedInitializer.displayName = "SeedInitializer";
