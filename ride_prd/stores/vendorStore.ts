import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Vendor, ID } from "@/lib/types";
import { id } from "@/lib/mock";

interface VendorStore {
  vendors: Vendor[];
  addVendor: (vendor: Omit<Vendor, "id">) => void;
  updateVendor: (id: ID, updates: Partial<Vendor>) => void;
  toggleVendor: (id: ID) => void;
  getVendorsByTenant: (tenantId: ID) => Vendor[];
}

const SEED_VENDORS: Vendor[] = [
  {
    id: "V1",
    tenantId: "T1",
    name: "Hubballi Transport (Self)",
    type: "SELF",
    gstin: "29ABCDE1234F1Z5" as string | undefined,
    contactName: "Prakash Kumar",
    phone: "+919876543210",
    email: "contact@hubballi-transport.local",
    active: true,
  },
  {
    id: "V2",
    tenantId: "T1",
    name: "Royal Cabs Sub-Vendor",
    type: "SUB_VENDOR",
    gstin: "29XYZAB9876F1Z5",
    contactName: "Suresh Gowda",
    phone: "+919988776655",
    email: "royal@cabs.local",
    active: true,
  },
  {
    id: "V3",
    tenantId: "T1",
    name: "Express Logistics",
    type: "SUB_VENDOR",
    contactName: "Ananya Singh",
    phone: "+919123456789",
    email: "ops@expresslog.local",
    active: true,
  },
  {
    id: "V4",
    tenantId: "T2",
    name: "Bengaluru Rides (Self)",
    type: "SELF",
    gstin: "29DEFGH5678G1Z5",
    contactName: "Rajesh Nair",
    phone: "+919555666777",
    email: "ops@bengaluru-rides.local",
    active: true,
  },
  {
    id: "V5",
    tenantId: "T2",
    name: "Swift Motors",
    type: "SUB_VENDOR",
    contactName: "Hari Prasad",
    phone: "+919777888999",
    email: "swift@motors.local",
    active: true,
  },
  {
    id: "V6",
    tenantId: "T3",
    name: "Gulf Express (Self)",
    type: "SELF",
    gstin: undefined,
    contactName: "Ahmed Al-Mazrouei",
    phone: "+971501234567",
    email: "ops@gulfexpress.ae",
    active: true,
  },
];

export const useVendorStore = create<VendorStore>()(
  persist(
    (set, get) => ({
      vendors: SEED_VENDORS,
      addVendor: (vendor) => {
        set((state) => ({
          vendors: [...state.vendors, { ...vendor, id: id() }],
        }));
      },
      updateVendor: (vid, updates) => {
        set((state) => ({
          vendors: state.vendors.map((v) => (v.id === vid ? { ...v, ...updates } : v)),
        }));
      },
      toggleVendor: (vid) => {
        set((state) => ({
          vendors: state.vendors.map((v) => (v.id === vid ? { ...v, active: !v.active } : v)),
        }));
      },
      getVendorsByTenant: (tenantId) => {
        return get().vendors.filter((v) => v.tenantId === tenantId);
      },
    }),
    {
      name: "ride-vendors",
    }
  )
);
