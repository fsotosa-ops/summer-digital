# Unified Home: CRM as Admin Start Page + Simplified Participant Dashboard

**Date:** 2026-06-01  
**Status:** Approved  

---

## Context

The app currently has two separate admin-facing surfaces that serve overlapping purposes:

- `/dashboard` — renders `AdminDashboardPanel` (KPIs: usuarios, journeys, recursos, completados; live event control center) for admins, and the participant experience (gamification, journeys, resources) for participants.
- `/crm` — renders the engagement widget dashboard (adoption %, funnel, program health, activity).

This split means an admin landing on `/dashboard` sees platform KPIs but has to navigate separately to `/crm` for engagement data. The two surfaces belong together. Meanwhile, participant-facing content in `/dashboard` is polluted by admin logic that doesn't serve them.

**Goal:** Make `/crm` the true home for admins (absorbing the `AdminDashboardPanel` elements) and simplify `/dashboard` to a clean participant-only experience.

---

## Architecture Change

```
BEFORE                         AFTER
──────────────────────         ──────────────────────────────
/dashboard                     /dashboard
  Admin → AdminDashboardPanel    Admin → redirect to /crm
  Participant → journey + res    Participant → hero + journeys + resources (unchanged)

/crm                           /crm (admin home)
  Tabs: Panel | Participantes    Shortcuts strip  ← new
  Panel: engagement widgets      KPI bar          ← moved from AdminDashboardPanel
                                 Live event banner ← moved from AdminDashboardPanel
                                 Tabs: Panel | Participantes | En Riesgo | Orgs | Config
                                 Panel tab: engagement widgets (existing)
```

---

## Detailed Changes

### 1. `src/app/(app)/dashboard/page.tsx`

Add server-side or client-side redirect: if user role is `Admin` or `SuperAdmin`, redirect to `/crm`.

**Implementation:** Use `useAuthStore` in the Dashboard component to detect admin role and call `router.replace('/crm')` before rendering. This keeps the page.tsx thin and delegates role logic to the existing Dashboard component.

```tsx
// In Dashboard.tsx — before rendering anything:
if (isAdmin && viewMode === 'admin') {
  router.replace('/crm');
  return null;
}
```

This reuses the existing `isAdmin` and `viewMode` checks already in Dashboard.tsx. No new logic needed.

### 2. `src/features/dashboard/Dashboard.tsx`

- **Remove** the `{isAdmin && viewMode === 'admin' && <AdminDashboardPanel user={user} />}` branch — this component moves to the CRM.
- **Keep unchanged:** participant hero card, `ParticipantJourneysSection` (already renders both active journeys AND available-to-enroll journeys), `ResourcesFeedWidget`, subscriber CTA banner.
- No new code needed for the participant side — `ParticipantJourneysSection` already shows available journeys (uses `journeyService.listAvailableJourneysMultiOrg`). The simplification is purely removing the admin branch.

### 3. `src/features/crm/CRMHub.tsx` — Shortcuts strip

Add a compact shortcuts strip **above** the sidebar+content layout (always visible regardless of active tab). Links to key admin routes.

```
Ir a → | ⚡ Journeys | 📚 Recursos | 🏢 Mi Org | 🎮 Gamificación | 📊 Analítica* | 🔧 Config*
                                                              * SuperAdmin only
```

Routes:
- Journeys → `/admin/journeys`
- Recursos → `/admin/resources`
- Mi Org → `/admin/my-organization`
- Gamificación → `/admin/gamification`
- Analítica → `/analytics` (SuperAdmin only, gate with `isSuperAdmin`)
- Config → `/admin/settings` (SuperAdmin only)

**Implementation:** A `ShortcutsStrip` sub-component inside CRMHub.tsx (no separate file needed given its simplicity). Uses `next/link` for navigation. Dark background (`bg-slate-900`) to visually separate from the content area.

### 4. `src/features/crm/tabs/ActivityTab.tsx` — KPI bar + Live event banner

Add two new sections at the **top** of the Panel tab, above the existing "Adopción del Programa" hero card.

#### KPI bar (4 gradient cards)

| Card | Value | Source | Color |
|------|-------|--------|-------|
| Usuarios activos | `total` (from existing `listContacts().count`) | Already loaded | pink→lavender |
| Journeys activos | `allJourneys.filter(j => j.is_active).length` | Already loaded from tracking | sky→cyan |
| Recursos | new: `resourceService.listResources(orgId, null)` → `.length` | New call | teal→emerald |
| Completados | `completedEnrollments` (already computed from tracking) | Already computed | yellow→orange |

