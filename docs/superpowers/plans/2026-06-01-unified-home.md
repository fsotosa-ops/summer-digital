# Unified Home Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/crm` the admin home (absorbing KPI bar + live event banner from AdminDashboardPanel), redirect admins from `/dashboard` to `/crm`, and simplify the participant dashboard.

**Architecture:** Three file changes — `Dashboard.tsx` gets a redirect and loses the AdminDashboardPanel branch; `CRMHub.tsx` gains a shortcuts strip above the layout; `ActivityTab.tsx` gains a KPI bar and conditional live event banner at the top of the Panel tab, fed by two new parallel API calls.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS, Zustand, Lucide React, shadcn/ui, Framer Motion

---

## File Map

| File | Change |
|------|--------|
| `src/features/dashboard/Dashboard.tsx` | Add redirect for admin+admin-mode; remove `AdminDashboardPanel` branch |
| `src/features/crm/CRMHub.tsx` | Add `ShortcutsStrip` above the CRM layout div |
| `src/features/crm/tabs/ActivityTab.tsx` | Add KPI bar + live event banner; 2 new data calls |

`src/features/dashboard/components/AdminDashboardPanel.tsx` — **not touched**. Left in place, simply no longer rendered.

---

## Task 1: Redirect admins from `/dashboard` to `/crm`

**Files:**
- Modify: `src/features/dashboard/Dashboard.tsx`

**Context:** `Dashboard.tsx` already has `isAdmin` and `viewMode` computed from `useAuthStore`. By the time we reach those checks, `user` is guaranteed non-null (earlier `if (!user)` guard handles the null case). Adding `useRouter` from `next/navigation` and calling `router.replace('/crm')` synchronously before returning JSX is the cleanest pattern in App Router client components.

- [ ] **Step 1: Add `useRouter` import**

In `src/features/dashboard/Dashboard.tsx`, add `useRouter` to the existing Next.js import:

```tsx
import { useRouter } from 'next/navigation';
```

Add after the existing `import Link from 'next/link';` line.

- [ ] **Step 2: Instantiate router and add redirect**

Inside the `Dashboard` function, after the `if (!user)` guard and after the `isAdmin`/`viewMode` constants are defined, add:

```tsx
const router = useRouter();

// Admins in admin mode belong in the CRM — redirect immediately
if (isAdmin && viewMode === 'admin') {
  router.replace('/crm');
  return null;
}
```

Place this block immediately after line 58 (`const isParticipantView = ...`), before the hero color token declarations.

- [ ] **Step 3: Remove `AdminDashboardPanel` branch and import**

Remove line 194:
```tsx
{isAdmin && viewMode === 'admin' && <AdminDashboardPanel user={user} />}
```

Remove line 11:
```tsx
import { AdminDashboardPanel } from './components/AdminDashboardPanel';
```

The file no longer needs that import.

- [ ] **Step 4: Verify build**

```bash
cd /Users/usuario/Desktop/projects/fsummer-platform/summer-digital && npm run build
```

Expected: clean build, no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add src/features/dashboard/Dashboard.tsx
git commit -m "feat(dashboard): redirect admins to /crm; remove AdminDashboardPanel branch"
```

---

## Task 2: Add shortcuts strip to CRMHub

**Files:**
- Modify: `src/features/crm/CRMHub.tsx`

**Context:** The strip goes **above** the sidebar+content `div` (line 47 in current CRMHub) but **below** the `SectionHeader`. It uses `next/link` for navigation and is gated by `isSuperAdmin` for the Analítica and Config links. Dark `bg-slate-900` background visually separates it from the CRM content.

- [ ] **Step 1: Add `Link` import**

At the top of `src/features/crm/CRMHub.tsx`, add:

```tsx
import Link from 'next/link';
```

- [ ] **Step 2: Add `isSuperAdmin` constant**

Inside `CRMHub`, after the existing `const isAdmin = ...` line, add:

```tsx
const isSuperAdmin = user?.role === 'SuperAdmin';
```

- [ ] **Step 3: Add the shortcuts strip**

Between the closing `/>` of `<SectionHeader ... />` and the opening `<div className="flex flex-col md:flex-row ...">` of the CRM layout, insert:

```tsx
{/* Shortcuts strip — quick nav to admin sections */}
<div className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5">
  <span className="mr-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
    Ir a
  </span>
  {[
    { label: '⚡ Journeys',      href: '/admin/journeys'          },
    { label: '📚 Recursos',      href: '/admin/resources'         },
    { label: '🏢 Mi Org',        href: '/admin/my-organization'   },
    { label: '🎮 Gamificación',  href: '/admin/gamification'      },
  ].map(({ label, href }) => (
    <Link
      key={href}
      href={href}
      className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1 text-[11px] font-medium text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-700"
    >
      {label}
    </Link>
  ))}
  {isSuperAdmin && (
    <>
      <Link
        href="/analytics"
        className="rounded-md border border-indigo-800 bg-indigo-900/50 px-3 py-1 text-[11px] font-medium text-indigo-300 transition-colors hover:border-indigo-600 hover:bg-indigo-800/50"
      >
        📊 Analítica
      </Link>
      <Link
        href="/admin/settings"
        className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1 text-[11px] font-medium text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-700"
      >
        🔧 Config
      </Link>
    </>
  )}
