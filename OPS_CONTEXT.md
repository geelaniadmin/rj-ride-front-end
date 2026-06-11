# RIDE Ops Portal — Shared Context
# Paste at the top of every phase prompt before sending to Claude Code.
# Project folder: Ride_polish/ride-ops-portal/

---

## What is the ops portal

A standalone Next.js web app for three non-dispatcher roles at ops.rezolv.com.
It lives in Ride_polish/ride-ops-portal/ alongside rideprd/, ride-shared/,
and ride-vendor-portal/.

Three roles use this portal — each sees a different view:

  Preethi     Control room / safety officer (SpiceJet)
              Safety monitoring, SOS, anomalies — read-only on trips

  Rate mgr    Rate manager (SpiceJet rate team)
              Rate cards, versioning, fare simulation — no trip data

  Geelani     Super admin (Rezolv owner)
              All tenants, platform billing, system health, audit

---

## File structure

  Ride_polish/
    rideprd/               ← existing operator portal
    ride-shared/           ← shared Zustand store (source of truth)
    ride-vendor-portal/    ← existing vendor portal
    ride-ops-portal/       ← NEW — this project

---

## Tech stack (mirror rideprd exactly)

  Next.js 15 (App Router)
  React 19
  TypeScript strict — no any in shared types
  Tailwind CSS
  Zustand — imported from @ride/shared (no local stores for shared data)
  Lucide React (icons)
  Recharts (charts)
  Leaflet + OpenStreetMap (maps — lazy loaded only)
  No real backend — all data from ride-shared + mock seed

---

## How it connects to ride-shared

  ride-ops-portal reads from ride-shared stores:
    tripStore       — for control room live trips
    driverStore     — for control room driver status
    vehicleStore    — for control room vehicle positions
    rateCardStore   — for rate manager (read + write)
    earningsStore   — for super admin platform revenue
    tenantStore     — for super admin all tenants
    alertStore      — for control room SOS and anomalies
    auditStore      — for super admin cross-tenant audit

  ride-ops-portal writes to ride-shared stores:
    alertStore      — control room acknowledges SOS
    rateCardStore   — rate manager creates/versions rate cards
    tenantStore     — super admin onboards new tenants

  rideprd reflects changes immediately:
    Rate card created in ops portal → rideprd /pricing shows it
    SOS acknowledged in ops portal → rideprd /dispatch alert clears
    New tenant created in ops portal → rideprd tenant switcher shows it

---

## Color palette (match rideprd exactly)

  --sidebar-bg:    #1B2A4A   all sidebars
  --brand-blue:    #2563EB   primary CTAs, active states
  --page-bg:       #F8FAFC   main content background
  --card-bg:       #FFFFFF   all cards
  --card-border:   #E8E8E8   all borders
  --text-primary:  #3D434A   body text
  --text-muted:    #8B8FA8   secondary labels
  --success:       #1DB87A   active/completed/resolved
  --warning:       #F0A030   pending/amber alerts
  --danger:        #E84040   SOS/critical alerts
  --table-header:  #F4F5F7   table column headers
  --purple:        #7060E0   rate manager accent
  --navy-dark:     #0F1923   super admin accent

---

## Role switcher (demo login)

  Login page: 3 role cards
    Control room    → logs in as Preethi (SpiceJet)
    Rate manager    → logs in as Rate Mgr (SpiceJet)
    Super admin     → logs in as Geelani (Rezolv)

  After login: role stored in localStorage + opsSessionStore
  Role controls which sidebar and screens are shown
  Role switcher in header for demo switching

---

## Shared types (from ride-shared, already defined in CLAUDE.md)

  TripRequest, TripVehicle, VehicleStatus, TripStatus
  Driver, Vehicle, Vendor, Customer, Tenant
  RateCard, Offer, RateBasis, RateModifiers
  VendorEarnings, VendorAlert

---

## Wire-up events (ride-ops-portal → ride-shared → other portals)

  Event 1 — Control room acknowledges SOS:
    ops portal: Preethi clicks Acknowledge on SOS alert
    ride-shared alertStore: alert.acknowledgedBy = 'Preethi', alert.status = 'ACKNOWLEDGED'
    rideprd /dispatch: SOS badge clears, card updates
    ride-vendor-portal /alerts: alert shows as acknowledged

  Event 2 — Rate manager creates new rate card version:
    ops portal: rate mgr submits new rate card
    ride-shared rateCardStore: new version added, old version superseded
    rideprd /pricing: new rate card appears immediately
    rideprd /trips: next quote uses new rate card version

  Event 3 — Super admin onboards new tenant:
    ops portal: Geelani submits new tenant form
    ride-shared tenantStore: new tenant added
    rideprd: tenant switcher shows new tenant

  Event 4 — Super admin suspends tenant:
    ops portal: Geelani clicks suspend on a tenant
    ride-shared tenantStore: tenant.active = false
    rideprd: tenant switcher shows tenant as suspended

---

## Money rules

  All amounts in integer paise
  Display: ₹{(paise/100).toFixed(2)}
  Never floats in arithmetic
  Operator fee: Math.round(lockedPrice * 0.15)

---

## PII rules

  All names, phones, emails masked by default
  Eye icon reveals for 10 seconds then re-masks
  Never log PII to console
  Rate manager sees NO passenger PII at all
  Super admin sees tenant contact info only (masked)

