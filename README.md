<p align="center">
  <img src="https://readme-typing-svg.demolab.com?font=Space+Grotesk&size=32&duration=3000&pause=1000&color=6D5EF9&center=true&vCenter=true&width=760&lines=BuildMatch+AI;Explainable+Construction+Matching;Homeowners+%2B+Verified+Professionals" alt="BuildMatch AI animated title" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/BuildMatch-AI%20Construction%20Platform-6D5EF9?style=for-the-badge" alt="BuildMatch AI">
  <img src="https://img.shields.io/badge/Matching-Explainable%20AI-00C2A8?style=for-the-badge" alt="Explainable AI">
  <img src="https://img.shields.io/badge/Status-Active%20Development-FFB020?style=for-the-badge" alt="Status">
</p>

<p align="center">
  AI-powered construction platform connecting homeowners with verified engineers, plumbers, electricians, material suppliers, and other construction professionals — with every match explained, not just scored.
</p>

<p align="center">
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-feature-map">Features</a> •
  <a href="#-explainable-matching-engine">Matching Engine</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-database">Database</a> •
  <a href="#-project-structure">Structure</a> •
  <a href="#-known-limitations">Limitations</a> •
  <a href="#-roadmap">Roadmap</a>
</p>

---

## 🏗️ Overview

**BuildMatch AI** replaces the usual "browse a directory and hope" approach to hiring construction professionals with a transparent, explainable matching layer.

Homeowners describe a project once. The platform scores every engineer, plumber, electrician, carpenter, and material supplier against that project — and shows **why** each one was recommended, not just a star rating.

```mermaid
flowchart LR
    A[Homeowner posts project] --> B[Explainable Matching Engine]
    B --> C[Scored + Ranked Professionals]
    C --> D[Recommended Full Team]
    D --> E[Engineer]
    D --> F[Plumber]
    D --> G[Electrician]
    D --> H[Carpenter]
    D --> I[Material Supplier]
    C --> J[Human-Readable Explanation]
```

---

## 👥 Who Uses It

| Role | What they get |
|---|---|
| 🏠 **Homeowner** | Dashboard, AI Match, Find/Compare Engineers, Construction Team directory, Digital Passport, Project Team Center, Document Vault, Payments, Reviews |
| 👷 **Engineer** | LinkedIn-style network feed, active projects, project evidence & AI verification, client management |
| 🔧 **Plumber / Electrician** | Professional portal — requests, projects, clients, earnings, verification, subscription |
| 🏬 **Material Shop** | Everything above, plus inventory and orders management |
| 🛡️ **Admin** | Verification approvals, complaints, platform oversight |

---

## ⚡ Feature Map

<table>
<tr>
<td width="50%" valign="top">

### 🏠 Homeowner Portal
- Dashboard with project overview
- **AI Match** — explainable recommendations
- Find & Compare Engineers side-by-side
- **Construction Team** — 9-trade directory with AI matching
- Project Team Center + evidence transparency reports
- Digital Passport, Document Vault, Payments, Reviews

</td>
<td width="50%" valign="top">

### 👷 Engineer / Professional Portals
- Social feed — posts, media, hashtags, mentions, reposts, saves
- Active projects & client management
- Project evidence & AI verification
- Earnings, verification, subscription management
- Shop-specific: inventory + order management

</td>
</tr>
</table>

<details>
<summary><strong>🛡️ Admin & Platform</strong></summary>

- Verification approvals for professionals
- Complaint handling
- Platform-wide oversight dashboard

</details>

<details>
<summary><strong>🔐 Auth</strong></summary>

- Supabase email authentication
- Role-based demo logins (homeowner, engineer, plumber, electrician, material shop, admin)
- Protected routes per role via `<ProtectedRoute roles={[...]}>`

</details>

---

## 🧠 Explainable Matching Engine

The core differentiator: matching runs as a **Supabase Edge Function** (`explainable-match`) that scores every professional with transparent, weighted factors — and generates a plain-language reason for each score instead of a black-box number.

```mermaid
flowchart TD
    A[Project Requirements] --> B[Edge Function: explainable-match]
    B --> C[Fetch Engineers + Professionals<br/>service-role, no RLS]
    C --> D[Weighted Scoring]
    D --> E[Human-Readable Explanation]
    E --> F[Recommended Team:<br/>Engineer to Plumber to Electrician to Carpenter to Supplier]
    D --> G[(match_logs<br/>audit trail)]
```

<details>
<summary><strong>📊 Scoring factors — Engineers</strong></summary>

| Factor | Weight | Measures |
|---|:---:|---|
| Budget Fit | 25% | Does pricing fit the homeowner's budget? |
| Location | 20% | Same city/region as the project |
| Experience | 15% | Years of experience + completed projects |
| Specialization | 15% | Match to required house type/style |
| Past Performance | 15% | On-time %, budget adherence %, quality score |
| Timeline Fit | 10% | Availability for the expected timeline |

</details>

<details>
<summary><strong>📊 Scoring factors — Other Professionals</strong></summary>

