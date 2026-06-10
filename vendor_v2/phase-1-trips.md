# Vendor Portal — Phase 1: Trip Management + Admin Portal Wire-up
# Send: cat VENDOR_CONTEXT.md phase-1-trips.md | claude
# Requires: Phase 0 complete, both apps running, shared store confirmed

---

## What to build in this phase

Full trip management for the vendor portal AND the corresponding
wire-up in admin_portal so every vendor action is instantly
reflected in the operator's dispatch queue and kanban board.

---

## Part A — Vendor portal trip screens

## 1. Dashboard — wire real data

  4 KPI tiles from ride-shared stores filtered by vendorId:
    Trips today:       trips where scheduledAt = today AND vendorId matches
    Active now:        trips with status IN_TRANSIT or EN_ROUTE_PICKUP
    Drivers on duty:   drivers with status ON_TRIP for this vendor
    Earnings today:    sum of netToVendor for COMPLETED trips today (₹)

  Left column — "Trips needing attention":
    Trips with status ASSIGNED for this vendor
    Each item:
      Trip ID (monospace) | Customer | Route | Scheduled | Locked price
      [Accept] green inline button
      [Reject] red inline button
    Empty state: "No pending trips — you're all caught up ✓"

  Right column — "Active trips":
    Trips with status IN_TRANSIT or EN_ROUTE_PICKUP
    Each item: tripId, driver (masked), vehicle plate, ETA, status badge
    Click → trip detail drawer

  Bottom full-width — "Recent activity feed":
    Last 10 events from a shared eventLog in ride-shared
    Events: trip assigned to vendor, trip accepted, driver on route,
            trip completed, vendor declined, failover triggered
    Auto-adds new events as they happen

---

## 2. Trips page (/trips)

  Filter bar (sticky):
    Status: All | ASSIGNED | DRIVER_ACCEPTED | EN_ROUTE_PICKUP |
            IN_TRANSIT | COMPLETED | CANCELLED
    Date: Today | This week | This month | Custom
    Vehicle type: All | Sedan | SUV | Tempo Traveller | Coach
    Search: trip ID or customer (300ms debounce)
    [Clear filters] shown only when filters active

  Trips table (DataTable, 20/page, sortable):
    Trip ID (mono) | Customer | Route | Vehicle | Driver (PII) |
    Scheduled | Status | Locked price (₹) | Actions

    Actions per status:
      ASSIGNED:          [Accept] + [Reject]
      DRIVER_ACCEPTED:   [View]
      EN_ROUTE_PICKUP:   [View] + [Track]
      IN_TRANSIT:        [View] + [Track]
      COMPLETED:         [View] + [Receipt]
      CANCELLED:         [View]

---

## 3. Accept trip flow — WIRED TO ADMIN_PORTAL

  Click [Accept]:
    Modal opens:
      "Accept Trip [tripId]?"
      Route, scheduled time, locked price, vehicle type
      Driver assignment dropdown:
        Only AVAILABLE drivers from THIS vendor
        Each option: masked name (eye reveals) + vehicle plate + rating
        Default: highest rated available
      [Confirm Accept] primary blue | [Cancel]

  On confirm — the following MUST happen in this exact order:
    1. Call ride-shared tripStore.acceptTrip(tripId, vendorId, driverId, vehicleId)
    2. ride-shared driverStore: driver.status → ON_TRIP
    3. ride-shared vehicleStore: vehicle.status → IN_TRANSIT
    4. ride-shared eventLog: push { type: 'TRIP_ACCEPTED', tripId, vendorId, timestamp }

    Vendor portal side effects (immediate, no refresh):
      Modal closes
      Table row: status badge → DRIVER_ACCEPTED
      Dashboard: "Trips needing attention" count decrements
      Toast: "Trip [tripId] accepted — [DriverName masked] assigned"
      Notification bell: unread count increments with TRIP_ACCEPTED event

    Admin portal side effects (same Zustand store, no refresh):
      /dispatch: ASSIGNED card disappears from dispatch queue panel
      /dispatch: card moves to DRIVER_ACCEPTED kanban column
      /dispatch: "Pending acceptance" badge count decrements
      /tracking: vehicle pin appears on map (now has status)
      Toast in admin (if app is open): "V1 accepted T-V1-001 ✓"

---

## 4. Reject trip flow — WIRED TO ADMIN_PORTAL WITH FAILOVER

  Click [Reject]:
    Modal:
      "Reject Trip [tripId]?"
      Warning: "Operator will be notified — auto-failover may trigger"
      Reason (required):
        No drivers available
        No vehicles available
        Location out of coverage
        Scheduling conflict
        Other (free text)
      [Confirm Reject] danger red | [Cancel]

  On confirm — the following MUST happen:
    1. ride-shared tripStore.declineTrip(tripId, vendorId, reason)
       Inside declineTrip:
         a. Append to trip.vendorDeclineLog: { vendorId, reason, declinedAt }
         b. trip.dispatchAttempts++
         c. Find next available vendor:
              vendors = all vendors for this tenant
              nextVendor = first vendor NOT in trip.vendorDeclineLog
              AND nextVendor.isActive = true
         d. If nextVendor found:
              trip.vendorId = nextVendor.vendorId
              trip.status remains ASSIGNED
              push event: { type: 'FAILOVER', from: V1, to: V2, reason }
         e. If no nextVendor:
              trip.status = CONFIRMED (back to unassigned)
              push event: { type: 'NO_VENDOR_AVAILABLE', tripId }
    2. ride-shared auditStore: log { action: REJECT, tripId, vendorId, reason }

    Vendor portal side effects:
      Modal closes
      Table row: status → CANCELLED (for V1)
      Dashboard count decrements
      Toast: "Trip rejected — operator notified"

    Admin portal side effects (CRITICAL — must work without refresh):
      If failover triggered:
        Toast: "V1 declined T-V1-001 — auto-assigned to V2"
        /dispatch queue: card updates showing V2's name and new timer
        /dispatch kanban: card stays in ASSIGNED column but vendorId updated
      If no vendor available:
        Toast: "No vendors available for T-V1-001 — requires manual assignment"
        /dispatch queue: card shows "⚠ Needs manual assignment" in red
        Trip moves back to CONFIRMED in dispatch kanban

