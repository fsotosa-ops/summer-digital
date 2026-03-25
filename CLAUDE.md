# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server (port 3000)
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

No test framework is configured. Deployment is via GitHub Actions on push to `main` → Google Cloud Run (staging).

## Architecture

**Single Next.js 16 app** (App Router, TypeScript, no separate backend). The UI is backend-agnostic — services contain mock data stubs ready for real API integration.

### Data Flow

```
API/Supabase → Service (src/services/) → Zustand Store (src/store/) → Components
```

- **Services** (`src/services/`) — singleton classes; all API calls go through `apiClient` (`src/lib/api-client.ts`). The client handles token refresh (with dedup), retries on 502/503/504, and 15s timeout.
- **Stores** (`src/store/`) — Zustand with localStorage persistence. Three stores: `useAuthStore`, `useJourneyStore`, `useContentStore`.
- **Mappers** (`src/lib/mappers/`) — transform API DTOs → domain models. Keeps API shape separate from UI types.
- **Types** — API DTOs in `src/types/api.types.ts`, domain models in `src/types/index.ts`.

### Routing

Routes live under `src/app/(app)/` (authenticated) and `src/app/` root (auth pages). Key routes:
- `/dashboard` — main dashboard with gamification widget
- `/journey`, `/journey/[id]` — learning journeys
- `/resources`, `/resources/[id]` — resource library
- `/crm` — CRM hub (admin)
- `/admin/*` — admin section (journeys, users, organizations, gamification)
- `/analytics` — embedded Apache Superset dashboard
- `/profile` — user profile
- `/login`, `/onboarding`, `/reset-password`, `/auth/callback`

### UI Components

- Shadcn/ui (new-york style, neutral base) in `src/components/ui/`
- Feature components in `src/features/` organized by domain: `crm/`, `journey/`, `dashboard/`, `resources/`
- Layout: `MainLayout` wraps authenticated pages; `OnboardingGate` redirects incomplete profiles
- Path alias: `@/*` → `src/*`

## Environment Variables

```
NEXT_PUBLIC_API_URL               # Backend API base URL
NEXT_PUBLIC_SUPABASE_URL          # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY     # Supabase anonymous key
NEXT_PUBLIC_SUPERSET_URL          # Apache Superset URL
NEXT_PUBLIC_SUPERSET_DASHBOARD_ID # Embedded dashboard ID
SUPERSET_ADMIN_USERNAME           # Server-side only (Superset token generation)
SUPERSET_ADMIN_PASSWORD           # Server-side only
```

Copy to `.env.local` for local development. Production secrets live in GCP Secret Manager.

## Key Conventions

- **Feature modules** in `src/features/` follow domain-driven naming (e.g., `crm/components/ContactCard.tsx`).
- **New API endpoints** → add types in `src/types/api.types.ts`, add method to relevant service singleton, optionally add mapper if shape differs from domain model.
- **Zustand stores** use the SSR hydration pattern — check existing stores before adding new ones.
- The analytics route (`/api/analytics/token`) is the only Next.js Route Handler; it fetches a Superset guest token server-side.
- Docker output is `standalone` — don't reference files outside `src/` or `public/` from within components.
