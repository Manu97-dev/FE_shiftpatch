# Shiftpatch frontend

Independent React + TypeScript + Vite frontend repository.

The frontend and backend live in sibling folders: `FE_shiftpatch/` and
`BE_shiftpatch/`.

## Development

Use Node.js 22.12+ and npm. Setup was verified with Node 22.16.0.

```sh
cd FE_shiftpatch
npm install
npm run dev
```

Open http://localhost:5173. Start the backend in a separate terminal from `../BE_shiftpatch`
with `npm run dev`. Vite proxies `/api` requests to http://localhost:3000.

The API base defaults to `/api`. Optionally copy `.env.example` to `.env.local`
and set `VITE_API_BASE_URL`. VITE variables are public: never put secrets in them.
A separate API origin requires backend CORS support.

## Stack

- React + TypeScript + Vite.
- React Router: login, protected empty home, and fallback routes.
- TanStack Query: server data, with Devtools in development only. Queries use a
  30-second stale time and disable automatic retries by default. Features can
  override these defaults. Mutations do not automatically retry.
- Context: focused shared UI state. A theme provider demonstrates light/dark
  appearance; selection resets on reload. Authentication uses a separate in-memory session provider; refresh restores the session through an HttpOnly backend cookie.
- Sass Modules: feature styles, with global CSS design tokens.
- Radix: accessible primitives; the starter uses Tooltip.
- React Hook Form + Zod + Zod resolver: installed for upcoming forms.
- Oxlint: linting from the official Vite template.

```text
src/
  app/                 # Routing and application providers
  pages/               # Route-level login and nurse-home screens
  features/
    auth/              # API, schemas, login form, and auth contexts
    nurses/            # Nurse API, schemas, and My shifts query hook
    shifts/            # Shift API, schemas, hooks, components, and utilities
  shared/              # HTTP transport, theme contexts, and global styles
```

The API helper returns unknown so features can validate responses with Zod. It
supports an optional bearer token and native RequestInit options, including an
AbortSignal for query cancellation. Encode JSON bodies with JSON.stringify.
Login posts to `/api/auth/login`, validates success responses, and handles invalid credentials, validation, network, and server errors. Successful logins reach an empty protected home screen. Marketplace flows are the next milestone.

## Checks and deployment

```sh
npm run typecheck
npm run lint
npm run build
npm run preview
```

Build output goes to `dist/`. The deployment host must serve `index.html` for
frontend routes and route `/api` to the backend, or use an API base configured at
build time with appropriate CORS support. The Vite proxy works in development only.

This folder has its own package.json and lockfile; backend scripts remain separate.

## Persistent sessions

Apply the backend auth_sessions migration and restart the backend before using this
frontend. Login sets a one-hour HttpOnly, SameSite=Strict session cookie. Startup
calls GET /api/auth/session before routing. Tokens stay in memory; credentials
are never saved to browser storage. POST /api/auth/logout revokes the stored session.
The empty home includes a sign-out control. Failed restoration offers retry.

For production, use HTTPS and a same-origin /api reverse proxy. The backend requires
NODE_ENV=production and FRONTEND_ORIGIN=https://your-frontend-origin. Cookies then
use Secure and the __Host- prefix. Development HTTP cookies are for localhost only.
Cross-origin deployments require explicit credentialed CORS and origin configuration;
this starter intentionally uses the same-origin Vite proxy instead.

## Nurse home: My shifts

Nurse accounts fetch GET /api/nurses/me/shifts with their in-memory bearer token.
The response is validated with Zod, including nurse-profile ownership. Query cache
keys include the login user ID and are cleared on logout or session rejection.
Upcoming/current assignments appear first; past assignments are in collapsible
history. Dates use America/Tegucigalpa regardless of the browser timezone, and
overnight shifts explicitly show the end date. The screen handles initial loading,
empty results, no upcoming assignments, expired authentication, missing nurse
access, malformed responses, and temporary failures with retry. Failed refreshes
retain previously loaded results with a warning. Admin and agency accounts keep
a placeholder home and do not call the nurse endpoint.

This phase only lists assignments. Available shifts, detail views, claiming, and
cancellation remain separate follow-up phases.

## Available shifts

Nurse home stacks My shifts above Available shifts, preserving a commitments-first
layout on desktop and mobile. The marketplace uses GET /api/shifts/available and validates the shared shift
contract. The backend filters upcoming unassigned shifts and orders by start time
and ID; the frontend displays the result without filtering or reordering it. Each section has its own query
and refresh/retry controls, so a marketplace failure does not hide assignments.
Cards, list layout, loading/error presentation, timezone formatting, and clock
updates are shared between sections. Shift details and claim/cancel actions are
reserved for subsequent phases. Open status alone does not establish credential
eligibility; the backend will enforce eligibility when claiming is implemented.

## API organization

Frontend API modules mirror backend entity boundaries:

- features/auth/api/auth.api.ts: login, session restoration, and logout.
- features/nurses/api/nurses.api.ts: the authenticated nurse's assigned shifts.
- features/shifts/api/shifts.api.ts: available shifts and future shift mutations.

Response contracts live in the corresponding *.schemas.ts files. The nurse
contract reuses the shared shift schema. Components own presentation and query
lifecycle; API modules own requests and response validation. Login error copy
lives separately in login.errors.ts. shared/api/client.ts handles HTTP transport.

## Organization rules

Pages compose feature UI. Domain API modules own HTTP calls and response validation;
query hooks own query keys and request lifecycle. Feature components render domain
UI. Shared code serves unrelated features. Domain UI such as ShiftCard stays in
the shifts feature even when multiple pages reuse it. Tests and Sass Modules stay
next to the code they cover; the shift presentation components share their section
stylesheet. No empty placeholder folders or barrel exports are required.
