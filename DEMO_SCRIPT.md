# Ride Operations Portal — E2E Demo Script (v1.0.0)

## Overview
This demo script showcases the complete Ride Operations Portal across 4 phases and 3 specialized portals. Each step demonstrates a feature as implemented in the system.

**Demo duration:** ~15 minutes  
**Portals involved:** ops-portal, ride-vendor-portal, ride_prd

---

## Pre-Demo Setup

### Terminal 1: Start all portals
```bash
cd /home/geelani/Downloads/Ride_polish
npm run dev
# Portals will start on:
# - ops-portal: http://localhost:3002
# - ride-vendor-portal: http://localhost:3001
# - ride_prd: http://localhost:3004
```

### Test data
All test data is auto-seeded on first load via Zustand persist (localStorage).

---

## Demo Steps

### **Step 1: Login & Control Room Overview** (Phase 1 — Safety)
**Audience:** Ops team lead looking at real-time dispatch safety.

1. Open **ops-portal** → http://localhost:3002
2. See login screen. Log in as: `name: "Preethi Sharma"` → `role: "control-room"`
3. Redirected to `/control-room`
4. **Observe:**
   - 4 KpiCards at top: Active trips, SOS active, Anomalies today, Resolved today
   - Interactive map showing vehicle markers (blue=en route, green=in transit, red=SOS)
   - Active alerts card (3-4 sample alerts with types: SOS_RAISED, ANOMALY_DETECTED)
   - Recent activity feed on right (shows timeline of events)
   - **Live badge** in header showing real-time status

**Talk track:**  
"This is our Safety Board — a unified view of all active trips and safety incidents. The map shows vehicle locations color-coded by status. We can see active SOS alerts and anomalies detected in real time."

---

### **Step 2: Handle a Live SOS** (Phase 1 — Control Room)
**Scenario:** Preethi responds to an active SOS.

1. Click on **Live SOS** in sidebar (should show badge with count)
2. Navigate to `/control-room/sos`
3. **Observe:**
   - Header: "SOS Active — 1 incident"
   - Elapsed timer showing time since SOS raised (mm:ss format)
   - Escalation track showing L1→L2→L3→L4
   - Current level highlighted (e.g., L2)
   - [Acknowledge] button at top
   - SOS alert card with vehicle details

4. Click **[Acknowledge]** button
5. Toast shows: "SOS acknowledged"
6. Escalation track updates (acknowledging timestamps recorded)

**Talk track:**  
"When an SOS comes in, our dispatch gets an immediate alert with the vehicle location and driver info. Preethi can acknowledge receipt and escalate to management if needed. The elapsed timer tracks response time — critical for safety metrics."

---

### **Step 3: Anomaly Detection & Reporting** (Phase 1 — Control Room)
**Scenario:** View detected anomalies.

1. Click **Anomalies** in sidebar
2. Navigate to `/control-room/anomalies`
3. **Observe:**
   - 3 tabs: Route Deviations, Prolonged Stops, No-shows
   - Click **Route Deviations** tab
   - Table showing: Trip ID, Deviation distance, GPS coords, Status
   - Click a row → right-side drawer opens with full trip details
   - **Geofencing visualization** (optional): show how system detects off-route

4. Switch to **Prolonged Stops** tab
5. See trips with stop duration > threshold
6. Supervisor can [View] trip to understand reason

**Talk track:**  
"Our anomaly detection catches risky patterns: vehicles going off-route, unusual stops, or missing pickups. This tab consolidates all three — dispatch can investigate and coach drivers in real time."

---

### **Step 4: Cross-Portal Data Sync (LiveTrips)** (Phase 1 → Phase 2 bridge)
**Scenario:** Demonstrate that data created in one portal appears instantly in another.

1. **Window 1:** Keep ops-portal open at `/control-room`
2. **Window 2:** Open **ride-vendor-portal** → http://localhost:3001
   - Log in: `name: "Rajesh"` → `role: "vendor"`
   - Navigate to **Trips** (sidebar)
3. **Observe:**
   - Both portals show the same trips list
   - Same trip statuses, same driver/vehicle assignments
4. **Back to Window 1:** Click on a trip in the control room trips table
5. **Back to Window 2:** Refresh vendor portal
   - **Same trip is visible** — data synced via localStorage

**Talk track:**  
"Our system uses cross-tab synchronization through localStorage. When the ops portal updates a trip status, the vendor portal and rideprd see it instantly — no backend required in demo mode. This is how all our portals stay in sync."

---

### **Step 5: Rate Card Overview & KPI Dashboard** (Phase 2 — Rate Manager)
**Scenario:** Rate manager reviews current pricing.

