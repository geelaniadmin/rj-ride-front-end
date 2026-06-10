# Vendor Portal — Phase 4: Polish, Mobile & Full End-to-End Demo
# Send: cat VENDOR_CONTEXT.md phase-4-polish.md | claude
# Requires: Phase 3 complete and committed

---

## What to build in this phase

Final polish, notifications, mobile refinement, error/empty/offline states,
performance validation, and the full cross-portal end-to-end demo flow.

---

## 1. Notifications system

  Bell icon in header — unread badge (red)
  Clicking bell → notifications drawer (360px right side):
    Title + "Mark all read" button

    Types with icons:
      TRIP_ASSIGNED     →  "New trip: [tripId] from [customer]" — blue
      TRIP_ACCEPTED     →  "[tripId] accepted — driver assigned" — green
      TRIP_COMPLETED    →  "[tripId] completed — ₹[net] earned" — dark green
      VEHICLE_BREAKDOWN →  "Breakdown: [plate]" — red
      DOC_EXPIRY        →  "[plate] [doc type] expiring in [N] days" — amber
      DRIVER_OFFLINE    →  "Driver went offline" — grey
      FAILOVER          →  "Trip [tripId] reassigned to you (failover)" — purple

    Each notification: icon + title + timestamp (relative)
    Unread: highlighted bg (#EFF6FF)
    Click: mark read + navigate to relevant page

  Seed V1 with 5 notifications on load:
    2 unread: TRIP_ASSIGNED + DOC_EXPIRY
    3 read: TRIP_COMPLETED + DRIVER_OFFLINE + FAILOVER

  Auto-generate on:
    New trip assigned to vendor → TRIP_ASSIGNED
    Trip completed → TRIP_COMPLETED with net amount
    Alert created → DOC_EXPIRY
    Failover triggers to this vendor → FAILOVER notification

---

## 2. Dashboard KPI polish

  Fleet status bar (full width):
    Horizontal segmented bar:
      Green: AVAILABLE drivers / Total drivers (%)
      Yellow: ON_TRIP drivers (%)
      Grey: OFFLINE drivers (%)
    Label: "X of Y drivers available"

  Quick actions row:
    [View pending trips]   → /trips?status=ASSIGNED
    [View active trips]    → /trips?status=IN_TRANSIT
    [View alerts]          → /alerts
    [View earnings]        → /earnings

  Acceptance rate KPI (add as 5th card):
    accepted / (accepted + rejected) this month as %
    Green if >90% | amber 70-90% | red <70%

---

## 3. Error states — all pages

  Loading:
    DataTable: LoadingSkeleton rows
    KpiCards: skeleton number placeholder
    Charts: spinner overlay

  Empty:
    Trips: "No trips found" + [Clear filters]
    Drivers: "No drivers yet" + [Add driver]
    Vehicles: "No vehicles yet" + [Add vehicle]
    Earnings: "No earnings in this period" + [Change period]
    Alerts: "No alerts — fleet is healthy ✓" (green icon)

  API error:
    Error card: "Failed to load [resource]" + [Retry]
    Collapsed debug section with error.message

  Offline mode:
    All pages: amber banner "Offline — showing cached data"
    Accept/Reject buttons: disabled + tooltip "Cannot perform offline"
    Charts still render from earningsStore cache
    Auto-retry every 30s — banner disappears on reconnect

---

## 4. Mobile refinements (test at 375px and 768px)

  Sidebar: hamburger + slide-over overlay on mobile ✓ (Phase 0)
  Header: compact — hide vendor name label, show initials avatar only
  Dashboard KPIs: 2 × 2 grid on mobile, 4 × 1 on desktop
  All tables: horizontal scroll, first column (ID/name) pinned sticky
  Drawers: full width on mobile (not 420px)
  Modals: full-width bottom-sheet on mobile (slide up animation)
  Charts: stack vertically on mobile (column, not row)
  Buttons: min 44px touch target on all interactive elements
  Filter bar: collapsible on mobile (show "Filters" pill, tap to expand)
  Notifications drawer: full width on mobile

---

## 5. Performance checks

  Leaflet map: confirm NOT in any page bundle — only loads on modal/drawer open
    Check: open /trips page, Network tab must show 0 leaflet requests
    Open trip drawer → Network shows leaflet loading
    Close drawer → open different drawer → leaflet reloads cleanly

  Recharts: dynamically imported with next/dynamic ssr:false
  DataTable: pagination limits DOM to 20 rows max
  Search: 300ms debounce confirmed (no re-filter on every keystroke)
  Vendor switch: stores re-filter within 100ms, no full page reload

---

## 6. Full end-to-end demo flow — 10 steps

  This is the complete demo script for higher authorities.
  Run with admin_portal and vendor portal open side by side.

  Step 1: Open admin_portal /trips
    → See 12 seeded trips
    → T-V1-001 and T-V1-002 are ASSIGNED to Apex Fleet

  Step 2: Open vendor portal, login as Apex Fleet (V1)
    → Dashboard: 2 trips needing attention, 2 active
    → Notification bell: 2 unread

  Step 3: Vendor portal /trips — Accept T-V1-001
    → Assign to highest-rated driver
    → Confirm Accept
    → VENDOR PORTAL: T-V1-001 → DRIVER_ACCEPTED, driver → ON_TRIP
    → ADMIN PORTAL (no refresh): dispatch queue card disappears,
      kanban card moves to DRIVER_ACCEPTED column, toast fires

  Step 4: Vendor portal — Reject T-V1-002, reason "No vehicles available"
    → VENDOR PORTAL: T-V1-002 → CANCELLED for V1
    → ADMIN PORTAL (no refresh): toast "V1 declined — assigned to V2"
    → Switch vendor to V2 in vendor portal
    → T-V1-002 now appears in V2's trip list as ASSIGNED

  Step 5: Admin portal /driver
    → Find T-V1-004 (EN_ROUTE_PICKUP)
    → Advance through statuses: AT_PICKUP → enter OTP 4821 → PAX_PICKED → IN_TRANSIT → AT_DROP → COMPLETED
    → VENDOR PORTAL: earnings statement new row appears immediately
    → VENDOR PORTAL: "Earnings today" KPI updates
    → Toast: "New earning from T-V1-004 — ₹XXX added"

  Step 6: Vendor portal /earnings
    → See new earning from T-V1-004 at top of Statement tab
    → Verify net = lockedPrice - 15%
    → Check per-driver tab — that driver now shows the earning

  Step 7: Vendor portal /fleet → Vehicles
    → Find a vehicle with expiring document (red ✗ icon)
    → Click View → document section shows ✗ Insurance expired

  Step 8: Vendor portal /alerts
    → 3 alerts for V1
    → Click "View vehicle" on the insurance alert
    → Vehicle drawer opens with expiry detail

  Step 9: Admin portal /configuration → Vendors → V1 → View details
    → Drivers tab: same driver list as vendor portal fleet
    → Vehicles tab: same vehicle list + expiry warnings
    → Performance tab: shows decline log for T-V1-002
    → Add a new driver from admin side
    → Switch to vendor portal /fleet → new driver appears

  Step 10: Switch vendor portal to V2
    → Dashboard: fewer trips, drivers, vehicles
    → T-V1-002 appears as ASSIGNED (from failover in Step 4)
    → Earnings show V2's history

---

## 7. Final acceptance criteria

  All 10 steps of the demo flow work without errors or page refreshes
  Cross-portal sync confirmed for: accept, decline, failover, complete, add driver/vehicle
  Net earnings always = lockedPrice - Math.round(lockedPrice * 0.15)
  PII never unmasked without user action
  Audit log: every accept/reject logged, accessible in vendor + admin
  Notifications: bell badge correct, drawer lists all, click navigates
  Mobile (375px): all pages usable — no overflow, no broken layouts
  Tablet (768px): tables readable, sidebar works
  Leaflet: NOT in page bundle (check Network tab on /trips)
  npm run build: passes in BOTH projects with zero errors
  Debug badge in both apps shows same trip count

---

## 8. Commit and tag

  cd ride-vendor-portal
  git add -A
  git commit -m "Phase 4: polish, notifications, e2e — v1.0.0-vendor-portal"
  git tag v1.0.0-vendor-portal

  cd ../admin_portal
  git add -A
  git commit -m "Wire-up: vendor accept/decline, fleet sync, earnings bridge"
  git tag v1.0.0-wired

  cd ../ride-shared
  git add -A
  git commit -m "Shared store: all wire-up contracts implemented"
  git tag v1.0.0-shared

