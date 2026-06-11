# Ops Portal — Phase 1: Control Room (Preethi)
# Send: cat OPS_CONTEXT.md phase-1-control-room.md | claude
# Requires: Phase 0 complete and committed

---

## What to build

Full safety monitoring surface for Preethi (SpiceJet control room).
She watches all SpiceJet trips, handles SOS, monitors anomalies.
She can NEVER dispatch or reassign — read-only on operations.

---

## Control room sidebar

  ShieldCheck    Safety board     /control-room       (default)
  AlertTriangle  Active SOS       /control-room/sos   (red badge if any)
  Activity       Anomaly alerts   /control-room/anomalies
  List           All trips        /control-room/trips
  BarChart2      Safety reports   /control-room/reports

---

## Screen CR-1: Safety board (/control-room) — default landing

  Header row:
    Page title: "Safety Board"
    LiveBadge ("Live · GPS active")
    Tenant selector: SpiceJet (only — Preethi sees her company only)

  4 KPI tiles (from ride-shared, filtered tenantId = SpiceJet):
    Active trips now:   trips with IN_PROGRESS or ASSIGNED status — blue
    SOS active:         alerts with type=SOS and status=ACTIVE — red (pulse if >0)
    Anomalies today:    route deviations + prolonged stops + no-shows — amber
    Resolved today:     alerts resolved today — green

  Full-width live map (Leaflet, OSM tiles):
    Height: 420px
    All active SpiceJet TripVehicles with status IN_TRANSIT or EN_ROUTE_PICKUP
    Vehicle markers coloured by status:
      EN_ROUTE_PICKUP: blue
      IN_TRANSIT: green
      SOS: red pulsing (from ride-shared alertStore)
      BREAKDOWN: orange
    Click marker → vehicle detail side panel:
      Driver (PII masked), vehicle plate, trip ID, status, ETA
      If SOS: red banner "SOS ACTIVE" + [Acknowledge] button
    LiveBadge bottom-left of map
    "Read-only — contact dispatcher to reassign" notice bottom-right

  Below map — 2 columns:

  Left: Active alerts (from ride-shared alertStore, SpiceJet only)
    Card layout, sorted: SOS first, then by severity
    Each card:
      Left accent: red=SOS, amber=DEVIATION, grey=STOP
      Icon + alert type + trip ID + location
      Time elapsed since alert raised (counting up)
      Driver name (PII) + vehicle plate
      [Acknowledge] button (if not yet acknowledged)
        → calls ride-shared alertStore.acknowledge(alertId, 'Preethi')
        → rideprd /dispatch: alert badge clears
        → ride-vendor-portal /alerts: shows acknowledged by Preethi
      [Escalate] button → opens escalation modal

  Right: Recent activity feed
    Last 15 safety events from ride-shared eventLog
    SOS raised, SOS acknowledged, route deviation, prolonged stop,
    vehicle swap, breakdown, no-show
    Each: timestamp + icon + description
    Auto-updates when new events come in

---

## Screen CR-2: Active SOS (/control-room/sos)

  If no active SOS: green empty state "All clear — no active emergencies ✓"

  If SOS active — full dramatic layout:

  Top banner (full width, red gradient):
    Pulsing red dot + "ACTIVE SOS — Trip [tripId]"
    Live elapsed timer (mm:ss counting up)
    Meta grid (3 cols):
      Passenger (PII masked) | Location | Vehicle plate
      Driver (PII masked)    | Vendor   | Passengers aboard
    Escalation track:
      L1 Driver notified (0 min)  — done/pending
      L2 Rajesh dispatcher (2 min) — done/pending
      L3 Preethi SPOC (5 min)     — done/pending (this is her level)
      L4 Authorities (10 min)     — pending
    Action buttons:
      [✓ Acknowledge] — calls alertStore.acknowledge, updates L3 to done
      [⬆ Escalate to L4] — opens escalation modal
      [💬 Message driver] — toast "Mattermost message sent to driver"
      [💬 Message passenger] — toast "WhatsApp sent to passenger"

  Emergency timeline (vertical, from ride-shared alertStore.timeline[]):
    Each event: dot colour (done=green, active=amber, pending=grey)
    + line + timestamp + actor + description
    Last event: pulsing dot "Situation ongoing"

  Below: Mini OSM map
    Shows vehicle last known location (from ride-shared vehicleStore)
    Red pin at SOS location
    Lazy loaded

  Resolved SOS incidents today (table):
    Trip ID | Type | Time | Resolution time | Resolved by
    Pulled from ride-shared alertStore where status=RESOLVED and today

---

