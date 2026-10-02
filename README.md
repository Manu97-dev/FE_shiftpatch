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

Nurse home uses My shifts and Available shifts tabs, with My shifts selected
by default. The marketplace uses GET /api/shifts/available and validates the shared shift
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

## Nurse home tabs

shared/components/tabs.tsx wraps Radix Tabs with accessible keyboard navigation,
optional counts, and mounted but hidden inactive panels. Each panel scrolls
independently and retains its scroll position and disclosure state when switching.
The tab controls stay outside the scroll area so Available shifts remains visible
even with many assignments. NurseShiftTabs composes the domain-specific sections.
My shifts counts upcoming/current assignments; Available shifts counts server
results. Counts are omitted until data loads. Queries share existing keys and
TanStack Query deduplicates requests between count and section observers.

## Claiming a shift

Available cards open a reusable confirmation dialog showing agency, role, and
the full schedule including overnight end dates. Confirmation sends a bodyless
POST /api/shifts/:id/claim with the in-memory bearer token. No automatic retries
or optimistic assignment updates occur. Success invalidates and refetches the
current user's available-shifts and My shifts queries, including inactive ones,
so tab counts update too. Errors reconcile both lists and show specific messages
for credential expiry, missing access, expired sessions, missing shifts, and
competing claims. Network/server failures advise refreshing before retrying,
since a failed response does not prove that the server rejected the assignment.

The current backend validates JWT claims, nurse role, UUID, empty body, nurse
profile, credentials through the current Tegucigalpa date, and an unassigned
shift via an atomic update. It does not enforce future start time, overlaps,
professional role matching, or credentials valid through the end of the shift.

### Nurse shift cancellation

Upcoming assignment cards offer Cancel shift with the shared confirmation dialog. The frontend posts `{ "reason": "advance" }` to `POST /shifts/:id/cancel`, validates the reopened shift and cancellation metadata, and refreshes both user-specific My shifts and Available shifts queries (including inactive queries). Requests are not automatically retried; uncertain outcomes require refreshing before another attempt.

The backend requires authentication, a UUID shift ID, a valid reason, and assignment ownership for nurses. Nurses may only use `advance`; agencies must belong to the shift's agency and may use `advance` or `no-show`; admins are denied. Expired credentials do not prevent cancellation. Assignment release and cancellation history are recorded together under a row lock. Missing shifts return 404 and already-open shifts return 409 after authorization (a nurse whose assignment was already removed can therefore receive 403).

The backend currently has no timing cutoff. The nurse UI offers cancellation only before the shift starts; enforcing this rule across all API clients requires a backend rule. Current and completed assignments have no cancellation button.

### Role-specific home

`HomePage` maps authenticated roles to separate nurse, agency, and admin pages through a typed role registry. `HomeLayout` shares the header and sign-out handling. Agency accounts load their agency identity and shifts using `GET /agencies` to discover the single membership, followed by `GET /agencies/:agencyId/shifts`. The backend verifies membership for the requested agency. No selector is shown. Query keys are scoped to the user and agency. Upcoming/current and past shifts reuse the shared shift cards, with loading, empty, retry, authentication, and permission states. Missing or revoked membership shows an access error. Shift creation is the next phase.

Deploy with the matching backend and apply its `0003_single_agency_per_user.sql` migration first. Each agency can have multiple staff users, but each user has at most one agency membership.

### Agency shift creation

The agency dashboard exposes New shift after agency discovery and scoped-list access succeed. React Hook Form and Zod validate the four required fields: role (trimmed, 1–100 characters), valid calendar date, and HH:mm start/end times. Equal times are rejected; an earlier end time is explained as next-day completion. RN, LPN, and CNA are suggestions, not an enforced enum: the backend accepts arbitrary professional role strings. Posting agency is displayed and cannot be edited.

Before POST /shifts, the frontend rechecks the authenticated user's current single agency and blocks mismatches. Only the four supported fields are sent; the backend resolves ownership and permits agency owners/managers. Success validates an open, unassigned shift belonging to the expected agency and refreshes the agency's shift list plus cached marketplace queries. There are no automatic retries. Session/access errors block resubmission; uncertain network/server outcomes require closing and refreshing before another attempt. The backend currently does not enforce future dates, duplicate schedules, a professional-role catalog, pay, or location fields.

Agency shift creation opens in a Radix modal from the New shift header action beside Refresh. Form actions share a horizontal row. Escape, outside clicks, and Close form are disabled while submitting; success closes the modal and refreshes the shift list.

### Admin phase 1 dashboard

Admin home shows globally scoped upcoming open/assigned/total counts from GET /admin/shifts/summary and a read-only shift list from GET /shifts. Summary and list have independent queries, refresh/retry actions, loading states, stale-data warnings, and 401/403 handling. Summary totals remain global when list filters change. Dates/times and summary timestamps display in America/Tegucigalpa.

Agency, status, and inclusive start-date range dropdown filters apply immediately; date changes apply after a 300ms debounce. Assigned maps to status=filled. Invalid dates and reversed ranges preserve the last valid results and display validation errors; Clear filters resets the form and returns to all shifts. Query keys include user and applied filters; requests carry cancellation signals and validate responses with Zod. Agency choices come from the unfiltered shifts response (agencies without shifts are not included). No pagination or admin write actions are introduced.
