# BuildMatch AI

AI-powered construction platform connecting homeowners with verified engineers, plumbers, electricians, material suppliers and other construction professionals.

**Stack:** React 18 + TypeScript + Vite + Tailwind CSS · Supabase (Postgres + Auth + Storage + RLS) · deployed on Vercel.

## Project structure

```
buildmatch/
├── frontend/     # React SPA (Vite) — all UI, routing, Supabase client
│   ├── src/
│   ├── public/   # Demo profile photos, icons
│   ├── .env      # VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (public anon key)
│   └── package.json
├── backend/      # Supabase — SQL migrations (schema, seeds, RLS, storage)
│   └── supabase-migrations/
└── README.md
```

## Quick start

```bash
# 1. Frontend
cd frontend
npm install
npm run dev            # → http://localhost:5173

# 2. Backend (first time only)
#    Run every SQL file in backend/supabase-migrations/ in filename order
#    in the Supabase SQL Editor. See backend/README.md.
```

Environment variables live in `frontend/.env` (Supabase URL + public anon key — safe for the browser, RLS protects the data).

## Scripts (run inside `frontend/`)

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Type-check + production build to `dist/` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |

## Feature map

- **Homeowner portal** — dashboard, Digital Passport, Construction Team directory (9 trades) with AI matching, project Team Center, evidence transparency reports
- **Engineer portal** — LinkedIn-style professional network (feed, posts with media/hashtags/mentions/reposts/saves), active projects, Project Evidence & AI verification
- **Professional portals** — plumber, electrician, material shop (inventory, orders, earnings, verification, subscriptions)
- **Admin** — verification approvals, complaints, platform oversight
- **Auth** — Supabase email auth + role-based demo logins

See `backend/README.md` for the database layer.
