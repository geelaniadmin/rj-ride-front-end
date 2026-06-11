# RIDE Ops Portal — Phase-wise Prompt Pack
# 3 roles: Control room | Rate manager | Super admin
# Fully wired to ride-shared (rideprd + vendor portal sync)

---

## Folder it lives in

  Ride_polish/
    rideprd/               existing
    ride-shared/           existing
    ride-vendor-portal/    existing
    ride-ops-portal/       ← this project

---

## Files

  OPS_CONTEXT.md           Paste before every phase
  phase-0-foundation.md    Shell, login, role switcher, UI components
  phase-1-control-room.md  Preethi — safety board, SOS, anomalies, reports
  phase-2-rate-manager.md  Rate cards, versioning, simulator, audit
  phase-3-super-admin.md   Geelani — all tenants, billing, health, audit
  phase-4-polish.md        Notifications, mobile, E2E demo script

---

## 5 wire-ups (all cross-portal, no page refresh)

  1. SOS acknowledge  ops portal → rideprd + vendor portal
  2. Rate card new    ops portal → rideprd pricing + trips
  3. New tenant       ops portal → rideprd tenant switcher
  4. Trip complete    rideprd → ops portal platform revenue
  5. All actions      all portals → ops portal cross-tenant audit log

---

## How to use

  From Ride_polish/:
    Phase 0: cat OPS_CONTEXT.md phase-0-foundation.md | claude
    Test: login as all 3 roles, debug badge shows shared store counts
    Commit: ride-ops-portal + ride-shared

    Phase 1: cat OPS_CONTEXT.md phase-1-control-room.md | claude
    Test: SOS ack in ops → rideprd dispatch clears (no refresh)

    Phase 2: cat OPS_CONTEXT.md phase-2-rate-manager.md | claude
    Test: new rate card in ops → rideprd pricing shows it (no refresh)

    Phase 3: cat OPS_CONTEXT.md phase-3-super-admin.md | claude
    Test: new tenant in ops → rideprd switcher shows it (no refresh)

    Phase 4: cat OPS_CONTEXT.md phase-4-polish.md | claude
    Test: run full 10-step e2e demo script

---

## Estimated time (AI agents running vigorously)

  Phase 0:  3-4 hrs    Shell + 3 role layouts + components
  Phase 1:  5-6 hrs    Control room (live map + SOS wire-up)
  Phase 2:  4-5 hrs    Rate manager + rideprd wire-up
  Phase 3:  4-5 hrs    Super admin + all tenant wire-ups
  Phase 4:  3-4 hrs    Polish + mobile + e2e demo
  ──────────────────────
  Total:   ~19-24 hrs  (~3 days with agents running continuously)