| Factor | Weight | Measures |
|---|:---:|---|
| Location / Service Area | 25% | Service area coverage |
| Experience | 20% | Years + completed projects |
| Specialization | 20% | Skills match to project needs |
| Reputation | 15% | Verified ratings + reviews |
| Availability | 10% | Current availability status |
| Verification | 10% | Identity + credential verification |

</details>

> Every factor also carries a **confidence level** (high / medium / low) based on how much real data is available — missing fields produce explicit *"Not enough data"* reasons instead of fabricated scores.

**Graceful fallback:** the frontend calls the Edge Function when it's deployed, and automatically falls back to local computation when it isn't — so the app works before you deploy the function.

```bash
# Local dev
cd backend && supabase start
supabase functions serve explainable-match

# Production
cd backend && supabase functions deploy explainable-match
```

---

## 🏛️ Architecture

```mermaid
flowchart TB
    U[Homeowner / Professional / Admin] --> FE[React + TypeScript + Vite Frontend]
    FE -->|anon key, RLS-protected| SB[(Supabase: Postgres + Auth + Storage)]
    FE -->|invoke| EF[Edge Function: explainable-match]
    EF -->|service-role| SB
    SB --> LOG[(match_logs audit trail)]
```

There is **no custom API server** — the frontend talks to Supabase directly with the public anon key, and Row Level Security enforces what each role can see and change. The Edge Function is the one piece that runs with elevated (service-role) access, purely for unrestricted scoring.

---

## 🗄️ Database

Schema lives entirely in `backend/supabase-migrations/`, applied **in filename order** — every migration is additive and never drops or replaces existing tables.

```mermaid
flowchart LR
    S1[buildmatch_schema] --> S2[buildmatch_seed]
    S2 --> S3[ecosystem_extension: portal extensions]
    S3 --> S4[professional_portal_constraints]
    S4 --> S5[network_feed]
    S5 --> S6[social_posts + media bucket]
    S6 --> S7[construction_team: trades directory]
    S7 --> S8[match_audit_log]
```

| Migration | Adds |
|---|---|
| `buildmatch_schema` | Core schema (projects, engineers, professionals) |
| `buildmatch_seed` | Seed data |
| `ecosystem_extension` | Professional portal extensions |
| `professional_portal_constraints` | Portal-level constraints |
| `network_feed` | Social feed backbone |
| `social_posts` | Rich posts + media storage bucket |
| `construction_team` | 9-trade construction directory |
| `match_audit_log` | Audit log for every match invocation |

> Only need the core app (projects, engineers, AI match)? The first two migrations are enough — the rest layer on professional portals, the social feed, and the trades directory.

Apply them in **Supabase Dashboard → SQL Editor**, oldest file first. See `backend/README.md` for details.

---

## 🛠️ Technology Stack

