# Ops Portal — Phase 4: Polish, Mobile & Full E2E Demo
# Send: cat OPS_CONTEXT.md phase-4-polish.md | claude
# Requires: Phase 3 complete and committed

---

## What to build

Final polish across all 3 roles, mobile refinement, error/empty/offline
states, notifications, and the complete cross-portal demo script.

---

## 1. Notifications (all 3 roles)

  Bell in OpsHeader shows role-specific unread count.
  Clicking opens notification drawer (360px).

  Control room (Preethi) notifications:
    SOS_RAISED         "SOS triggered — Trip [id]" — red
    SOS_RESOLVED       "SOS resolved — Trip [id]" — green
    ANOMALY_DETECTED   "Route deviation — Trip [id]" — amber
    TRIP_COMPLETED     "[id] completed safely" — green

  Rate manager notifications:
    RATE_CARD_EXPIRING  "Rate card [id] expires in 7 days" — amber
    RATE_CARD_PUBLISHED "Rate card v[N] published" — green (own action)

  Super admin notifications:
    TENANT_PAYMENT_DUE  "[tenant] payment due in 3 days" — amber
    SYSTEM_ALERT        "Service degraded: [service]" — red (mock)
    TENANT_ONBOARDED    "New tenant [name] activated" — green

  Each notification: icon + title + time (relative) + click navigates
  Seed 3 unread per role on load

---

## 2. Error states (all pages, all roles)

  Loading: DataTable skeleton rows, KpiCard skeleton value, chart spinner
  Empty: designed empty state with icon + message + CTA per page
  API error: error card + [Retry] button
  Offline: amber banner "Offline — showing cached data"
    Control room: acknowledge buttons disabled
    Rate manager: create/publish button disabled
    Super admin: onboard/suspend buttons disabled

---

## 3. Mobile refinements (375px and 768px)

  All sidebars: hamburger + overlay drawer
  All KPI grids: 2×2 on mobile
  All tables: horizontal scroll, first column sticky
  Drawers: full-width on mobile
  Modals: bottom-sheet on mobile
  Leaflet map: full-width, correct height on mobile
  Charts: stack vertically on mobile
  All buttons: min 44px touch target
  Filter bars: collapsible pill on mobile

---

## 4. Performance

  Leaflet: lazy loaded — NOT in any page bundle
    Verify: open /control-room, Network tab → 0 leaflet requests
    Open SOS map or trip drawer map → leaflet loads
  Recharts: next/dynamic with ssr:false
  DataTable: max 20 DOM rows at any time
  Search: 300ms debounce

---

## 5. Complete E2E demo script — all 4 portals

  This is the story to tell higher authorities.
  Run with all 4 portals open in separate tabs.

  SETUP:
    Tab 1: rideprd (operator portal)
    Tab 2: ride-vendor-portal (Apex Fleet V1)
    Tab 3: ride-ops-portal (Control room — Preethi)
    Tab 4: ride-ops-portal (Super admin — Geelani)
      (open second browser window for Tab 4)

  STORY: "Flight SG-204 cancelled. 47 passengers need hotel transport."

  Step 1 — Trips appear (Tab 1: rideprd /trips)
    "RISMA fires 47 trips to RIDE. They appear instantly."
    Show 3 seeded ASSIGNED trips in the table.

  Step 2 — Vendor receives trip (Tab 2: vendor portal /trips)
    "Apex Fleet sees the trips assigned to them."
    Show 2 ASSIGNED trips with Accept / Reject buttons.

  Step 3 — Vendor accepts (Tab 2: vendor portal)
    Accept T-V1-001, assign driver Suresh Kumar.
    Switch to Tab 1: T-V1-001 → DRIVER_ACCEPTED in dispatch kanban.
    "The operator sees vendor acceptance instantly — no calls made."

  Step 4 — Rate manager checks pricing (Tab 3: switch to Rate Manager)
    "The pricing team verifies the locked fare."
    /rate-manager/simulate: run simulation for Sedan, 25km, 11 PM
    Show fare breakdown: ₹396 base + ₹59 night surcharge + ₹50 platform fee
    Show rate card v1 used.

  Step 5 — Driver advances, SOS triggered (Tab 1: rideprd /driver)
    Advance T-V1-004 to IN_TRANSIT.
    Press SOS button.
    Switch to Tab 3: switch to Control room.
    "Preethi's safety board shows the SOS immediately — red alert."
    Show KPI "SOS active: 1" incrementing.
    Show SOS card in activity feed.

  Step 6 — Control room acknowledges (Tab 3: control room /sos)
    Preethi clicks Acknowledge.
    Escalation track: L3 turns green.
    Switch to Tab 1: SOS badge on trip clears.
    "Acknowledged in 2 minutes — no phone calls."

  Step 7 — Trip completes (Tab 1: rideprd /driver)
    Advance to COMPLETED via OTP + status steps.
    Switch to Tab 2: vendor portal /earnings.
    "Net earnings appear immediately — ₹X after 15% platform fee."

  Step 8 — Super admin sees it all (Tab 4: /super-admin)
    "Geelani sees platform revenue update in real time."
    Platform revenue today: incremented by ₹50.
    Tenant health table: SpiceJet trips count incremented.
    Go to /super-admin/audit: all 7 actions logged (accept, SOS, ack, complete, billing).

  Step 9 — Rate manager publishes new version (Tab 3: /rate-manager)
    Switch to Rate Manager role.
    Create new rate card version (raise Sedan rate ₹18→₹20/km).
    Switch to Tab 1: rideprd /pricing.
    New version appears, old superseded.
    "New rates take effect — old trips keep their locked price."

  Step 10 — Final summary (Tab 4: super admin /super-admin/audit)
    Show cross-portal audit log with all actions.
    "Every action — accept, reject, SOS, acknowledge, rate change,
     billing — logged permanently across all portals."
    "47 passengers at hotels. Zero phone calls. ₹50 per trip to Rezolv."

---

## 6. Final acceptance criteria

  All 10 demo steps work without errors or page refreshes
  All cross-portal wire-ups confirmed:
    SOS ack: ops → rideprd + vendor portal (no refresh)
    Rate card: ops → rideprd (no refresh)
    Tenant onboard: ops → rideprd tenant switcher (no refresh)
    Trip complete: rideprd → vendor earnings + super admin revenue (no refresh)
    Audit log: all portals → ops super admin audit (no refresh)
  All 3 roles: correct sidebar, correct data scope, correct permissions
  Control room: cannot create/assign/cancel anything
  Rate manager: sees zero passenger PII
  Super admin: cross-tenant view, tenant operations work
  Notifications: role-specific, bell badge correct
  Mobile (375px): all pages usable
  Tablet (768px): all pages readable
  Performance: Leaflet not in bundle
  npm run build: zero errors in ride-ops-portal

---

## 7. Final commits

  cd ride-ops-portal
  git add -A
  git commit -m "Phase 4: polish, notifications, e2e — v1.0.0-ops-portal"
  git tag v1.0.0-ops-portal

  cd ../rideprd
  git add -A
  git commit -m "Wire-up: ops portal SOS ack, rate card sync, tenant sync"

  cd ../ride-shared
  git add -A
  git commit -m "Shared store: ops portal wire-ups complete"
  git tag v1.1.0-shared