Only one new API call needed: `resourceService.listResources(orgId, null)`.

#### Live event banner (conditional)

New API call: `eventService.getDashboardSummary(orgId)` → `ApiEventDashboardSummary`.

- If `summary.live_events.length > 0`: show amber banner with pulsing red dot, event name, attendee count, and "Control →" link that navigates to `/crm` and activates the `events` tab (pass via `?tab=events` query param or local state).
- If no live events but `summary.upcoming_events.length > 0`: show a quieter upcoming event hint.
- If neither: render nothing.

#### Updated `loadData()` in ActivityTab

```
Promise.allSettled([
  crmService.listContacts(0, 30, undefined, orgId),         // existing
  adminService.listOrgTracking(orgId),                       // existing
  resourceService.listResources(orgId, null),                // NEW — for KPI
  eventService.getDashboardSummary(orgId),                   // NEW — for live banner
])
```

New state variables:
- `resourceCount: number` (from `resourceService` response length)
- `eventSummary: ApiEventDashboardSummary | null`

---

## Data Flow (Admin Home)

```
loadData() [parallel]
  ├── listContacts(0,30,orgId)          → total, contacts (actividad reciente)
  ├── listOrgTracking(orgId)            → tracking (programas, funnel, adopción)
  ├── listResources(orgId)              → resourceCount (KPI)
  └── getDashboardSummary(orgId)        → eventSummary (live banner)

Derived:
  total           → KPI card "Usuarios activos"
  allJourneys     → KPI card "Journeys activos" (is_active filter)
  resourceCount   → KPI card "Recursos"
  completedEnr.   → KPI card "Completados"
  eventSummary    → Live event banner (conditional)
```

---

## Visual Order — Admin Home (`/crm`, Panel tab)

1. **Shortcuts strip** (CRMHub, dark bg, always visible)
2. **KPI bar** — 4 gradient cards (ActivityTab top)
3. **Live event banner** — conditional amber strip (ActivityTab)
4. **CRM sidebar + content area** (CRMHub structure, unchanged)
   - Sidebar: Panel · Participantes · En Riesgo · Organizaciones · Config
   - Panel tab content:
     5. Adopción del Programa hero (% + bar)
     6. 4 status cards (Comunidad · Participando · Completaron · Sin Journey)
     7. Alert: sin journey
     8. Row: Salud de Programas + Funnel de Participación
     9. Row: Adopción del Programa + Actividad Reciente

---

## Visual Order — Participant Home (`/dashboard`)

1. Profile hero (gamification score, level, progress bar)
2. CTA banner (subscribers only)
3. Journeys activos (up to 2, with progress + "Continuar")
4. Journeys disponibles para inscribirse (up to 3, with "Unirme")
5. Recursos disponibles (up to 4, locked/unlocked)

_No admin content. No conditional branches. Pure participant UX._

---

## Files Modified

| File | Change | Scope |
|------|--------|-------|
| `src/features/dashboard/Dashboard.tsx` | Remove `AdminDashboardPanel` branch + redirect logic | ~10 lines removed, ~8 added |
| `src/features/crm/CRMHub.tsx` | Add `ShortcutsStrip` above sidebar layout | ~40 lines added |
| `src/features/crm/tabs/ActivityTab.tsx` | Add KPI bar + live event banner at top; 2 new data calls | ~80 lines added |

`AdminDashboardPanel.tsx` is **not deleted** — it becomes unused and can be removed in a cleanup PR, but deleting it is out of scope here to avoid risk.

---

## Out of Scope

- Redesigning the participant journey or resources pages
- Changes to mobile navigation (MainLayout)
- Modifying the "admin participant mode" banner behaviour
- Any backend changes
- Deleting `AdminDashboardPanel.tsx`

---

## Verification

1. Login as **Admin** → should land on `/crm` (redirect from `/dashboard`)
2. Login as **Participant** → should see `/dashboard` with hero, journeys activos, journeys disponibles, recursos — no admin content
3. CRM Panel tab → KPI bar shows 4 cards with real data
4. If a live event exists → amber banner appears with event name and attendee count
5. If no live event → banner absent, no empty space
6. Shortcuts strip → all links navigate to correct admin routes; Analítica/Config only visible for SuperAdmin
7. `npm run build` passes with no errors