## Screen CR-3: Anomaly alerts (/control-room/anomalies)

  3 tabs: Route deviations | Prolonged stops | No-shows

  Route deviations tab:
    Table: Trip ID | Driver (PII) | Expected route | Actual location |
           Deviation (m) | Duration | Action
    [Dismiss] button → alertStore.dismiss(alertId, reason)
    [Escalate to SOS] → creates new SOS alert in alertStore
    From ride-shared alertStore where type=ROUTE_DEVIATION

  Prolonged stops tab:
    Table: Trip ID | Driver (PII) | Stop location | Duration | Expected time | Action
    [Check on driver] → toast "Mattermost sent to driver"
    [Mark as resolved] → alertStore.resolve
    From ride-shared alertStore where type=PROLONGED_STOP

  No-shows tab:
    Table: Trip ID | Pickup point | Scheduled time | Driver waited | Passenger | Action
    [Skip passenger] → toast "Passenger skipped — trip proceeds"
    [Wait 5 more min] → toast "Driver notified to wait"
    From ride-shared alertStore where type=NO_SHOW

  Each tab: count badge in tab header
  All actions write to ride-shared and update rideprd simultaneously

---

## Screen CR-4: All trips — read-only (/control-room/trips)

  Identical layout to rideprd /trips table but:
    NO create button
    NO assign button
    NO cancel button
    NO bulk actions
    Only [View] action per row (opens read-only drawer)

  Read-only banner at top:
    "Read-only view — contact the dispatcher to make changes"
    Blue info banner

  Trip detail drawer (read-only):
    All fields visible
    PII masked with reveal
    NO action buttons
    Full timeline of status changes

  Filters: status, date, vehicle type, vendor (same as rideprd)
  Data from ride-shared tripStore filtered by SpiceJet tenantId

---

## Screen CR-5: Safety reports (/control-room/reports)

  Date range picker (default: this month)

  4 KPI cards:
    Total SOS events | Avg resolution time | Route deviations | On-time %

  3 charts (Recharts):
    Line: daily incidents this month (SOS + deviations + stops)
    Bar: incident breakdown by type
    Pie: resolution status (resolved / escalated / pending)

  Incidents table (filterable):
    Date | Type | Trip | Resolution time | Resolved by | Notes

  Export CSV button → toast "Preparing safety report CSV..."

---

## Wire-ups to implement in this phase

  Wire-up CR-1 — SOS acknowledge propagates:
    Preethi clicks [Acknowledge] on SOS card
    ride-shared alertStore: alert.acknowledgedBy = 'Preethi'
    ride-shared alertStore: alert.status = 'ACKNOWLEDGED'
    rideprd /dispatch: SOS badge on that trip clears (no refresh)
    rideprd /dispatch: SOS kanban card moves to acknowledged state
    ride-vendor-portal /alerts: alert shows "Acknowledged by Preethi"
    All 3 portals update without refresh

  Wire-up CR-2 — New SOS from driver app propagates to control room:
    rideprd /driver: driver presses SOS button
    ride-shared alertStore: new SOS alert created
    ride-ops-portal /control-room: KPI tile "SOS active" increments
    ride-ops-portal /control-room: new alert card appears in left column
    ride-ops-portal /control-room/sos: page shows active SOS
    No refresh on any portal

  Wire-up CR-3 — Anomaly detected:
    ride-shared: mock anomaly detection (prolonged stop > 10 min)
    ride-ops-portal /control-room/anomalies: new row in Prolonged stops tab
    ride-ops-portal: Anomalies today KPI increments
    Anomalies badge on sidebar nav item increments

---

## Seed data for control room

  Seed in ride-shared/src/mock/seed.ts (add if not present):

  3 alerts for SpiceJet:
    Alert 1: SOS, Trip T-V1-004, status ACTIVE, raised 8 min ago
      Passenger M***a S***a, location Mekhri Circle, vehicle KA-05-CH-1122
      L1 done (driver notified), L2 done (Rajesh ack), L3 pending (Preethi)
      Timeline: 4 events

    Alert 2: ROUTE_DEVIATION, Trip T-V1-005, status ACTIVE
      300m off expected route, duration 4 min

    Alert 3: NO_SHOW, Trip T-V1-003, status ACTIVE
      Driver waited 8 min, passenger not at pickup

  2 resolved alerts (for reports):
    Resolved SOS from yesterday
    Resolved prolonged stop from 2 days ago

---

## Acceptance criteria

  CRITICAL WIRE-UP TESTS:

  Test 1 — SOS acknowledge cross-portal:
    Open rideprd /dispatch in Tab 1
    Open ops portal /control-room in Tab 2 (logged as Preethi)
    In Tab 2: click Acknowledge on SOS alert
    In Tab 1: SOS badge on trip clears immediately (no refresh)
    In Tab 2: escalation track shows L3 ✓ green

  Test 2 — SOS from driver propagates:
    Open rideprd /driver in Tab 1
    Open ops portal /control-room in Tab 2
    In Tab 1: press SOS on active trip
    In Tab 2: "SOS active" KPI increments, new alert card appears

  Test 3 — Read-only enforcement:
    Open /control-room/trips
    Verify: no create, assign, cancel buttons anywhere
    Read-only banner visible
    Clicking trip row opens read-only drawer with no action buttons

  Safety board map loads (lazy) with vehicle markers
  Clicking marker shows vehicle detail panel
  SOS screen: elapsed timer counting up
  Escalation track updates when acknowledged
  Anomalies tabs: each shows correct data from alertStore
  Safety reports: charts render, table shows data
  Switching to another portal: SOS acknowledgement visible there
  PII masked everywhere, reveals work
  Mobile: map full-width, cards stack, tables scroll

