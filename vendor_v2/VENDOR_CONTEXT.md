# RIDE Vendor Portal — Shared Context v2
# Architect-reviewed. Wire-up with admin_portal fully specified.
# Paste at the top of EVERY phase prompt before sending to Claude Code.

---

## Architecture overview — how vendor portal connects to admin_portal

Both portals share a single Zustand store package: ride-shared/
Neither portal has its own local tripStore or driverStore.
ALL state lives in ride-shared/src/stores/.
Both apps import from "@ride/shared".

  admin_portal/          → imports @ride/shared
  ride-vendor-portal/    → imports @ride/shared
  ride-shared/           → single source of truth

  When vendor accepts a trip in ride-vendor-portal:
    ride-shared tripStore: trip.status → DRIVER_ACCEPTED
    ride-shared tripStore: trip.assignedDriverId set
    admin_portal /dispatch kanban: card moves to DRIVER_ACCEPTED column
    admin_portal /dispatch queue: pending badge count decrements
    No page refresh needed in either app

  When vendor declines a trip in ride-vendor-portal:
    ride-shared tripStore: trip.vendorDeclineLog entry added
    ride-shared tripStore: trip.dispatchAttempts++ 
    admin_portal /dispatch: auto-failover fires if next vendor exists
    admin_portal: toast "Vendor V1 declined T-001 — auto-failover to V2"

  When admin_portal /driver advances status to COMPLETED:
    ride-shared tripStore: trip.status → COMPLETED
    ride-shared earningsStore: VendorEarnings entry auto-created
      fare = trip.lockedPrice
      operatorFee = Math.round(trip.lockedPrice * 0.15)
      netToVendor = fare - operatorFee
    ride-vendor-portal /earnings: new line appears immediately
    ride-vendor-portal dashboard: Earnings today KPI updates

  When admin_portal dispatches a new trip to vendor:
    ride-shared tripStore: new trip with status ASSIGNED, vendorId set
    ride-vendor-portal /trips: new row appears at top with ASSIGNED badge
    ride-vendor-portal notification bell: unread count increments
    ride-vendor-portal dashboard: Trips needing attention count increments

---

## Shared store schema (defined in ride-shared/src/stores/tripStore.ts)

  interface TripRequest {
    tripId: string
    tenantId: string               // T1 for Hubballi Transport Co
    customerId: string
    vendorId: string               // which vendor this trip is assigned to
    status: TripStatus
    vehicleType: VehicleType
    stops: Stop[]
    lockedPrice: number            // integer paise — set at CONFIRMED, never changes
    lockedRateCardVersion: number
    priceId: string
    scheduledAt: string
    assignedDriverId?: string
    assignedVehicleId?: string
    dispatchAttempts: number       // how many vendors tried
    vendorDeclineLog: VendorDeclineEntry[]  // audit of declines
    createdAt: string
    updatedAt: string
  }

  interface VendorDeclineEntry {
    vendorId: string
    reason: string
    declinedAt: string
  }

  type TripStatus =
    | 'PENDING'           // just created, not yet rated
    | 'CONFIRMED'         // price locked, ready to dispatch
    | 'ASSIGNED'          // sent to vendor, awaiting acceptance
    | 'DRIVER_ACCEPTED'   // vendor accepted, driver assigned
    | 'EN_ROUTE_PICKUP'   // driver en route to pickup
    | 'AT_PICKUP'         // driver at pickup location
    | 'PAX_PICKED'        // passengers aboard
    | 'IN_TRANSIT'        // en route to drop
    | 'AT_DROP'           // at drop location
    | 'PAX_DROPPED'       // passengers dropped
    | 'COMPLETED'         // trip done, billing triggered
    | 'BILLED'            // billing line created
    | 'CANCELLED'         // cancelled by any party

---

## Vendor-specific data (ride-vendor-portal reads, admin_portal writes)

  Vendor portal reads from ride-shared tripStore filtered by vendorId.
  Vendor portal NEVER writes to trip fields except:
    trip.status (ASSIGNED → DRIVER_ACCEPTED via accept action)
    trip.status (ASSIGNED → CANCELLED via reject action)
    trip.assignedDriverId (set on accept)
    trip.vendorDeclineLog (appended on reject)

  Admin portal writes all other fields:
    Creates trips, sets lockedPrice, assigns to vendor, advances status
    beyond DRIVER_ACCEPTED (all further lifecycle is admin/driver)

---

## Two demo vendors

  V1 — Apex Fleet
    vendorId: 'V1'
    token: 'sk_vendor_V1_demo123'
    drivers: 10 (mix of AVAILABLE/ON_TRIP/OFFLINE)
    vehicles: 15 (Sedan × 8, SUV × 4, Tempo Traveller × 2, Coach × 1)

  V2 — Urban Drivers Co
    vendorId: 'V2'
    token: 'sk_vendor_V2_demo456'
    drivers: 5
    vehicles: 8

  Both vendors are also seeded in admin_portal's vendor configuration.
  The vendorIds 'V1' and 'V2' must match between both portals exactly.

---

