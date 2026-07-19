"use client";

import { useEffect } from "react";
import { seedTrips } from "@/lib/mock/seed";
import { useRosterStore } from "@/stores/rosterStore";
import { usePoolingStore } from "@/stores/poolingStore";

export const SeedInitializer: React.FC = () => {
  useEffect(() => {
    const timer = setTimeout(() => {
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

  return null;
};

SeedInitializer.displayName = "SeedInitializer";