1. **Window 1:** Open ops-portal `/rate-manager`
2. Log in: `name: "Arjun Gupta"` → `role: "rate-manager"`
3. Redirected to `/rate-manager` (Rate Cards overview)
4. **Observe:**
   - 4 KpiCards: Active cards, Vendors covered, Vehicle types, Avg ₹/km rate
   - Filter bar: Vendor, Vehicle type, Basis, Status dropdowns
   - DataTable (20 rows/page) showing all rate cards:
     - Columns: ID, Vendor, Vehicle Type, Basis, Rate, Modifiers, Valid from, Valid to, Version, Status
     - Rate display: "₹20/km", "₹500/hr", "Fixed pair", "₹1200 (4hr/50km)"
     - Modifiers shown as badges: "Min ₹200", "Night +25%", "Wait ₹100/hr"
     - Status badges: green "Active" vs grey "Superseded"
   - [Actions]: "View" + "New version" (active only)

5. Click [View] on a rate card
6. Right drawer opens showing:
   - Full rate card details
   - Modifier breakdown (night charge %, waiting rate, toll handling)
   - Valid from/to dates
   - Version history timeline (3 versions, newest first)
   - [Create new version] button

**Talk track:**  
"The Rate Manager dashboard gives our pricing team a bird's-eye view of all negotiated rates. We can see which vendors are covered, what vehicle types have rates, and instantly spot pricing outliers. Version history is immutable for audit compliance."

---

### **Step 6: Create a New Rate Card** (Phase 2 — Rate Manager)
**Scenario:** Arjun creates a new PER_KM rate for a logistics customer.

1. Click [New rate card] button
2. Navigated to `/rate-manager/create` (full-page form)
3. **Section 1 — Scope:**
   - Vendor: Select "Vendor 1"
   - Customer: Select "Acme Logistics" (shown as customer code, not full name — PII masking)
   - Vehicle type: Select "SUV"
   - Valid from: Set to today
   - Valid to: Leave blank (indefinite)

4. **Section 2 — Pricing basis:**
   - Select **PER_KM** radio
   - Rate input: "25" (₹25/km)
   - Min fare: "300" (₹300)

5. **Section 3 — Modifiers:**
   - Night charge: Toggle ON, enter "20" (20% surcharge between 22:00–06:00)
   - Waiting charge: Toggle ON, enter "100" (₹100/hour after 10 min free)
   - Toll handling: Select "EXTRA" (toll not included in rate; shown separately)
   - Parking: Select "INCLUDED"

6. **Section 4 — Live preview:**
   - Sample trip auto-updates as you change fields
   - Shows: "Sample: 25km, 30min wait, 11PM"
   - Breakdown:
     - Base: ₹625 (25km × ₹25)
     - Night surcharge: ₹125 (+20% of base)
     - Waiting: ₹67 ((30-10) min / 60 × ₹100)
     - Toll: ₹0 (toggle available but not included in sample)
     - **Total: ₹817**

7. Click [Save rate card]
8. **Supercede Modal** appears:
   - "This will supersede RC-V1-C2-VT2 v1 (₹20/km)"
   - [Confirm & supersede] / [Cancel]
9. Click [Confirm & supersede]
10. Toast: "Rate card v2 published — effective [today]"
11. Redirected to `/rate-manager`
12. New rate card appears in table with:
    - Status: "Active" (green badge)
    - Version: "v2"
    - Old card shows "Superseded" (grey badge)

**Talk track:**  
"When we negotiate a new rate, the system walks us through the pricing structure. Live preview shows exactly what customers will pay for a sample trip, including all modifiers. When published, it supersedes the old version — we keep full audit history for compliance."

---

### **Step 7: Rate Card Version History** (Phase 2 — Rate Manager)
**Scenario:** Review how rates have evolved.

1. Click **History** in sidebar
2. Navigate to `/rate-manager/history`
3. **Observe:**
   - Rate cards grouped by (vendor × customer × vehicleType)
   - **Group 1:** "Vendor 1 — Acme Logistics — SUV"
     - Timeline (vertical, newest first):
       - **v2** (green "Active") — Valid from [today] — ₹25/km
       - **v1** (grey "Superseded") — Valid from [7 days ago] — ₹20/km
   - Click v2: Read-only drawer shows full details
   - Click v1: Shows previous rate (now superseded)
   - Note: "Old versions preserved for audit — cannot be deleted"

4. Filter by Vendor or Date range to see other combos

**Talk track:**  
"Version history gives us a complete timeline of pricing changes. Each new version supersedes the old one, but we keep the history for audits and for understanding what customers paid on specific dates. This is critical for billing disputes."

---

### **Step 8: Fare Simulator** (Phase 2 — Rate Manager)
**Scenario:** Arjun simulates what a customer will pay under different scenarios.

