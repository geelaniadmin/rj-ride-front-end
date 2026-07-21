# 🚗 RIDE — Business Logic Reference

**Rezolv Integrated Dispatch Engine** — Multi-tenant B2B Transport Management System

> This document explains the complete business logic across all 4 portals: `ride-shared` (shared data layer), `ride-ops-portal` (Control Room + Rate Manager + Super Admin), `ride_prd` (Admin Dispatch), and `ride-vendor-portal` (Vendor Fleet).

---

## 📋 Table of Contents

1. [System Architecture](#1-system-architecture)
2. [The Two Anchoring Business Rules](#2-the-two-anchoring-business-rules)
3. [Trip State Machine (Two-Level)](#3-trip-state-machine-two-level)
4. [Pricing & Rate Engine](#4-pricing--rate-engine)
5. [Quote → Book → Confirm Flow](#5-quote--book--confirm-flow)
6. [Billing & Operator Fee](#6-billing--operator-fee)
7. [Safety Monitoring & SOS Escalation](#7-safety-monitoring--sos-escalation)
8. [Vendor Trip Management (Accept/Decline/Failover)](#8-vendor-trip-management-acceptdeclinefailover)
9. [OTP Verification](#9-otp-verification)
10. [Vehicle Swap & Breakdown Handling](#10-vehicle-swap--breakdown-handling)
11. [Traccar GPS Tracking & Demo Simulation](#11-traccar-gps-tracking--demo-simulation)
12. [Multi-Tenancy & Cross-Portal Sync](#12-multi-tenancy--cross-portal-sync)
13. [Portal-by-Portal Role & Permission Model](#13-portal-by-portal-role--permission-model)
14. [Earnings & Payouts](#14-earnings--payouts)
15. [Pre-Flight Checks (Detailed)](#15-pre-flight-checks-detailed)
16. [All 6 Trip Creation Methods](#16-all-6-trip-creation-methods)
17. [Dispatch Board (Kanban) & Auto-Assign](#17-dispatch-board-kanban--auto-assign)
18. [Driver Accept/Reject & Configurable Timeout Policy](#18-driver-acceptreject--configurable-timeout-policy)
19. [Location Typing & Reverse Scheduling](#19-location-typing--reverse-scheduling)
20. [Driver App Simulator (Phase 5)](#20-driver-app-simulator-phase-5)
21. [Tracking Module (Phase 5)](#21-tracking-module-phase-5)
22. [Partner API Console (Phase 7)](#22-partner-api-console-phase-7)
23. [Comms Bridge (Mattermost + WhatsApp)](#23-comms-bridge-mattermost--whatsapp)
24. [Document Expiry System](#24-document-expiry-system)
25. [Seed Data Detail (12 Trips)](#25-seed-data-detail-12-trips)
26. [The 5 Wire-Up Contracts (Cross-Portal)](#26-the-5-wire-up-contracts-cross-portal)
27. [Phase Build Order (7 Phases)](#27-phase-build-order-7-phases)
28. [Backend Architecture Blueprint](#28-backend-architecture-blueprint)

---

## 1. System Architecture

```
                     ┌─────────────────────────────────────┐
                     │         ride-shared (@ride/shared)   │
                     │  ┌──────────────────────────────┐   │
                     │  │  14 Zustand Stores + Types   │   │
                     │  │  persist → localStorage      │   │
                     │  │  cross-tab sync via storage   │   │
                     │  │  events                       │   │
                     │  └──────────────────────────────┘   │
                     └──────┬──────────┬──────────┬──────┘
                            │          │          │
              ┌─────────────┘          │          └─────────────┐
              ▼                        ▼                        ▼
    ┌─────────────────┐    ┌──────────────────┐    ┌───────────────────┐
    │ ride-ops-portal  │    │    ride_prd      │    │ ride-vendor-portal│
    │ (port 3002/ops)  │    │  (port 3000,     │    │ (port 3001/vendor)│
    │                  │    │   proxies /ops   │    │                   │
    │ Control Room     │    │   and /vendor)   │    │ Trip Mgmt         │
    │ Rate Manager     │    │                  │    │ Fleet Mgmt        │
    │ Super Admin      │    │ Dispatch/Trips   │    │ Earnings          │
    │                  │    │ Configuration    │    │ Alerts            │
    │ Reads + Writes   │    │ Pricing/Billing  │    │ Mostly Reads      │
    └─────────────────┘    └──────────────────┘    └───────────────────┘
```

**Key principle:** All 3 portals import stores from `@ride/shared`. There is **no backend API**. Data is:
1. Seeded in-memory on first load from `mock/seed.ts` and default store state
2. Persisted to `localStorage` via Zustand's `persist` middleware
3. Synced across browser tabs via the `storage` event

---

## 2. The Two Anchoring Business Rules

These two rules are inviolable and drive every design decision:

### Rule 1: Pre-Negotiated Pricing + Price Lock

Rate cards are pre-negotiated per vendor × customer × vehicle type, with effective dates and version history. An order is **never** created from raw addresses. The flow is:

```
Customer requests transport
    → System gets a **priced offer** (a `price_id` + rate-card `version`)
    → Order **must cite that `price_id`**
    → Quoted price is **frozen on the order at booking**
    → No cache/engine divergence
    → Billing is deterministic (always matches the locked price)
```

This means:
- The Rate Manager portal creates/versions rate cards
- When creating a trip, you must first get a quote (priced offer)
- The trip vehicle stores: `priceId`, `lockedPrice`, `lockedRateCardVersion`
- Billing reads `lockedPrice` from the trip — never re-quotes

### Rule 2: Pre-Flight Checks Before State Changes

Every state-changing operation runs a pre-flight check first:

| Check | When | Returns |
|---|---|---|
| `checkTime()` | Before booking | Hours until pickup, minimum lead time check |
| `checkCancel()` | Before cancelling | `{ allowed, free, penaltyPct, penaltyAmount, resultingStatus }` |
| `checkUpdate()` | Before editing | `{ allowed, message }` |

These checks compute penalties dynamically based on:
- `freeCancellationHours` from the offer
- Deadline = pickupTime − freeCancellationHours
- Before deadline: free cancellation
- After deadline: configurable penalty (e.g., 20% of locked price)

---

## 3. Trip State Machine (Two-Level)

The trip state machine operates on **two levels**: vehicle-level (17 states) and trip-level (7 derived states).

### Vehicle Status (17 States)

```
                    ┌──────────┐
                    │ PENDING  │
                    └────┬─────┘
                         │
                    ┌────▼─────┐
                    │ ASSIGNED │
                    └────┬─────┘
                         │
              ┌──────────┼──────────┐
              ▼          ▼          │
   ┌────────────────┐  ┌───────────────┐  │
   │ DRIVER_ACCEPTED │  │DRIVER_REJECTED│  │
   └────────┬───────┘  └───────┬───────┘  │
            │                  │          │
            │           ┌──────▼──────┐   │
            │           │ RE-ASSIGNED │   │
            │           └─────────────┘   │
            │                             │
      ┌─────▼──────────┐                 │
      │ EN_ROUTE_PICKUP │                 │
      └─────┬──────────┘                 │
            │                            │
      ┌─────▼──────┐                     │
      │ AT_PICKUP  │───→ NO_SHOW         │
      └─────┬──────┘                     │
            │ OTP GATE                   │
      ┌─────▼────────┐                   │
      │ PAX_PICKED   │                   │
      └─────┬────────┘                   │
            │                            │
      ┌─────▼──────────┐                 │
      │ IN_TRANSIT     │                 │
      └─────┬──────────┘                 │
            │                            │
       ┌────▼─────┐                      │
       │ AT_DROP  │                      │
       └────┬─────┘                      │
            │ OTP GATE                   │
      ┌─────▼──────────┐                 │
      │ PAX_DROPPED    │                 │
      └─────┬──────────┘                 │
            │                            │
       ┌────▼────────┐                   │
       │ COMPLETED   │ (terminal)        │
       └─────────────┘                   │
                                          │
         EXCEPTION STATES:                │
         ┌────────────┐  ┌──────────┐     │
         │ BREAKDOWN  │──│ ACCIDENT │     │
         └─────┬──────┘  └──────────┘     │
               │                          │
         ┌─────▼──────┐                   │
         │ VEHICLE_SWAP│                   │
         └─────┬──────┘                   │
               │ (resumes from phase)     │
         ┌─────▼──────┐                   │
         │   DELAYED  │ (resumes)         │
         └────────────┘                   │
         ┌─────┐                          │
         │ SOS │───→ BREAKDOWN or CANCEL  │
         └─────┘                          │
         ┌───────────┐                    │
         │ CANCELLED │ (terminal)         │
         └───────────┘                    │
```

**Allowed transitions** are defined in `ride_prd/lib/lifecycle.ts` → `ALLOWED_TRANSITIONS`.

Key rules:
- **OTP gates:** `PAX_PICKED` requires `otp.pickupVerified === true`. `PAX_DROPPED` requires `otp.dropVerified === true`.
- **Exception states** (BREAKDOWN, ACCIDENT, SOS, DELAYED, NO_SHOW) are per-vehicle and surface as **trip alerts without failing the whole convoy**.
- **VEHICLE_SWAP** creates a continuation — the new vehicle picks up from where the old one left off (the current phase).
- **CANCELLED** and **COMPLETED** are terminal — no further transitions allowed.

### Trip Status (7 Derived States)

Derived from vehicle statuses via `deriveTripStatus()` in `ride_prd/lib/lifecycle.ts`:

| Trip Status | Derivation Rule |
|---|---|
| `DRAFT` | 0 vehicles |
| `CONFIRMED` | Not all assigned, none in progress, default |
| `ASSIGNED` | All vehicles in `ASSIGNED` or `DRIVER_ACCEPTED` |
| `IN_PROGRESS` | Any vehicle in `EN_ROUTE_PICKUP` through `AT_DROP` |
| `COMPLETED` | All vehicles `COMPLETED` or `NO_SHOW` |
| `BILLED` | Auto-transitioned when all vehicles complete (auto-creates billing) |
| `CANCELLED` | All vehicles `CANCELLED` |

### Complete State Transition Map

For reference, here's every legal transition:

```
PENDING       → ASSIGNED, DRIVER_REJECTED, CANCELLED
ASSIGNED      → DRIVER_ACCEPTED, DRIVER_REJECTED, CANCELLED
DRIVER_ACCEPTED → EN_ROUTE_PICKUP, DRIVER_REJECTED, CANCELLED
DRIVER_REJECTED → ASSIGNED, CANCELLED
EN_ROUTE_PICKUP → AT_PICKUP, DELAYED, BREAKDOWN, SOS, CANCELLED
AT_PICKUP     → PAX_PICKED, NO_SHOW, BREAKDOWN, SOS, CANCELLED
PAX_PICKED    → IN_TRANSIT, DELAYED, BREAKDOWN, SOS, CANCELLED
IN_TRANSIT    → AT_DROP, DELAYED, BREAKDOWN, ACCIDENT, SOS, CANCELLED
AT_DROP       → PAX_DROPPED, BREAKDOWN, SOS, CANCELLED
PAX_DROPPED   → COMPLETED
COMPLETED     → (terminal)
NO_SHOW       → (terminal)
BREAKDOWN     → VEHICLE_SWAP, CANCELLED
ACCIDENT      → CANCELLED
VEHICLE_SWAP  → EN_ROUTE_PICKUP, AT_PICKUP, PAX_PICKED, IN_TRANSIT, AT_DROP
DELAYED       → EN_ROUTE_PICKUP, AT_PICKUP, PAX_PICKED, IN_TRANSIT, AT_DROP
SOS           → BREAKDOWN, CANCELLED
CANCELLED     → (terminal)
```

---

## 4. Pricing & Rate Engine

### Rate Card Structure

Rate cards exist in **two** stores (unfortunately):
1. **`ride-ops-portal/stores/rateCardStore.ts`** — The "live" Ops Portal store. This is the primary store used for creating/editing rate cards.
2. **`ride_prd/stores/rateCardStore.ts`** — The PRD store with pre-seeded data (RC1-RC6). May have sync lag.

### Rate Bases (4 types)

| Basis | Per-unit | Example |
|---|---|---|
| `PER_KM` | ₹X per kilometer | Sedan: ₹20/km |
| `FIXED_LOCATION_PAIR` | ₹X per route pair | Airport→Downtown: ₹300 |
| `HOURLY` | ₹X per hour | SUV: ₹500/hr |
| `PACKAGE` | ₹X for Y hours + Z km | 8hr + 80km: ₹4,000 |

### Modifiers

| Modifier | Type | Effect |
|---|---|---|
| `minFare` | paise | Minimum charge regardless of distance |
| `nightCharge` | % surcharge | Applied during night hours (configurable start/end) |
| `waitingPerHour` | paise/hr | Waiting time charge after free minutes |
| `freeWaitingMinutes` | number | Minutes of free waiting before charge starts |
| `tollHandling` | INCLUDED / EXTRA | Whether tolls are included in rate or billed extra |
| `parkingHandling` | INCLUDED / EXTRA | Whether parking is included or billed extra |
| `interStateSurcharge` | % surcharge | Applied for interstate travel |
| `deadMileagePerKm` | paise/km | Charge for dead (empty) kilometers |

### Versioning

Rate cards are versioned. Creating a new version:
1. Copies the original with all its fields
2. Increments `version` by 1
3. Sets `validFrom` to today (the effective date)
4. Creates two audit entries: `SUPERSEDED` for the old card, `CREATED` for the new one
5. The old card remains in the store with its original `validFrom` — it's just superseded

When looking up the applicable rate card:
```
candidates = rateCards where:
    tenantId === T &&
    vendorId === V &&
    customerId === C &&
    vehicleTypeId === VT &&
    validFrom <= effectiveDate &&
    (validTo is null OR validTo >= effectiveDate)
return highest version among candidates
```

### Fare Simulation

The Rate Manager's `/rate-manager/simulate` page lets you:
1. Select vendor, customer, vehicle type, and rate basis
2. Enter distance (km) and duration (hours)
3. Add modifiers (night charge, waiting time, etc.)
4. See a live calculated fare breakdown
5. Save to simulation history for reference

---

## 5. Quote → Book → Confirm Flow

This is the core pricing flow that anchors the system:

```
STEP 1: QUOTE
    Client sends: { vendorId, customerId, vehicleTypeId, pickup, drop, datetime }
    System responds:
        - Finds applicable rate card (highest version, valid on that date)
        - Calculates price: perKm × distance + modifiers + surcharges
        - Creates an Offer with: { priceId, rateCardId, rateCardVersion, price,
          freeCancellationHours, minLeadTimeHours, expiresAt }
        - Price is computed in paise (integer)

STEP 2: BOOK
    Client sends: { priceId, stops[], vehicles[], schedule }
    System:
        - Validates the priceId exists and hasn't expired
        - Locks the price on each TripVehicle: { priceId, lockedPrice, lockedRateCardVersion }
        - Creates a TripRequest with status = CONFIRMED or DRAFT
        - Price is now frozen — never re-calculated

STEP 3: CONFIRM
    Vendors accept/decline trips
    Admin dispatcher assigns drivers and vehicles
    Status transitions execute
```

**Critical rule:** `lockedPrice` on the TripVehicle is the **single source of truth for billing**. Billing never re-quotes.

---

## 6. Billing & Operator Fee

### When Billing Is Created

Billing is **automatically generated** when all vehicles in a trip reach a terminal status:
- `COMPLETED` ✓
- `NO_SHOW` ✓
- `CANCELLED` ✓

When this condition is met, `advanceVehicleStatus()` in both `ride_prd/stores/tripStore.ts` and `ride-shared/src/stores/tripStore.ts`:

1. Calculates `subtotal = sum of all vehicle lockedPrices`
2. Calculates `operatorFee` based on the tenant's fee config
3. Creates `BillingLine` entries per vehicle (status: `UNBILLED`)
4. Creates a `BillableTrip` with subtotal + operatorFee = total
5. Updates trip status to `BILLED`

### Operator Fee Config (3 types)

| Type | Behavior | Example |
|---|---|---|
| `FLAT` | Fixed amount per trip | ₹50/trip |
| `PERCENT` | Percentage of subtotal | 15% of subtotal |
| `TIERED` | Tiered percentage by amount | 0-1000: 10%, 1000-5000: 12%, 5000+: 15% |

Config is stored per-tenant in `billingStore.operatorFees`:
```typescript
T1: { type: "PERCENT", amount: 15 }         // Hubballi Transport: 15%
T2: { type: "FLAT", amount: 50 }            // Bengaluru Rides: ₹50 flat
T3: { type: "TIERED", tiers: [...] }        // Gulf Express: tiered
```

### Billing Lifecycle

```
UNBILLED → STATEMENTED → RECONCILED
              ↓              ↓
         (sent to        (payment
          customer)       received)
```

Additional operations:
- **Void (soft-delete):** `voidBillingLine(id, reason, actor)` — sets `voided: true`, keeps record
- **Adjustment:** `addAdjustment(adjustment, actor)` — positive or negative adjustment with audit trail
- **Billing Events:** Immutable log of all changes (CREATED, STATEMENTED, RECONCILED, ADJUSTED, VOIDED)

### Multi-Currency Support

Each tenant has a `currencyConfig`:
```typescript
T1: { code: "INR", symbol: "₹", exchangeRate: 1 }   // Base
T2: { code: "USD", symbol: "$", exchangeRate: 83 }  // 1 USD = 83 INR
T3: { code: "EUR", symbol: "€", exchangeRate: 90 }  // 1 EUR = 90 INR
```

Conversion: `amountInBase = amount / exchangeRate`

### Sub-Vendor Reconciliation

1. Sub-vendor uploads an invoice (CSV with invoice lines)
2. System matches each line against billable trips
3. `reconcileInvoice()` returns match results:
   - `matched: true` if invoice amount == system amount
   - `reason` explains mismatches ("Trip not found", "Amount mismatch")

### Vouchers

Generated per trip or per passenger:
- `generateVouchers(tripId, paxIds?, language?)`
- Creates a trip-level voucher + per-passenger vouchers
- Stores mock document URL for download

---

## 7. Safety Monitoring & SOS Escalation

### Safety Alert Types

| Type | Description | Severity |
|---|---|---|
| `SOS` | Emergency button pressed by driver | HIGH |
| `ROUTE_DEVIATION` | Vehicle deviates from planned route | MEDIUM |
| `NO_SHOW` | Driver doesn't arrive at pickup | MEDIUM |
| `PROLONGED_STOP` | Vehicle stationary for too long | LOW |

### 4-Level Escalation Timeline

```
L1 (Logged)        → L2 (Dispatcher)     → L3 (Manager)      → L4 (Executive)
   ┌──────┐            ┌──────┐              ┌──────┐             ┌──────┐
   │ done │───────────→│done  │─────────────→│active│───────────→│pending│
   └──────┘            └──────┘    ▲         └──────┘             └──────┘
                                    │
                             Acknowledge
                             (marks L3 done)
```

- **ACTIVE** → Acknowledge → **ACKNOWLEDGED** (marks L3 as done)
- **ACKNOWLEDGED** → Escalate → **ESCALATED** (increments level, up to L4)
- **ACTIVE/ACKNOWLEDGED/ESCALATED** → Resolve → **RESOLVED**

### SOS Flow in Practice

1. **Control Room map** shows SOS vehicles with red markers
2. **AlertCard** displays SOS details: driver name, vehicle, location, escalation level
3. Dispatcher clicks **Acknowledge** → alert status changes to `ACKNOWLEDGED`, L3 marked done
4. If not resolved, dispatcher can **Escalate** → level increments (max L4)
5. **EscalationModal** shows timeline: L1-L4 with labels, actors, and status
6. **ActivityFeed** logs all actions in real-time
7. Cross-portal: Acknowledging in ops portal updates `safetyAlertStore` → ride_prd sees the change

### Anomaly Detection (Mock)

The anomalies page (`/control-room/anomalies`) displays:
- Route deviations (mock: 1 active, 1 resolved)
- Prolonged stops (mock: various)
- No-shows (mock: various)

These are seeded in `safetyAlertStore` as mock data.

---

## 8. Vendor Trip Management (Accept/Decline/Failover)

### Flow

```
               Trip Created (ride_prd)
                      │
                      ▼
         Vendor sees trip in list
                      │
            ┌─────────┴─────────┐
            ▼                   ▼
       ACCEPT               DECLINE
          │                    │
          │              ┌─────▼──────┐
          │              │  Reason?   │
          │              └─────┬──────┘
          │                    │
          ▼                    ▼
    Assign Driver +      FAILOVER:
    Vehicle               Find next vendor
          │               (V1→V2, V2→V1)
          │                    │
          ▼                    ▼
    Status: ASSIGNED     If no vendors left:
                              Status: CONFIRMED
                              (unassigned)
```

### Accept Flow

1. Vendor selects a trip from the list
2. Accept modal opens with driver & vehicle dropdowns
3. Auto-assign button picks: highest-rated driver + matching vehicle type
4. Manual override: vendor picks specific driver/vehicle
5. On confirm: `acceptTrip(tripId, vendorId, driverId, vehicleId)`
6. State changes: vehicle status → `ASSIGNED`, driver & vehicle IDs set
7. Event logged: `TRIP_ACCEPTED`
8. Audit logged: `ACCEPT`

### Decline Flow

1. Vendor selects reason (default: "No drivers available")
2. On confirm: `declineTrip(tripId, vendorId, reason)`
3. State changes:
   - `vendorDeclineLog` appended with `{ vendorId, reason, declinedAt }`
   - System checks for next available vendor (V1→V2)
   - If found: trip re-offered to next vendor (failover event logged)
   - If no vendors: status stays at `CONFIRMED` (no one assigned)
4. Events logged: `VENDOR_DECLINED`, optionally `FAILOVER`

### Failover Logic

```typescript
// From ride-shared/src/stores/tripStore.ts
const allVendors = ['V1', 'V2'];
const existingDeclines = declineLog.map(e => e.vendorId);
const nextVendor = allVendors.find(v => !existingDeclines.includes(v));
```

This is a simple round-robin. In production, this would be replaced by a configurable failover policy.

---

## 9. OTP Verification

OTP gates are enforced at two critical points in the trip lifecycle:

### Pickup OTP (PAX_PICKED)

```
Driver arrives at pickup → enters OTP → verified? → proceed
                           │
                     ┌─────┴─────┐
                     ▼           ▼
                  Correct      Wrong
                     │           │
                     ▼           ▼
               Mark pickup   Increment failure
               verified      count
                                 │
                           ┌─────▼─────┐
                           │  >= 3?    │
                           ├─────┬─────┤
                           ▼     ▼
                        BLOCK   Retry
                        (alert  (remaining
                         sent)  attempts)
```

### Drop OTP (PAX_DROPPED)

Same logic, but for `drop` phase instead of `pickup`.

### Implementation

```typescript
verifyOtp(tripId, vehicleIndex, phase, otp) → {
  success: boolean;
  message: string;
  blocked?: boolean;         // true if OTP is locked
  remainingAttempts?: number;
}
```

- Expected OTP: defaults to `"1234"` for mock, sourced from `vehicle.otp[phase]`
- Max failed attempts: **3**
- After 3 failures: OTP is **blocked**, dispatcher is alerted (does not auto-escalate to SOS)
- Failed attempts tracked in `vehicle.otpFailedAttempts[]`
- Successful verification resets the failure count

---

## 10. Vehicle Swap & Breakdown Handling

### Breakdown Flow

1. Driver reports breakdown via the driver app (or dispatcher in ride_prd)
2. `reportBreakdown(tripId, vehicleIndex, reason)`:
   - Sets vehicle status to `BREAKDOWN`
   - Stores `breakdownReason` on the vehicle
3. From `BREAKDOWN`, available transitions:
   - `VEHICLE_SWAP` — replace the vehicle
   - `CANCELLED` — cancel this vehicle (convoy continues with others)

### Vehicle Swap Logic

`performVehicleSwap(tripId, vehicleIndex, reason)`:

1. **Find replacement:** Search for active vehicles of the same `requestedVehicleTypeId` in the same tenant, excluding the current vehicle
2. **Find replacement driver:** Search for available, active drivers in the same tenant, excluding current driver
3. **Perform swap:**
   - `vehicleId` → replacement vehicle
   - `driverId` → replacement driver (or keep existing if none found)
   - `vendorId` → replacement vehicle's owner vendor
   - `status` → `VEHICLE_SWAP`
   - Preserves: `priceId`, `lockedPrice`, `lockedRateCardVersion`, `otp`, `pax[]`
4. From `VEHICLE_SWAP`, the new vehicle can resume from any phase:
   `EN_ROUTE_PICKUP`, `AT_PICKUP`, `PAX_PICKED`, `IN_TRANSIT`, or `AT_DROP`

---

## 11. Traccar GPS Tracking & Demo Simulation

### Two Modes

| Mode | Setting | Behavior |
|---|---|---|
| **Mock** (default) | `useMockData: true` | Random simulated positions, no Traccar server needed |
| **Live** | `useMockData: false` | Fetches real GPS data from Traccar API at `localhost:8082` |

### Vehicle Mapping

App vehicles map to Traccar devices via `vehicle.traccarDeviceId`:

| App Vehicle | Traccar uniqueId | Make/Model | Demo Color |
|---|---|---|---|
| VH1 | `TRA-001` | Maruti Swift Dzire | Emerald (#10B981) |
| VH2 | `TRA-002` | Mahindra XUV700 | Blue (#3B82F6) |
| VH3 | `TRA-003` | Force Tempo Traveller | Orange (#F97316) |
| VH5 | `TRA-005` | Toyota Fortuner | Purple (#8B5CF6) |

### Traccar Service Architecture

```
traccarService (singleton)
├── updateConfig(config)  ← Switch between mock/live at runtime
├── fetchDevices()        ← Get all devices from Traccar
├── getDevicePosition(id) ← Get latest GPS position
├── updateMockPosition()  ← Set mock position for simulation
├── updateMockBearing()   ← Set direction for smooth animation
└── getDevicesPositions() ← Batch position fetch
```

### Demo Simulation

The **Start Demo** button on Control Room triggers `traccarStore.startDemoSimulation()`:

1. Loads waypoint routes from `demoRoutes.ts` (4 Bangalore routes: Majestic→Koramangala→Electronic City loop, Hebbal→Mysore Road, Airport→Yelahanka, Whitefield→HSR Layout)
2. Tracks current waypoint index per vehicle in a `Map`
3. Sets an interval: every **2.5 seconds**, advance each vehicle to next waypoint
4. Calculates speed and bearing between waypoints
5. Updates `traccarService.updateMockPosition()` and `updateMockBearing()`
6. Fetches updated position → triggers map re-render
7. Map markers animate smoothly via `requestAnimationFrame` with cubic ease-out

### Switching to Live Mode

1. Go to **Super Admin → GPS Tracking** (`/super-admin/traccar`)
2. Click "Edit Configuration"
3. Enter Traccar credentials: username `admin@localhost`, password `admin`
4. Toggle to "Live Traccar"
5. Save → calls `setTraccarConfig()` which updates both store and service singleton

---

## 12. Multi-Tenancy & Cross-Portal Sync

### Tenant Model

3 seed tenants:
| ID | Name | Base City | Currency |
|---|---|---|---|
| `T1` | Hubballi Transport Co | Hubballi | INR |
| `T2` | Bengaluru Rides Pvt Ltd | Bengaluru | INR |
| `T3` | Gulf Express (Demo) | Dubai | AED |

Active tenant is stored in `tenantStore.activeTenantId` and used to scope all data queries.

### Cross-Portal Sync Mechanism

```
ride-ops-portal writes to store
    → Zustand persist middleware writes to localStorage
    → storage event fires in other tabs
    → ride_prd Tab: event listener calls persist.rehydrate()
    → Vendor Portal Tab: same listener calls persist.rehydrate()
```

**Implementation** (`ride-ops-portal/hooks/useCrossTabSync.ts`):
```typescript
useEffect(() => {
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === 'ride-safety-alerts') useSafetyAlertStore.persist.rehydrate();
    if (e.key === 'ride-ops-trips') useTripStore.persist.rehydrate();
    // ... etc for all shared persist keys
  };
  window.addEventListener('storage', handleStorageChange);
  return () => window.removeEventListener('storage', handleStorageChange);
}, []);
```

### What Syncs

| Action in Ops Portal | Effect in ride_prd | Effect in Vendor |
|---|---|---|
| SOS acknowledged | SOS badge clears | — |
| Rate card created | Pricing page updates | — |
| New tenant onboarded | Tenant switcher updates | — |
| Trip completed | Revenue dashboard updates | Earnings update |

### Known Sync Lags

- **Rate cards:** ops portal uses `ride-ops-portal/stores/rateCardStore.ts` while ride_prd uses `ride_prd/stores/rateCardStore.ts` — these are **different stores** with different persist keys. They do NOT automatically sync.
- **Trips:** There are also two `tripStore.ts` files (one in `ride-shared`, one in `ride_prd`). They share the persist key `ride-trips` and both use `encryptedStorage`, so they should stay in sync — but if encryption keys diverge, data can become unreadable.

---

## 13. Portal-by-Portal Role & Permission Model

### 13.1 ride-ops-portal — Ops Control Center

Three roles, selected at login:

| Role | Color | Purpose | PII Access |
|---|---|---|---|
| **Control Room** | Green | Safety monitoring, SOS, anomalies | Full (with mask) |
| **Rate Manager** | Purple | Rate cards, simulation, audit | **No PII** |
| **Super Admin** | Navy Blue | Tenants, billing, health, GPS config | Contact info (masked) |

#### Role-Specific Sidebar

| Role | Primary Nav | Secondary Nav |
|---|---|---|
| Control Room | Safety Board, SOS, Anomalies, Trips, Reports | — |
| Rate Manager | Dashboard, Create, History, History Timeline, Simulate, Audit | — |
| Super Admin | Dashboard, Tenants, Billing, Health, Audit, GPS Tracking | — |

#### Role Permissions

| Action | Control Room | Rate Manager | Super Admin |
|---|---|---|---|
| View SOS alerts | ✓ | ✗ | ✓ |
| Acknowledge SOS | ✓ | ✗ | ✗ |
| Escalate SOS | ✓ | ✗ | ✗ |
| View anomalies | ✓ | ✗ | ✗ |
| Create rate cards | ✗ | ✓ | ✓ |
| View rate cards | ✗ | ✓ | ✓ |
| Supersede versions | ✗ | ✓ | ✓ |
| View simulation | ✗ | ✓ | ✗ |
| View audit log | ✗ | ✓ | ✓ |
| Manage tenants | ✗ | ✗ | ✓ |
| View billing | ✗ | ✗ | ✓ |
| GPS config | ✗ | ✗ | ✓ |
| View PII | ✓ (masked) | ✗ | ✓ (masked) |

### 13.2 ride_prd — Admin Portal

Roles (implicit, no login screen):
- **Operator/Admin** — Full access to all features

Nav structure:
- Dashboard → `/`
- Configuration → Vendors, Customers, Vehicle Types, Vehicles, Drivers, Add-ons
- Pricing → Rate Cards, Quote Simulator
- Trips → Trip management (Manual, Bulk, API, Recurring, Clone creation), Trip Detail View
- Dispatch → Auto-dispatch
- Driver → Driver mobile simulation
- Tracking → Live GPS tracking
- Billing → Ledger, Vouchers, Sub-vendor reconciliation, Customer statements
- API Console → API docs, Webhook config/logs, API tester

### 13.3 ride-vendor-portal — Vendor Portal

Single role: **Vendor Fleet Manager**

Nav structure:
- Dashboard → KPIs (active trips, alerts, earnings)
- Fleet → Vehicles, Drivers (with document alerts)
- Trips → Accept/Decline, View details, Track
- Earnings → Earnings history, Payouts
- Alerts → Safety alerts, Document expiry alerts
- Login → Session-based auth

---

## 14. Earnings & Payouts

### Earnings Model

```typescript
interface VendorEarnings {
  earningId: string;
  tripId: string;
  vendorId: string;
  driverId?: string;
  fare: number;           // Gross fare (lockedPrice)
  operatorFee: number;    // Platform commission
  netToVendor: number;    // fare - operatorFee = what vendor gets
  completedAt: string;
  status: 'UNBILLED' | 'STATEMENTED' | 'RECONCILED';
}
```

### Payout Model

```typescript
interface PayoutEntry {
  id: string;
  vendorId: string;
  payoutDate: string;
  periodStart: string;
  periodEnd: string;
  tripsIncluded: number;
  amount: number;          // Total payout amount
  status: 'PAID' | 'PENDING';
}
```

### Flow

```
Trip Completed
    → Earnings entry created (fare, operatorFee, netToVendor)
    → Status: UNBILLED
    → Monthly statement: STATUS = STATEMENTED
    → Payment processed: STATUS = RECONCILED
    → Payout created: PAYOUT (with period range and trip count)
```

### Vendor Portal Earnings Page

- Shows monthly earnings chart (bar chart with 6 months)
- Card: Total earnings, this month, pending payouts
- DataTable: Earnings list (trip ID, amount, net, status)
- Payout table: History of payouts (date, period, amount, status)

---

## Appendix: Key Business Logic Files

| File | What it Contains |
|---|---|
| `ride-shared/src/stores/tripStore.ts` | Core trip CRUD, accept/decline, event/audit logging |
| `ride-shared/src/stores/safetyAlertStore.ts` | SOS escalation, acknowledge/resolve/dismiss |
| `ride-shared/src/stores/alertStore.ts` | Vendor alerts, notifications |
| `ride-shared/src/stores/earningsStore.ts` | Earning creation, period filtering |
| `ride-shared/src/stores/payoutStore.ts` | Payout CRUD |
| `ride-shared/src/stores/traccarStore.ts` | GPS state, demo simulation interval |
| `ride-shared/src/services/traccarService.ts` | Traccar API client, mock mode, config switching |
| `ride-shared/src/mock/demoRoutes.ts` | Bangalore waypoint routes for demo |
| `ride-shared/src/types/index.ts` | All domain types (Trip, Vehicle, Driver, etc.) |
| `ride_prd/stores/tripStore.ts` | Advanced trip store with OTP, breakdown, vehicle swap |
| `ride_prd/stores/billingStore.ts` | Billing lifecycle, operator fees, reconciliation, vouchers |
| `ride_prd/stores/rateCardStore.ts` | Rate card versioning, applicability lookup |
| `ride_prd/lib/lifecycle.ts` | Authoritative transition map, deriveTripStatus, getNextValidTransitions |
| `ride_prd/lib/preflight.ts` | Pre-flight checks: checkCancel, checkUpdate |
| `ride-ops-portal/stores/rateCardStore.ts` | Ops-specific rate card store (with audits) |
| `ride-ops-portal/stores/opsSessionStore.ts` | Ops role-based session management |
| `ride-ops-portal/stores/notificationStore.ts` | Role-based notifications |
| `ride-ops-portal/components/control-room/MapComponent.tsx` | Smooth marker animation, Traccar integration |
| `ride-prd/CLAUDE.md` | Authoritative domain model (read before changing types) |

---

## Quick Reference: Common Formulas

**Display money:** `₹{(paise / 100).toFixed(2)}`

**Operator fee (PERCENT):** `operatorFee = Math.round(subtotal * percentAmount / 100)`

**Operator fee (FLAT):** `operatorFee = flatAmount`

**Operator fee (TIERED):** 
```typescript
const tier = tiers.find(t => subtotal >= t.minAmount && (!t.maxAmount || subtotal < t.maxAmount));
operatorFee = tier ? Math.round(subtotal * tier.feePercent / 100) : 0;
```

**Net to vendor:** `netToVendor = fare - operatorFee`

**Cancellation penalty:** 
```typescript
if (now < pickupTime - freeCancellationHours) penalty = 0; // Free
else penalty = Math.round(lockedPrice * 0.2); // 20% penalty
```

**Demo speed calculation:** 
```typescript
const dlat = nextLat - currentLat;
const dlng = nextLng - currentLng;
const distKm = Math.sqrt(dlat * dlat + dlng * dlng) * 111;
const speed = Math.max(15, Math.round(distKm / 0.00055 * 3.6));
```

---

## 15. Pre-Flight Checks (Detailed)

Pre-flight checks are implemented in `ride_prd/lib/preflight.ts` and enforce anchoring pattern #2.

### checkTime

```typescript
checkTime(priceId: string, pickupTime: string) → {
  allowBooking: boolean;
  reasons: string[];         // e.g. "Minimum lead time is 2 hours"
  hoursUntilPickup: number;
  minLeadTimeHours: number;
}
```

Called **before confirming a trip** to verify:
- Pickup time is in the future
- Pickup time respects `minLeadTimeHours` from the offer (default: 2h)
- No blackout dates apply

If `allowBooking === false`, the confirm button stays disabled and the reason is displayed.

### checkCancel

```typescript
checkCancel(
  offer: { freeCancellationHours: number },
  pickupTime: string,
  lockedPrice: number
) → {
  allowed: boolean;
  free: boolean;              // true = no penalty
  penaltyPct: number;         // 0 if free, else configured %
  penaltyAmount: number;      // 0 if free, else calculated penalty in paise
  resultingStatus: string;    // "CANCELLED"
}
```

**Algorithm:**
```
deadline = pickupTime - freeCancellationHours
if now < deadline → free cancellation, penalty = 0
if now >= deadline → penalty = Math.round(lockedPrice * configuredPenaltyPct / 100)
```

### checkUpdate

```typescript
checkUpdate(trip: TripRequest) → {
  allowed: boolean;
  message: string;  // "Trip can be updated" or reason why not
}
```

Restrictions:
- Cannot update if any vehicle has status `IN_TRANSIT` or beyond
- Cannot update if any vehicle has an exception status (SOS, BREAKDOWN, ACCIDENT)
- Stops can only be added (not removed) if any vehicle is past `AT_PICKUP`

---

## 16. All 6 Trip Creation Methods

Trips can be created via 6 different methods, tracked via `TripRequest.createdVia`:

### 1. Manual
Full form with sections:
- **Scope:** Customer (dropdown), schedule (one-off datetime or recurring rule)
- **Stops:** Build ordered stop sequence (PICKUP/DROP/WAYPOINT) with address + lat/lng + location-type conditional fields
- **Vehicles:** Add 1..n vehicles (choose requested type, types may be mixed, e.g., 2 Sedan + 1 Coach)
- **Pricing:** Get offers per vehicle (calls `getOffers`), pick an offer, lock price
- **Assignment:** Optionally pre-assign vehicle + driver
- **Pax:** Optionally add passengers per vehicle
- **Coordination:** Coordinator (name/phone), viewers (email list), costCenter, POS

### 2. Bulk Upload
- CSV/Excel file drop → mock parser
- Shows row-level validation preview before commit
- Creates multiple draft trips in one action
- Validation rules: required fields, valid date format, vehicle type exists

### 3. API — Pax-Based (`API_PAX`)
Mock incoming payload styled as RISMA/ROMA integration:
- Payload: `{ pax[], pickup, drop, vehicleType }`
- Two modes: "1 vehicle per pax" or "1 coach for all"
- Automatically maps pax to vehicles
- Auto-quotes each vehicle

### 4. API — Vehicle Count (`API_VEHICLE_COUNT`)
Mock payload:
- Payload: `{ "N vehicles of type X", stops[], autoAssign: boolean }`
- `autoAssign: true` → auto-pick available vehicles + drivers + auto-quote
- `autoAssign: false` → create unfilled slots (still quoted) for dispatcher to fill

### 5. Recurring Generator
From a recurring rule (`TripRequest.schedule.type === 'RECURRING'`):
- Rule: `{ freq: 'DAILY'|'WEEKLY', daysOfWeek[], startDate, endDate?, time }`
- Generator creates the next ~7 occurrences as individual trips
- Each occurrence copies stops, vehicles, and pricing from the template

### 6. Clone
Duplicate an existing trip:
- Copies: stops, vehicles (without driver/vehicle assignments), pricing
- New `createdVia = 'CLONE'`
- User can edit before confirming

---

## 17. Dispatch Board (Kanban) & Auto-Assign

### Dispatch Board Layout

The dispatch board (`ride_prd /dispatch`) is a kanban-style layout with columns by `VehicleStatus`:

```
┌─────────────┐ ┌──────────────┐ ┌──────────────┐ ┌─────────────┐
│  PENDING    │ │  ASSIGNED    │ │DRVR_ACCEPTED │ │EN_ROUTE     │
│  (awaiting  │ │  (awaiting   │ │ (driver on   │ │ (in field)  │
│  assignment)│ │  vendor      │ │  the way)    │ │             │
├─────────────┤ ├──────────────┤ ├──────────────┤ ├─────────────┤
│ T-V1-003    │ │ T-V1-001     │ │ T-V1-004     │ │ T-V1-005    │
│ Sedan       │ │ ┌─────────┐  │ │ ┌─────────┐  │ │ ┌─────────┐ │
│ Karnataka   │ │ │Vendor:  │  │ │ │Driver:  │  │ │ │Driver:  │ │
│ Airlines    │ │ │Apex     │  │ │ │Suresh K │  │ │ │Rajesh M │ │
│             │ │ │Timer:   │  │ │ │Vehicle: │  │ │ │Vehicle: │ │
│             │ │ │02:45    │  │ │ │KA-05    │  │ │ │KA-02    │ │
│             │ │ └─────────┘  │ │ └─────────┘  │ │ └─────────┘ │
└─────────────┘ └──────────────┘ └──────────────┘ └─────────────┘
```

Each card shows:
- Trip ID, customer, route summary, vehicle type, locked price
- Vendor name + timer (countdown from 300s for vendor response)
- Assigned driver (masked) + vehicle plate
- Actions: Accept/Decline (admin-side simulation), or Advance status

### Auto-Assign Logic

- Action: "Auto-assign all" button at top of dispatch board
- For each trip with `autoAssign === true` and unassigned vehicles:
  1. Find available vehicle of matching `requestedVehicleTypeId`
  2. Find available driver (not currently ON_TRIP)
  3. Ensure no double-booking (vehicle/driver not assigned to overlapping trip)
  4. Assign vehicle + driver, set status → `DRIVER_ACCEPTED`
- Shows spinner → success toast: "X trips auto-assigned"

### Manual Assignment
- Fill unfilled slots via dropdown: vehicle type filter → available vehicles → driver selection
- Respects: vehicle type, availability, no double-booking
- Manual reassign/override allowed before vehicle reaches `EN_ROUTE_PICKUP`

---

## 18. Driver Accept/Reject & Configurable Timeout Policy

### Driver Accept/Reject Simulation

In ride_prd's `/driver` page (driver app simulator), the driver can:
- **Accept** a trip → vehicle status: `DRIVER_ACCEPTED`
- **Reject** a trip → vehicle status: `DRIVER_REJECTED`

### Configurable Timeout Policy (Tenant Setting)

When a driver rejects OR the accept-timeout expires (configurable per tenant, default 300s), the system applies a tenant-level policy:

| Policy | Behavior |
|---|---|
| `AUTO_REASSIGN` | Automatically assign to next available driver |
| `RETURN_TO_QUEUE` | Return trip to dispatch queue for manual reassignment |
| `ESCALATE` | Notify supervisor, flag as requiring attention |

The policy is stored in the tenant configuration. The effect is visible in the dispatch board.

---

## 19. Location Typing & Reverse Scheduling

### Location Typing Helper

Located in `lib/location.ts`, the helper classifies a point and enforces conditional fields:

```typescript
classifyLocation(point: { lat: number; lng: number; address: string }) → {
  locationType: 'AIRPORT' | 'RAIL' | 'HOTEL' | 'CITY' | 'ADDRESS';
  requiredFields: string[];  // Fields that become required for this stop
  tags?: string[];           // e.g. ['lodging'] for HOTEL
}
```

| Location Type | Detection Heuristic | Required Fields |
|---|---|---|
| `AIRPORT` | Keywords: "airport", "airprt", airport codes (BLR, BOM) | `flightNumber` (required), `terminal` (optional) |
| `RAIL` | Keywords: "station", "railway", "rail" | `trainNumber` (required) |
| `HOTEL` | Keywords: "hotel", "resort", "inn", or lodging tags | None extra |
| `CITY` | City-level addresses | None extra ("from" pricing) |
| `ADDRESS` | Full street address | None extra (exact pricing) |

### Pricing Eligibility

- `ADDRESS` and `HOTEL`: exact pricing applies
- `CITY`: imprecise — shows "from" price flag instead of exact price
- `AIRPORT` and `RAIL`: exact pricing applies with location-specific surcharges

### Reverse Scheduling

When destination is `AIRPORT` or `RAIL` and a flight/train time is entered:

```
recommendedDispatchTime = departureTime - travelTimeToAirport - checkInBuffer

Where:
  travelTimeToAirport = estimated from current location (mock: 60 min default)
  checkInBuffer = 120 min for international, 60 min for domestic (AIRPORT)
  checkInBuffer = 15 min (RAIL)
```

The user can accept the suggested dispatch time or override it.

---

## 20. Driver App Simulator (Phase 5)

The driver app simulator lives at `ride_prd /driver` and is framed as a mobile view (single driver at a time, pick which driver to simulate).

### Inbox
- List of assigned trips for the selected driver
- **Accept / Reject** buttons (feeds the timeout policy from §18)
- Each trip shows: route, scheduled time, customer, vehicle type

### Active Trip Screen
- Convoy stop list (all stops in sequence)
- Large **status-advance** button following the legal transition map
- Current status highlighted, next allowed transitions shown

### OTP Entry
- At `PAX_PICKED`: OTP input field appears (default mock OTP: `1234`)
- At `PAX_DROPPED`: OTP input field appears
- OTP must match `vehicle.otp.pickup` or `vehicle.otp.drop` to flip the verified gate
- 3 attempts max, then blocked
- OTP is shared via Comms Bridge (§23) — the pax "receives" it via WhatsApp/SMS

### Location Sharing
- Toggle: "Sharing location" ON/OFF
- When ON: drives this driver's position in the mock Traccar feed
- The position updates every 3 seconds, visible on the Tracking map (§21)

### SOS Button
- Red emergency button
- Pressing it:
  1. Sets vehicle status → `SOS` (exception)
  2. Creates a `SafetyAlert` with type `SOS` in `safetyAlertStore`
  3. Sets escalation L1 as done (driver notified), L2 as active
  4. Cross-portal: Control Room sees the SOS immediately

---

## 21. Tracking Module (Phase 5)

The tracking module lives at `ride_prd /tracking` and provides a live GPS map.

### Live Map
- OpenStreetMap tiles (Leaflet or MapLibre — **no Google Maps**)
- Vehicles plotted from a mock Traccar feed (`lib/mock/traccar.ts`)
- Feed is a generator moving vehicles along their convoy stop sequence via interpolation on an interval

### Marker Colours
| VehicleStatus | Marker Colour |
|---|---|
| `EN_ROUTE_PICKUP` | Blue |
| `IN_TRANSIT` | Green |
| `SOS` | Red (pulsing) |
| `BREAKDOWN` | Orange |
| `DELAYED` | Amber |
| Others | Grey |

### Side Panel (on marker click)
- Trip context: trip ID, customer, route
- Driver info (PII masked)
- Passenger info (PII masked)
- Current status + ETA to next stop
- ETA = remaining distance × mock speed (computed, not from a real routing engine)

### Trip-Focused View
- Filter by trip → shows ALL convoy vehicles for that trip on the map together
- Useful for monitoring multi-vehicle convoys

### "Traccar" Chip
- Badge: "Traccar: self-hosted (mock)" or "Traccar: live"
- Toggle between mock and live modes

---

## 22. Partner API Console (Phase 7)

The API Console at `ride_prd /api-console` demonstrates the external integration surface that systems like RISMA, ROMA, and CLASS would use.

### Quote → Book → Confirm Playground

A stepper with canned sample payloads styled as RISMA, ROMA, and CLASS:

**Step 1 — Quote:**
- Request: `{ vendorId, customerId, vehicleTypeId, pickup, drop, datetime }`
- Response: JSON offer with `priceId`, `rateCardVersion`, price, `freeCancellationHours`, `expiresAt`

**Step 2 — Check Time:**
- Calls `checkTime()` → shows verdict JSON

**Step 3 — Create Order:**
- Sends `{ priceId, stops[], vehicles[], schedule }`
- Order created only if `priceId` is valid and unexpired
- Returns order JSON with operator-assigned vehicle + driver (may be null if `autoAssign: false`)

**Step 4 — Confirm:**
- Mock confirmation → status flips
- Webhook event emitted

### Typed Error Taxonomy

Consistent envelope for all API responses:

```typescript
interface ApiResponse<T> {
  result: T | null;
  error: {
    name: string;       // e.g. "PRICE_EXPIRED"
    message: string;    // Human-readable description
    code: string;       // e.g. "ERR-400-002"
    status: number;     // HTTP status code
  } | null;
}
```

Error categories:
- **General:** `ERR-500-*` — Internal error, service unavailable
- **Order:** `ERR-400-*` — Invalid price ID, capacity < pax, missing flight number
- **Request:** `ERR-422-*` — Validation error
- **Pricing:** `ERR-409-*` — Expired price ID, rate card not found
- **Search:** `ERR-404-*` — Trip not found, vehicle not found
- **Auth:** `ERR-401-*` — Invalid token, token expired

A control in the API console allows **forcing example errors** (e.g., expired `priceId`) to show the error envelope in action.

### Webhook Log with Retry Contract

- Events emitted on: `created`, `quoted`, `assigned`, `driver_accepted`, `pax_picked`, `vehicle_swap`, `completed`, `billed`, `cancelled`, `sos`
- Payload includes: event type, trip ID, timestamp, relevant entity IDs
- **Retry contract:** 10 attempts, 2-minute intervals (simulated in compressed time for demo)
- A "Simulate delivery failure" toggle forces a retry sequence to be visible

### Token Panel
- JWT Bearer + refresh token
- 7-day lifetime
- Rule: retry auth max 3 times on invalid token
- Control to generate new/expired tokens for testing

### Outbound Read APIs (Customer-Facing)

An explorer where a "customer" can:
- Fetch trip status by `reference`
- Fetch vehicle + driver info by trip ID
- Fetch live position by trip ID
- All responses rendered as JSON

### Integration Map

A one-screen view showing all external integrations:

```
              ┌─────────────────────────────────────────────┐
              │              RIDE Platform                  │
              │                                             │
  RISMA ─────→│ Quote → Book → Confirm (inbound API)        │
  ROMA ──────→│                                             │
  CLASS ─────→│ Outbound: Webhooks, Status APIs             │──→ Customers
              │                                             │──→ Webhooks
              ├──────────────────┬──────────────────────────┤
              │  Traccar (GPS)   │  OSM (Maps)              │
              │  Mattermost(Ops) │  WhatsApp(Pax)            │
              └──────────────────┴──────────────────────────┘
```

### Sandbox Note

Panel listing items that **cannot** be tested in sandbox:
- Card payment processing
- Physical voucher delivery
- SMS/Email delivery (shown as mock only)
- Production access gated on acceptance testing

---

## 23. Comms Bridge (Mattermost + WhatsApp)

The comms bridge is an illustrative panel in the API Console showing how the platform communicates with different stakeholders.

### Channel Separation

| Channel | Audience | Triggers |
|---|---|---|
| **Mattermost** | Operator ops team | Assignment, Swap, SOS, Escalation |
| **WhatsApp** | Passengers (Pax) | OTP delivery, Trip confirmation, ETA updates, SOS notification |

### OTP Delivery Flow

1. Driver requests OTP (via driver app)
2. System generates OTP and stores it in `vehicle.otp`
3. **Comms bridge displays:** "WhatsApp message sent to pax: Your OTP for pickup is 4821"
4. Driver enters the OTP in their app
5. System verifies and flips the OTP gate

### Message Types

**Mattermost (to operations team):**
- `Trip T-V1-001 assigned to Apex Fleet`
- `Vehicle swap on T-V1-001 — KA-05-CH-1122 → KA-02-AB-3344`
- `SOS raised on T-V1-004 — driver needs assistance`

**WhatsApp (to passenger):**
- `Your ride is confirmed! Driver Suresh will pick you up at 14:30. OTP: 4821`
- `Your driver is 5 minutes away`
- `Trip completed! Thank you for riding with us.`
- `⚠️ Emergency: Your driver has requested help. We're on it.`

---

## 24. Document Expiry System

### Vehicle Documents

| Document Type | Fields | Expiry Indicator |
|---|---|---|
| `REGISTRATION` | number, expiry, fileName | ≤30 days: amber ⚠, expired: red ✗ |
| `PERMIT_NATIONAL` | number, expiry, fileName | Same |
| `PERMIT_STATE` | number, expiry, fileName | Same |
| `FITNESS` | number, expiry, fileName | Same |
| `PUC` | number, expiry, fileName | Same |
| `INSURANCE` | number, expiry, fileName | Same |

### Driver Documents

| Document Type | Fields | Expiry Indicator |
|---|---|---|
| `LICENCE` | number, expiry, fileName | Same |
| `PSV_BADGE` | number, expiry, fileName | Same |
| `POLICE_VERIFICATION` | number, expiry, fileName | Same |
| `MEDICAL` | number, expiry, fileName | Same |
| `INDUCTION` | number, expiry, fileName | Same |

### Configuration Health Strip

Each configuration list (Drivers, Vehicles) shows a **health strip** at the top:
```
┌─────────────────────────────────────────────────────────┐
│ ⚠ 3 vehicles with expiring documents  │ 1 expired       │
└─────────────────────────────────────────────────────────┘
```

### Auto-Create Alert on Expiry

When a vehicle or driver is added with a document ≤30 days from expiry:
- An alert is auto-created in `alertStore`
- Type: `DOC_EXPIRY`
- Severity: `HIGH` if expired, `MEDIUM` if ≤30 days
- Appears in vendor portal `/alerts` and sidebar bell badge

---

## 25. Seed Data Detail (12 Trips)

### V1 — Apex Fleet (8 trips)

| Trip ID | Status | Vehicle Type | Route | Locked Price (₹) | Locked Price (paise) |
|---|---|---|---|---|---|
| T-V1-001 | `ASSIGNED` | Sedan | BLR Airport → Taj West End | 505.40 | 50540 |
| T-V1-002 | `ASSIGNED` | Innova | Kempegowda Station → Sheraton | 380.00 | 38000 |
| T-V1-003 | `DRIVER_ACCEPTED` | Sedan | Whitefield → Electronic City | 290.00 | 29000 |
| T-V1-004 | `EN_ROUTE_PICKUP` | Coach | BLR Airport → Ibis Airport | 890.00 | 89000 |
| T-V1-005 | `IN_TRANSIT` | Sedan | MG Road → BLR Airport | 420.00 | 42000 |
| T-V1-006 | `COMPLETED` | Sedan | Marathahalli → UB City Mall | 260.00 | 26000 |
| T-V1-007 | `COMPLETED` | Innova | BLR Airport → Brigade Road | 370.00 | 37000 |
| T-V1-008 | `CANCELLED` | Sedan | HSR Layout → Koramangala | 180.00 | 18000 |

### V2 — Urban Drivers Co (4 trips)

| Trip ID | Status | Vehicle Type | Route | Locked Price (₹) | Locked Price (paise) |
|---|---|---|---|---|---|
| T-V2-001 | `ASSIGNED` | Sedan | Indiranagar → BLR Airport | 340.00 | 34000 |
| T-V2-002 | `IN_TRANSIT` | Sedan | Jayanagar → MG Road | 210.00 | 21000 |
| T-V2-003 | `COMPLETED` | Sedan | Hebbal → Yelahanka | 190.00 | 19000 |
| T-V2-004 | `CANCELLED` | Sedan | Bannerghatta → JP Nagar | 220.00 | 22000 |

### Vehicles per Vendor

- **V1 (Apex Fleet):** 15 vehicles (8 Sedan, 4 SUV, 2 Tempo Traveller, 1 Coach)
- **V2 (Urban Drivers Co):** 8 vehicles (all Sedan)

### Drivers per Vendor

- **V1:** 10 drivers (mix of AVAILABLE/ON_TRIP/OFFLINE)
- **V2:** 5 drivers

### Safety Alerts (Ops Portal)

- 1 active SOS: Trip T-V1-004, raised 8 min ago, location Mekhri Circle, vehicle KA-05-CH-1122
  - L1 done (driver notified), L2 done (Rajesh acknowledged), L3 pending (Preethi)
  - Timeline: 4 events
- 1 active ROUTE_DEVIATION: Trip T-V1-005, 300m off expected route, duration 4 min
- 1 active NO_SHOW: Trip T-V1-003, driver waited 8 min, passenger not at pickup
- 2 resolved alerts for reports (SOS from yesterday, prolonged stop from 2 days ago)

---

## 26. The 5 Wire-Up Contracts (Cross-Portal)

These 5 contracts define how the portals stay in sync. They MUST work without page refresh.

### Contract 1: Accept

```
ride-vendor-portal: vendor accepts trip, assigns driver+vehicle
    → ride-shared tripStore: status = ASSIGNED, driverId/vehicleId set
    → ride_prd /dispatch: card disappears from dispatch queue
    → ride_prd /dispatch: kanban card moves to DRIVER_ACCEPTED column
    → ride_prd: toast "Apex Fleet accepted T-V1-001 ✓"
```

### Contract 2: Decline + Failover

```
ride-vendor-portal: vendor declines trip with reason
    → ride-shared tripStore: vendorDeclineLog appended
    → ride-shared tripStore: dispatchAttempts++
    → ride-shared tripStore: find next vendor NOT in declineLog
        → if found: trip.vendorId = nextVendor, status stays ASSIGNED
        → if none: status = CONFIRMED (unassigned)
    → ride_prd: toast "V1 declined T-V1-002 — assigned to V2"
    → ride_prd: dispatch queue shows new vendor name + new timer
    → ride-vendor-portal (V2): trip appears in trip list as ASSIGNED
```

### Contract 3: Fleet Sync

```
ride-vendor-portal: adds a driver/vehicle
    → ride-shared driverStore/vehicleStore: new entity added
    → ride_prd /configuration → Vendor Detail: new entity appears

ride_prd: adds a driver/vehicle to a vendor
    → ride-shared stores: entity added with vendorId
    → ride-vendor-portal /fleet: new entity appears
```

### Contract 4: Earnings Trigger

```
ride_prd /driver: trip vehicle reaches COMPLETED
    → ride-shared tripStore: advanceVehicleStatus() detects all completed
    → ride-shared earningsStore: createEarning() called automatically
        fare = trip.lockedPrice
        operatorFee = Math.round(lockedPrice * 0.15)
        netToVendor = fare - operatorFee
    → ride-shared tripStore: status = BILLED
    → ride-vendor-portal /earnings: new row appears immediately
    → ride-vendor-portal dashboard: "Earnings today" KPI increments
    → ride-vendor-portal: toast "New earning from T-V1-004 — ₹X added"
    → ride-ops-portal Super Admin: platform revenue increments
```

### Contract 5: Status Sync

```
ride_prd /dispatch: dispatcher advances vehicle status
    → ride-shared tripStore: vehicle status updated
    → ride-vendor-portal /trips: status badge updates on that trip
    → ride-vendor-portal dashboard: KPI updates (active now, etc.)
```

---

## 27. Phase Build Order (7 Phases)

The prototype was built in 7 sequential phases, each committing to all repos:

### Phase 0 — Foundation & App Shell
**Files:** `phase-0-foundation.md`
- Next.js 15 project setup, UI kit (Card, DataTable, Drawer, Modal, Tabs, Badge, Toast, PII)
- Tenant store with 3 seeded operators
- Sidebar + top bar with tenant switcher
- Domain types in `lib/types/index.ts`
- `/kitchen-sink` component showcase page

### Phase 1 — Configuration Domain
**Files:** `phase-1-configuration.md`
- Vendors, Customers, Vehicle Types, Vehicles (+docs), Drivers (+docs), Add-on services
- Location typing helper (`lib/location.ts`)
- Configuration health strip (expiring/expired document counts)
- PII masking everywhere

### Phase 2 — Pricing & Rate Engine
**Files:** `phase-2-pricing-rate-engine.md`
- 4 rate bases: PER_KM, FIXED_LOCATION_PAIR, HOURLY, PACKAGE
- Rate card versioning + effective dating
- Quote engine: `getOffers(input)` → `Offer[]` with `priceId`
- Quote Simulator page
- "Engine: Linked ⟷ Cached" chip

### Phase 3 — Trip Requests
**Files:** `phase-3-trip-requests.md`
- Convoy model: 1 shared stop sequence, 1..n vehicles
- All 6 creation methods (Manual, Bulk, API-PAX, API-VEHICLE-COUNT, Recurring, Clone)
- Booking rule: must cite valid `priceId`, blocked otherwise
- Location typing + reverse scheduling
- Coordinator, viewers, costCenter, POS

### Phase 4 — Lifecycle & Dispatch
**Files:** `phase-4-lifecycle-dispatch.md`
- Two-level state machine (17 vehicle, 7 trip states)
- Dispatch kanban board
- Pre-flight checks: checkTime, checkCancel, checkUpdate
- Driver accept/reject + configurable timeout policy
- Vehicle swap with preservation of price/history/OTP
- Exception handling (BREAKDOWN, ACCIDENT, SOS, etc.)
- Per-vehicle activity timeline

### Phase 5 — Tracking & Driver App
**Files:** `phase-5-tracking-driver-app.md`
- Live map with mock Traccar feed
- Marker colours by VehicleStatus, ETA computation
- Driver app simulator: inbox, accept/reject, status advance, OTP, location sharing, SOS

### Phase 6 — Billing & Reconciliation
**Files:** `phase-6-billing.md`
- Deterministic costing from frozen quote (never re-resolve)
- Billable Trips ledger
- Operator fee config: FLAT / PERCENT / TIERED
- Sub-vendor invoice reconciliation
- Customer usage statements + CSV export
- Vouchers per trip and per passenger
- Multi-currency: INR/AED/USD/EUR
- Immutable billing event log + adjustments

### Phase 7 — Partner API Console
**Files:** `phase-7-partner-api.md`
- Quote→Book→Confirm playground (real prototype logic)
- Typed error taxonomy with force-error controls
- Pre-flight check endpoints as callable cards
- Outbound read APIs by reference
- Webhook log with retry contract (10 attempts, 2-min intervals)
- Token panel (JWT Bearer + refresh)
- Comms bridge: Mattermost + WhatsApp
- Integration map (one-screen SVG)
- Sandbox limitations panel

---

## 28. Backend Architecture Blueprint

This section is for the **production backend** — translating the Zustand+mock prototype to Django/FastAPI services.

### Recommended Architecture

```
┌────────────────────────────────────────────────────────────┐
│                     API Gateway (Kong/NGINX)                │
│  Auth: JWT + API Key rotation  │  Rate limiting            │
└──────────┬──────────┬──────────┬──────────┬───────────────┘
           │          │          │          │
     ┌─────▼──┐ ┌────▼───┐ ┌───▼────┐ ┌───▼────────┐
     │ Pricing│ │ Trip   │ │ Fleet  │ │ Billing    │
     │ Service│ │ Service│ │ Service│ │ Service    │
     └────────┘ └────────┘ └────────┘ └────────────┘
           │          │          │          │
     ┌─────▼──────────▼──────────▼──────────▼────────────┐
     │                 PostgreSQL                          │
     │  Tenants | Vendors | Customers | Vehicles | Drivers │
     │  RateCards | Trips | Billing | Earnings            │
     └─────┬──────────┬──────────┬──────────┬────────────┘
           │          │          │          │
     ┌─────▼──┐ ┌────▼───┐ ┌───▼────┐ ┌───▼────────┐
     │  Redis │ │Traccar │ │ Matter-│ │ WhatsApp   │
     │ (Cache)│ │ (GPS)  │ │ most   │ │ BSP        │
     └────────┘ └────────┘ └────────┘ └────────────┘
```

### Service Boundaries

| Service | Responsibility | Key Endpoints |
|---|---|---|
| **Pricing Service** | Rate cards, quoting, fare simulation | `GET /offers`, `POST /rate-cards`, `GET /rate-card-versions` |
| **Trip Service** | Trip CRUD, state machine, pre-flight checks | `POST /trips`, `PATCH /trips/:id/status`, `POST /trips/:id/swap` |
| **Fleet Service** | Vehicles, drivers, documents, availability | `GET /vendors/:id/vehicles`, `PATCH /drivers/:id/status` |
| **Billing Service** | Billing lines, operator fees, reconciliation, vouchers | `POST /billing-lines`, `GET /customer-statements`, `POST /reconcile` |
| **Vendor Service** | Vendor onboarding, tokens, webhook config | `POST /vendors`, `GET /vendors/:id/trips`, `POST /webhook-config` |
| **Notification Service** | Mattermost ops, WhatsApp pax, in-app | `POST /notify`, `POST /send-otp` |
| **Partner API Gateway** | External-facing API for RISMA/ROMA/CLASS | `POST /quote`, `POST /book`, `POST /confirm`, `GET /trips/:ref` |

### Data Model Translation

| Prototype Type | PostgreSQL Table | Notes |
|---|---|---|
| `Tenant` | `tenants` | Multi-tenant root |
| `Vendor` | `vendors` | `tenant_id` FK, `type` ENUM |
| `Customer` | `customers` | `tenant_id` FK |
| `VehicleType` | `vehicle_types` | `tenant_id` FK, `ac` BOOLEAN |
| `Vehicle` | `vehicles` | `vendor_id` FK, `vehicle_type_id` FK, JSONB `documents` |
| `Driver` | `drivers` | `vendor_id` FK, JSONB `documents`, TSVECTOR for search |
| `RateCard` | `rate_cards` | `tenant_id`, `vendor_id`, `customer_id`, `vehicle_type_id` FKs, JSONB `modifiers`, `version` INT |
| `TripRequest` | `trips` | JSONB `stops`, JSONB `schedule` |
| `TripVehicle` | `trip_vehicles` | `trip_id` FK, JSONB `pax`, JSONB `otp`, INT `locked_price` (paise) |
| `BillingLine` | `billing_lines` | `trip_id` FK, `vehicle_id` FK, `locked_price` INT, `status` ENUM |
| `VendorEarnings` | `vendor_earnings` | `trip_id` FK, `vendor_id` FK, INT `fare`, `operator_fee`, `net` |
| `SafetyAlert` | `safety_alerts` | JSONB `timeline`, `escalation_level` INT |

### Key Business Logic as SQL/Service Decisions

1. **Price lock guarantee:** `trip_vehicles.locked_price` is written ONCE at booking time. The billing service reads this column — it NEVER joins to rate_cards for historical pricing.

2. **State machine as code + DB constraint:** Vehicle status is an ENUM with allowed transitions enforced by application code (not DB triggers). Trip status is a **materialized view** over vehicle statuses, refreshed on every status change.

3. **OTP gate:** Implemented as a CHECK constraint: `(status = 'PAX_PICKED' AND otp->'pickupVerified' = 'true') OR status != 'PAX_PICKED'`. Same for drop.

4. **Operator fee:** Computed at billing time, NOT at trip time. Fee config (FLAT/PERCENT/TIERED) is per-tenant in `tenants.operator_fee_config` JSONB column.

5. **Failover:** Stored procedure or application-level: when a vendor declines, find next vendor from a priority-ordered list on the trip. If none, set status to CONFIRMED and create a "needs assignment" alert.

6. **Cross-tab sync** (prototype only): In production, all portals make API calls to the backend. Real-time updates via WebSocket (e.g., Phoenix Channels or Django Channels).

### Production Tech Stack Recommendation

| Component | Recommendation |
|---|---|
| **Backend** | Django + Django REST Framework **OR** FastAPI + SQLAlchemy |
| **Database** | PostgreSQL 15+ (RDS on AWS ap-south-1) |
| **Cache** | Redis |
| **Real-time** | Django Channels (WebSocket) or Phoenix Channels |
| **Frontend** | React/Next.js (reuse validated flows, not mock code) |
| **Driver App** | Flutter (reuse state machine logic) |
| **Passenger App** | Flutter (real-time tracking, ETA, ride history) |
| **GPS** | Traccar (self-hosted or cloud) |
| **Maps** | OSM + OSRM/Valhalla/GraphHopper routing |
| **Ops Comms** | Mattermost |
| **Pax Comms** | WhatsApp BSP (Twilio/WhatsApp Business API) |
| **CI/CD** | GitLab CI or GitHub Actions |
| **Infra** | AWS (ECS Fargate or EKS), ap-south-1 |
| **Monitoring** | Sentry (errors), Datadog/Prometheus (metrics), PagerDuty (alerts) |

---

*This document was generated by reading all 34 `.md` files across the codebase. Last updated: July 15, 2026.*