</div>
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```

Expected: clean build.

- [ ] **Step 5: Commit**

```bash
git add src/features/crm/CRMHub.tsx
git commit -m "feat(crm): add shortcuts strip above CRM layout"
```

---

## Task 3: Add KPI bar to ActivityTab

**Files:**
- Modify: `src/features/crm/tabs/ActivityTab.tsx`

**Context:** The KPI bar shows 4 gradient cards — Usuarios activos, Journeys activos, Recursos, Completados. Three of the four values are already computed from existing data (`total`, `allJourneys.filter(j => j.is_active).length`, `completedEnrollments`). Only **Recursos** needs a new API call: `resourceService.listResources(orgId, null)`.

- [ ] **Step 1: Add `resourceService` import**

At the top of `src/features/crm/tabs/ActivityTab.tsx`, add:

```tsx
import { resourceService } from '@/services/resource.service';
```

- [ ] **Step 2: Add `resourceCount` state**

Inside `ActivityTab`, after the existing state declarations, add:

```tsx
const [resourceCount, setResourceCount] = useState<number | null>(null);
```

- [ ] **Step 3: Add the new API call in `loadData`**

Replace the existing `Promise.allSettled` call with:

```tsx
const [contactsRes, trackingRes, resourcesRes] = await Promise.allSettled([
  crmService.listContacts(0, 30, undefined, orgId),
  orgId ? adminService.listOrgTracking(orgId) : Promise.resolve(null),
  orgId ? resourceService.listResources(orgId, null) : Promise.resolve([]),
]);
if (contactsRes.status === 'fulfilled') {
  setContacts(contactsRes.value.contacts);
  setTotal(contactsRes.value.count);
}
if (trackingRes.status === 'fulfilled' && trackingRes.value) {
  setTracking(trackingRes.value);
}
if (resourcesRes.status === 'fulfilled') {
  setResourceCount(Array.isArray(resourcesRes.value) ? resourcesRes.value.length : 0);
}
```

- [ ] **Step 4: Compute `activeJourneyCount` from tracking**

In the derived values section (after `if (loading) { return ... }`), add after the `allJourneys` computation:

```tsx
const activeJourneyCount = allJourneys.filter((j) => j.is_active).length;
```

- [ ] **Step 5: Add the KPI bar UI**

Add the following block immediately **after** the header `<div>` (the one with "Panel de Engagement" + Actualizar button) and **before** the engagement health hero `<Card>`:

```tsx
{/* ── KPI bar (moved from AdminDashboardPanel) ── */}
<div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
  {[
    {
      label: 'Usuarios activos',
      sub: 'Total registrados',
      value: total,
      gradient: 'from-summer-pink to-summer-lavender',
      border: 'border-summer-pink/30',
    },
    {
      label: 'Journeys activos',
      sub: 'Publicados',
      value: activeJourneyCount,
      gradient: 'from-sky-400 to-cyan-500',
      border: 'border-sky-200',
    },
    {
      label: 'Recursos',
      sub: 'Disponibles',
      value: resourceCount,
      gradient: 'from-teal-400 to-emerald-500',
      border: 'border-teal-200',
    },
    {
      label: 'Completados',
      sub: 'Total acumulado',
      value: completedEnrollments,
      gradient: 'from-yellow-400 to-orange-500',
      border: 'border-yellow-200',
    },
  ].map(({ label, sub, value, gradient, border }) => (
    <div
      key={label}
      className={`bg-white rounded-2xl border ${border} shadow-sm p-4 flex flex-col gap-2`}
    >
      <div className={`h-8 w-8 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center`}>
        <Users className="h-4 w-4 text-white" />
      </div>
      <div>
        {value === null ? (
          <div className="h-8 w-14 animate-pulse rounded bg-slate-100" />
        ) : (
          <p className="text-2xl font-bold tabular-nums text-slate-800 leading-none">
            {value.toLocaleString()}
          </p>
        )}
        <p className="text-sm font-medium text-slate-600 mt-1">{label}</p>
        <p className="text-xs text-slate-400">{sub}</p>
      </div>
    </div>
  ))}
</div>
```

Note: the `Users` icon is already imported. The icon is the same for all 4 cards in this compact version — it keeps the code DRY without needing 4 separate icon imports.

- [ ] **Step 6: Verify build**

```bash
npm run build
```

Expected: clean build, no TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add src/features/crm/tabs/ActivityTab.tsx
git commit -m "feat(crm): add KPI bar to Panel tab (users, journeys, resources, completions)"
```

---

## Task 4: Add live event banner to ActivityTab

**Files:**
- Modify: `src/features/crm/tabs/ActivityTab.tsx`