1. Click **Simulator** in sidebar
2. Navigate to `/rate-manager/simulate`
3. **Left panel — Inputs:**
   - Vendor: Select "Vendor 1"
   - Vehicle type: Select "SUV"
   - Trip date/time: Set to today, 11:30 PM (night time)
   - Distance: "45" km
   - Duration: 1 hour, 15 min
   - Waiting time: "20" min
   - Night trip: Auto-detects from time → shows toggled ON
   - Toll: Toggle ON

4. **Right panel — Live results (updates instantly):**
   - "Simulated fare — rate card v2"
   - Breakdown table:
     - Base fare: ₹1125 (45km × ₹25/km)
     - Night surcharge: ₹225 (+20% of base, active 22:00–06:00)
     - Waiting charge: ₹167 ((20-10) min / 60 × ₹100)
     - Toll: ₹100 (EXTRA handling, user toggled on)
     - **Total: ₹1617**
   - "Rate card: RC-V1-C2-VT2 v2 — Vendor 1 × SUV"
   - "Valid: [today] → indefinite"
   - "This is a simulation — no trip created"

5. Session history shows last 3 simulations
6. Click [Save as reference] on one
7. Toast: "Saved to simulation history"

**Talk track:**  
"The simulator is our rate testing lab. Finance can see exactly what customers will pay without creating real trips. We use this to validate that our rates are competitive and test 'what-if' scenarios — like 'what if we increase night charge by 5%?'"

---

### **Step 9: Rate Audit Log** (Phase 2 → Phase 3 bridge)
**Scenario:** Super admin views immutable audit trail.

1. Click **Audit** in sidebar
2. Navigate to `/rate-manager/audit`
3. **Observe:**
   - DataTable showing all rate card changes
   - Columns: Timestamp, Action, Rate card ID, Vendor, Vehicle type, Old rate, New rate, Changed by, Version
   - Filter bar: Date range, Vendor, Action type (CREATED / SUPERSEDED / DEACTIVATED)
   - Sample rows:
     - [Now] | CREATED | RC-XYZ | Vendor 1 | SUV | — | ₹25/km | Arjun Gupta | v2
     - [Now] | SUPERSEDED | RC-ABC | Vendor 1 | SUV | ₹20/km | ₹25/km | Arjun Gupta | v1
   - Action badges: green "CREATED", grey "SUPERSEDED", red "DEACTIVATED"
4. Footer note: "Immutable audit log — no edit or delete"

**Talk track:**  
"Every rate change is logged with timestamp, who changed it, and what changed. This audit trail is immutable — critical for financial compliance and customer disputes. If a customer claims they were overcharged, we can prove what rate was active on their booking date."

---

### **Step 10: Super Admin Dashboard & Tenant Management** (Phase 3 — Super Admin)
**Scenario:** Platform admin reviews system health.

1. **Window 3:** Open new ops-portal tab → http://localhost:3002
2. Log in: `name: "Vikram Kumar"` → `role: "super-admin"`
3. Redirected to `/super-admin`
4. **Observe:**
   - 4 KpiCards: Active tenants (1), Total trips (15), Rate cards (3), Active SOS (0)
   - Quick navigation cards:
     - [Tenant Management] → `/super-admin/tenants`
     - [Billing Dashboard] → `/super-admin/billing`
     - [System Health] → `/super-admin/health`
     - [Audit Log] → `/super-admin/audit`
   - System summary box: Completed trips (10), Total revenue (₹8,450), Active alerts (0), Rate card versions (3)

5. Click [Tenant Management]
6. Navigate to `/super-admin/tenants`
7. **Observe:**
   - DataTable of tenants
   - Columns: ID, Name, Status, Created, Type, Actions
   - Sample rows: T1 (SpiceJet), T2 (Acme), etc. (if seeded)
   - [+ New Tenant] button to add operators
   - [Edit] button opens modal to update tenant info
8. Click [Billing Dashboard]
9. Navigate to `/super-admin/billing`
10. **Observe:**
    - 4 KpiCards: Total revenue, Completed trips, Avg revenue/trip, Active tenants
    - Chart 1: "Daily revenue (Last 7 days)" — LineChart showing ₹ trend
    - Chart 2: "Revenue by tenant" — BarChart showing T1, T2, etc.
    - Tenant billing summary table: Name, Trip count, Revenue

**Talk track:**  
"The Super Admin dashboard is our business command center. We monitor revenue, trip volume, and system health across all tenants. The billing dashboard shows which customers are generating revenue and helps us optimize rates. The immutable audit log tracks every system change."

---

## Demo Verification Checklist

