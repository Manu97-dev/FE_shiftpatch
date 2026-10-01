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
  appearance; selection resets on reload. Authentication uses a separate in-memory session provider; refresh requires signing in again.
- Sass Modules: feature styles, with global CSS design tokens.
- Radix: accessible primitives; the starter uses Tooltip.
- React Hook Form + Zod + Zod resolver: installed for upcoming forms.
- Oxlint: linting from the official Vite template.

```text
src/
  app/                 # Providers and routing
  features/auth/       # Login form, contracts, API, and session context
  features/home/       # Empty protected home screen
  shared/
    api/               # Fetch helper and API errors
    contexts/          # Focused providers and hooks
    styles/            # Global styles and tokens
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
