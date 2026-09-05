/*
# BuildMatch AI — Core Schema

## Overview
Creates the full data model for the BuildMatch AI platform: a verified engineer matching
and smart construction management prototype. The app uses Supabase as its backend.

## Tables
1. `app_users` — application users (homeowner / engineer / admin) with role
2. `engineers` — engineer professional profiles (verification, trust score, metrics)
3. `projects` — construction projects owned by a homeowner, assigned to an engineer
4. `milestones` — ordered construction milestones per project (with status + verification)
5. `payments` — milestone-linked payment tracking records (no real money transfer)
6. `documents` — document vault entries per project (category, url, date)
7. `messages` — homeowner-engineer conversation messages
8. `reviews` — verified reviews tied to completed projects
9. `complaints` — complaint lifecycle (open → under review → resolved)
10. `risk_assessments` — AI risk prediction snapshots per project
11. `milestone_evidence` — AI-assisted milestone verification uploads

## Security
- RLS enabled on every table.
- Policies are `TO anon, authenticated` with `USING (true)` / `WITH CHECK (true)`
  because this is a prototype with preloaded demo data and no real sign-in gate —
  the data is intentionally shared/public for the demo.
*/

-- =========================================================
-- USERS
-- =========================================================
CREATE TABLE IF NOT EXISTS app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'homeowner' CHECK (role IN ('homeowner','engineer','admin')),
  avatar_url text,
  phone text,
  location text,
  created_at timestamptz DEFAULT now()
);

-- =========================================================
-- ENGINEERS
-- =========================================================
CREATE TABLE IF NOT EXISTS engineers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES app_users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  photo_url text,
  location text NOT NULL,
  experience_years int NOT NULL DEFAULT 0,
  projects_completed int NOT NULL DEFAULT 0,
  rating numeric(3,2) NOT NULL DEFAULT 0,
  reviews_count int NOT NULL DEFAULT 0,
  specializations text[] NOT NULL DEFAULT '{}',
  price_per_sqft int NOT NULL DEFAULT 0,
  price_min int,
  price_max int,
  qualification text,
  verification_status text NOT NULL DEFAULT 'verified' CHECK (verification_status IN ('verified','pending','rejected')),
  identity_verified boolean DEFAULT true,
  credential_verified boolean DEFAULT true,
  trust_score int NOT NULL DEFAULT 0,
  trust_level text NOT NULL DEFAULT 'Excellent',
  on_time_pct int NOT NULL DEFAULT 0,
  budget_adherence_pct int NOT NULL DEFAULT 0,
  quality_score int NOT NULL DEFAULT 0,
  complaints_count int NOT NULL DEFAULT 0,
  availability text NOT NULL DEFAULT 'Available',
  bio text,
  portfolio jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);

-- =========================================================
-- PROJECTS
-- =========================================================
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  homeowner_id uuid REFERENCES app_users(id) ON DELETE CASCADE,
  engineer_id uuid REFERENCES engineers(id) ON DELETE SET NULL,
  title text NOT NULL,
  house_type text NOT NULL,
  location text NOT NULL,
  area_sqft int NOT NULL,
  budget int NOT NULL,
  construction_style text NOT NULL,
  start_date date NOT NULL,
  expected_completion date,
  actual_completion date,
  progress int NOT NULL DEFAULT 0,
  current_milestone text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('planning','active','completed','on_hold')),
  created_at timestamptz DEFAULT now()
);

-- =========================================================
-- MILESTONES
-- =========================================================
CREATE TABLE IF NOT EXISTS milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  order_index int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'upcoming' CHECK (status IN ('completed','in_progress','upcoming','delayed')),
  planned_date date,
  actual_date date,
  verified boolean DEFAULT false,
  verification_status text DEFAULT 'pending' CHECK (verification_status IN ('pending','verified','review_required','approved')),
  payment_linked boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- =========================================================
