import { create } from "zustand";

interface ConfigFiltersState {
  vendorSearch: string;
  customerSearch: string;
  vehicleTypeSearch: string;
  vehicleSearch: string;
  driverSearch: string;
  rateCardVendorId: string;
  rateCardCustomerId: string;
  rateCardVehicleTypeId: string;

  setVendorSearch: (q: string) => void;
  setCustomerSearch: (q: string) => void;
  setVehicleTypeSearch: (q: string) => void;
  setVehicleSearch: (q: string) => void;
  setDriverSearch: (q: string) => void;
  setRateCardVendorId: (id: string) => void;
  setRateCardCustomerId: (id: string) => void;
  setRateCardVehicleTypeId: (id: string) => void;
}

export const useConfigFiltersStore = create<ConfigFiltersState>()((set) => ({
  vendorSearch: "",
  customerSearch: "",
  vehicleTypeSearch: "",
  vehicleSearch: "",
  driverSearch: "",
  rateCardVendorId: "",
  rateCardCustomerId: "",
  rateCardVehicleTypeId: "",

  setVendorSearch: (q) => set({ vendorSearch: q }),
  setCustomerSearch: (q) => set({ customerSearch: q }),
  setVehicleTypeSearch: (q) => set({ vehicleTypeSearch: q }),
  setVehicleSearch: (q) => set({ vehicleSearch: q }),
  setDriverSearch: (q) => set({ driverSearch: q }),
  setRateCardVendorId: (id) => set({ rateCardVendorId: id }),
  setRateCardCustomerId: (id) => set({ rateCardCustomerId: id }),
  setRateCardVehicleTypeId: (id) => set({ rateCardVehicleTypeId: id }),
}));
