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

---

## Schema contract — keeping the frontend in sync with the backend

The TypeScript types consumed by all three apps (`ride_prd`, `ride-vendor-portal`, `ride-ops-portal`)
are generated from a single source of truth: `ride-shared/schema.yaml`.

**Update flow (backend merges a new API shape):**

1. Copy the updated OpenAPI spec from the backend repo:
   ```
   cp /path/to/backend/openapi.yaml ride-shared/schema.yaml
   ```
2. Regenerate the TypeScript types:
   ```
   cd ride-shared && npm run gen:api
   ```
3. Fix every TypeScript compile error in all three apps (the compiler is the contract-drift alarm).
4. Run the full local gate (see below) until green.
5. Open a PR. The CI `schema-drift` job will fail on any PR where `schema.d.ts` is not in sync with `schema.yaml`.

**CI enforcement (`schema-drift` job in `.github/workflows/ci.yml`):**
- Installs ride-shared deps, runs `npm run gen:api`, then `git diff --exit-code src/api/schema.d.ts`.
- A non-empty diff means the committed `schema.d.ts` no longer matches `schema.yaml` — the job fails and blocks the PR.

---

## Deployment — Vercel (per-app)

Each app is deployed as a separate Vercel project. The monorepo `vercel.json` at the repo root
configures which directory maps to which project.

### Required environment variables

| Variable | Example | Notes |
|---|---|---|
| `API_ORIGIN` | `https://api.ride.example.com` | Base URL of the Django backend. Set per Vercel environment (Production / Preview / Development). |
| `NEXT_PUBLIC_WS_ORIGIN` | `wss://api.ride.example.com` | WebSocket origin for real-time events. Must match `API_ORIGIN` host (same CORS policy). |

### Why CORS stays closed

The Django backend allows only the specific origins listed in `CORS_ALLOWED_ORIGINS`. No wildcard.
Vercel preview deployments get their own origin (`https://<deployment-id>.vercel.app`) which must be
added to `CORS_ALLOWED_ORIGINS` (or use a pattern) before the preview can hit the API.

### WebSocket ticket flow

```
Browser                     Next.js (SSR edge)          Django backend
  |                               |                           |
  |--- POST /v1/ws/ticket ------->|--- forward w/ JWT ------->|
  |                               |<-- { ticket, expiresAt } -|
  |<-- { ticket } ---------------|                            |
  |                               |                           |
  |--- ws://api/ws?ticket=<T> ----------------------------------->|
  |<-- events (trip.*, sos.*, billing.*, tracking.*) -------------|
```

- The ticket is a short-lived (60 s) opaque token issued by the backend.
- The frontend requests it via authenticated REST, then opens the WebSocket using the ticket as a
  query param. This avoids sending the JWT in the WebSocket upgrade URL (which would be logged).
- On expiry the client reconnects (`connectEvents` in `ride-shared/src/realtime/ws.ts` handles
  automatic reconnect with exponential back-off).

---

## Local gate — run before every PR

```bash
# 1. ride-shared unit tests
cd ride-shared && npm test && cd ..

# 2. Lint + build all three apps
cd ride_prd && npm run lint && npm run build && cd ..
cd ride-vendor-portal && npm run lint && npm run build && cd ..
cd ride-ops-portal && npm run lint && npm run build && cd ..

# 3. E2E smoke (requires running backend + all three dev servers)
cd e2e && npm ci && npx playwright install chromium && npx playwright test
```

Set `BASE_URL_PRD`, `BASE_URL_VENDOR`, `BASE_URL_OPS`, and `API_BASE` in `e2e/.env` if the dev
servers run on non-default ports.