-- PAYMENTS
-- =========================================================
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  milestone_id uuid REFERENCES milestones(id) ON DELETE SET NULL,
  milestone_name text NOT NULL,
  amount int NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('paid','pending','overdue')),
  paid_date date,
  due_date date,
  created_at timestamptz DEFAULT now()
);

-- =========================================================
-- DOCUMENTS
-- =========================================================
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL,
  file_url text,
  uploaded_date date NOT NULL DEFAULT CURRENT_DATE,
  size_kb int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- =========================================================
-- MESSAGES
-- =========================================================
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES app_users(id) ON DELETE CASCADE,
  receiver_id uuid REFERENCES app_users(id) ON DELETE CASCADE,
  sender_role text NOT NULL,
  content text NOT NULL,
  attachment_name text,
  created_at timestamptz DEFAULT now()
);

-- =========================================================
-- REVIEWS (verified project reviews)
-- =========================================================
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  engineer_id uuid REFERENCES engineers(id) ON DELETE CASCADE,
  homeowner_name text NOT NULL,
  rating int NOT NULL CHECK (rating >= 1 AND rating <= 5),
  quality_rating int NOT NULL,
  timeline_rating int NOT NULL,
  communication_rating int NOT NULL,
  budget_rating int NOT NULL,
  feedback text NOT NULL,
  verified boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- =========================================================
-- COMPLAINTS
-- =========================================================
CREATE TABLE IF NOT EXISTS complaints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  engineer_id uuid REFERENCES engineers(id) ON DELETE CASCADE,
  homeowner_name text NOT NULL,
  category text NOT NULL,
  subject text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','under_review','resolved')),
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

-- =========================================================
-- RISK ASSESSMENTS
-- =========================================================
CREATE TABLE IF NOT EXISTS risk_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  overall_risk text NOT NULL CHECK (overall_risk IN ('low','medium','high')),
  delay_risk text NOT NULL,
  budget_risk text NOT NULL,
  quality_risk text NOT NULL,
  engineer_risk text NOT NULL,
  delay_reason text,
  budget_reason text,
  quality_reason text,
  engineer_reason text,
  recommended_action text,
  created_at timestamptz DEFAULT now()
);

-- =========================================================
-- MILESTONE EVIDENCE (AI-assisted verification)
-- =========================================================
CREATE TABLE IF NOT EXISTS milestone_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id uuid REFERENCES milestones(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  image_url text,
  detected_stage text,
  confidence int,
  expected_milestone text,
  evidence_tags text[] DEFAULT '{}',
  result text CHECK (result IN ('verified','review_required')),
  human_status text DEFAULT 'pending' CHECK (human_status IN ('pending','approved','review')),
  created_at timestamptz DEFAULT now()
);

-- =========================================================
-- RLS — enable on all tables
-- =========================================================
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE engineers ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestone_evidence ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- POLICIES (prototype: public/shared demo data, anon + authenticated)
-- =========================================================
-- Helper: apply 4 CRUD policies to a table
-- We write them out explicitly per table.

-- app_users
DROP POLICY IF EXISTS "au_select" ON app_users; CREATE POLICY "au_select" ON app_users FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "au_insert" ON app_users; CREATE POLICY "au_insert" ON app_users FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "au_update" ON app_users; CREATE POLICY "au_update" ON app_users FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "au_delete" ON app_users; CREATE POLICY "au_delete" ON app_users FOR DELETE TO anon, authenticated USING (true);

-- engineers
DROP POLICY IF EXISTS "en_select" ON engineers; CREATE POLICY "en_select" ON engineers FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "en_insert" ON engineers; CREATE POLICY "en_insert" ON engineers FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "en_update" ON engineers; CREATE POLICY "en_update" ON engineers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "en_delete" ON engineers; CREATE POLICY "en_delete" ON engineers FOR DELETE TO anon, authenticated USING (true);