**Frontend**
![React](https://img.shields.io/badge/React_18-20232A?style=flat-square&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)
![Tailwind](https://img.shields.io/badge/TailwindCSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![React Router](https://img.shields.io/badge/React_Router_7-CA4245?style=flat-square&logo=reactrouter&logoColor=white)
![Recharts](https://img.shields.io/badge/Recharts-8884d8?style=flat-square)

**Backend**
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![Edge Functions](https://img.shields.io/badge/Deno_Edge_Functions-000000?style=flat-square&logo=deno&logoColor=white)

**Deployment**
![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat-square&logo=vercel&logoColor=white)

---

## 📦 Project Structure

```text
buildmatch/
├── frontend/                  # React SPA (Vite) — all UI, routing, Supabase client
│   ├── src/
│   │   ├── components/
│   │   │   ├── team/          # ConstructionTeam, TeamCenter
│   │   │   ├── professional/  # PortalLayout, NotificationsBell
│   │   │   ├── feed/          # FeedPostCard, PostComposer, PostMedia
│   │   │   └── AppLayout.tsx
│   │   ├── lib/                # supabase.ts, portal.ts, compare.tsx
│   │   └── pages/
│   │       ├── portal/         # Engineer/Plumber/Electrician/Shop portal pages
│   │       ├── Dashboard.tsx, AIMatch.tsx, FindEngineers.tsx
│   │       ├── ProjectDetail.tsx, MyProjects.tsx
│   │       ├── DigitalPassport.tsx, DocumentVault.tsx
│   │       └── AdminDashboard.tsx
│   ├── public/                 # Demo profile photos, icons
│   ├── .env                    # VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
│   └── package.json
│
├── backend/                    # Supabase — schema, RLS, Edge Functions
│   ├── supabase-migrations/    # SQL migrations, run in filename order
│   └── supabase/
│       ├── config.toml
│       └── functions/
│           └── explainable-match/index.ts
│
└── README.md
```

---

## ⚙️ Quick Start

```bash
# 1. Frontend
cd frontend
npm install
npm run dev            # → http://localhost:5173

# 2. Backend (first time only)
#    Run every SQL file in backend/supabase-migrations/ in filename order
#    in the Supabase SQL Editor — see backend/README.md
```

Environment variables live in `frontend/.env`:

```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

> The anon key is public by design in Supabase apps — but in the current build, **RLS policies are set to `USING (true)` for every table** (documented intentionally in the schema migration as a demo-only choice), and auth is a client-side demo login with no real `supabase.auth` session. See [Known Limitations](#-known-limitations) before treating this as production-ready. Never commit a **service-role** key to the frontend regardless.

### Scripts (run inside `frontend/`)

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Type-check + production build to `dist/` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run preview` | Preview the production build |

---

## 🧭 Routes at a Glance

```mermaid
flowchart LR
    Land[Landing] --> Login[Login]
    Land --> Signup[Signup]
    Login --> App[Protected app]
    App --> Dash[Dashboard]
    App --> Match[AI Match]
    App --> Find[Find Engineers]
    App --> Compare[Compare]
    App --> Team[Construction Team]
    App --> Proj[Project Detail]
    App2[Engineer portal] --> Feed[Feed + Projects]
    App3[Plumber portal] --> Feed
    App4[Electrician portal] --> Feed
    App5[Material Shop portal] --> Inv[Inventory + Orders]
    Admin[Admin] --> Verify[Verification + Complaints]
```

Each professional portal (`/app/engineer/*`, `/app/plumber/*`, `/app/electrician/*`, `/app/material-shop/*`) is role-gated by `<ProtectedRoute roles={[...]}>` and shares `requests`, `projects`, `clients`, `earnings`, `verification`, `subscription`, and `messages` — with `inventory` and `orders` added only for material shops.

---

## ⚠️ Known Limitations

This is a functioning prototype, not a production-hardened app yet. Two things to fix before any public deployment:

```mermaid
flowchart LR
    A[Client picks a role<br/>at signup] --> B[In-memory user object<br/>no supabase.auth session]
    B --> C[ProtectedRoute checks<br/>that client-side role only]
    C -.no server enforcement.-> D[(Database)]
    D --> E["RLS: USING (true)<br/>on every table"]
    style E fill:#ff4d5e,stroke:#ff4d5e,color:#fff
```

<details>
<summary><strong>🔓 Auth is demo-only, not a real session</strong></summary>

`AuthPage.tsx` never calls `supabase.auth` — sign up/sign in just create a local `AppUser` object with a client-chosen role, and `supabase.ts` sets `persistSession: false`. `ProtectedRoute` only checks that in-memory object, so role gating happens entirely in the browser.

**Fix:** wire real `supabase.auth.signUp` / `signInWithPassword`, store role server-side (e.g. in `app_users` keyed to `auth.uid()`), and drive `ProtectedRoute` off the real session.

</details>

<details>
<summary><strong>🔓 RLS policies are fully open</strong></summary>

Every table's policies are `TO anon, authenticated USING (true) WITH CHECK (true)` — intentional and documented in `buildmatch_schema.sql` for demo purposes, but it means anyone with the public anon key can read/write/delete any row via the Supabase REST API directly, regardless of what the UI shows.

**Fix:** rewrite policies to check `auth.uid()` against ownership — e.g. a homeowner only sees their own `projects`, an engineer only sees projects assigned to them.

</details>

<details>
<summary><strong>🟡 Dependency audit</strong></summary>

`npm audit` currently reports high-severity issues concentrated in the build toolchain (`vite`, `postcss`, `rollup`, and their transitive deps) — not the shipped React runtime. Run `npm audit fix` periodically; a `--force` major bump on `vite`/`rollup` should get a smoke test afterward.

</details>

---

## 🗺️ Roadmap

<details>
<summary><strong>Shipped</strong> ✅</summary>

- [x] Core schema + seed data
- [x] Homeowner dashboard, AI Match, Find/Compare Engineers
- [x] Professional portals (engineer, plumber, electrician, material shop)
- [x] Social feed with rich posts, media, hashtags, mentions
- [x] Construction Team directory (9 trades)
- [x] Explainable Matching Engine as a Supabase Edge Function
- [x] Match audit log

</details>

<details>
<summary><strong>Next</strong></summary>

- [ ] Deeper verification workflows for professionals
- [ ] Expanded evidence/transparency reporting per project
- [ ] Notification delivery beyond in-app bell
- [ ] Formal test coverage around the matching engine

</details>

---

## 🤝 Contributing

```bash
git clone <your-repo-url>
cd buildmatch/frontend
npm install
git checkout -b feature/your-feature
npm run typecheck && npm run lint
git add .
git commit -m "Add your feature"
git push origin feature/your-feature
```

## 📄 License

Add the project's selected open-source license here before public distribution.

---

<p align="center">
  <img src="https://readme-typing-svg.demolab.com?font=Space+Grotesk&size=20&duration=2600&pause=900&color=00C2A8&center=true&vCenter=true&width=620&lines=Every+match%2C+explained;Not+just+scored" alt="closing animation" />
</p>

<p align="center"><strong>BuildMatch AI — matching people to projects, with the reasoning shown.</strong></p>