✅ **Phase 1 — Control Room:**
- [ ] Live vehicle map shows color-coded markers
- [ ] SOS active count badge on sidebar
- [ ] Acknowledge SOS records timestamp
- [ ] Anomalies show route deviations/prolonged stops/no-shows
- [ ] Trips table filters and shows read-only view

✅ **Phase 2 — Rate Manager:**
- [ ] KpiCard KPIs update when rate cards change
- [ ] Create rate card form shows live preview
- [ ] Supercede modal confirms old card is superseded
- [ ] Version history shows all versions with immutable lock note
- [ ] Fare simulator updates live as inputs change
- [ ] Audit log shows CREATED/SUPERSEDED actions

✅ **Phase 3 — Super Admin:**
- [ ] Dashboard KPIs reflect all tenants' data
- [ ] Tenant management CRUD works
- [ ] Billing charts load with revenue data
- [ ] Audit log filters by date/vendor/action

✅ **Phase 4 — Polish:**
- [ ] Skeleton loaders appear on first load (before data seeded)
- [ ] OfflineBanner appears if browser goes offline
- [ ] Notification bell shows unread count
- [ ] [Mark all read] in notification drawer works
- [ ] Mobile menu (hamburger) appears on screens < 768px
- [ ] Mobile drawer navigation works smoothly

✅ **Cross-Portal Sync:**
- [ ] Ops portal trip list ↔ Vendor portal trips sync via localStorage
- [ ] Rate card created in ops portal appears in rideprd /pricing immediately
- [ ] No backend calls required (demo mode — all data in localStorage)

---

## Troubleshooting

**Issue:** Portals won't start  
**Fix:** Kill any processes on ports 3001, 3002, 3004  
```bash
lsof -i :3001 | grep -v PID | awk '{print $2}' | xargs kill -9
lsof -i :3002 | grep -v PID | awk '{print $2}' | xargs kill -9
lsof -i :3004 | grep -v PID | awk '{print $2}' | xargs kill -9
npm run dev
```

**Issue:** Data not syncing between tabs  
**Fix:** Check localStorage — open DevTools → Application → Storage → Local Storage  
- Verify keys like `ride-safety-alerts`, `ride-rate-cards`, `ride-trips` exist
- If empty, data is not seeded. Refresh page to trigger SeedInitializer.

**Issue:** Mobile menu doesn't appear  
**Fix:** Resize browser to < 768px or use DevTools device emulation (Ctrl+Shift+M)

**Issue:** Notifications not showing  
**Fix:** Click bell icon in header. If empty, notifications may not be seeded.  
Check: `useNotificationStore().getNotificationsByRole('control-room')` in console.

---

## Post-Demo Talking Points

1. **Real-time Safety:**  
   "Our control room gives dispatch a unified view of safety incidents with color-coded severity. When an SOS comes in, the system immediately alerts and tracks escalation — critical for our zero-incident SLA."

2. **Transparent Pricing:**  
   "Rate cards are versioned and immutable. We can prove to any customer what rate was active on their booking date. Live preview ensures our team doesn't make pricing mistakes."

3. **Audit Compliance:**  
   "Every action — creating a rate card, changing pricing, escalating an SOS — is logged with timestamp, actor, and change details. This gives us compliance confidence and faster dispute resolution."

4. **Cross-Portal Sync:**  
   "Our demo uses localStorage for instant cross-tab sync. In production, this would use a real backend. The architecture supports both seamlessly."

5. **Mobile-First Design:**  
   "All portals work on mobile with responsive layouts and touch-friendly navigation. Dispatch can manage incidents from anywhere."

---

## Architecture Summary

| Component | Technology | Purpose |
|---|---|---|
| **State Management** | Zustand + persist | Cross-tab localStorage sync |
| **Routing** | Next.js App Router | File-based routing, nested layouts |
| **UI Components** | React + Tailwind | Responsive design system |
| **Charts** | Recharts | Revenue/KPI visualization |
| **Maps** | Leaflet | Vehicle location tracking |
| **Icons** | Lucide React | Consistent icon set |
| **Date/Formatting** | Native JS + utils | Paise ↔ ₹ conversion, date formatting |

---

## Success Criteria

- ✅ All 4 portals start without errors
- ✅ Data persists in localStorage and syncs across tabs
- ✅ All 10 demo steps execute without errors
- ✅ UI is responsive on desktop (1920px) and mobile (375px)
- ✅ Audit logs show immutable records
- ✅ Notification bell works
- ✅ Mobile menu appears and navigation works
- ✅ No console errors (TypeScript + runtime)

---

**Demo created:** 2026-06-11  
**Version:** v1.0.0-ops-portal  
**Author:** Claude + Ride Operations Team