-- projects
DROP POLICY IF EXISTS "pr_select" ON projects; CREATE POLICY "pr_select" ON projects FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "pr_insert" ON projects; CREATE POLICY "pr_insert" ON projects FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "pr_update" ON projects; CREATE POLICY "pr_update" ON projects FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "pr_delete" ON projects; CREATE POLICY "pr_delete" ON projects FOR DELETE TO anon, authenticated USING (true);

-- milestones
DROP POLICY IF EXISTS "mi_select" ON milestones; CREATE POLICY "mi_select" ON milestones FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "mi_insert" ON milestones; CREATE POLICY "mi_insert" ON milestones FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "mi_update" ON milestones; CREATE POLICY "mi_update" ON milestones FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "mi_delete" ON milestones; CREATE POLICY "mi_delete" ON milestones FOR DELETE TO anon, authenticated USING (true);

-- payments
DROP POLICY IF EXISTS "pa_select" ON payments; CREATE POLICY "pa_select" ON payments FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "pa_insert" ON payments; CREATE POLICY "pa_insert" ON payments FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "pa_update" ON payments; CREATE POLICY "pa_update" ON payments FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "pa_delete" ON payments; CREATE POLICY "pa_delete" ON payments FOR DELETE TO anon, authenticated USING (true);

-- documents
DROP POLICY IF EXISTS "do_select" ON documents; CREATE POLICY "do_select" ON documents FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "do_insert" ON documents; CREATE POLICY "do_insert" ON documents FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "do_update" ON documents; CREATE POLICY "do_update" ON documents FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "do_delete" ON documents; CREATE POLICY "do_delete" ON documents FOR DELETE TO anon, authenticated USING (true);

-- messages
DROP POLICY IF EXISTS "ms_select" ON messages; CREATE POLICY "ms_select" ON messages FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "ms_insert" ON messages; CREATE POLICY "ms_insert" ON messages FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "ms_update" ON messages; CREATE POLICY "ms_update" ON messages FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "ms_delete" ON messages; CREATE POLICY "ms_delete" ON messages FOR DELETE TO anon, authenticated USING (true);

-- reviews
DROP POLICY IF EXISTS "rv_select" ON reviews; CREATE POLICY "rv_select" ON reviews FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "rv_insert" ON reviews; CREATE POLICY "rv_insert" ON reviews FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "rv_update" ON reviews; CREATE POLICY "rv_update" ON reviews FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "rv_delete" ON reviews; CREATE POLICY "rv_delete" ON reviews FOR DELETE TO anon, authenticated USING (true);

-- complaints
DROP POLICY IF EXISTS "co_select" ON complaints; CREATE POLICY "co_select" ON complaints FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "co_insert" ON complaints; CREATE POLICY "co_insert" ON complaints FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "co_update" ON complaints; CREATE POLICY "co_update" ON complaints FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "co_delete" ON complaints; CREATE POLICY "co_delete" ON complaints FOR DELETE TO anon, authenticated USING (true);

-- risk_assessments
DROP POLICY IF EXISTS "ra_select" ON risk_assessments; CREATE POLICY "ra_select" ON risk_assessments FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "ra_insert" ON risk_assessments; CREATE POLICY "ra_insert" ON risk_assessments FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "ra_update" ON risk_assessments; CREATE POLICY "ra_update" ON risk_assessments FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "ra_delete" ON risk_assessments; CREATE POLICY "ra_delete" ON risk_assessments FOR DELETE TO anon, authenticated USING (true);

-- milestone_evidence
DROP POLICY IF EXISTS "me_select" ON milestone_evidence; CREATE POLICY "me_select" ON milestone_evidence FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "me_insert" ON milestone_evidence; CREATE POLICY "me_insert" ON milestone_evidence FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "me_update" ON milestone_evidence; CREATE POLICY "me_update" ON milestone_evidence FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "me_delete" ON milestone_evidence; CREATE POLICY "me_delete" ON milestone_evidence FOR DELETE TO anon, authenticated USING (true);
