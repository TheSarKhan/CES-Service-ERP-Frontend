# CES Service — Frontend

Next.js 14 (App Router) + TypeScript frontend for the **CES Service Management
System**. UI language: Azerbaijani.

## Stack (SRS §2.2)

- **Next.js 14** (App Router), **React 18**, **TypeScript 5**
- **Tailwind CSS 3** + the **CES ERP UI Kit** design system (`styles/ui-kit.css`);
  UI primitives in `components/ui/` are thin typed React wrappers over the kit's
  CSS classes (`btn`, `input`/`field`, `card-*`/`kpi-*`, `table-wrap`/`tbl`/
  `pagination`, `pill`, `av`, `skel`, `alert`, `empty`, `sd-*` sidebar). Fonts:
  Plus Jakarta Sans + JetBrains Mono via `next/font`.
- **TanStack Query 5** — server state / caching
- **Zustand 4** — client state (auth + active branch), persisted to localStorage
- **React Hook Form + Zod** — forms & validation
- **Recharts** — dashboard charts
- **Axios** — HTTP client with auth + branch interceptors

## Getting started

```bash
cp .env.local.example .env.local   # set NEXT_PUBLIC_API_URL
npm install
npm run dev                        # http://localhost:3000
```

### Scripts

| Script          | Description               |
| --------------- | ------------------------- |
| `npm run dev`   | Start dev server          |
| `npm run build` | Production build          |
| `npm run start` | Run the production build  |
| `npm run lint`  | ESLint (next/core-web-vitals) |

## Environment

| Variable              | Description                                            |
| --------------------- | ------------------------------------------------------ |
| `NEXT_PUBLIC_API_URL` | Backend base URL (without `/api/v1`), e.g. `http://localhost:8080` |
| `NEXTAUTH_URL`        | App URL (reserved for BFF auth layer)                  |
| `NEXTAUTH_SECRET`     | Session secret (reserved)                              |

## Architecture notes

- **Auth (SRS §4):** independent JWT. The login response (`access_token`,
  `refresh_token`, `user{...}`) is stored in the Zustand auth store. The access
  token + active branch are mirrored into cookies (`ces_access_token`,
  `ces_branch_id`) so the edge **`middleware.ts`** can gate `(dashboard)` routes.
- **Multi-branch (SRS §5):** every request carries `Authorization: Bearer` and
  `X-Branch-Id` headers, injected by the Axios request interceptor from the auth
  store. The branch switcher calls `/auth/switch-branch` to mint a new token.
- **Response envelope (SRS §6.2):** the api client unwraps `{ success, data,
  meta }`; list helpers return `{ items, meta }`. On `401` it attempts a single
  silent refresh, then logs out.
- **RBAC (SRS §M16):** `useAuthStore.hasPermission(code)` gates sidebar entries
  and UI affordances.

## Project structure (SRS §7.3)

```
app/
  (auth)/login/page.tsx        Login (RHF + Zod)
  (dashboard)/
    layout.tsx                 Sidebar + Header + branch switcher (client guard)
    page.tsx                   Dashboard (KPIs, Recharts, activity)
    vehicles/page.tsx          M03 data-table example (TanStack Query)
    ...                        Module route stubs
  layout.tsx                   Root layout (lang="az", Providers)
  providers.tsx                TanStack Query provider
components/
  ui/                          UI Kit primitives (thin wrappers over ui-kit.css)
  layout/                      Sidebar (sd-*), Header, BranchSwitcher, LogoTile, ModulePlaceholder
styles/
  ui-kit.css                   CES ERP UI Kit (imported in app/layout.tsx)
  ui-kit-dark.css              Dark theme (available for future theming)
hooks/                         use-auth, use-vehicles
lib/
  api/                         client (axios + interceptors), auth, vehicles
  constants/modules.ts         Sidebar nav config (19 modules)
  utils.ts                     cn()
  utils/format.ts              money/number/date helpers
store/                         Zustand auth store (persisted + cookie sync)
types/                         auth, api, vehicle
middleware.ts                  Route protection
```

## Docker

Multi-stage build producing a standalone server (`output: 'standalone'`):

```bash
docker build -t ces-service-frontend .
docker run -p 3000:3000 -e NEXT_PUBLIC_API_URL=http://backend:8080 ces-service-frontend
```
