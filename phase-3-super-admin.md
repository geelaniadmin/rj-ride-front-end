# Ops Portal — Phase 3: Super Admin (Geelani)
# Send: cat OPS_CONTEXT.md phase-3-super-admin.md | claude
# Requires: Phase 2 complete and committed

---

## What to build

The platform owner view for Geelani (Rezolv). He sees all tenants,
all platform revenue, system health, and cross-tenant audit.
This is the most impressive screen for investors — shows RIDE as
a multi-tenant platform, not just one company's tool.

---

## Super admin sidebar

  LayoutDashboard  Platform overview   /super-admin          (default)
  Building2        Tenant management   /super-admin/tenants
  CreditCard       Platform billing    /super-admin/billing
  Activity         System health       /super-admin/health
  ScrollText       Platform audit      /super-admin/audit

  Accent: dark navy (#0F1923)
  Role badge: "Super Admin · Geelani · Rezolv"

---

## Screen SA-1: Platform overview (/super-admin) — default

  Header:
    "Platform Overview"
    "Rezolv Integrated Dispatch Engine · All tenants"
    Date + time

  4 KPI tiles (across ALL tenants in ride-shared tenantStore):
    Active tenants:     count of tenants with active = true — blue
    Total trips today:  sum of trips across all tenants today — green
    Platform revenue:   sum of platform fees earned today ₹ — amber
    System uptime:      hardcoded 99.97% with green badge

  Tenant health table (all tenants, one row each):
    Tenant name | Type | Plan | Trips this month |
    Platform fee this month | Status | Last activity

    Seeded tenants:
      SpiceJet         AIRLINE    Dedicated   1,240   ₹62,000    ✓ Active  2 min ago
      Infosys          CORPORATE  Shared      1,800   ₹90,000    ✓ Active  5 min ago
      Taj Hotels       HOTEL      Shared        480   ₹24,000    ✓ Active  12 min ago
      Indigo Airlines  AIRLINE    Dedicated     320   ₹16,000    ✓ Active  1 hr ago

    Row click → opens tenant detail drawer (see below)
    Status badge: Active (green) | Suspended (red) | Trial (amber)

  Platform revenue chart (Recharts, full-width):
    Bar chart: monthly platform revenue last 6 months
    Each bar: total ₹ across all tenants
    Hover tooltip: month + ₹ amount
    Colour: #2563EB

  Infrastructure status row (4 status cards):
    Main API:      ✓ Healthy   23ms avg   99.97% uptime
    Rate engine:   ✓ Healthy   12ms avg   99.99% uptime
    Traccar GPS:   ✓ Healthy   15 devices  last ping 3s
    Redis cache:   ✓ Healthy   234 keys    0.02ms
    Each card: green dot + service name + metric + uptime
    Click any card → /super-admin/health for detail

---

## Screen SA-2: Tenant management (/super-admin/tenants)

  Header: "Tenants" + [+ Onboard new tenant] button (primary)

  Tenant list (DataTable):
    Tenant name | Type | Plan | Created | Trips/month |
    Platform fee (₹) | Status | Actions

    Actions per row:
      Active:    [View] + [Suspend]
      Suspended: [View] + [Reactivate]
      Trial:     [View] + [Activate] + [Reject]

  [+ Onboard new tenant] opens modal:
    Company name (required)
    Type: AIRLINE | CORPORATE | HOTEL | FLEET
    Plan: DEDICATED | SHARED
    Platform fee per trip: ₹ input (stored as integer paise)
    First admin email (required)
    Base city (required)
    [Provision tenant] button
    On submit:
      ride-shared tenantStore.addTenant(tenant)
      rideprd: tenant switcher shows new tenant
      ride-vendor-portal: not affected (vendor-scoped)
      ops portal: tenant health table shows new row
      Toast: "Tenant [name] provisioned ✓ — admin email sent (mock)"

  Tenant detail drawer (opens on [View]):
    Company info: name, type, plan, created date, base city
    Contact (PII masked): admin name, email
    Config: platform fee per trip, transport scope, compliance
    Stats: total trips, total platform fee paid
    Vendors: list of vendors for this tenant
    Users: list of user accounts (role, last login)
    [Suspend tenant] button (danger):
      Type-to-confirm: "Type tenant name to confirm"
      On confirm:
        ride-shared tenantStore: tenant.active = false
        rideprd: tenant switcher shows tenant as "[name] (suspended)"
        Toast: "Tenant [name] suspended — all sessions terminated (mock)"

---

## Screen SA-3: Platform billing (/super-admin/billing)

  Header: "Platform Billing"
  Subtitle: "Revenue from platform fees across all tenants"

  Summary KPI row (4 cards):
    Total platform fee this month: sum across all tenants (₹)
    Collected: sum where payment_status = PAID (₹) — green
    Pending: sum where payment_status = PENDING (₹) — amber
    Overdue: sum where payment_status = OVERDUE (₹) — red

  Per-tenant billing table:
    Tenant | Trips this month | Fee per trip | Total fee |
    Payment status | Due date | Actions

    Seeded billing:
      SpiceJet     1,240 trips  ₹50   ₹62,000  PAID      —         [Invoice]
      Infosys      1,800 trips  ₹50   ₹90,000  PENDING   Jun 15    [Invoice] [Remind]
      Taj Hotels     480 trips  ₹50   ₹24,000  PAID      —         [Invoice]
      Indigo         320 trips  ₹50   ₹16,000  PENDING   Jun 20    [Invoice] [Remind]

    [Invoice] → toast "Generating invoice PDF for [tenant]..."
    [Remind] → toast "Payment reminder sent to [tenant] finance team (mock)"
    [Mark paid] on PENDING rows → ride-shared updates payment_status

  Revenue trend chart (Recharts line chart):
    6 months of platform revenue per tenant (stacked)
    Each tenant: distinct colour
    Legend below chart

  Total platform revenue: ₹1,92,000 this month (sum all)
  Bold summary row at bottom of table

---

## Screen SA-4: System health (/super-admin/health)

  Header: "System Health"
  LiveBadge ("Monitoring active")

  Service status grid (6 cards, 3×2):
    Each card:
      Service name + icon
      Status dot: green (healthy) / amber (degraded) / red (down)
      Key metric (latency or count)
      Uptime percentage
      "Last checked [time]" footer

    Services:
      Main API          ✓ Healthy   23ms avg    99.97%
      Rate engine       ✓ Healthy   12ms avg    99.99%
      Traccar GPS       ✓ Healthy   15 devices  99.95%
      Redis cache       ✓ Healthy   0.02ms      100%
      PostgreSQL        ✓ Healthy   8ms         99.98%
      WhatsApp BSP      ✓ Healthy   47 msgs/hr  99.9%

  Error rate chart (Recharts):
    Line chart: error rate (%) last 24 hours
    Y axis: 0-5%, mostly flat near 0
    Annotations at spike points

  Active connections:
    WebSocket connections: 18 active
    API requests/min: 124
    GPS pings/min: 180 (15 vehicles × 12/min)

  Tenant activity feed (last 20 events across all tenants):
    Trip created, billing generated, rate card updated, SOS resolved
    Each: [tenant badge] + event + timestamp

---

## Screen SA-5: Platform audit (/super-admin/audit)

  Cross-tenant immutable audit log
  ALL actions from ALL portals in one place

  Header: "Platform Audit Log"
  "All actions from all portals — immutable"

  Filter bar:
    Tenant dropdown (All tenants + individual)
    Portal: All | rideprd | ride-vendor-portal | ride-ops-portal
    Action type: All | TRIP_* | RATE_* | ALERT_* | TENANT_* | AUTH_*
    Date range picker

  Audit table (DataTable):
    Timestamp | Portal | Tenant | Action | Actor | Entity | Detail

    Sample rows:
      rideprd     SpiceJet  TRIP_ACCEPTED    Vendor V1     T-V1-001   Apex Fleet accepted
      ops-portal  SpiceJet  ALERT_ACK        Preethi       ALT-001    SOS acknowledged
      ops-portal  SpiceJet  RATE_CARD_NEW    Rate Mgr      RC-v2      New version published
      vendor-p    SpiceJet  TRIP_REJECTED    Vendor V1     T-V1-002   Reason: No drivers
      ops-portal  Rezolv    TENANT_CREATED   Geelani       T5         Taj Hotels onboarded
      rideprd     Infosys   BILLING_BILLED   System        T-IF-099   ₹450.00 billed

    From ride-shared auditStore (all portals write here)
    "Immutable — cannot be deleted or edited" bottom label

---

## Wire-ups to implement in this phase

  Wire-up SA-1 — New tenant propagates to rideprd:
    Geelani creates new tenant in ops portal
    ride-shared tenantStore: tenant added
    rideprd top bar: tenant switcher dropdown shows new tenant
    No refresh in rideprd

  Wire-up SA-2 — Tenant suspend propagates to rideprd:
    Geelani suspends a tenant
    ride-shared tenantStore: tenant.active = false
    rideprd: switching to suspended tenant shows warning banner
    "This tenant is suspended — contact Rezolv support"

  Wire-up SA-3 — Cross-portal audit log:
    Every action from every portal writes to ride-shared auditStore
    ops portal /super-admin/audit: all actions visible across all portals
    This must include:
      rideprd actions (trip created, rate card created, billing)
      vendor portal actions (accept, reject)
      ops portal actions (SOS ack, rate card, tenant onboard)

  Wire-up SA-4 — Platform revenue reflects real earnings:
    ride-shared earningsStore has VendorEarnings entries
    ops portal platform revenue = sum of operatorFee across ALL tenants
    When rideprd completes a trip → earningsStore.createEarning()
    ops portal platform overview: Platform revenue today KPI updates

---

## Acceptance criteria

  CRITICAL WIRE-UP TESTS:

  Test 1 — New tenant in rideprd:
    Open rideprd in Tab 1
    Open ops portal /super-admin/tenants in Tab 2
    In Tab 2: onboard new tenant "Test Corp"
    In Tab 1: tenant switcher dropdown shows "Test Corp"
    No refresh needed

  Test 2 — Suspend tenant:
    In ops portal: suspend one tenant (NOT SpiceJet — use a demo tenant)
    In rideprd: switch to that tenant
    Warning banner appears: "This tenant is suspended"

  Test 3 — Cross-portal audit log:
    Perform actions in all 3 portals:
      rideprd: create a trip
      vendor portal: accept a trip
      ops portal: acknowledge SOS
    Go to ops portal /super-admin/audit
    All 3 actions appear with correct portal label and timestamp

  Test 4 — Platform revenue from real earnings:
    Complete a trip in rideprd /driver
    ops portal platform overview: Platform revenue today increments by ₹50

  Tenant health table: all 4 seeded tenants shown with correct metrics
  Revenue chart: 6 months of data, correct colours per tenant
  System health: all 6 service cards show healthy
  Billing table: correct amounts, payment statuses
  Audit log: filterable by tenant and portal
  [Onboard tenant] form: validates, adds to store, rideprd updates
  [Suspend]: type-to-confirm works, tenant marked suspended
  Mobile: cards 2-col, tables scroll, drawers full-width
  npm run build: zero errors

