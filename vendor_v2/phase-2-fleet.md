# Vendor Portal — Phase 2: Fleet Management + Admin Portal Vendor View
# Send: cat VENDOR_CONTEXT.md phase-2-fleet.md | claude
# Requires: Phase 1 complete and committed

---

## What to build in this phase

Fleet management for the vendor portal (drivers + vehicles + alerts)
AND the corresponding vendor detail view in admin_portal that shows
the same driver and vehicle data from ride-shared.

---

## Part A — Vendor portal fleet screens

## 1. Fleet page (/fleet) — Drivers tab

  Summary KPIs (from ride-shared driverStore, filtered by vendorId):
    Total drivers | Available | On trip | Offline

  Drivers table (DataTable):
    Status dot: green=AVAILABLE, yellow=ON_TRIP, grey=OFFLINE
    Name (PiiField) | Phone (PiiField) | Vehicle plate |
    Current trip ID or "—" | Rating (★ X.X) |
    Last 7 days (trip count) | Completion % (colour-coded badge) |
    [View]

  Driver detail drawer:
    Name + phone (PiiField) | Vehicle | Status | Rating
    Performance: trips last 7 days, completion rate, avg rating
    Current assignment: if ON_TRIP → tripId + route + ETA (opens trip drawer on click)
    Trip history: last 5 trips (mini table)

  Add Driver button → modal:
    Name, phone (required), assign vehicle (IDLE vehicles dropdown), status default AVAILABLE
    On submit: ride-shared driverStore.addDriver → appears in both vendor portal AND
    admin_portal /configuration drivers tab (same store)

---

## 2. Fleet page — Vehicles tab

  Summary KPIs: Total | Idle | In transit | Maintenance

  Vehicles table (DataTable):
    Status badge | Plate (mono) | Type | Driver assigned (masked) |
    Health score (progress bar, colour-coded) |
    Registration expiry (+ ⚠ if ≤30 days) |
    Insurance expiry (+ ⚠ if ≤30 days) |
    [View]

  Vehicle detail drawer:
    Plate + type + status | Health score bar
    Assigned driver (PiiField)
    Current trip if IN_TRANSIT
    Documents: 3 rows (Registration, Insurance, Fitness)
      Each: expiry date + days remaining + ✓ / ⚠ / ✗ icon
    Trip history: last 5 trips (mini table)

  Add Vehicle button → modal:
    Plate, type (dropdown auto-fills capacity), reg/insurance/fitness dates
    On submit: ride-shared vehicleStore.addVehicle
    If any doc ≤30 days: auto-create alert in ride-shared alertStore
    Appears in admin_portal /configuration vehicles tab (same store)

  "Show expiring only" toggle — filters table

---

## 3. Alerts page (/alerts)

  KPIs: Critical (HIGH) | Warnings (MEDIUM) | Info (LOW)

  Alert cards (sorted: severity desc, daysRemaining asc):
    Accent border colour: red/amber/grey
    Icon: FileWarning / AlertTriangle / User
    Message + entity (PII masked)
    Days remaining badge
    [View vehicle] or [View driver] → opens respective drawer

  Sidebar bell badge: total unread alert count

---

## Part B — Admin portal vendor detail view (admin_portal changes)

## 4. Admin portal /configuration → Vendors tab — vendor detail panel

  In admin_portal /configuration → Vendors tab:
    Each vendor row already has [Edit] and [Deactivate]
    Add: [View details] button

  Clicking [View details] opens a full-width side panel (not a drawer):
    Shows data from ride-shared stores filtered by vendorId

  Panel has 3 tabs: Drivers | Vehicles | Performance

  Drivers tab (admin view — same data as vendor portal):
    Table: same columns as vendor portal driver table
    PII masked with reveal
    [Add driver] button → same add driver modal (writes to ride-shared)
    Changes appear in vendor portal fleet page immediately

  Vehicles tab (admin view):
    Table: same columns as vendor portal vehicles table
    [Add vehicle] button → same modal (writes to ride-shared)
    Document expiry warnings shown
    Changes appear in vendor portal fleet page immediately

  Performance tab:
    This month: trips, acceptance rate, on-time %, avg driver rating
    Trend chart (Recharts bar): trips per day last 14 days
    Decline log: table of all trip rejections with reasons
      (from tripStore.vendorDeclineLog across all trips)

---

## 5. Cross-portal sync for fleet changes

  The following must sync between both apps via ride-shared:

  Scenario A — Vendor adds a driver:
    ride-vendor-portal /fleet: Add driver form submitted
    ride-shared driverStore: new driver added
    admin_portal /configuration Vendors → View details → Drivers tab:
      New driver appears without refresh

  Scenario B — Admin adds a driver to a vendor:
    admin_portal /configuration → Add driver to Regal Cabs
    ride-shared driverStore: driver added with vendorId
    ride-vendor-portal /fleet Drivers tab: new driver appears

  Scenario C — Driver goes ON_TRIP (from Phase 1 accept flow):
    ride-shared driverStore: driver.status → ON_TRIP
    Vendor portal /fleet: status dot turns yellow
    Admin portal /configuration vendor detail: status dot turns yellow
    Both without refresh

  Scenario D — Vehicle added with expiring document:
    ride-shared alertStore: new alert created
    Vendor portal sidebar: bell badge increments
    Vendor portal /alerts: new card appears
    Admin portal has no alerts page but vendor detail Performance tab
      shows compliance issues count

---

## Acceptance criteria for Phase 2

  CRITICAL CROSS-PORTAL TESTS:

  Test 1 — Driver sync:
    Add a driver in vendor portal /fleet
    Open admin_portal /configuration → V1 vendor → View details → Drivers
    New driver appears (no refresh)

  Test 2 — Vehicle expiry alert:
    Add a vehicle with insurance expiring in 10 days
    ride-shared alertStore gets new HIGH alert
    Vendor portal sidebar bell badge increments
    Vendor portal /alerts: new card appears

  Test 3 — Driver status sync:
    Accept a trip in Phase 1 flow (sets driver ON_TRIP)
    Vendor portal /fleet Drivers: that driver dot turns yellow
    Admin portal vendor detail Drivers tab: same dot turns yellow

  Test 4 — Decline log in admin:
    Reject a trip from vendor portal
    Admin portal vendor detail → Performance → Decline log:
      That rejection appears with reason and timestamp

  Vendor portal fleet shows only this vendor's drivers and vehicles
  Admin portal vendor detail shows same data + add forms
  PII masked everywhere, reveal works in both portals
  Health score bar colours correct (>80 green, 50-80 amber, <50 red)
  Document expiry icons: ✓ / ⚠ / ✗ correct per dates
  "Show expiring only" toggle works
  Add driver/vehicle: form validates, record appears, TypeScript clean
  Mobile: tables scroll, KPI cards stack 2-col