## Seed trips — 12 trips total (in ride-shared/src/mock/seed.ts)

  These 12 trips are the SAME trips seen in both portals.
  admin_portal sees all 12.
  vendor portal filters by vendorId.

  V1 Apex Fleet trips (8):
    T-V1-001  ASSIGNED        Sedan    BLR Airport → Taj West End     ₹505.40
    T-V1-002  ASSIGNED        Innova   Kempegowda Station → Sheraton  ₹380.00
    T-V1-003  DRIVER_ACCEPTED Sedan    Whitefield → Electronic City   ₹290.00
    T-V1-004  EN_ROUTE_PICKUP Coach    BLR Airport → Ibis Airport     ₹890.00
    T-V1-005  IN_TRANSIT      Sedan    MG Road → BLR Airport          ₹420.00
    T-V1-006  COMPLETED       Sedan    Marathahalli → UB City Mall     ₹260.00
    T-V1-007  COMPLETED       Innova   BLR Airport → Brigade Road     ₹370.00
    T-V1-008  CANCELLED       Sedan    HSR Layout → Koramangala       ₹180.00

  V2 Urban Drivers Co trips (4):
    T-V2-001  ASSIGNED        Sedan    Indiranagar → BLR Airport      ₹340.00
    T-V2-002  IN_TRANSIT      Sedan    Jayanagar → MG Road            ₹210.00
    T-V2-003  COMPLETED       Sedan    Hebbal → Yelahanka              ₹190.00
    T-V2-004  CANCELLED       Sedan    Bannerghatta → JP Nagar        ₹220.00

  All lockedPrice values stored as integer paise (50540, 38000, etc.)

---

## Admin portal dispatch queue — what vendor portal connects to

  In admin_portal /dispatch, there is a "Vendor acceptance" panel showing
  trips with status ASSIGNED that are awaiting vendor response.
  Each card has a countdown timer and the vendor's name.

  When vendor accepts in ride-vendor-portal:
    That card disappears from admin_portal dispatch queue
    Trip moves to DRIVER_ACCEPTED column in kanban

  When vendor declines or timer expires in ride-vendor-portal:
    Admin_portal dispatch queue: card shows "Declined by V1 — reassigning"
    If another vendor available: auto-assign to next vendor
    New ASSIGNED entry appears with next vendor name

  This connection is the core of the wire-up.
  It must work without page refresh on either side.

---

## Earnings connection — admin_portal triggers, vendor portal displays

  When admin_portal /driver advances TripVehicle to COMPLETED:
    ride-shared earningsStore.createEarning({
      tripId,
      vendorId: trip.vendorId,
      driverId: trip.assignedDriverId,
      fare: trip.lockedPrice,
      operatorFee: Math.round(trip.lockedPrice * 0.15),
      netToVendor: trip.lockedPrice - Math.round(trip.lockedPrice * 0.15),
      completedAt: new Date().toISOString(),
      status: 'UNBILLED'
    })

  ride-vendor-portal earningsStore subscribes to this.
  Vendor portal /earnings statement table adds the new row.
  Vendor portal /dashboard Earnings today KPI updates.

---

## Failover logic — admin_portal side

  When vendor declines, admin_portal must:
    1. Log the decline in trip.vendorDeclineLog
    2. Increment trip.dispatchAttempts
    3. Look for next available vendor (not in declineLog)
    4. If found: set trip.vendorId = nextVendor, keep status ASSIGNED
    5. If no vendor available: set status back to CONFIRMED with alert
    6. Show toast in admin_portal: "V1 declined T-001 — assigned to V2"

  ride-vendor-portal V2 then sees the newly assigned trip immediately.

---

## Tech stack — exact (mirror admin_portal exactly)

  Next.js 15 (App Router)
  React 19
  TypeScript strict — no any
  Tailwind CSS
  Zustand — imported from @ride/shared (no local stores)
  Lucide React
  Recharts
  Leaflet + OpenStreetMap (lazy loaded)

---

## Color palette

  --brand-blue:    #2563EB
  --sidebar-bg:    #1B2A4A
  --page-bg:       #F8FAFC
  --card-bg:       #FFFFFF
  --card-border:   #E8E8E8
  --text-primary:  #3D434A
  --text-muted:    #8B8FA8
  --success:       #1DB87A
  --warning:       #F0A030
  --danger:        #E84040
  --table-header:  #F4F5F7

---

## Layout

  Sidebar: 240px, #1B2A4A, fixed desktop, drawer mobile
    Nav: Dashboard | Trips | Fleet | Earnings | Alerts
  Header: 64px, white, border-bottom
    Left: page title
    Right: bell (with badge) + vendor switcher + avatar
  Main: #F8FAFC, padding 24px
  Mobile (<768px): hamburger, horizontal scroll on tables

---

## PII rules

  All driver names masked: S***h K***r
  All phones masked: ***-***-3210
  Eye icon reveals for 10 seconds → auto-re-masks
  Never log PII to console

---

## Money rules

  All amounts stored as integer paise
  Display: ₹{(paise / 100).toFixed(2)}
  Operator fee: Math.round(lockedPrice * 0.15) — integer always
  Net to vendor: lockedPrice - operatorFee — integer always
  Never use floats in arithmetic

---

## What is NOT in MVP

  Driver onboarding, vehicle registration, invoice PDF,
  SMS/WhatsApp notifications, accounting integration,
  performance incentives, detailed analytics

