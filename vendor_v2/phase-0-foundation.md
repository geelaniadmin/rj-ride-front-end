# Vendor Portal — Phase 0: Foundation, Shell & Shared Store Wire-up
# Send: cat VENDOR_CONTEXT.md phase-0-foundation.md | claude
# Run from workspace root (parent of admin_portal/)

---

## What to build in this phase

The complete app shell AND the ride-shared package that wires
ride-vendor-portal to admin_portal. This phase proves the connection
works before any feature is built.

---

## Step 1 — Create ride-shared package

From workspace root (same level as admin_portal/):

  mkdir ride-shared && cd ride-shared
  npm init -y
  Set package.json name to "@ride/shared"

  Create this exact folder structure:
    ride-shared/
      src/
        types/
          index.ts          All shared TypeScript interfaces
        stores/
          tripStore.ts      Single source of truth for all trips
          driverStore.ts    All drivers across all vendors
          vehicleStore.ts   All vehicles across all vendors
          earningsStore.ts  VendorEarnings entries
          alertStore.ts     VendorAlerts
          sessionStore.ts   Both operator + vendor sessions
        mock/
          seed.ts           All 12 trips + drivers + vehicles + earnings seeded here
          vendors.ts        V1 and V2 vendor definitions
          drivers.ts        10 V1 drivers + 5 V2 drivers
          vehicles.ts       15 V1 vehicles + 8 V2 vehicles
          earnings.ts       30 days earnings for V1, 20 for V2
          alerts.ts         3 alerts V1, 1 alert V2
        index.ts            Re-exports everything
      package.json

  src/types/index.ts must contain ALL interfaces from VENDOR_CONTEXT.md:
    TripRequest, TripStatus, VehicleStatus, VehicleType, Stop, Pax,
    VendorDeclineEntry, VendorDriver, VendorVehicle, VendorEarnings,
    VendorAlert, VendorSession, TripVehicle

  src/stores/tripStore.ts:
    Zustand store with:
      trips: TripRequest[]
      setTrips(trips)
      addTrip(trip)
      updateTripStatus(tripId, status)
      updateTripVendor(tripId, vendorId)
      acceptTrip(tripId, vendorId, driverId, vehicleId)
        → sets status DRIVER_ACCEPTED, assignedDriverId, assignedVehicleId
      declineTrip(tripId, vendorId, reason)
        → appends to vendorDeclineLog, increments dispatchAttempts
        → triggers failover: find next vendor not in declineLog
          → if found: updateTripVendor(tripId, nextVendorId)
          → if none: set status back to CONFIRMED
      getTripsForVendor(vendorId): TripRequest[]
      getTripsForAdmin(): TripRequest[]

  src/stores/earningsStore.ts:
    Zustand store with:
      earnings: VendorEarnings[]
      createEarning(entry: VendorEarnings)
        → called automatically when tripStore.updateTripStatus → COMPLETED
      getEarningsForVendor(vendorId): VendorEarnings[]
      getTotalNetForVendor(vendorId, period): number

  src/mock/seed.ts:
    export function seed() — populates all stores with the 12 trips,
    drivers, vehicles, earnings from VENDOR_CONTEXT.md seed data.
    Call this once in the root layout of both apps.
    Guard: if already seeded (check tripStore.trips.length > 0) → skip.

---

## Step 2 — Wire admin_portal to ride-shared

  In admin_portal/package.json add:
    "@ride/shared": "file:../ride-shared"

  Run: cd admin_portal && npm install

  In admin_portal read every existing store file carefully.
  For each store:
    If ride-shared has an equivalent → remove the local store,
      import from @ride/shared instead.
    Preserve all existing functionality — do not break any screens.

  In admin_portal root layout (app/layout.tsx):
    Import seed from @ride/shared/mock/seed
    Call seed() on mount (client-side, guard against re-seeding)

  Verify admin_portal still works:
    npm run dev in admin_portal
    /trips shows 12 seeded trips (was 0 before)
    /dispatch shows vehicles in kanban (was empty before)
    /driver shows trip in inbox (was empty before)

---

## Step 3 — Create ride-vendor-portal

  From workspace root:
    npx create-next-app@latest ride-vendor-portal \
      --typescript --tailwind --app --no-src-dir \
      --import-alias "@/*"

  cd ride-vendor-portal

  Install dependencies:
    npm install zustand lucide-react recharts leaflet @types/leaflet
    npm install @ride/shared@file:../ride-shared

  Tailwind config: extend with RIDE color tokens:
    sidebar-bg: '#1B2A4A'
    brand-blue: '#2563EB'
    page-bg: '#F8FAFC'
    card-bg: '#FFFFFF'
    card-border: '#E8E8E8'
    text-primary: '#3D434A'
    text-muted: '#8B8FA8'
    success: '#1DB87A'
    warning: '#F0A030'
    danger: '#E84040'

  Import seed from @ride/shared and call it in root layout.
  SAME guard as admin_portal — if already seeded, skip.
  Since both apps share the same Zustand store instance
  (they run in the same browser tab session), seed() runs once total.

---

