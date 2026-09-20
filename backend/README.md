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
│   ├── 20260908010000_match_audit_log.sql              # Match engine audit log
│   ├── 20260916010000_ai_matching_expansion.sql        # Interior designers + furniture providers
│   └── 20260918010000_backend_automation.sql           # Triggers: progress sync, notifications, updated_at
├── supabase/
│   └── config.toml               # Local dev config (supabase start)
└── supabase/
    └── functions/
        ├── explainable-match/    # Explainable Intelligent Matching Engine
        │   └── index.ts          # Edge Function: server-side scoring + explanations
        ├── ai-assistant/         # Helping AI chat proxy (server-held provider key)
        │   └── index.ts
        └── interior-design/      # AI Interior Design vision proxy (server-held key)
            └── index.ts
```

## Applying migrations

In Supabase Dashboard → **SQL Editor**, run each file **in filename order** (oldest first). All migrations are additive — they never drop or replace existing tables.

If you only want the core app (projects, engineers, AI match), the first two suffice. The later ones add the professional portals, social feed, and construction-trades directory. The final migration extends the AI matching directory to interior designers and furniture providers.

## AI — REAL Google Gemini (backend-only)

All AI runs through the official `@google/genai` SDK inside the Edge Functions.
The API key NEVER reaches the browser.

```
Frontend → Supabase Edge Function (GEMINI_API_KEY secret) → Google Gemini API
```

### Activate (2 commands)

```bash
supabase secrets set GEMINI_API_KEY=your_real_key      # https://aistudio.google.com/apikey
supabase functions deploy ai-assistant interior-design
```

`GEMINI_MODEL` secret is optional (default: `gemini-3.6-flash`).

### What each function does

| Function | Ops | Grounding |
|---|---|---|
| `ai-assistant` | `analyze` (structured JSON), `chat`, `health` | Loads the caller's REAL project + milestones + payments + documents + evidence + reviews + complaints, plus the real engineer/professional directory. Role-checked: homeowners → own projects; engineers → assigned/member projects; admin → platform queues. |
| `interior-design` | vision analysis | Real Gemini vision on the uploaded photo + the homeowner's inputs; returns the exact `InteriorDesignResult` contract. |

`analyze` response shape: `{ answer, recommendations[{name, reason, confidence}], risks[{title, severity, reason}], nextActions[], missingInformation[], confidence, model }`.

### Security

- Key only in Supabase secrets (`GEMINI_API_KEY`) — never in `VITE_*` vars, never in responses, never logged. Health op returns `configured: true/false` + model name only.
- `.env.example` files document the variables without real values; `.gitignore` excludes `.env*`.
- System instruction forbids inventing users, engineers, ratings, certifications or progress; missing information is reported as missing.

## Database automation (20260918010000_backend_automation.sql)

Server-side triggers keep derived data and notifications consistent without
any client involvement:

| Trigger | Table | What it does |
|---|---|---|
| `trg_milestones_sync_progress` | milestones | Recalculates `projects.progress` on every milestone change (completed = full, in-progress = half) |
| `trg_projects_lifecycle` | projects | Auto-completes the project at 100% progress (stamps `actual_completion`); clears it if reopened |
| `trg_notify_*` | milestones, payments, professional_requests, reviews, verification_requests, material_orders | Inserts `notifications` rows for homeowners, professionals and buyers on lifecycle transitions |
| `trg_*_updated_at` | material_orders, professional_requests | Maintains `updated_at` |

All notifications link to real application routes (role-aware for portals).
All triggers are `DROP TRIGGER IF EXISTS` + re-create, so the migration is safe to re-run.

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
