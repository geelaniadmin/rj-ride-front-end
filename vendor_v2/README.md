# RIDE Vendor Portal — Phase-wise Prompt Pack v2
# Architect-reviewed. Full wire-up with admin_portal specified.

---

## What changed from v1

  v1 had independent local stores — vendor portal and admin_portal
  had no connection. Accept in vendor = nothing in admin.

  v2 uses ride-shared/ — a single Zustand store package.
  Both apps import from @ride/shared.
  Every action in vendor portal is immediately reflected in admin_portal.

---

## What this builds

  ride-shared/          New shared store package (source of truth)
  ride-vendor-portal/   Vendor portal (new, imports @ride/shared)
  admin_portal/         Updated to import @ride/shared (existing project)

---

## Files in this pack

  VENDOR_CONTEXT.md       Shared context — paste before every phase
  phase-0-foundation.md   ride-shared setup + both portals wired + shells
  phase-1-trips.md        Trip management + accept/decline + failover wired
  phase-2-fleet.md        Fleet + drivers/vehicles + admin vendor detail wired
  phase-3-earnings.md     Earnings + admin billing wired + live earnings trigger
  phase-4-polish.md       Notifications + mobile + e2e 10-step demo

---

## The 5 wire-ups that make this work

  1. Accept:   Vendor accepts → admin dispatch queue updates instantly
  2. Decline:  Vendor declines → auto-failover fires in admin
  3. Fleet:    Add driver/vehicle in either portal → both see it
  4. Earnings: Admin completes trip → vendor earnings appear instantly
  5. Status:   Admin /driver advances status → vendor trip badge updates

---

## Build order (strict)

  Phase 0 first — creates ride-shared and wires both apps
  Then 1, 2, 3, 4 in order
  Do not skip — each phase builds on the previous

---

## How to use

  From workspace root (same level as admin_portal/):
    Phase 0: cat VENDOR_CONTEXT.md phase-0-foundation.md | claude
    Test: both apps running, debug badge shows same data
    Commit: both apps + ride-shared

    Phase 1: cat VENDOR_CONTEXT.md phase-1-trips.md | claude
    Test: accept in vendor → see in admin dispatch (no refresh)
    Commit: all three repos

    Continue for phases 2, 3, 4

---

## Total time with AI agents

  Phase 0:  4-5 hrs    ride-shared + wire-up + shells
  Phase 1:  5-6 hrs    Trip management + cross-portal sync (hardest phase)
  Phase 2:  4-5 hrs    Fleet + admin vendor detail
  Phase 3:  3-4 hrs    Earnings + live trigger
  Phase 4:  3-4 hrs    Polish + e2e demo
  ─────────────────────────────────────
  Total:   ~19-24 hrs  (3 days with agent running vigorously)

---

## Folder structure after all phases complete

  your-workspace/
    ride-shared/               @ride/shared package
      src/
        types/index.ts
        stores/
          tripStore.ts         acceptTrip, declineTrip, failover logic
          driverStore.ts
          vehicleStore.ts
          earningsStore.ts     createEarning auto-triggered on COMPLETED
          alertStore.ts
          sessionStore.ts
        mock/
          seed.ts              12 trips, 15+8 vehicles, 10+5 drivers
      package.json

    admin_portal/              Updated — imports @ride/shared
      package.json             "@ride/shared": "file:../ride-shared"

    ride-vendor-portal/        New project — imports @ride/shared
      package.json             "@ride/shared": "file:../ride-shared"
      app/
        page.tsx               Dashboard (wired)
        trips/page.tsx         Trip management (accept/decline)
        fleet/page.tsx         Drivers + vehicles
        earnings/page.tsx      Earnings + statement
        alerts/page.tsx        Alerts
        login/page.tsx         V1 / V2 demo login