## Step 4 — Build vendor portal shell

  app/login/page.tsx:
    Centered card with RIDE logo
    "Vendor Portal" subtitle
    Two buttons:
      "Login as Apex Fleet (V1)" → sets vendorSession V1 in localStorage
      "Login as Urban Drivers Co (V2)" → sets vendorSession V2
    Redirect to / after login

  app/layout.tsx:
    Root layout with sidebar + header
    Check localStorage for vendorSession on mount
    No session → redirect to /login
    Has session → render layout + children
    Call seed() on mount

  app/page.tsx:
    Dashboard placeholder:
      "Welcome back, [Vendor Name]"
      4 KpiCard placeholders (wired in Phase 1)
      "Prototype — data is shared with admin_portal in real time" banner

  app/trips/page.tsx:        Placeholder "Trips — Phase 1"
  app/fleet/page.tsx:        Placeholder "Fleet — Phase 2"
  app/earnings/page.tsx:     Placeholder "Earnings — Phase 3"
  app/alerts/page.tsx:       Placeholder "Alerts — Phase 2"

---

## Step 5 — Build all UI components

  components/layout/Sidebar.tsx:
    240px, #1B2A4A, fixed desktop, drawer mobile
    Nav items with lucide icons:
      LayoutDashboard  Dashboard   /
      ListOrdered      Trips       /trips
      Truck            Fleet       /fleet
      CircleDollarSign Earnings    /earnings
      Bell             Alerts      /alerts  (badge count)
    Bottom: LogOut (clears localStorage session → /login)
    Active: white text + 3px left border #2563EB
    Mobile: hamburger opens overlay drawer

  components/layout/Header.tsx:
    64px, white, border-bottom #E8E8E8
    Left: hamburger (mobile) + page title (from route)
    Right: bell (unread badge) + vendor switcher dropdown + avatar initials

  components/ui/StatusBadge.tsx:
    Covers ALL statuses from VENDOR_CONTEXT.md
    PENDING grey | ASSIGNED blue | DRIVER_ACCEPTED purple |
    EN_ROUTE_PICKUP amber | IN_TRANSIT green | COMPLETED dark-green |
    CANCELLED red | AVAILABLE green | ON_TRIP amber | OFFLINE grey |
    IDLE grey | MAINTENANCE amber

  components/ui/KpiCard.tsx:
    label, value, delta?, icon?, accentColor?
    White card, subtle shadow, large bold value

  components/ui/DataTable.tsx:
    columns[], data[], pageSize=20, loading?
    Sortable headers, pagination, LoadingSkeleton, EmptyState

  components/ui/PiiField.tsx:
    maskedValue, revealedValue
    Eye icon → reveals 10s → auto-masks
    Never logs to console

  components/ui/Toast.tsx:
    useToast() hook: success | error | info | warn
    Stack top-right, auto-dismiss 4s, manual close

  components/ui/Drawer.tsx:
    420px desktop, full-width mobile
    Slides from right, backdrop closes

  components/ui/Modal.tsx:
    Centred overlay, backdrop close (unless confirmModal prop)

  components/ui/LoadingSkeleton.tsx:
    Animated grey bars matching table row height

  components/ui/EmptyState.tsx:
    Icon + message + optional CTA button

---

## Step 6 — Shared store debug badge (proves wire-up)

  In BOTH apps, add a small fixed badge at bottom-right corner:
    Background: #1B2A4A, white text, 12px font
    Content: "Trips: X | Drivers: Y | Earnings: Z"
    X, Y, Z are live counts from ride-shared stores
    Updates in real time as store changes

  This badge is the visual proof that both apps share one data source.
  When you accept a trip in vendor portal:
    Admin portal badge trip count does NOT change (same total)
    but if you open admin /dispatch you see status changed

  Add a small "⚡ Shared store" label so the demo audience understands.

---

## Step 7 — Vendor switcher (header dropdown)

  In ride-vendor-portal header:
    Dropdown: "Apex Fleet (V1)" | "Urban Drivers Co (V2)"
    Switch: updates localStorage + vendorSessionStore
    All stores re-filter by new vendorId
    No page refresh needed

---

## Acceptance criteria for Phase 0

  ride-shared/ folder exists with all stores, types, mock data
  Both apps have "@ride/shared": "file:../ride-shared" in package.json
  npm install succeeds in both projects without errors
  seed() seeds 12 trips, 15 drivers, 23 vehicles on first load
  seed() does NOT re-seed if already populated
  admin_portal /trips: shows 12 seeded trips (was 0 before)
  admin_portal /dispatch: shows vehicles in kanban (was empty before)
  ride-vendor-portal /login: both vendor buttons work
  ride-vendor-portal sidebar nav: all 5 routes work
  Switching vendor: header name changes, KPIs will update in Phase 1
  Debug badge: shows live counts in both apps
  CRITICAL: Open admin_portal in Tab 1, vendor portal in Tab 2
    Go to admin_portal /dispatch → see trip T-V1-001 in ASSIGNED column
    Go to vendor portal /trips → also see T-V1-001 with ASSIGNED status
    They are the SAME object from ride-shared
  TypeScript: npm run build passes in both projects with no errors

