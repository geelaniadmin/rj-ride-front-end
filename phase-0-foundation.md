# Ops Portal — Phase 0: Foundation, Shell & ride-shared Wire-up
# Send: cat OPS_CONTEXT.md phase-0-foundation.md | claude
# Run from: Ride_polish/ (workspace root)

---

## What to build

App shell for ride-ops-portal with 3 role-based layouts,
ride-shared wire-up, role switcher, and all shared UI components.

---

## Step 1 — Create the project

From Ride_polish/:
  npx create-next-app@latest ride-ops-portal \
    --typescript --tailwind --app --no-src-dir \
    --import-alias "@/*"

  cd ride-ops-portal

  Install:
    npm install zustand lucide-react recharts leaflet @types/leaflet
    npm install @ride/shared@file:../ride-shared

  Tailwind config extend colors:
    'sidebar-bg':   '#1B2A4A'
    'brand-blue':   '#2563EB'
    'page-bg':      '#F8FAFC'
    'card-bg':      '#FFFFFF'
    'card-border':  '#E8E8E8'
    'text-primary': '#3D434A'
    'text-muted':   '#8B8FA8'
    'success':      '#1DB87A'
    'warning':      '#F0A030'
    'danger':       '#E84040'
    'purple':       '#7060E0'
    'navy-dark':    '#0F1923'

---

## Step 2 — Folder structure

  app/
    login/page.tsx             Role selection login
    layout.tsx                 Root layout — role-based shell
    page.tsx                   Redirect to role default page

    control-room/
      page.tsx                 Safety board (default for Preethi)
      sos/page.tsx             Active SOS detail
      anomalies/page.tsx       Route deviations, stops, no-shows
      trips/page.tsx           All trips read-only
      reports/page.tsx         Safety reports

    rate-manager/
      page.tsx                 Rate card overview
      create/page.tsx          Create / edit rate card
      history/page.tsx         Version history
      simulate/page.tsx        Fare simulator
      audit/page.tsx           Rate change audit log

    super-admin/
      page.tsx                 Platform overview
      tenants/page.tsx         All tenants management
      billing/page.tsx         Platform billing
      health/page.tsx          System health
      audit/page.tsx           Cross-tenant audit log

  components/
    layout/
      OpsShell.tsx             Root shell — picks sidebar by role
      ControlRoomSidebar.tsx   Preethi's sidebar
      RateManagerSidebar.tsx   Rate mgr sidebar
      SuperAdminSidebar.tsx    Geelani's sidebar
      OpsHeader.tsx            Top bar — role badge + switcher + bell
    ui/
      StatusBadge.tsx          All status values from CLAUDE.md
      KpiCard.tsx              Label + value + delta + icon
      DataTable.tsx            Sortable, paginated, skeleton, empty
      Drawer.tsx               Right slide-in 420px
      Modal.tsx                Centred overlay
      Toast.tsx                useToast() hook
      PiiField.tsx             Masked + eye reveal 10s
      LoadingSkeleton.tsx      Animated placeholder rows
      EmptyState.tsx           Icon + message + CTA
      AlertBanner.tsx          Full-width coloured banner
      TimelineEvent.tsx        Dot + line + time + text
      LiveBadge.tsx            Pulsing green dot + "Live" label

  stores/
    opsSessionStore.ts         Role, user, permissions for ops portal

  lib/
    utils.ts                   formatPaise, maskPii, formatDate, timeAgo
    types.ts                   Re-export from @ride/shared + ops-specific types

---

## Step 3 — Login page (app/login/page.tsx)

  Centered layout, RIDE logo + "Ops Portal" subtitle
  "ops.rezolv.com" URL label

  3 role cards in a row (or stack on mobile):

  Card 1 — Control room:
    Icon: ShieldCheck (lucide, green)
    Title: "Control Room"
    Subtitle: "Safety monitoring · SOS alerts · Preethi, SpiceJet"
    [Login as Preethi] button

  Card 2 — Rate manager:
    Icon: Calculator (lucide, purple)
    Title: "Rate Manager"
    Subtitle: "Rate cards · Fare simulation · SpiceJet pricing team"
    [Login as Rate Manager] button

  Card 3 — Super admin:
    Icon: Crown (lucide, amber)
    Title: "Super Admin"
    Subtitle: "All tenants · Platform billing · Geelani, Rezolv"
    [Login as Geelani] button

  On any login:
    Set localStorage: { role, userName, tenantId, permissions[] }
    Set opsSessionStore
    Redirect to role default page:
      control-room → /control-room
      rate-manager → /rate-manager
      super-admin  → /super-admin

---

## Step 4 — OpsShell (role-based layout)

  Root layout reads role from opsSessionStore
  Renders correct sidebar + OpsHeader + main content

  OpsHeader (top bar, 64px, white):
    Left: hamburger (mobile) + page title
    Centre: role badge pill:
      Control room: green pill "Control Room · Preethi"
      Rate manager: purple pill "Rate Manager"
      Super admin:  navy pill "Super Admin · Geelani"
    Right: role switcher dropdown + bell (unread badge) + avatar

  All 3 sidebars share:
    240px width, #1B2A4A background
    RIDE logo + role name at top
    Nav items (different per role — see phases 1/2/3)
    Logout at bottom

---

## Step 5 — UI Components

  Build exactly these — same spec as rideprd and vendor portal:

  StatusBadge: covers ALL VehicleStatus + TripStatus + AlertSeverity
  KpiCard: label, value, delta, icon, accentColor
  DataTable: columns[], data[], pageSize=20, loading, sortable, pagination
  PiiField: maskedValue, revealedValue, 10s reveal, no console log
  Toast: useToast() → success/error/info/warn, top-right, 4s dismiss
  Drawer: 420px right, full-width mobile, backdrop close
  Modal: centred, backdrop close optional
  AlertBanner: severity (critical/warn/info), icon, message, action button
  TimelineEvent: for SOS timelines — dot colour, line, time, text, actor
  LiveBadge: pulsing green dot + "Live" — used on control room map

---

## Step 6 — ride-shared wire check

  Call seed() from ride-shared in root layout on mount.
  Guard: if already seeded (tripStore.trips.length > 0) → skip.
  (Same seed() called in rideprd and vendor portal — runs once total)

  Add debug badge bottom-right (same as other portals):
    "Trips: X | Alerts: Y | Tenants: Z"
    Live counts from ride-shared stores
    Label: "⚡ ride-shared"

---

## Step 7 — Placeholder pages

  /control-room:   "Control Room — Phase 1"
  /rate-manager:   "Rate Manager — Phase 2"
  /super-admin:    "Super Admin — Phase 3"
  All sub-routes:  "Coming in this phase"

---

## Acceptance criteria

  npx create-next-app runs cleanly
  npm install @ride/shared succeeds
  Login page: all 3 role cards render and work
  Each role login redirects to correct default page
  Role badge in header shows correct role
  Role switcher dropdown switches between all 3 roles
  Sidebar renders correctly per role (even with placeholder items)
  Debug badge shows live counts from ride-shared
  All UI components render on /ui-test page
  PiiField: mask → reveal 10s → re-mask
  Toast: all 4 types fire and dismiss
  DataTable: renders, sorts, paginates
  Mobile: sidebar collapses to hamburger
  npm run build passes with zero TypeScript errors