**Context:** `eventService.getDashboardSummary(orgId)` returns `ApiEventDashboardSummary` with `live_events: ApiEventDashboardSummaryItem[]` and `upcoming_events: ApiEventDashboardSummaryItem[]`. Each item has `name`, `registered_count`, and `attended_count`. The banner renders conditionally — amber with a pulsing red dot when there is a live event, a quieter slate variant for upcoming only, nothing when neither.

- [ ] **Step 1: Add imports**

Add to the existing imports in `ActivityTab.tsx`:

```tsx
import { eventService } from '@/services/event.service';
import { ApiEventDashboardSummary } from '@/types/api.types';
```

- [ ] **Step 2: Add `eventSummary` state**

```tsx
const [eventSummary, setEventSummary] = useState<ApiEventDashboardSummary | null>(null);
```

- [ ] **Step 3: Add `getDashboardSummary` to `loadData`**

Extend the `Promise.allSettled` call to include the event summary (make it a 4th slot):

```tsx
const [contactsRes, trackingRes, resourcesRes, eventRes] = await Promise.allSettled([
  crmService.listContacts(0, 30, undefined, orgId),
  orgId ? adminService.listOrgTracking(orgId) : Promise.resolve(null),
  orgId ? resourceService.listResources(orgId, null) : Promise.resolve([]),
  orgId ? eventService.getDashboardSummary(orgId) : Promise.resolve(null),
]);
if (contactsRes.status === 'fulfilled') {
  setContacts(contactsRes.value.contacts);
  setTotal(contactsRes.value.count);
}
if (trackingRes.status === 'fulfilled' && trackingRes.value) {
  setTracking(trackingRes.value);
}
if (resourcesRes.status === 'fulfilled') {
  setResourceCount(Array.isArray(resourcesRes.value) ? resourcesRes.value.length : 0);
}
if (eventRes.status === 'fulfilled' && eventRes.value) {
  setEventSummary(eventRes.value);
}
```

- [ ] **Step 4: Add the banner UI**

Place this block immediately **after** the KPI bar `</div>` and **before** the Adopción del Programa hero `<Card>`:

```tsx
{/* ── Live / upcoming event banner (conditional) ── */}
{eventSummary && eventSummary.live_events.length > 0 && (() => {
  const ev = eventSummary.live_events[0];
  return (
    <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-900 truncate">
          {ev.name}
        </p>
        <p className="text-xs text-amber-700">
          {ev.registered_count} inscritos · {ev.attended_count} asistieron
        </p>
      </div>
      <Link
        href="/crm?tab=events"
        className="shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-600 transition-colors"
      >
        Control →
      </Link>
    </div>
  );
})()}

{eventSummary && eventSummary.live_events.length === 0 && eventSummary.upcoming_events.length > 0 && (() => {
  const ev = eventSummary.upcoming_events[0];
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5">
      <span className="text-sm">📅</span>
      <p className="flex-1 text-xs text-slate-600 truncate">
        Próximo evento: <strong>{ev.name}</strong> · {ev.registered_count} inscritos
      </p>
    </div>
  );
})()}
```

- [ ] **Step 5: Add `Link` import**

Add to existing imports in `ActivityTab.tsx`:

```tsx
import Link from 'next/link';
```

- [ ] **Step 6: Verify build**

```bash
npm run build
```

Expected: clean build, zero TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add src/features/crm/tabs/ActivityTab.tsx
git commit -m "feat(crm): add live event banner to Panel tab"
```

---

## Task 5: Push and verify end-to-end

- [ ] **Step 1: Push to remote**

```bash
git push origin main
```

- [ ] **Step 2: Manual verification checklist**

Open the app locally (`npm run dev`, port 3000) and verify:

1. **Admin redirect** — Login (or already logged in) as Admin/SuperAdmin. Navigate to `/dashboard`. Should immediately redirect to `/crm` with no flash of participant content.

2. **Participant home** — Switch to a Participant account (or use admin participant mode). `/dashboard` should show: profile hero → journeys activos → journeys disponibles con "Unirme" → recursos. No AdminDashboardPanel, no KPI cards.

3. **Shortcuts strip** — On `/crm`, above the CRM layout, verify the dark strip with: ⚡ Journeys · 📚 Recursos · 🏢 Mi Org · 🎮 Gamificación links. As SuperAdmin also verify 📊 Analítica · 🔧 Config appear. Click one to confirm navigation.

4. **KPI bar** — On `/crm` Panel tab, verify 4 gradient cards appear with real numbers (not null/—). Usuarios activos should match the community total. Recursos should be a non-zero number if resources exist.

5. **Live event banner** — If a live event exists: amber banner with pulsing red dot, event name, attendee count, and "Control →" link. If no live event but upcoming: slate banner with event name. If neither: no banner, no empty space.

6. **Existing widgets intact** — Scroll down in the Panel tab to confirm: Adopción del Programa hero, 4 status cards, Salud de Programas, Funnel de Participación, Adopción widget, Actividad Reciente all still render correctly.
