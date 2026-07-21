# 🚗 Ride Operations Platform — Handover Document

**Project:** Ride Operations Platform (RIDE — Rezolv Integrated Dispatch Engine)  
**Repository:** `/home/geelani/Downloads/Ride_polish`  
**Last Updated:** July 15, 2026  
**Current State:** MVP feature-complete across all 3 portals. Demo-ready.

---

## 📋 Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Getting Started](#3-getting-started)
4. [Portal-by-Portal Breakdown](#4-portal-by-portal-breakdown)
5. [State Management & Data Flow](#5-state-management--data-flow)
6. [Key Implementations](#6-key-implementations)
7. [Traccar GPS Integration](#7-traccar-gps-integration)
8. [Design System](#8-design-system)
9. [Demo Script](#9-demo-script)
10. [Known Issues & Gotchas](#10-known-issues--gotchas)
11. [Future Work](#11-future-work)

---

## 1. Project Overview

A **multi-tenant B2B Transport Management System** with 3 interconnected Next.js portals sharing a common state layer. Built as a **clickable prototype for internal validation** — no real backend, all data in-memory via Zustand stores with localStorage persistence.

### What it does
- **Control Room** — Real-time safety monitoring, SOS handling, anomaly detection, vehicle tracking on a live map
- **Rate Manager** — Pre-negotiated rate cards with versioning, fare simulation, audit trails
- **Super Admin** — Multi-tenant management, platform billing, system health
- **Vendor Portal** — Trip acceptance/decline, fleet management, earnings
- **Admin Portal** (ride_prd) — Full operator dispatch, trip lifecycle, configuration, billing

### Key Business Rules
1. **Pre-negotiated pricing** — Orders must cite a `price_id` from a rate card; quoted price is frozen at booking
2. **Pre-flight checks** — `checkTime`, `checkCancel`, `checkUpdate` before any state change
3. **Convoy trip model** — 1 shared stop sequence, 1..n vehicles following the same stops
4. **Two-level state machine** — Vehicle status (17 states) + Trip status (7 derived states)
5. **Reverse scheduling** — For AIRPORT/RAIL destinations, compute dispatch time from departure minus buffer

---

## 2. Architecture

### Repository Structure

```
Ride_polish/
├── ride-shared/               ← Shared data layer (Zustand stores, types, services, mock data)
│   ├── src/
│   │   ├── index.ts           ← Public API: exports all stores, types, services
│   │   ├── types/index.ts     ← Core domain types
│   │   ├── helpers.ts         ← Utility: id() generator
│   │   ├── crypto.ts          ← Encryption utilities
│   │   ├── encryptedStorage.ts ← Encrypted localStorage wrapper
│   │   ├── translations.ts    ← i18n (English + Japanese)
│   │   ├── mock/
│   │   │   ├── seed.ts        ← Vendor seed data
│   │   │   └── demoRoutes.ts  ← Bangalore waypoint routes for 4 demo vehicles
│   │   ├── services/
│   │   │   └── traccarService.ts ← GPS tracking (mock + live Traccar API)
│   │   └── stores/            ← 14 Zustand stores (see §5)
│   └── package.json           ← Exports as @ride/shared
│
├── ride-ops-portal/           ← Operations Control Center (port 3002, basePath: /ops)
│   ├── app/                   ← 11 route groups + 7 sub-routes
│   ├── components/            ← UI kit + domain components
│   │   ├── control-room/      ← 6 components
│   │   ├── layout/            ← 4 components (OpsShell, Header, Sidebars, MobileMenu)
│   │   ├── rate-manager/      ← 1 component (SupersedeModal)
│   │   ├── ui/                ← 21 reusable components
│   │   └── notifications/     ← Notification drawer
│   ├── stores/                ← 5 ops-specific stores
│   ├── hooks/                 ← Custom hooks
│   └── lib/                   ← Utils, types, translations
│
├── ride_prd/                  ← Main admin portal (port 3000, NO basePath — acts as reverse proxy)
│   ├── app/                   ← ~17 route groups
│   ├── components/            ← 13 component directories
│   ├── stores/                ← ride_prd-specific stores
│   ├── lib/                   ← Mock data, helpers, validation, lifecycle
│   └── next.config.ts         ← Proxies /ops→:3002, /vendor→:3001
│
├── ride-vendor-portal/        ← Vendor portal (port 3001, basePath: /vendor)
│   ├── app/                   ← 6 route groups
│   ├── components/            ← 6 component directories
│   └── hooks/                 ← 6 custom hooks
│
├── vendor_v2/                 ← Documentation/specs for vendor portal phases (not live code)
├── dev.js                     ← Unified dev script: starts all 3 portals
├── DEMO_SCRIPT.md             ← 10-step E2E demo walkthrough
├── OPS_CONTEXT.md             ← Ops portal context for prompting AI agents
└── PHASE_4_SUMMARY.md         ← Summary of Phase 4 polish work
```

### Tech Stack

| Technology | Version | Notes |
|---|---|---|
| **Next.js (ops/vendor)** | 16.2.9 | App Router |
| **Next.js (ride_prd)** | 15.x | App Router (older but compatible) |
| **React** | 19.x | Latest |
| **TypeScript** | 5.x | Strict mode |
| **Tailwind CSS** | 4.x | PostCSS config |
| **Zustand** | 5.x | State management + persist middleware |
| **Leaflet** | 1.9.x | OpenStreetMap maps |
| **Recharts** | 3.x | Charts |
| **Lucide React** | Latest | Icons |
| **Traccar** | Docker | GPS tracking server |

### Port Assignments

| Portal | Port | Base Path | URL |
|---|---|---|---|
| ride_prd (main) | 3000 | `/` | http://localhost:3000 |
| ride_prd (legacy) | 3004 | `/` | http://localhost:3004 |
| Vendor Portal | 3001 | `/vendor` | http://localhost:3000/vendor or :3001/vendor |
| Ops Portal | 3002 | `/ops` | http://localhost:3000/ops or :3002/ops |

### Cross-Portal Communication

**No backend.** All portals share Zustand stores from `@ride/shared` using localStorage as the persistence layer. Cross-tab sync is achieved via the browser's `storage` event:

```
ride-shared (Zustand stores)
    ├── persist middleware → localStorage
    ├── storage events → cross-tab sync
    ├── → ride-ops-portal (reads/writes)
    ├── → ride_prd (reads + writes)
    └── → ride-vendor-portal (reads)
```

Key wire-up events:
1. **SOS Acknowledge** → Ops portal → `safetyAlertStore` → ride_prd + vendor portal update
2. **Rate Card Create** → Rate manager → `rateCardStore` → ride_prd pricing shows new card
3. **New Tenant** → Super admin → `tenantStore` → ride_prd tenant switcher updates
4. **Trip Complete** → ride_prd → `tripStore` → Ops portal platform revenue updates

---

## 3. Getting Started

### Prerequisites
- Node.js 18+
- npm 9+
- Docker (for Traccar GPS)

### Installation

```bash
cd /home/geelani/Downloads/Ride_polish

# Install dependencies for each package
cd ride-shared && npm install && cd ..
cd ride-ops-portal && npm install && cd ..
cd ride_prd && npm install && cd ..
cd ride-vendor-portal && npm install && cd ..
```

### Running All Portals

```bash
# Option 1: Unified launcher (start all 3 in one terminal)
node dev.js

# Option 2: Individual terminals
cd ride-ops-portal && npx next dev --port 3002   # http://localhost:3002/ops
cd ride_prd && npx next dev --port 3000           # http://localhost:3000
cd ride-vendor-portal && npx next dev --port 3001 # http://localhost:3001/vendor
```

### Traccar GPS Server (Optional — for live vehicle tracking)

```bash
docker run -d \
  --name traccar \
  --restart unless-stopped \
  -p 8082:8082 \
  -p 5055:5055 \
  traccar/traccar:latest

# Create admin user (fresh install)
curl -X POST 'http://localhost:8082/api/users' \
  -H 'Content-Type: application/json' \
  -d '{"name":"Administrator","email":"admin@localhost","password":"admin"}'

# Log in
curl -c cookies.txt 'http://localhost:8082/api/session' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'email=admin@localhost&password=admin'

# Create 4 tracking devices
for id in TRA-001 TRA-002 TRA-003 TRA-005; do
  curl -b cookies.txt 'localhost:8082/api/devices' \
    -H 'Content-Type: application/json' \
    -d "{\"name\":\"Vehicle-${id}\",\"uniqueId\":\"$id\"}"
done
```

**Traccar credentials:** Email: `admin@localhost`, Password: `admin`  
**Dashboard:** http://localhost:8082

### Demo Data
All data is auto-seeded on first load via Zustand persist middleware. No manual setup needed — just open any portal and it populates.

---

## 4. Portal-by-Portal Breakdown

### 4.1 ride-shared (`@ride/shared`) — The Shared Foundation

**Package path:** `file:../ride-shared`  
**Entry point:** `src/index.ts` — exports all stores, services, types, utilities

#### Stores (14 total)

| Store | Persist Key | Key State | Purpose |
|---|---|---|---|
| `tripStore` | `ride-trips` (encrypted) | `trips[]`, `eventLog[]`, `auditLog[]` | Trip CRUD, status machine, vendor accept/decline |
| `vehicleStore` | — | `vehicles[]` | Vehicle registry |
| `driverStore` | — | `drivers[]` | Driver management |
| `vehicleTypeStore` | — | `vehicleTypes[]` | Vehicle type definitions |
| `vendorStore` | `ride-vendors` | `vendors[]` | Vendor info |
| `sessionStore` | `ride-session` | `sessions[]` | Vendor login sessions |
| `alertStore` | `ride-vendor-alerts` | `alerts[]`, `notifications[]` | Vendor alerts + notifications |
| `safetyAlertStore` | `ride-safety-alerts` | `safetyAlerts[]` | SOS + safety alerts with escalation timeline |
| `earningsStore` | `ride-earnings` | `earnings[]` | Vendor earnings |
| `payoutStore` | `ride-payouts` | `payouts[]` | Payout management |
| `customerStore` | `ride-ops-customers` | `customers[]` | Customer registry |
| `tenantStore` | `ride-tenant` | `tenants[]`, `activeTenantId` | Multi-tenant management |
| `traccarStore` | — | `devices`, `positions`, `useMockData` | GPS tracking + demo simulation |
| `languageStore` | `ride-language` | `language` | i18n preference |

#### Services

- **`traccarService.ts`** — Singleton service for Traccar GPS integration. Supports mock mode (random movements) and live mode (API calls to Traccar server at port 8082). Has `updateConfig()` to switch between modes at runtime.

#### Key Domain Types

```typescript
TripRequest, TripVehicle, TripStatus (7), VehicleStatus (17)
Driver, Vehicle, Vendor, Customer, Tenant, VehicleTypeConfig
Stop, Pax, OTPGates, Schedule, RecurrenceRule
VendorAlert, VendorEarnings, EventLogEntry, AuditLogEntry
```

#### Encryption

Passwords are stored encrypted using a AES-like `encrypt`/`decrypt` pair in `crypto.ts`. The `encryptedStorage.ts` wraps Zustand's `createJSONStorage` for secure localStorage.

---

### 4.2 ride-ops-portal — Operations Control Center

**The newest portal, built last.** Contains the most polished UI with skeleton loading, offline detection, mobile responsiveness, and smooth animations.

#### Route Structure (11 pages + 7 sub-routes)

```
/ops/
├── /login                        ← Role selection (Control Room / Rate Manager / Super Admin)
├── /control-room                 ← Safety board (live map, KPIs, alerts, activity feed)
│   ├── /control-room/sos         ← SOS detail with escalation L1→L2→L3→L4 tracker
│   ├── /control-room/anomalies   ← Route deviations, prolonged stops, no-shows
│   ├── /control-room/trips       ← Read-only trip list
│   └── /control-room/reports     ← Safety reports
├── /rate-manager                 ← Rate card KPI dashboard
│   ├── /rate-manager/create      ← Full rate card creation with live preview
│   ├── /rate-manager/history     ← Version history timeline
│   ├── /rate-manager/simulate    ← Fare simulator with live calculation
│   └── /rate-manager/audit       ← Immutable audit log
├── /super-admin                  ← Platform health dashboard
│   ├── /super-admin/tenants      ← Multi-tenant CRUD
│   ├── /super-admin/billing      ← Revenue charts + summary
│   ├── /super-admin/health       ← System health monitoring
│   ├── /super-admin/audit        ← Cross-tenant audit log
│   └── /super-admin/traccar      ← GPS tracking configuration
└── /ui-test                      ← Component showcase (kitchen sink)
```

#### Component Architecture

**Layout (4 components):**
| Component | File | Purpose |
|---|---|---|
| `OpsShell` | `components/layout/OpsShell.tsx` | Root shell — picks sidebar by role, manages mobile menu state |
| `OpsHeader` | `components/layout/OpsHeader.tsx` | Top bar — role badge, switcher, notification bell, avatar |
| `Sidebars` | `components/layout/Sidebars.tsx` | 3 role-specific nav sidebars (240px, navy `#1B2A4A`) |
| `MobileMenu` | `components/layout/MobileMenu.tsx` | Fullscreen drawer for <768px, 44px touch targets |

**Control Room (6 components):**
| Component | File | Purpose |
|---|---|---|
| `LiveMap` | `components/control-room/LiveMap.tsx` | Leaflet map wrapper (lazy loaded) |
| `MapComponent` | `components/control-room/MapComponent.tsx` | Vehicle markers with smooth `requestAnimationFrame` animation |
| `AlertCard` | `components/control-room/AlertCard.tsx` | Safety alert card display |
| `VehicleDetailPanel` | `components/control-room/VehicleDetailPanel.tsx` | Vehicle info on map click |
| `EscalationModal` | `components/control-room/EscalationModal.tsx` | SOS escalation L1→L2→L3→L4 modal |
| `ActivityFeed` | `components/control-room/ActivityFeed.tsx` | Real-time event timeline |

**UI Kit (21 components) — `components/ui/`:**
`KpiCard`, `DataTable`, `Drawer`, `Modal`, `Toast`, `StatusBadge`, `PiiField`, `LiveBadge`, `Skeleton` (4 variants), `EmptyState`, `EmptyStateCard`, `ErrorCard`, `OfflineBanner`, `TimelineEvent`, `Tabs`, `Badge`, `Card`, `Button`, `AlertBanner`, `LanguageToggle`, `LoadingSkeleton`

**Ops-Specific Stores (5):**
- `opsSessionStore` — User role, name, permissions (persisted to localStorage)
- `rateCardStore` — Rate card CRUD for ops portal
- `notificationStore` — Role-based notifications (seeded with 9 samples, 3 per role)
- `languageStore` — UI language toggle
- `tripStore` — Trip state override

#### Key UI Features
- **Skeleton loaders** — KpiCardSkeleton, DataTableSkeleton, ChartSkeleton, CardSkeleton
- **Offline detection** — Fixed `OfflineBanner` via `navigator.onLine` + window events
- **Mobile responsive** — Hamburger menu <768px, 44px touch targets
- **Smooth map animation** — Vehicle markers interpolate between positions using `requestAnimationFrame` with cubic ease-out
- **Live badge** — Pulsing green dot + "Live" on control room

---

### 4.3 ride_prd — Main Admin Portal

**The original portal.** Largest codebase with the most pages and features.

#### Route Structure (17+ route groups)

```
/
├── /                     ← Dashboard
├── /configuration        ← Vendors, Customers, Vehicle Types, Vehicles, Drivers, Add-ons
├── /pricing              ← Rate cards + Quote simulator
├── /trips                ← Trip management (manual, bulk, API, recurring, clone creation)
├── /dispatch             ← Auto-dispatch controls + driver assignment
├── /driver               ← Driver mobile app simulation
├── /pooling              ← Ride pooling
├── /rosters              ← Crew rosters
├── /tracking             ← Live GPS tracking (mock Traccar)
├── /billing              ← Ledger, vouchers, sub-vendor reconciliation, customer statements
├── /api-console          ← API docs, webhook config/logs, API tester
├── /kitchen-sink         ← UI component showcase
├── /passenger-mobile     ← Passenger mobile app simulation
├── /driver-mobile        ← Driver mobile app simulation
└── /driver               ← Driver management
```

#### Key Components (by directory)
- **`trips/`** — TripDetailView, MapComponent, StateTransitionManager, VehicleAssignmentModal, BillingSection, StopEditor, PaxAssignment, CloneCreation, Manual/Bulk/Recurring/API creation
- **`configuration/`** — VendorsTab, CustomersTab, VehiclesTab, DriversTab, VehicleTypesTab, AddonsTab, DocumentStatus
- **`pricing/`** — RateCardsTab, QuoteSimulatorTab
- **`billing/`** — BillingLedger, VoucherManager, SubVendorReconciliation, CustomerStatement
- **`api-console/`** — ApiDocumentation, ApiTester, WebhookConfig, WebhookLogs
- **`partner-api/`** — QuoteBookConfirmStepper

#### Proxying (next.config.ts)
`ride_prd` acts as the **entry point** — it proxies `/ops/*` → `:3002/ops/*` and `/vendor/*` → `:3001/vendor/*`. This means you can access all 3 portals from a single URL: `http://localhost:3000`.

#### `CLAUDE.md`
Contains the authoritative domain model with all type definitions. **Read this file before making any changes to types** — it's the source of truth for the domain model.

---

### 4.4 ride-vendor-portal — Vendor Portal

**The leanest portal.** Built after the initial PRD prototype.

#### Route Structure (6 routes)
```
/vendor/
├── /              ← Dashboard with KPIs
├── /fleet         ← Fleet management (vehicles, drivers, alerts)
├── /trips         ← Trip management
├── /earnings      ← Earnings & payouts
├── /login         ← Vendor login
└── /alerts        ← Safety alerts
```

#### Custom Hooks (6)
- `useVendorTrips` — Fetch trips scoped to a vendor
- `useFleetAlerts` — Fetch fleet alerts
- `useStorageSync` — Cross-tab localStorage sync
- `useKeyboardShortcuts` — Keyboard navigation
- `useCrossTabSync` — Another cross-tab sync hook
- `useHydrated` — Track hydration state

#### UI Components
Reuses the shared pattern: `DataTable`, `StatusBadge`, `PiiField`, `Tabs`, `KpiCard`, `Toast`, `Drawer`, `Modal`, `EmptyState`, `PageSkeleton`, `LoadingSkeleton`, `ErrorBoundary`

---

## 5. State Management & Data Flow

### Zustand Pattern

Every store follows the same pattern:

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Store {
  // State
  items: Item[];
  
  // Actions (always mutative via set())
  addItem: (item: Omit<Item, 'id'>) => string;
  updateItem: (id: string, updates: Partial<Item>) => void;
  removeItem: (id: string) => void;
  
  // Derived data (computed in component via selector)
  getItemsByFilter: (filter: string) => Item[];
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      items: [],
      
      addItem: (item) => {
        const id = crypto.randomUUID();
        set((state) => ({ items: [...state.items, { ...item, id }] }));
        return id;
      },
      
      updateItem: (id, updates) => {
        set((state) => ({
          items: state.items.map((i) => i.id === id ? { ...i, ...updates } : i),
        }));
      },
      
      removeItem: (id) => {
        set((state) => ({ items: state.items.filter((i) => i.id !== id) }));
      },
      
      getItemsByFilter: (filter) => get().items.filter(/* ... */),
    }),
    { name: 'store-persist-key' }
  )
);
```

### Cross-Tab Sync Implementation

The `useCrossTabSync` hook listens for `storage` events and rehydrates affected stores:

```typescript
// In ride-ops-portal/hooks/useCrossTabSync.ts
useEffect(() => {
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === 'ride-safety-alerts') useSafetyAlertStore.persist.rehydrate();
    if (e.key === 'ride-ops-trips') useTripStore.persist.rehydrate();
    if (e.key === 'ride-ops-rate-cards') useRateCardStore.persist.rehydrate();
    // ...
  };
  window.addEventListener('storage', handleStorageChange);
  return () => window.removeEventListener('storage', handleStorageChange);
}, []);
```

### localStorage Persist Keys

| Key | Store | Portal(s) |
|---|---|---|
| `ride-trips` | tripStore (encrypted) | All |
| `ride-vendor-alerts` | alertStore | All |
| `ride-safety-alerts` | safetyAlertStore | ops, ride_prd |
| `ride-tenant` | tenantStore | ops, ride_prd |
| `ride-vendors` | vendorStore | All |
| `ride-session` | sessionStore | vendor |
| `ride-earnings` | earningsStore | vendor, ops |
| `ride-payouts` | payoutStore | vendor |
| `ride-ops-customers` | customerStore | ops, ride_prd |
| `ride-language` | languageStore | All |
| `ride-ops-session` | opsSessionStore | ops |
| `ride-ops-rate-cards` | rateCardStore | ops |
| `ride-ops-notifications` | notificationStore | ops |
| `ride-ops-language` | languageStore (ops) | ops |

---

## 6. Key Implementations

### 6.1 Trip State Machine

**File:** `ride-shared/src/stores/tripStore.ts`

Two-level state machine:
- **Vehicle status** (17 states): `PENDING → ASSIGNED → DRIVER_ACCEPTED|DRIVER_REJECTED → EN_ROUTE_PICKUP → AT_PICKUP → PAX_PICKED(otp) → IN_TRANSIT → AT_DROP → PAX_DROPPED(otp) → COMPLETED` + exceptions: `NO_SHOW, BREAKDOWN, ACCIDENT, VEHICLE_SWAP, DELAYED, SOS, CANCELLED`
- **Trip status** (7 derived): `DRAFT → CONFIRMED → ASSIGNED → IN_PROGRESS → COMPLETED → BILLED | CANCELLED`

Transition validation is hardcoded in `advanceVehicleStatus()` with OTP gates enforced at `PAX_PICKED` and `PAX_DROPPED`.

### 6.2 SOS Escalation

**File:** `ride-shared/src/stores/safetyAlertStore.ts`

4-level escalation track: L1 (logged) → L2 (dispatcher notified) → L3 (manager) → L4 (executive). Each level has a timeline entry with `status: 'pending' | 'active' | 'done'`. The Ops Portal `EscalationModal` shows this timeline visually.

Acknowledging an SOS (`acknowledgeSafetyAlert`) sets the alert to `ACKNOWLEDGED` and marks L3 as done.

### 6.3 Rate Card Versioning

**File:** `ride-ops-portal/stores/rateCardStore.ts`

Rate cards have a `version` field. Creating a new version supercedes the old one via a confirmation modal (`SupersedeModal`). The audit log tracks every `CREATED`, `SUPERSEDED`, and `DEACTIVATED` action immutably.

Rate bases: `PER_KM | FIXED_LOCATION_PAIR | HOURLY | PACKAGE`  
Modifiers: `minFare`, `nightCharge`, `waitingPerHour`, `tollHandling`, `parkingHandling`, `interStateSurcharge`, `deadMileagePerKm`

### 6.4 Demo Vehicle Simulation

**Files:** `ride-shared/src/mock/demoRoutes.ts`, `ride-shared/src/stores/traccarStore.ts`

4 vehicles with Bangalore waypoint routes:
- **VH1** (Maruti Swift, green): Majestic → MG Road → Koramangala → Silk Board → Electronic City loop
- **VH2** (XUV700, blue): Hebbal → Yeshwanthpur → Rajajinagar → Vijayanagar → Mysore Road loop
- **VH3** (Tempo Traveller, orange): Airport → Yelahanka → Manyata Tech Park → Hebbal loop
- **VH5** (Fortuner, purple): Whitefield → Marathahalli → Bellandur → HSR Layout loop

Start/Stop via `traccarStore.startDemoSimulation()` / `stopDemoSimulation()`. Advances every 2.5 seconds. Map markers animate smoothly via `requestAnimationFrame` with cubic ease-out.

### 6.5 Cross-Portal Proxy

**File:** `ride_prd/next.config.ts`

The PRD portal rewrites `/ops/*` → `localhost:3002/ops/*` and `/vendor/*` → `localhost:3001/vendor/*`. This allows unified access at `http://localhost:3000`.

---

## 7. Traccar GPS Integration

### Overview

Two modes:
1. **Mock mode** (`useMockData: true` — default) — Random simulated vehicle movements without a real Traccar server
2. **Live mode** (`useMockData: false`) — Fetches real GPS data from Traccar at `http://localhost:8082`

### Service Architecture

**File:** `ride-shared/src/services/traccarService.ts`

The `TraccarService` class is a singleton (`traccarService`) that handles:
- Device CRUD via Traccar REST API
- Position fetching (single + batch)
- Mock position generation for testing
- Config switching via `updateConfig()`

### Vehicle Mapping

| App Vehicle ID | Traccar uniqueId | Make/Model |
|---|---|---|
| VH1 | `TRA-001` | Maruti Swift Dzire |
| VH2 | `TRA-002` | Mahindra XUV700 |
| VH3 | `TRA-003` | Force Tempo Traveller |
| VH5 | `TRA-005` | Toyota Fortuner |

The mapping is via `Vehicle.traccarDeviceId` field in the data model.

### Switching to Live Mode

1. Navigate to **Super Admin → GPS Tracking** (`/super-admin/traccar`)
2. Click **"Edit Configuration"**
3. Enter credentials: Username: `admin@localhost`, Password: `admin`
4. Toggle to **"Live Traccar"**
5. Click **"Save Configuration"**

This calls `setTraccarConfig()` which updates both the store state AND the service singleton via `traccarService.updateConfig()`.

### Demo Simulation

On the Control Room page (`/control-room`), click **"Start Demo"** to begin vehicle animation. All 4 vehicles move along their Bangalore routes every 2.5 seconds. The button turns red **"Stop Demo"** while active.

---

## 8. Design System

### Color Palette

| Token | Hex | Usage |
|---|---|---|
| `sidebar-bg` | `#1B2A4A` | All sidebars |
| `brand-blue` | `#2563EB` | Primary CTAs, active states |
| `page-bg` | `#F8FAFC` | Main content background |
| `card-bg` | `#FFFFFF` | All cards |
| `card-border` | `#E8E8E8` | All borders |
| `text-primary` | `#3D434A` | Body text |
| `text-muted` | `#8B8FA8` | Secondary labels |
| `success` | `#1DB87A` | Active/completed/resolved |
| `warning` | `#F0A030` | Pending/amber alerts |
| `danger` | `#E84040` | SOS/critical alerts |
| `purple` | `#7060E0` | Rate manager accent |
| `navy-dark` | `#0F1923` | Super admin accent |

### PII Rules

- All names, phones, emails masked by default
- Eye icon reveals for 10 seconds then re-masks
- Never log PII to console
- Rate manager sees NO passenger PII at all
- Super admin sees tenant contact info only (masked)

### Money Rules

- All amounts in integer **paise**
- Display: `₹{(paise/100).toFixed(2)}`
- Never use floats in arithmetic
- Operator fee: `Math.round(lockedPrice * 0.15)`

### Mobile Responsiveness

- Desktop-first with mobile tolerance
- Sidebar collapses to hamburger menu at `<768px`
- `touch-target` class: `min-h-[44px]` (Apple's recommended tap target)
- Mobile drawer slides in from left with backdrop overlay

---

## 9. Demo Script

A full 10-step E2E demo script exists at `DEMO_SCRIPT.md` (~15 minute walkthrough):

1. Login & Control Room Overview
2. Handle Live SOS with Escalation
3. Anomaly Detection & Reporting
4. Cross-Portal Data Sync
5. Rate Card KPI Dashboard
6. Create New Rate Card with Live Preview
7. Version History Timeline
8. Fare Simulator
9. Audit Log (Immutable Trail)
10. Super Admin Dashboard & Tenant Management

**Demo credentials:**
- Control Room: name "Preethi Sharma", role "control-room"
- Rate Manager: name "Arjun Gupta", role "rate-manager"
- Super Admin: name "Vikram Kumar", role "super-admin"

---

## 10. Known Issues & Gotchas

### Critical

- **No backend.** All data is in-memory + localStorage. Refreshing clears state unless rehydrated from localStorage. The `SeedInitializer` component guards against this.
- **Rate card sync delay.** The `rateCardStore` in `ride-ops-portal` is OPS-specific. Creating a rate card in Ops Portal updates the ops store — but ride_prd has its own rate card store that may not sync via `storage` events. Check persist keys.
- **Multiple cross-tab sync hooks.** Both `useCrossTabSync` (ops-portal/hooks) and `useStorageSync` (vendor-portal/hooks) exist. They may conflict.

### Moderate

- **`dev.js` race condition.** The unified launcher starts all 3 portals simultaneously. The 15-second banner is approximate. If a portal fails, the script doesn't retry.
- **Zustand persist + Leaflet.** Leaflet maps use DOM elements that don't survive React hydration. The map container ID (`#map-container`) must exist before `L.map()` is called. The `MapComponent` handles this via a ref.
- **Traccar mock-to-live switch.** The `setTraccarConfig` now syncs to the service singleton via `updateConfig()`, BUT if the user is already on the Control Room page and switches to Live mode, the map won't auto-refresh (no stale closure issue — but `fetchDevices()` only runs on mount).
- **Demo simulation interval.** Stored in a module-level `let demoSimInterval` (not in Zustand state). If the store is recreated (e.g., hot reload), the interval may leak.

### Minor

- **Console errors on first load.** Leaflet tile loading may log 404s if the map renders before styles are ready. Cosmetic only.
- **PII reveal timer.** The `PiiField` component uses `setTimeout` for the 10s reveal. If the component unmounts mid-reveal, the timer may fire on unmounted component. No functional impact.
- **Search input radios.** Some `configuration` pages use `<input type="search">` which renders as a radio button in Tailwind. Workaround: separate CSS reset.
- **Missing `postcss.config.mjs`.** The ride-ops-portal uses Tailwind v4 which reads from PostCSS. If Tailwind styles don't apply, check that `postcss.config.mjs` exists at the portal root.

---

## 11. Future Work

### Short-term (phase 5-6 candidates)
- **Real backend integration** — Replace Zustand-mocked stores with API calls to Django/FastAPI
- **Auto-refresh on config change** — When user switches Traccar to Live mode, the Control Room map should re-fetch devices automatically
- **Persistent notification history** — Currently session-only, should persist to localStorage
- **Service Worker** — True offline PWA support (currently localStorage only)

### Medium-term
- **Driver mobile app** — Flutter app for real driver GPS tracking with OTP
- **Passenger app** — Real-time tracking, ETA, ride history
- **Partner API documentation** — Swagger/OpenAPI for external integration
- **Rate engine as microservice** — Extract rate calculation into its own service

### Long-term
- **Multi-currency support** — Currently INR/AED/USD but not fully wired through billing
- **Geofencing** — Real geofence alerts for route deviations
- **Automated dispatch** — ML-based auto-assignment of vehicles to trips
- **Dark mode** — Theme toggle across all portals

---

## Appendix: Key File Reference

### For Onboarding (read these first)

| File | Why |
|---|---|
| `README.md` (root) | Project overview and phase structure |
| `OPS_CONTEXT.md` | Ops Portal architecture and conventions |
| `ride_prd/CLAUDE.md` | **Authoritative domain model** — read before touching any types |
| `DEMO_SCRIPT.md` | Full E2E demo walkthrough |
| `ride-shared/src/index.ts` | Shared package public API |
| `ride-shared/src/types/index.ts` | All domain type definitions |
| `ride-shared/src/stores/tripStore.ts` | Most complex store — trip lifecycle |
| `ride-ops-portal/components/control-room/MapComponent.tsx` | Most complex component — map + animation |

### For Build/Run Issues

| File | Why |
|---|---|
| `dev.js` | Unified launcher for all portals |
| `ride_prd/next.config.ts` | Proxy configuration for cross-portal access |
| `ride-ops-portal/next.config.ts` | Ops portal base path (`/ops`) |
| `ride-vendor-portal/next.config.ts` | Vendor portal base path (`/vendor`) |
| `ride-shared/package.json` | Shared package exports map |

### For State Management

| File | Why |
|---|---|
| `ride-ops-portal/hooks/useCrossTabSync.ts` | Cross-tab sync implementation |
| `ride-ops-portal/components/SeedInitializer.tsx` | Data seeding on first load |
| `ride-shared/src/encryptedStorage.ts` | Encrypted localStorage wrapper |
| `ride-ops-portal/stores/rateCardStore.ts` | Most complex ops-specific store |

### For GPS/Tracking

| File | Why |
|---|---|
| `ride-shared/src/services/traccarService.ts` | Traccar API client + mock mode |
| `ride-shared/src/stores/traccarStore.ts` | GPS state + demo simulation |
| `ride-shared/src/mock/demoRoutes.ts` | Bangalore waypoint routes |
| `ride-ops-portal/app/super-admin/traccar/page.tsx` | GPS config settings page |

---

**Handover prepared:** July 15, 2026  
**Prepared by:** Buffy (Coding AI Agent)  
**For questions about specific implementations,** check the phase spec files in `vendor_v2/` and root `.md` files.
