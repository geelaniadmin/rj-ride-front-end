# Ops Portal — Phase 2: Rate Manager
# Send: cat OPS_CONTEXT.md phase-2-rate-manager.md | claude
# Requires: Phase 1 complete and committed

---

## What to build

Full rate card management for the SpiceJet rate manager.
This role sees ONLY pricing data — zero trip data, zero passenger PII.
Rate changes here immediately reflect in rideprd /pricing and /trips.

---

## Rate manager sidebar

  LayoutList     Rate card overview    /rate-manager       (default)
  PlusCircle     Create rate card      /rate-manager/create
  History        Version history       /rate-manager/history
  Calculator     Fare simulator        /rate-manager/simulate
  FileText       Audit log             /rate-manager/audit

  Accent: purple (#7060E0)
  Role badge: "Rate Manager · SpiceJet"

---

## Screen RM-1: Rate card overview (/rate-manager) — default

  Header:
    "Rate Cards"
    "SpiceJet · All pre-negotiated rates"
    [+ New rate card] button (primary, purple)

  Summary bar (4 KpiCards):
    Active rate cards:   count where is_active = true
    Vendors covered:     distinct vendorIds in active cards
    Vehicle types:       distinct vehicleTypeIds
    Avg rate (PER_KM):   mean perKm across active PER_KM cards (₹/km)

  Filter bar:
    Vendor dropdown | Vehicle type dropdown | Basis dropdown |
    Status: Active / Superseded / All | Search by rate card ID

  Rate cards table (DataTable, sortable, 20/page):
    Rate card ID (mono) | Vendor | Vehicle type | Basis |
    Rate display | Modifiers | Valid from | Valid to |
    Version | Status | Actions

    Rate display per basis:
      PER_KM:             ₹{perKm}/km
      FIXED_LOCATION_PAIR: ₹{price} fixed
      HOURLY:             ₹{hourlyRate}/hr
      PACKAGE:            ₹{package.price} ({package.hours}hr/{package.km}km)

    Modifiers summary (compact):
      Night +X% | Waiting ₹X/hr | Min fare ₹X
      Shown as small badges on the row

    Status badge:
      Active: green | Superseded: grey (with "v[N] active" tooltip)

    Actions:
      Active card:     [View] + [New version]
      Superseded card: [View] only (read-only)

  Click [View]: opens rate card detail drawer
    All fields, full modifier breakdown
    "Price lock note: fare frozen at quote — never recalculated"
    Version history timeline (mini)
    [New version] button if active

---

## Screen RM-2: Create / edit rate card (/rate-manager/create)

  Full page form (not a modal — too many fields):

  Section 1 — Scope:
    Vendor dropdown (from ride-shared vendorStore, this tenant)
    Customer dropdown (from ride-shared customerStore)
    Vehicle type dropdown (from ride-shared vehicleTypeStore)
    Valid from date (required)
    Valid to date (optional — leave blank for indefinite)

  Section 2 — Pricing basis:
    Basis radio: PER_KM | FIXED_LOCATION_PAIR | HOURLY | PACKAGE
    Fields change based on selection:

    PER_KM:
      Rate per km: ₹ input (stores as integer paise per km)
      Min fare: ₹ input

    FIXED_LOCATION_PAIR:
      [+ Add location pair] button
      Each pair: From zone | To zone | Fixed price ₹
      Multiple pairs allowed (table with delete)

    HOURLY:
      Rate per hour: ₹ input
      Min hours: number input
      Extra per km beyond included: ₹ input

    PACKAGE:
      Package hours: number
      Package km: number
      Package price: ₹
      Extra per hour beyond package: ₹
      Extra per km beyond package: ₹

  Section 3 — Modifiers:
    Night charge: toggle + percentage + start hour + end hour
    Waiting charge: toggle + ₹/hr rate + free minutes
    Toll handling: INCLUDED | EXTRA
    Parking handling: INCLUDED | EXTRA
    Inter-state surcharge: toggle + percentage
    Dead mileage: toggle + ₹/km rate

  Section 4 — Preview:
    Live fare preview as user fills in fields
    "Sample trip: 25km, 30min waiting, 11 PM departure"
    Shows: base fare + modifiers breakdown + total
    Updates as fields change

  Submit button: "Save rate card"
    On submit:
      Validate all required fields
      Check: if active rate card exists for same (vendor × customer × vehicleType):
        Show warning: "This will supersede rate card [ID] v[N]"
        "Old version is preserved and read-only. New version takes effect from [validFrom]"
        [Confirm + supersede] | [Cancel]
      On confirm:
        ride-shared rateCardStore.createVersion(rateCard)
          → sets old card is_active = false
          → inserts new card as version N+1
        rideprd /pricing: new card appears immediately, old shows as superseded
        rideprd /trips: next getOffers() uses new version
        ops portal /rate-manager/audit: new entry logged
      Success toast: "Rate card v[N] published — effective [validFrom]"
      Redirect to /rate-manager

---

## Screen RM-3: Version history (/rate-manager/history)

  Filter bar:
    Vendor + vehicle type combination selector
    Date range

  For each active combination: a version timeline card
    Header: Vendor name + Vehicle type + Customer
    Timeline (vertical, newest first):
      Each version: version number + valid from + rate display + status badge
      Active version: green "Active"
      Superseded: grey "Superseded on [date]"
      Click any version: opens read-only detail drawer
    "Old versions preserved for audit — cannot be deleted" label

  Empty state if no history: "No version history yet for this combination"

---

## Screen RM-4: Fare simulator (/rate-manager/simulate)

  Two-panel layout:

  Left panel — inputs:
    Vendor dropdown
    Vehicle type dropdown
    Trip date + time (datetime picker)
    Distance (km input)
    Duration (hours + minutes)
    Waiting time (minutes)
    Night trip toggle (auto-detects from time, can override)
    Toll applicable toggle

  Right panel — results (updates live as inputs change):
    Card: "Simulated fare — rate card v[N]"
    Breakdown table:
      Base fare:              ₹ X
      Night surcharge (15%):  + ₹ X (shown only if applicable)
      Waiting charge:         + ₹ X (shown only if > free mins)
      Toll (if applicable):   + ₹ X
      Total:                  ₹ X (bold, large)
    Rate card used: [ID] v[N] — [vendorName] × [vehicleType]
    Valid from / to dates
    "This is a simulation — no trip created"
    [Save as reference] → toast "Saved to simulation history"

  Simulation history (below, collapsible):
    Last 10 simulations run this session
    Each: inputs summary + total + timestamp

---

## Screen RM-5: Rate audit log (/rate-manager/audit)

  Immutable log of all rate card changes
  From ride-shared rateCardStore.auditLog

  Table:
    Timestamp | Action | Rate card ID | Vendor | Vehicle type |
    Old rate | New rate | Changed by | Version

  Actions: CREATED | SUPERSEDED | DEACTIVATED

  Filter: date range + vendor + action type

  "Immutable — no edit or delete" label at bottom

  Wire-up: every rate change in this portal OR in rideprd /pricing
  appears in this log (both write to ride-shared rateCardStore.auditLog)

---

## Wire-ups to implement in this phase

  Wire-up RM-1 — New rate card version propagates to rideprd:
    Rate manager creates new version in ops portal
    ride-shared rateCardStore: new version, old superseded
    rideprd /pricing: rate card table shows new version, old shows superseded
    rideprd /pricing: version history timeline updates
    No refresh needed in rideprd

  Wire-up RM-2 — Rate change affects next quote in rideprd:
    After new rate card v2 published:
    rideprd /pricing → Quote Simulator: uses new rate card v2
    rideprd /trips → create new trip → getOffers() returns prices from v2
    Old confirmed trips: still show v1 (locked — never recalculates)

  Wire-up RM-3 — Rate change from rideprd appears in ops audit log:
    If someone uses rideprd /pricing to create a rate card
    (rideprd has this in Phase 2 already)
    ride-shared rateCardStore.auditLog gets the entry
    ops portal /rate-manager/audit: entry appears

---

## Important constraints

  Rate manager sees NO passenger data whatsoever:
    No trip ID with passenger info
    No route with addresses
    No driver names
    No PII of any kind
    If a rate card has a customerId: show customer CODE not name if PII risk

  All rate arithmetic in integer paise:
    Input fields show ₹ but store as paise
    Display: ₹{(paise/100).toFixed(2)}
    Night surcharge: Math.round(basePrice * nightChargePercent / 100)
    Never floats

---

## Acceptance criteria

  CRITICAL WIRE-UP TESTS:

  Test 1 — New rate card version propagates to rideprd:
    Open rideprd /pricing in Tab 1
    Open ops portal /rate-manager in Tab 2
    In Tab 2: create new version of an existing rate card (higher rate)
    In Tab 1: rate card table shows new version immediately
    In Tab 1: old version shows "Superseded" badge
    No refresh needed

  Test 2 — Rate change affects quote:
    After Test 1, go to rideprd /pricing → Quote Simulator
    Run simulation for same vendor + vehicle type
    Fare reflects new rate card version
    Old trips still show their locked v1 price (verify one)

  Test 3 — Audit log cross-portal:
    In rideprd /pricing: create a new rate card
    In ops portal /rate-manager/audit: entry appears for that change

  Rate manager sees zero passenger PII — verify every screen
  All 4 rate bases: create one of each, preview updates live
  Supersede flow: warning shown, old card goes grey, new version appears
  Version history: all versions listed newest first, all clickable read-only
  Fare simulator: totals update live as inputs change, breakdown correct
  Night surcharge: auto-detected from time input
  Mobile: form sections stack, preview shows below form
  npm run build: no TypeScript errors

