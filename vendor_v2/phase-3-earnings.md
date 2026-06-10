# Vendor Portal — Phase 3: Earnings + Admin Portal Billing Wire-up
# Send: cat VENDOR_CONTEXT.md phase-3-earnings.md | claude
# Requires: Phase 2 complete and committed

---

## What to build in this phase

Earnings for vendor portal AND the wire-up so when admin_portal
marks a trip COMPLETED, vendor portal earnings update immediately.
This is the financial truth of the platform — net to vendor always
equals locked price minus 15% operator fee.

---

## Part A — The earnings trigger (admin_portal side — add this first)

## 1. Wire COMPLETED status → earnings auto-creation

  In ride-shared tripStore.ts, inside updateTripStatus():
    When newStatus === 'COMPLETED':
      Automatically call earningsStore.createEarning({
        earningId: generateId(),
        tripId: trip.tripId,
        vendorId: trip.vendorId,
        driverId: trip.assignedDriverId,
        fare: trip.lockedPrice,
        operatorFee: Math.round(trip.lockedPrice * 0.15),
        netToVendor: trip.lockedPrice - Math.round(trip.lockedPrice * 0.15),
        completedAt: new Date().toISOString(),
        status: 'UNBILLED'
      })
      Also push to eventLog: { type: 'TRIP_COMPLETED', tripId, vendorId }

  This triggers from admin_portal /driver when driver advances to COMPLETED.
  The earning appears in vendor portal /earnings immediately.

  IMPORTANT: Never recalculate fare from rate card here.
  Always read trip.lockedPrice — this is the price-lock guarantee.
  If trip.lockedPrice is somehow 0: throw error, do NOT create earning.

---

## Part B — Vendor portal earnings screens

## 2. Earnings page (/earnings) — KPI row

  4 cards from ride-shared earningsStore.getEarningsForVendor(vendorId):
    This month total:  sum of netToVendor for current calendar month (₹)
    Last month:        sum of netToVendor for previous calendar month (₹)
    Pending payout:    sum of netToVendor where status = UNBILLED (₹)
    Trips billed:      count of earnings entries this month

---

## 3. Payout schedule banner

  Full-width info banner:
    Icon: CalendarClock
    "Next payout: Friday [next Friday date] — ₹[pending] pending"
    Sub: "Payouts every Friday for trips completed by Thursday 23:59"
    Blue variant: bg #EFF6FF, border #BFDBFE, text #1E40AF
    If pending = 0: green variant "No pending earnings — all up to date ✓"

---

## 4. Earnings tabs: Overview | Statement | Per-Driver | Audit log

  Tab 1 — Overview:
    Bar chart (Recharts): daily netToVendor last 30 days
      X: date labels, Y: ₹ amounts, bars #2563EB, tooltip with value
    Donut chart (Recharts): by vehicle type
      Sedan/SUV/Tempo/Coach — colours: #2563EB/#1DB87A/#F0A030/#7060E0
      Centre: total ₹ this month

    Summary table below charts:
      Vehicle type | Trips | Gross fare | Operator fee | Net to vendor
      Total row at bottom (bold)
      All ₹ from integer paise

  Tab 2 — Statement:
    Filters: date range + driver dropdown + status (Unbilled/Statemented/Reconciled)
    [Export CSV] → toast "Preparing CSV..."

    Statement table (DataTable):
      Trip ID (mono) | Date | Driver (PII) | Customer | Route |
      Gross fare (₹) | Operator fee (₹, muted red) | Net to vendor (₹, bold green) |
      Status badge

    Totals row: sum gross, fee, net
    "Showing X trips · Total net: ₹Y"

    Live update: when admin_portal completes a trip →
      New row appears at top of this table immediately (no refresh)
      Toast: "New earning from trip [tripId] — ₹[net] added"

  Tab 3 — Per Driver:
    Driver summary cards (grid):
      PiiField name | rating | trips count | gross ₹ | net ₹ | completion %
      [View details] → driver earnings drawer:
        Per-trip table: date | tripId | route | fare | net | status

  Tab 4 — Audit log:
    All ACCEPT and REJECT actions for this vendor
    Table: timestamp | action | trip | reason | actor
    Read from ride-shared auditStore filtered by vendorId
    "Immutable — for compliance" label at bottom
    This is the SAME audit data that admin_portal can see in vendor detail

---

## 5. Payout history section

  Below tabs, simple table:
    Payout date | Period covered | Trips included | Amount paid | Status
    Seed 4 payouts for V1, 2 for V2
    PAID (green) | PENDING (amber)

---

## 6. Multi-currency display

  Currency selector in earnings header:
    INR ₹ | USD $ | AED د.إ | EUR €
  Switching multiplies (paise/100) × rate:
    1 INR = 0.012 USD = 0.044 AED = 0.011 EUR (mock rates)
  "Display only — contract in INR" note always visible

---

## Part C — Admin portal billing connections

## 7. Admin portal /billing — vendor filter and earnings view

  In admin_portal /billing:
    Add a vendor filter dropdown at top:
      All vendors | Apex Fleet (V1) | Urban Drivers Co (V2)
    Filtering by vendor: shows only earnings for that vendor
    This is the SAME earningsStore data vendor portal sees

    Earnings ledger table should already exist from the main RIDE build.
    Wire it to ride-shared earningsStore if not already done.
    Each row: tripId | vendor | gross | operator fee | net | status

  When admin completes a trip:
    Earning appears in both:
      Admin_portal /billing ledger
      Vendor portal /earnings statement tab
    Both read from ride-shared earningsStore

## 8. Admin portal /billing — reconciliation

  Add reconciliation section (mock):
    Per-vendor invoice status:
      V1 Apex Fleet:    [Invoice uploaded] [47 lines] [1 mismatch ⚠]
      V2 Urban Drivers: [Invoice uploaded] [23 lines] [All matched ✓]
    Mismatch: one line where invoice amount ≠ lockedPrice
    [Raise dispute] on mismatch line → toast "Dispute raised — vendor notified"
    This mirrors what the vendor sees in their statement "Net to vendor" column

---

## Acceptance criteria for Phase 3

  CRITICAL LIVE EARNINGS TEST:
    Open admin_portal /driver in Tab 1
    Open vendor portal /earnings in Tab 2
    In Tab 1: advance a trip to COMPLETED
    In Tab 2: new row appears in Statement tab immediately (no refresh)
    In Tab 2: "Earnings today" KPI card increments
    In Tab 2: Pending payout banner amount increases
    Verify: net amount = lockedPrice - Math.round(lockedPrice * 0.15)
    Do this for 2 different trips

  Billed amount in admin /billing matches net in vendor /earnings
  Operator fee = exactly 15% (integer, no rounding error)
  Statement totals sum correctly
  Currency switcher changes all amounts (INR → USD → back → same INR value)
  Per-driver tab shows correct breakdown
  Audit log tab shows all accept/reject actions from Phases 1-3
  Payout history shows seeded data
  Live update toast fires when trip completed in admin
  Mobile: charts stack vertically, table scrolls

