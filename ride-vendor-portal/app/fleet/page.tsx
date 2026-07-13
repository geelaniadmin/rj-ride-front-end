"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useSessionStore, useDriverStore, useVehicleStore, useVehicleTypeStore, useAlertStore, useLanguageStore, t } from "@ride/shared";
import { useFleetAlerts } from "@/hooks/useFleetAlerts";
import { Tabs, type Tab } from "@/components/ui/Tabs";
import { KpiCard } from "@/components/ui/KpiCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { PiiField } from "@/components/ui/PiiField";
import { Drawer } from "@/components/ui/Drawer";
import { useDebounce } from "@/hooks/useDebounce";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Truck, Users, AlertTriangle, FileText, Search, X,
  Star, Shield,
  CheckCircle, XCircle, ChevronRight, Eye,
  Car, User, IdCard
} from "lucide-react";

export default function FleetPage() {
  const vendorSession = useSessionStore((s) => s.vendorSession);
  const drivers = useDriverStore((s) => s.drivers);
  const vehicles = useVehicleStore((s) => s.vehicles);
  const vehicleTypes = useVehicleTypeStore((s) => s.vehicleTypes);
  const dismissAlert = useAlertStore((s) => s.dismissAlert);
  const markAlertRead = useAlertStore((s) => s.markAlertRead);
  const language = useLanguageStore((s) => s.language);

  if (!vendorSession) return null;

  const vendorId = vendorSession.vendorId;

  const vendorVehicles = useMemo(
    () => vehicles.filter((v) => v.ownerVendorId === vendorId),
    [vehicles, vendorId]
  );
  const vendorDrivers = useMemo(
    () => drivers.filter((d) => d.vendorId === vendorId),
    [drivers, vendorId]
  );

  const { computedAlerts, highCount, mediumCount, lowCount } = useFleetAlerts(vendorId);

  const [activeTab, setActiveTab] = useState("vehicles");
  const tabs: Tab[] = [
    { id: "vehicles", label: t("vehicles", language), count: vendorVehicles.length },
    { id: "drivers", label: t("drivers", language), count: vendorDrivers.length },
    { id: "alerts", label: t("alerts", language), count: highCount + mediumCount + lowCount },
  ];

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [alertSeverity, setAlertSeverity] = useState<string>("ALL");
  const [selectedVehicle, setSelectedVehicle] = useState<typeof vendorVehicles[0] | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<typeof vendorDrivers[0] | null>(null);
  const [showVehicleDrawer, setShowVehicleDrawer] = useState(false);
  const [showDriverDrawer, setShowDriverDrawer] = useState(false);

  const getVehicleTypeName = useCallback(
    (typeId: string) => vehicleTypes.find((vt) => vt.id === typeId)?.name || "Unknown",
    [vehicleTypes]
  );

  const driversOnDuty = vendorDrivers.filter((d) => d.available && d.active).length;
  const activeAlerts = highCount + mediumCount + lowCount;
  const docsExpiringSoon = computedAlerts.filter((a) => a.type === "DOC_EXPIRY" && a.daysRemaining !== undefined && a.daysRemaining >= 0 && a.daysRemaining <= 14).length;

  // === VEHICLE TAB ===
  const filteredVehicles = useMemo(() => {
    if (!debouncedSearchQuery) return vendorVehicles;
    const q = debouncedSearchQuery.toLowerCase();
    return vendorVehicles.filter(
      (v) =>
        v.registrationNo.toLowerCase().includes(q) ||
        v.make.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q) ||
        v.fuelType.toLowerCase().includes(q)
    );
  }, [vendorVehicles, debouncedSearchQuery]);

  const findDriverForVehicle = useCallback(
    (vehicleId: string) => vendorDrivers.find((d) => d.assignedVehicleIds?.includes(vehicleId)),
    [vendorDrivers]
  );

  const vehicleColumns: Column<(typeof vendorVehicles)[0]>[] = [
    { key: "registrationNo", header: t("registration", language), render: (v) => <span className="font-mono text-sm">{v.registrationNo}</span>, sortable: true },
    { key: "makeModel", header: t("makeModel", language), render: (v) => <span className="text-sm">{v.make} {v.model} ({v.year || "—"})</span>, sortable: true },
    { key: "vehicleType", header: t("type", language), render: (v) => <span className="text-sm">{getVehicleTypeName(v.vehicleTypeId)}</span> },
    { key: "fuelType", header: t("fuel", language), render: (v) => <span className="text-xs capitalize">{v.fuelType.toLowerCase()}</span>, sortable: true },
    { key: "seating", header: t("seats", language), render: (v) => <span className="text-sm">{v.seatingCapacity}</span> },
    { key: "ac", header: t("ac", language), render: (v) => v.ac ? <CheckCircle className="w-4 h-4 text-success" /> : <XCircle className="w-4 h-4 text-text-muted" /> },
    { key: "driver", header: t("driver", language), render: (v) => {
      const driver = findDriverForVehicle(v.id);
      return driver ? <PiiField value={driver.name} /> : <span className="text-text-muted">—</span>;
    }},
    { key: "status", header: t("status", language), render: (v) => v.active ? <StatusBadge status="AVAILABLE" /> : <StatusBadge status="OFFLINE" /> },
  ];

  // === DRIVER TAB ===
  const filteredDrivers = useMemo(() => {
    if (!debouncedSearchQuery) return vendorDrivers;
    const q = debouncedSearchQuery.toLowerCase();
    return vendorDrivers.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.phone.includes(q) ||
        d.licenceNo.toLowerCase().includes(q)
    );
  }, [vendorDrivers, debouncedSearchQuery]);

  const findVehicleForDriver = useCallback(
    (driverId: string) => {
      const driver = vendorDrivers.find((d) => d.id === driverId);
      if (!driver?.assignedVehicleIds?.length) return undefined;
      return vendorVehicles.find((v) => driver.assignedVehicleIds!.includes(v.id));
    },
    [vendorDrivers, vendorVehicles]
  );

  const driverColumns: Column<(typeof vendorDrivers)[0]>[] = [
    { key: "name", header: t("name", language), render: (d) => <PiiField value={d.name} />, sortable: true },
    { key: "phone", header: t("phone", language), render: (d) => <PiiField value={d.phone} /> },
    { key: "licenceNo", header: t("licence", language), render: (d) => <PiiField value={d.licenceNo} /> },
    { key: "shift", header: t("shift", language), render: (d) => <span className="text-sm capitalize">{d.shift?.toLowerCase() || "—"}</span>, sortable: true },
    { key: "rating", header: t("rating", language), render: (d) => (
      <span className="flex items-center gap-1 text-sm">
        {d.rating ? <><Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /> {d.rating.toFixed(1)}</> : "—"}
      </span>
    ), sortable: true },
    { key: "vehicle", header: t("vehicle", language), render: (d) => {
      const vehicle = findVehicleForDriver(d.id);
      return vehicle ? <span className="font-mono text-xs">{vehicle.registrationNo}</span> : <span className="text-text-muted">—</span>;
    }},
    { key: "status", header: t("status", language), render: (d) => {
      if (!d.active) return <StatusBadge status="OFFLINE" />;
      return d.available ? <StatusBadge status="AVAILABLE" /> : <StatusBadge status="ON_TRIP" />;
    }},
    { key: "languages", header: t("languages", language), render: (d) => <span className="text-xs text-text-muted">{d.languages?.join(", ") || "—"}</span> },
  ];

  // === ALERTS TAB ===
  const filteredAlerts = useMemo(() => {
    if (alertSeverity === "ALL") return computedAlerts;
    return computedAlerts.filter((a) => a.severity === alertSeverity);
  }, [computedAlerts, alertSeverity]);

  const handleDismissAlert = (alertId: string) => {
    dismissAlert(alertId);
  };

  const getDocStatus = (expiry?: string) => {
    if (!expiry) return { status: "unknown", label: t("noExpiry", language), color: "text-text-muted" };
    const now = new Date();
    const exp = new Date(expiry);
    const days = Math.ceil((exp.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
    if (days < 0) return { status: "expired", label: `${t("expired", language)} ${Math.abs(days)}${t("daysAgo", language)}`, color: "text-danger" };
    if (days <= 7) return { status: "critical", label: `${days}${t("daysLeft", language)}`, color: "text-danger font-semibold" };
    if (days <= 30) return { status: "warning", label: `${days}${t("daysLeft", language)}`, color: "text-warning" };
    return { status: "valid", label: `${days}${t("daysLeft", language)}`, color: "text-success" };
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text-primary">{t("fleetManagement", language)}</h2>
        <p className="text-sm text-text-muted mt-1">{t("manageVehiclesDrivers", language)}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label={t("totalVehicles", language)} value={vendorVehicles.length} icon={Truck} accentColor="text-brand-blue" />
        <KpiCard label={t("driversOnDuty", language)} value={driversOnDuty} icon={Users} accentColor="text-success" />
        <KpiCard label={t("activeAlerts", language)} value={activeAlerts} icon={AlertTriangle} accentColor="text-danger" />
        <KpiCard label={t("docsExpiring", language)} value={docsExpiringSoon} icon={FileText} accentColor="text-warning" />
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="bg-card-bg border border-card-border rounded-xl p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeTab === "vehicles" ? t("searchRegistration", language) : activeTab === "drivers" ? t("searchNamePhone", language) : t("searchAlerts", language)}
              className="w-full pl-9 pr-3 py-2 bg-page-bg border border-border rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
            />
          </div>

          {activeTab === "alerts" && (
            <select
              value={alertSeverity}
              onChange={(e) => setAlertSeverity(e.target.value)}
              className="px-3 py-2 bg-page-bg border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
            >
              <option value="ALL">{t("allSeverities", language)}</option>
              <option value="HIGH">{t("high", language)} ({highCount})</option>
              <option value="MEDIUM">{t("medium", language)} ({mediumCount})</option>
              <option value="LOW">{t("low", language)} ({lowCount})</option>
            </select>
          )}

          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="flex items-center gap-1 px-3 py-2 text-sm text-text-muted hover:text-text-primary transition-colors"
            >
              <X className="w-4 h-4" /> {t("clear", language)}
            </button>
          )}
        </div>
      </div>

      {/* VEHICLES TAB */}
      {activeTab === "vehicles" && (
        <DataTable
          columns={vehicleColumns}
          data={filteredVehicles}
          pageSize={12}
          emptyMessage={t("noVehiclesFound", language)}
          onRowClick={(v) => { setSelectedVehicle(v); setShowVehicleDrawer(true); }}
        />
      )}

      {/* DRIVERS TAB */}
      {activeTab === "drivers" && (
        <DataTable
          columns={driverColumns}
          data={filteredDrivers}
          pageSize={12}
          emptyMessage={t("noDriversFound", language)}
          onRowClick={(d) => { setSelectedDriver(d); setShowDriverDrawer(true); }}
        />
      )}

      {/* ALERTS TAB */}
      {activeTab === "alerts" && (
        <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden">
          {filteredAlerts.length === 0 ? (
            <EmptyState
              icon={CheckCircle}
              title={t("allClear", language)}
              message={t("noAlertsMessage", language)}
            />
          ) : (
            <div className="divide-y divide-border/50">
              {filteredAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`px-5 py-4 flex items-start gap-4 hover:bg-ops-bg/30 transition-colors ${
                    !alert.read ? "bg-brand-blue/[0.02]" : ""
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {alert.severity === "HIGH" ? (
                      <div className="w-8 h-8 rounded-full bg-danger/10 flex items-center justify-center">
                        <AlertTriangle className="w-4 h-4 text-danger" />
                      </div>
                    ) : alert.severity === "MEDIUM" ? (
                      <div className="w-8 h-8 rounded-full bg-warning/10 flex items-center justify-center">
                        <AlertTriangle className="w-4 h-4 text-warning" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-brand-blue/10 flex items-center justify-center">
                        <FileText className="w-4 h-4 text-brand-blue" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-semibold uppercase ${
                        alert.severity === "HIGH" ? "text-danger" : alert.severity === "MEDIUM" ? "text-warning" : "text-text-muted"
                      }`}>
                        {alert.severity}
                      </span>
                      <span className="text-xs text-text-muted">
                        {alert.type.replace(/_/g, " ")}
                      </span>
                      {alert.daysRemaining !== undefined && (
                        <span className={`text-xs ${alert.daysRemaining < 0 ? "text-danger" : "text-text-muted"}`}>
                          · {alert.daysRemaining < 0 ? `${Math.abs(alert.daysRemaining)} ${t("daysOverdue", language)}` : `${alert.daysRemaining} ${t("daysRemainingLabel", language)}`}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-text-primary">{alert.message}</p>
                    <p className="text-xs text-text-muted mt-1">
                      {new Date(alert.createdAt).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!alert.read && (
                      <button
                        onClick={() => markAlertRead(alert.id)}
                        className="p-1.5 hover:bg-ops-bg rounded-lg transition-colors"
                        title={t("markRead", language)}
                      >
                        <Eye className="w-4 h-4 text-text-muted" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDismissAlert(alert.id)}
                      className="p-1.5 hover:bg-ops-bg rounded-lg transition-colors"
                      title={t("dismiss", language)}
                    >
                      <X className="w-4 h-4 text-text-muted hover:text-danger" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VEHICLE DETAIL DRAWER */}
      <Drawer open={showVehicleDrawer} onClose={() => setShowVehicleDrawer(false)} title={t("vehicleDetails", language)} width="max-w-xl">
        {selectedVehicle && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-text-primary">{selectedVehicle.registrationNo}</h3>
                <p className="text-sm text-text-muted">{selectedVehicle.make} {selectedVehicle.model} ({selectedVehicle.year || "N/A"})</p>
              </div>
              {selectedVehicle.active ? <StatusBadge status="AVAILABLE" /> : <StatusBadge status="OFFLINE" />}
            </div>

            {/* Specs */}
            <div>
              <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">{t("specifications", language)}</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 bg-ops-bg rounded-lg">
                  <p className="text-text-muted text-xs mb-1">{t("type", language)}</p>
                  <p className="text-text-primary font-medium">{getVehicleTypeName(selectedVehicle.vehicleTypeId)}</p>
                </div>
                <div className="p-3 bg-ops-bg rounded-lg">
                  <p className="text-text-muted text-xs mb-1">{t("seating", language)}</p>
                  <p className="text-text-primary font-medium">{selectedVehicle.seatingCapacity} {t("seats", language).toLowerCase()}</p>
                </div>
                <div className="p-3 bg-ops-bg rounded-lg">
                  <p className="text-text-muted text-xs mb-1">{t("ac", language)}</p>
                  <p className="text-text-primary font-medium">{selectedVehicle.ac ? t("yes", language) : t("no", language)}</p>
                </div>
                <div className="p-3 bg-ops-bg rounded-lg">
                  <p className="text-text-muted text-xs mb-1">{t("fuel", language)}</p>
                  <p className="text-text-primary font-medium capitalize">{selectedVehicle.fuelType.toLowerCase()}</p>
                </div>
                <div className="p-3 bg-ops-bg rounded-lg">
                  <p className="text-text-muted text-xs mb-1">{t("ownership", language)}</p>
                  <p className="text-text-primary font-medium capitalize">{selectedVehicle.ownership.replace(/_/g, " ").toLowerCase()}</p>
                </div>
                <div className="p-3 bg-ops-bg rounded-lg">
                  <p className="text-text-muted text-xs mb-1">{t("traccarId", language)}</p>
                  <p className="text-text-primary font-medium font-mono text-xs">{selectedVehicle.traccarDeviceId || "—"}</p>
                </div>
              </div>
            </div>

            {/* Assigned Driver */}
            {(() => {
              const driver = findDriverForVehicle(selectedVehicle.id);
              return driver ? (
                <div>
                  <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">{t("assignedDriver", language)}</h4>
                  <div className="p-3 bg-ops-bg rounded-lg flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand-blue/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-brand-blue" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text-primary"><PiiField value={driver.name} /></p>
                      <p className="text-xs text-text-muted"><PiiField value={driver.phone} /> · {driver.shift?.toLowerCase() || "flex"}</p>
                    </div>
                  </div>
                </div>
              ) : null;
            })()}

            {/* Documents */}
            <div>
              <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">{t("documents", language)}</h4>
              <div className="space-y-2">
                {selectedVehicle.documents.length === 0 ? (
                  <p className="text-sm text-text-muted">{t("noDocumentsRecorded", language)}</p>
                ) : (
                  selectedVehicle.documents.map((doc, idx) => {
                    const docStatus = getDocStatus(doc.expiry);
                    return (
                      <div key={idx} className="flex items-center justify-between p-3 bg-ops-bg rounded-lg text-sm">
                        <div className="flex items-center gap-3">
                          <Shield className="w-4 h-4 text-text-muted" />
                          <div>
                            <p className="text-text-primary font-medium">{doc.kind.replace(/_/g, " ")}</p>
                            {doc.number && <p className="text-xs text-text-muted font-mono"><PiiField value={doc.number} /></p>}
                          </div>
                        </div>
                        <div className="text-right">
                          {doc.expiry ? (
                            <>
                              <p className={`text-xs ${docStatus.color}`}>{docStatus.label}</p>
                              <p className="text-xs text-text-muted">{new Date(doc.expiry).toLocaleDateString()}</p>
                            </>
                          ) : (
                            <p className="text-xs text-text-muted">{t("noExpiry", language)}</p>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* DRIVER DETAIL DRAWER */}
      <Drawer open={showDriverDrawer} onClose={() => setShowDriverDrawer(false)} title={t("driverDetails", language)} width="max-w-xl">
        {selectedDriver && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-brand-blue/10 flex items-center justify-center">
                  <User className="w-6 h-6 text-brand-blue" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-text-primary"><PiiField value={selectedDriver.name} /></h3>
                  <p className="text-sm text-text-muted flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    {selectedDriver.rating?.toFixed(1) || "—"} · {selectedDriver.shift?.toLowerCase() || "flex"} {t("shift", language).toLowerCase()}
                  </p>
                </div>
              </div>
              {!selectedDriver.active ? (
                <StatusBadge status="OFFLINE" />
              ) : selectedDriver.available ? (
                <StatusBadge status="AVAILABLE" />
              ) : (
                <StatusBadge status="ON_TRIP" />
              )}
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">{t("contact", language)}</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 bg-ops-bg rounded-lg">
                  <p className="text-text-muted text-xs mb-1">{t("phone", language)}</p>
                  <p className="text-text-primary"><PiiField value={selectedDriver.phone} /></p>
                </div>
                <div className="p-3 bg-ops-bg rounded-lg">
                  <p className="text-text-muted text-xs mb-1">{t("licenceNoLabel", language)}</p>
                  <p className="text-text-primary"><PiiField value={selectedDriver.licenceNo} /></p>
                </div>
                <div className="p-3 bg-ops-bg rounded-lg">
                  <p className="text-text-muted text-xs mb-1">{t("licenceClass", language)}</p>
                  <p className="text-text-primary">{selectedDriver.licenceClass || "—"}</p>
                </div>
                <div className="p-3 bg-ops-bg rounded-lg">
                  <p className="text-text-muted text-xs mb-1">{t("languages", language)}</p>
                  <p className="text-text-primary">{selectedDriver.languages?.join(", ") || "—"}</p>
                </div>
              </div>
            </div>

            {/* Assigned Vehicle */}
            {(() => {
              const vehicle = findVehicleForDriver(selectedDriver.id);
              return vehicle ? (
                <div>
                  <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">{t("assignedVehicle", language)}</h4>
                  <div className="p-3 bg-ops-bg rounded-lg flex items-center gap-3 cursor-pointer hover:bg-ops-bg/80 transition-colors"
                    onClick={() => { setSelectedVehicle(vehicle); setShowDriverDrawer(false); setShowVehicleDrawer(true); }}
                  >
                    <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                      <Car className="w-5 h-5 text-success" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-text-primary">{vehicle.registrationNo}</p>
                      <p className="text-xs text-text-muted">{vehicle.make} {vehicle.model} · {getVehicleTypeName(vehicle.vehicleTypeId)}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-text-muted" />
                  </div>
                </div>
              ) : null;
            })()}

            {/* Documents */}
            <div>
              <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">{t("documents", language)}</h4>
              <div className="space-y-2">
                {selectedDriver.documents.length === 0 ? (
                  <p className="text-sm text-text-muted">{t("noDocumentsRecorded", language)}</p>
                ) : (
                  selectedDriver.documents.map((doc, idx) => {
                    const docStatus = getDocStatus(doc.expiry);
                    return (
                      <div key={idx} className="flex items-center justify-between p-3 bg-ops-bg rounded-lg text-sm">
                        <div className="flex items-center gap-3">
                          <IdCard className="w-4 h-4 text-text-muted" />
                          <div>
                            <p className="text-text-primary font-medium">{doc.kind.replace(/_/g, " ")}</p>
                            {doc.number && <p className="text-xs text-text-muted font-mono"><PiiField value={doc.number} /></p>}
                          </div>
                        </div>
                        <div className="text-right">
                          {doc.expiry ? (
                            <>
                              <p className={`text-xs ${docStatus.color}`}>{docStatus.label}</p>
                              <p className="text-xs text-text-muted">{new Date(doc.expiry).toLocaleDateString()}</p>
                            </>
                          ) : (
                            <p className="text-xs text-text-muted">{t("noExpiry", language)}</p>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
