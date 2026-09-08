# BuildMatch — Backend (Supabase)

The backend is **Supabase**: Postgres + Auth + Storage + Row Level Security. There is no custom API server — the frontend talks to Supabase directly with the anon key, protected by RLS policies.

## Directory

```
backend/
├── supabase-migrations/     # Run these in Supabase SQL Editor, in order
│   ├── 20260816012619_buildmatch_schema.sql            # Core schema
│   ├── 20260816012757_buildmatch_seed.sql              # Seed data
│   ├── 20260905014000_20260905_ecosystem_extension.sql # Portal extensions
│   ├── 20260905180000_professional_portal_constraints.sql
│   ├── 20260905200000_network_feed.sql                 # Social feed
│   ├── 20260905210000_social_posts.sql                 # Rich posts + media bucket
│   ├── 20260906010000_construction_team.sql            # Construction trades
│   └── 20260908010000_match_audit_log.sql              # Match engine audit log
├── supabase/
│   └── config.toml               # Local dev config (supabase start)
└── supabase/
    └── functions/
        └── explainable-match/    # Explainable Intelligent Matching Engine
            └── index.ts          # Edge Function: server-side scoring + explanations
```

## Applying migrations

In Supabase Dashboard → **SQL Editor**, run each file **in filename order** (oldest first). All migrations are additive — they never drop or replace existing tables.

If you only want the core app (projects, engineers, AI match), the first two suffice. The later ones add the professional portals, social feed, and construction-trades directory.

## Explainable Intelligent Matching Engine

The core AI matching runs as a **Supabase Edge Function** at `supabase/functions/explainable-match/index.ts`.

### What it does
- Fetches all engineers + professionals from the DB (service-role, no RLS restrictions)
- Scores each professional against the project requirements using transparent weighted factors
- Generates a human-readable explanation for every match
- Assembles a recommended full team (Engineer → Plumber → Electrician → Carpenter → Supplier)
- Logs every match invocation to `match_logs` for auditing

### Scoring factors (engineers)
| Factor | Weight | What it measures |
|---|---|---|
| Budget Fit | 25% | Does the engineer's pricing fit the homeowner's budget? |
| Location | 20% | Is the engineer in the same city/region? |
| Experience | 15% | Years of experience + completed projects |
| Specialization | 15% | Does the engineer specialize in the required house type/style? |
| Past Performance | 15% | On-time %, budget adherence %, quality score |
| Timeline Fit | 10% | Is the engineer available for the expected timeline? |

### Scoring factors (professionals)
| Factor | Weight | What it measures |
|---|---|---|
| Location / Service Area | 25% | Service area coverage |
| Experience | 20% | Years + completed projects |
| Specialization | 20% | Skills match project needs |
| Reputation | 15% | Verified ratings + reviews |
| Availability | 10% | Current availability status |
| Verification | 10% | Identity + credential verification |

Every factor also carries a **confidence level** (high/medium/low) based on how much real data is available — missing fields produce explicit "Not enough data" reasons instead of fabricated scores.

### Deploying

```bash
# Local dev
cd backend && supabase start
supabase functions serve explainable-match

# Production
cd backend && supabase functions deploy explainable-match
```

The frontend automatically calls the Edge Function when available and falls back to local computation when it isn't — so the app works before you deploy the function.

## What lives where

| Concern | Implementation |
|---|---|
| Database | Postgres tables, see schema migration for full ERD |
| Auth | Supabase Auth (email) + role stored in `app_users.role` |
| Authorization | Row Level Security policies per table (defined in each migration) |
| File storage | Supabase Storage bucket `post-media` (public, paths `posts/{user}/{post}/{n}`) |
| Demo seed data | `*_seed.sql` migrations — realistic Indian construction professionals |
| **AI Matching Engine** | **Edge Function `explainable-match` — server-side weighted scoring + explanations + audit logging** |

## Environment

The frontend needs these Vite vars (already in `frontend/.env` / `frontend/.env.local`):

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Only the public anon key is used client-side; RLS is the security boundary.
