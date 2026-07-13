"use client";

import { useRouter } from "next/navigation";
import { useSessionStore, useVendorStore, useLanguageStore, t } from "@ride/shared";
import type { Vendor } from "@ride/shared";
import { Truck, Globe } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const setVendorSession = useSessionStore((s) => s.setVendorSession);
  const vendors = useVendorStore((s) => s.vendors);
  const updateVendor = useVendorStore((s) => s.updateVendor);
  const activeVendors = vendors.filter((v) => v.active);
  const { language, toggleLanguage } = useLanguageStore();

  const handleLogin = (vendor: Vendor) => {
    // Generate a token on-the-fly if missing (handles legacy vendors created before token field was added)
    let token = vendor.token;
    if (!token) {
      token = `sk_vendor_${vendor.id.slice(0, 8)}_${crypto.randomUUID().slice(0, 8)}`;
      updateVendor(vendor.id, { token });
    }
    setVendorSession({
      vendorId: vendor.id,
      vendorName: vendor.name,
      token,
      loginAt: new Date().toISOString(),
    });
    router.push("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-page-bg">
      {/* Language toggle */}
      <div className="absolute top-6 right-6">
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-border hover:bg-gray-50 transition-colors text-sm font-medium text-text-primary"
          title={t("toggleLanguage", language)}
        >
          <Globe className="w-4 h-4 text-text-muted" />
          <span>{language.toUpperCase()}</span>
        </button>
      </div>

      <div className="bg-card-bg rounded-xl shadow-lg border border-border p-10 w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-sidebar-bg rounded-xl flex items-center justify-center mb-4">
            <Truck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">{t("rideVendorPortal", language)}</h1>
          <p className="text-sm text-text-muted mt-1">{t("signInManageFleet", language)}</p>
        </div>

        <div className="space-y-3">
          {activeVendors.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-8">
              {t("noVendorsRegistered", language)}
            </p>
          ) : (
            activeVendors.map((v, idx) => (
              <button
                key={v.id}
                onClick={() => handleLogin(v)}
                className={`w-full py-4 px-6 rounded-xl font-medium text-lg transition-all flex items-center justify-between group ${
                  idx % 2 === 0
                    ? "bg-sidebar-bg text-white hover:bg-sidebar-bg/90"
                    : "bg-brand-blue text-white hover:bg-brand-blue/90"
                }`}
              >
                <span>{t("loginAs", language)} {v.name}</span>
                <span className="text-xs text-white/60 group-hover:text-white/90 transition-colors">
                  {v.id.slice(0, 12)}
                </span>
              </button>
            ))
          )}
        </div>

        <p className="text-xs text-text-muted text-center mt-8">
          {t("newVendorsAppearAutomatically", language)}
        </p>
      </div>
    </div>
  );
}