---

## 5. Trip detail drawer (all statuses)

  Width: 420px desktop, full-width mobile

  Header: Trip ID + StatusBadge + close

  Section — Trip info:
    Customer, vehicle type, scheduled at, created at

  Section — Route:
    Stop list: sequence, type badge, address, planned time
    Mini map (lazy Leaflet):
      Pickup pin (green) + drop pin (red) on OSM
      Static route line
      Load only when drawer opens — not on page load

  Section — Assignment:
    Driver: PiiField name + phone + rating stars
    Vehicle: plate + type + status
    Locked price: ₹ display + "Price locked at quote time ✓"

  Section — Dispatch history (shows vendor decline log):
    If trip.vendorDeclineLog has entries:
      Timeline: "V1 declined — No drivers available — [time]"
      "V2 assigned via auto-failover — [time]"
    If no history: hidden

  Section — Billing (COMPLETED only):
    Gross fare: ₹
    Operator fee (15%): - ₹ (red/muted)
    Net to vendor: ₹ (bold green)

---

## 6. Track trip modal (EN_ROUTE_PICKUP and IN_TRANSIT)

  Full-screen modal
  Leaflet map 70% height (lazy loaded, cleared on modal close):
    OSM tiles
    Animated vehicle marker (setInterval 3s interpolation)
    Green pickup pin, red drop pin, blue route line
  Bottom 30%:
    Driver (PII masked) | Vehicle plate | Trip ID
    Status badge | ETA: "~X minutes" (mock)
    [Close] button

---

## 7. Receipt modal (COMPLETED trips)

  Printable layout:
    RIDE + Vendor logo header
    Trip ID, date, customer
    Route: pickup → drop, distance (mock km)
    Driver (PII masked) + vehicle
    Fare breakdown:
      Gross fare:     ₹ X
      Operator fee:  -₹ X (15%)
      Net to vendor:  ₹ X (bold green)
    "Price was locked at [scheduledAt] — rate card v[version]"
    "Powered by RIDE — Rezolv Integrated Dispatch Engine" footer

---

## Part B — Admin portal additions for this phase

## 8. Admin portal /dispatch — vendor acceptance panel updates

  The dispatch queue panel in admin_portal already exists as a shell.
  Wire it fully in this phase:

  Left side — "Dispatched trips" table:
    Reads from ride-shared tripStore.getTripsForAdmin()
    Clicking a row opens trip detail drawer (existing admin drawer)

  Right side — "Pending vendor acceptance" cards:
    Reads: trips where status = ASSIGNED
    Each card:
      Trip ID + type badge
      Vendor name (bold): "Apex Fleet"
      Passenger + route (PII masked)
      Vehicle type badge
      Countdown timer: tick down every second from 300s
      Two buttons: [✓ Accept] + [✗ Decline]
        (These simulate the vendor accepting from admin side for demo)
        [✓ Accept] calls tripStore.acceptTrip (same as vendor portal Accept)
        [✗ Decline] calls tripStore.declineTrip with reason "Admin override"

  When vendor accepts from vendor portal tab:
    The card in admin_portal dispatch queue disappears (no refresh)
    Toast fires in admin: "Apex Fleet accepted T-V1-001 ✓"

  When vendor declines from vendor portal tab:
    Card shows "⚠ Declined by Apex Fleet" briefly
    If failover: card updates to show "Urban Drivers Co" with new timer
    If no vendor: card shows "Needs manual assignment" in red

  "⚡ Auto-assign all" button at top:
    For each ASSIGNED trip: calls tripStore.acceptTrip with best available driver
    Shows spinner → success toast: "X trips auto-assigned"

---

## Acceptance criteria for Phase 1

  CRITICAL WIRE-UP TESTS — run these with both apps open side by side:

  Test 1 — Accept flow cross-portal:
    Open admin_portal /dispatch in Tab 1
    Open vendor portal /trips in Tab 2 (logged in as V1)
    In Tab 2: Accept trip T-V1-001, assign driver
    In Tab 1: T-V1-001 card must disappear from dispatch queue
    In Tab 1: T-V1-001 must appear in DRIVER_ACCEPTED kanban column
    No page refresh on either tab

  Test 2 — Reject + failover cross-portal:
    In Tab 2: Reject trip T-V1-002, reason "No drivers available"
    In Tab 1: Toast fires "V1 declined T-V1-002 — assigned to V2"
    In Tab 1: T-V1-002 card shows V2's name now
    Switch vendor portal to V2
    T-V1-002 now appears in V2's trip list as ASSIGNED

  Test 3 — No vendor available:
    Manually set both V1 and V2 as already declined on a trip
    Decline fires → trip goes back to CONFIRMED
    Admin portal: card shows "Needs manual assignment" warning

  Test 4 — Vendor portal shows only own trips:
    V1 sees 8 trips. V2 sees 4 trips. Neither sees the other's trips.
    Admin portal sees all 12.

  Test 5 — Mini map lazy load:
    Open trip drawer → map loads (check Network tab)
    Close drawer → reopen different trip → map reloads cleanly
    Trips table itself: NO map network calls

  All amounts display as ₹ from integer paise
  Reject reason required — form does not submit without it
  PII masked by default in all views
  Mobile: table scrolls, filters stack, modal is full-width

