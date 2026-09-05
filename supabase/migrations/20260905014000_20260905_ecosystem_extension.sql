/*
# BuildMatch AI Ecosystem Extension — 6 Roles, Materials, Subscriptions, Verification

## Summary
Extends the existing BuildMatch schema to support a full construction ecosystem with 6 roles:
Homeowner, Engineer, Plumber, Electrician, Material Shop, Admin.

## New Tables
1. `professional_profiles` — Extended profiles for plumbers, electricians, material shops (engineers use existing `engineers` table)
2. `project_members` — Links professionals (engineer/plumber/electrician/material_shop) to projects
3. `professional_requests` — Hire/service requests from homeowners to professionals
4. `verification_requests` — Credential/certificate verification submissions
5. `certificates` — Professional certificates stored per verification request
6. `materials` — Material shop inventory listings
7. `material_orders` — Orders from homeowners/engineers to material shops
8. `subscription_plans` — Free/Pro/Business plan definitions
9. `subscriptions` — Active subscriptions for professionals
10. `notifications` — User notifications

## Modified Tables
- `app_users` — role CHECK constraint extended to include 'plumber', 'electrician', 'material_shop'

## Security
- RLS enabled on all new tables with anon+authenticated CRUD (matching existing prototype pattern)
- Policies follow the same open pattern as existing tables (prototype with shared demo data)

## Notes
- Existing tables and data are NOT modified or dropped
- Seed data includes subscription plans and demo professional profiles
*/

-- ============================================================
-- 1. Extend app_users role constraint
-- ============================================================
ALTER TABLE app_users DROP CONSTRAINT IF EXISTS app_users_role_check;
ALTER TABLE app_users ADD CONSTRAINT app_users_role_check
  CHECK (role IN ('homeowner', 'engineer', 'plumber', 'electrician', 'material_shop', 'admin'));

-- ============================================================
-- 2. professional_profiles
-- ============================================================
CREATE TABLE IF NOT EXISTS professional_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  profession text NOT NULL CHECK (profession IN ('plumber', 'electrician', 'material_shop')),
  business_name text,
  name text NOT NULL,
  email text,
  phone text,
  photo_url text,
  location text NOT NULL,
  service_area text,
  experience_years int NOT NULL DEFAULT 0,
  projects_completed int NOT NULL DEFAULT 0,
  rating numeric(3,2) NOT NULL DEFAULT 0,
  reviews_count int NOT NULL DEFAULT 0,
  specializations text[] NOT NULL DEFAULT '{}',
  skills text[] NOT NULL DEFAULT '{}',
  price_per_visit int NOT NULL DEFAULT 0,
  qualification text,
  verification_status text NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  identity_verified boolean DEFAULT false,
  credential_verified boolean DEFAULT false,
  availability text NOT NULL DEFAULT 'Available',
  bio text,
  portfolio jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prof_profiles_profession ON professional_profiles(profession);
CREATE INDEX IF NOT EXISTS idx_prof_profiles_user ON professional_profiles(user_id);

ALTER TABLE professional_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pp_select" ON professional_profiles;
CREATE POLICY "pp_select" ON professional_profiles FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "pp_insert" ON professional_profiles;
CREATE POLICY "pp_insert" ON professional_profiles FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "pp_update" ON professional_profiles;
CREATE POLICY "pp_update" ON professional_profiles FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "pp_delete" ON professional_profiles;
CREATE POLICY "pp_delete" ON professional_profiles FOR DELETE TO anon, authenticated USING (true);

-- ============================================================
-- 3. project_members
-- ============================================================
CREATE TABLE IF NOT EXISTS project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('engineer', 'plumber', 'electrician', 'material_shop')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('invited', 'active', 'completed', 'declined')),
  invited_at timestamptz DEFAULT now(),
  joined_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pm_project ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_pm_user ON project_members(user_id);

ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pm_select" ON project_members;
CREATE POLICY "pm_select" ON project_members FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "pm_insert" ON project_members;
CREATE POLICY "pm_insert" ON project_members FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "pm_update" ON project_members;
CREATE POLICY "pm_update" ON project_members FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "pm_delete" ON project_members;
CREATE POLICY "pm_delete" ON project_members FOR DELETE TO anon, authenticated USING (true);

-- ============================================================
-- 4. professional_requests
-- ============================================================
CREATE TABLE IF NOT EXISTS professional_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  homeowner_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  professional_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  professional_type text NOT NULL CHECK (professional_type IN ('engineer', 'plumber', 'electrician', 'material_shop')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'completed', 'cancelled')),
  title text NOT NULL,
  description text,
  budget int,
  expected_date date,
  responded_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pr_homeowner ON professional_requests(homeowner_id);
CREATE INDEX IF NOT EXISTS idx_pr_professional ON professional_requests(professional_id);
CREATE INDEX IF NOT EXISTS idx_pr_project ON professional_requests(project_id);

ALTER TABLE professional_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "prq_select" ON professional_requests;
CREATE POLICY "prq_select" ON professional_requests FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "prq_insert" ON professional_requests;
CREATE POLICY "prq_insert" ON professional_requests FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "prq_update" ON professional_requests;
CREATE POLICY "prq_update" ON professional_requests FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "prq_delete" ON professional_requests;
CREATE POLICY "prq_delete" ON professional_requests FOR DELETE TO anon, authenticated USING (true);

-- ============================================================
-- 5. verification_requests
-- ============================================================
CREATE TABLE IF NOT EXISTS verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  professional_type text NOT NULL CHECK (professional_type IN ('engineer', 'plumber', 'electrician', 'material_shop')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  submitted_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES app_users(id),
  rejection_reason text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vr_user ON verification_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_vr_status ON verification_requests(status);

ALTER TABLE verification_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vr_select" ON verification_requests;
CREATE POLICY "vr_select" ON verification_requests FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "vr_insert" ON verification_requests;
CREATE POLICY "vr_insert" ON verification_requests FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "vr_update" ON verification_requests;
CREATE POLICY "vr_update" ON verification_requests FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "vr_delete" ON verification_requests;
CREATE POLICY "vr_delete" ON verification_requests FOR DELETE TO anon, authenticated USING (true);

-- ============================================================
-- 6. certificates
-- ============================================================
CREATE TABLE IF NOT EXISTS certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_request_id uuid NOT NULL REFERENCES verification_requests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  title text NOT NULL,
  issuing_authority text NOT NULL,
  certificate_number text,
  issue_date date,
  expiry_date date,
  file_url text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cert_user ON certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_cert_vr ON certificates(verification_request_id);

ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cert_select" ON certificates;
CREATE POLICY "cert_select" ON certificates FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "cert_insert" ON certificates;
CREATE POLICY "cert_insert" ON certificates FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "cert_update" ON certificates;
CREATE POLICY "cert_update" ON certificates FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "cert_delete" ON certificates;
CREATE POLICY "cert_delete" ON certificates FOR DELETE TO anon, authenticated USING (true);

-- ============================================================
-- 7. materials
-- ============================================================
CREATE TABLE IF NOT EXISTS materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('Cement', 'Steel', 'Bricks', 'Sand', 'Electrical', 'Plumbing', 'Tiles', 'Paint', 'Hardware', 'Other')),
  description text,
  price int NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'piece',
  stock int NOT NULL DEFAULT 0,
  availability text NOT NULL DEFAULT 'in_stock' CHECK (availability IN ('in_stock', 'low_stock', 'out_of_stock')),
  image_url text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mat_shop ON materials(shop_id);
CREATE INDEX IF NOT EXISTS idx_mat_category ON materials(category);

ALTER TABLE materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mat_select" ON materials;
CREATE POLICY "mat_select" ON materials FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "mat_insert" ON materials;
CREATE POLICY "mat_insert" ON materials FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "mat_update" ON materials;
CREATE POLICY "mat_update" ON materials FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "mat_delete" ON materials;
CREATE POLICY "mat_delete" ON materials FOR DELETE TO anon, authenticated USING (true);

-- ============================================================
-- 8. material_orders
-- ============================================================
CREATE TABLE IF NOT EXISTS material_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  shop_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  quantity int NOT NULL DEFAULT 1,
  total_price int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mo_shop ON material_orders(shop_id);
CREATE INDEX IF NOT EXISTS idx_mo_buyer ON material_orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_mo_material ON material_orders(material_id);

ALTER TABLE material_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mo_select" ON material_orders;
CREATE POLICY "mo_select" ON material_orders FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "mo_insert" ON material_orders;
CREATE POLICY "mo_insert" ON material_orders FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "mo_update" ON material_orders;
CREATE POLICY "mo_update" ON material_orders FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "mo_delete" ON material_orders;
CREATE POLICY "mo_delete" ON material_orders FOR DELETE TO anon, authenticated USING (true);

-- ============================================================
-- 9. subscription_plans
-- ============================================================
CREATE TABLE IF NOT EXISTS subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  tier text NOT NULL CHECK (tier IN ('free', 'pro', 'business')),
  price_monthly int NOT NULL DEFAULT 0,
  price_yearly int NOT NULL DEFAULT 0,
  features text[] NOT NULL DEFAULT '{}',
  max_listings int,
  max_projects int,
  priority_support boolean DEFAULT false,
  verified_badge boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sp_select" ON subscription_plans;
CREATE POLICY "sp_select" ON subscription_plans FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "sp_insert" ON subscription_plans;
CREATE POLICY "sp_insert" ON subscription_plans FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "sp_update" ON subscription_plans;
CREATE POLICY "sp_update" ON subscription_plans FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "sp_delete" ON subscription_plans;
CREATE POLICY "sp_delete" ON subscription_plans FOR DELETE TO anon, authenticated USING (true);

-- ============================================================
-- 10. subscriptions
-- ============================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
  tier text NOT NULL CHECK (tier IN ('free', 'pro', 'business')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'pending')),
  billing_cycle text NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  started_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sub_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_sub_status ON subscriptions(status);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sub_select" ON subscriptions;
CREATE POLICY "sub_select" ON subscriptions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "sub_insert" ON subscriptions;
CREATE POLICY "sub_insert" ON subscriptions FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "sub_update" ON subscriptions;
CREATE POLICY "sub_update" ON subscriptions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "sub_delete" ON subscriptions;
CREATE POLICY "sub_delete" ON subscriptions FOR DELETE TO anon, authenticated USING (true);

-- ============================================================
-- 11. notifications
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  read boolean DEFAULT false,
  link text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_read ON notifications(read);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notif_select" ON notifications;
CREATE POLICY "notif_select" ON notifications FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "notif_insert" ON notifications;
CREATE POLICY "notif_insert" ON notifications FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "notif_update" ON notifications;
CREATE POLICY "notif_update" ON notifications FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "notif_delete" ON notifications;
CREATE POLICY "notif_delete" ON notifications FOR DELETE TO anon, authenticated USING (true);

-- ============================================================
-- SEED DATA
-- ============================================================

-- Demo users for new roles
INSERT INTO app_users (id, name, email, role, avatar_url, phone, location) VALUES
  ('a1000000-0000-0000-0000-000000000010', 'Rajesh Plumbing', 'rajesh@buildmatch.ai', 'plumber', 'https://images.unsplash.com/photo-1633332755192-780a8825d60c?w=200&h=200&fit=crop', '+91 98765 43210', 'Coimbatore'),
  ('a1000000-0000-0000-0000-000000000011', 'Spark Electricals', 'spark@buildmatch.ai', 'electrician', 'https://images.unsplash.com/photo-1620712943543-bcc4688e7150?w=200&h=200&fit=crop', '+91 98765 43211', 'Coimbatore'),
  ('a1000000-0000-0000-0000-000000000012', 'BuildMart Supplies', 'buildmart@buildmatch.ai', 'material_shop', 'https://images.unsplash.com/photo-1565008447762-0bd3c6e5951f?w=200&h=200&fit=crop', '+91 98765 43212', 'Coimbatore')
ON CONFLICT (email) DO NOTHING;

-- Professional profiles
INSERT INTO professional_profiles (user_id, profession, business_name, name, email, phone, photo_url, location, service_area, experience_years, projects_completed, rating, reviews_count, specializations, skills, price_per_visit, qualification, verification_status, identity_verified, credential_verified, availability, bio) VALUES
  ('a1000000-0000-0000-0000-000000000010', 'plumber', 'Rajesh Plumbing Services', 'Rajesh Kumar', 'rajesh@buildmatch.ai', '+91 98765 43210', 'https://images.unsplash.com/photo-1633332755192-780a8825d60c?w=200&h=200&fit=crop', 'Coimbatore', 'Coimbatore, Pollachi', 12, 250, 4.7, 45, ARRAY['Residential Plumbing', 'Bathroom Fitting', 'Waterproofing', 'Drainage'], ARRAY['Pipe Fitting', 'Leak Repair', 'Bathroom Installation', 'Water Tank Setup'], 500, 'ITI Plumbing Certificate', 'verified', true, true, 'Available', 'Experienced plumber specializing in residential plumbing, bathroom fittings, and drainage systems.'),
  ('a1000000-0000-0000-0000-000000000011', 'electrician', 'Spark Electricals', 'Suresh Kumar', 'spark@buildmatch.ai', '+91 98765 43211', 'https://images.unsplash.com/photo-1620712943543-bcc4688e7150?w=200&h=200&fit=crop', 'Coimbatore', 'Coimbatore, Salem', 10, 200, 4.8, 38, ARRAY['Residential Wiring', 'Electrical Panels', 'Lighting', 'Safety Audit'], ARRAY['Wiring', 'Panel Installation', 'Lighting Setup', 'Safety Inspection'], 600, 'Electrical License - Grade A', 'verified', true, true, 'Available', 'Licensed electrician with expertise in residential wiring, panel installations, and safety audits.'),
  ('a1000000-0000-0000-0000-000000000012', 'material_shop', 'BuildMart Supplies', 'Mohan Lal', 'buildmart@buildmatch.ai', '+91 98765 43212', 'https://images.unsplash.com/photo-1565008447762-0bd3c6e5951f?w=200&h=200&fit=crop', 'Coimbatore', 'Coimbatore, Tamil Nadu', 15, 0, 4.5, 22, ARRAY['Cement', 'Steel', 'Bricks', 'Sand', 'Paint', 'Hardware'], ARRAY['Material Supply', 'Bulk Orders', 'Delivery'], 0, 'Registered Construction Material Supplier', 'verified', true, true, 'Available', 'Trusted construction material supplier serving Coimbatore region with quality cement, steel, bricks, and more.')
ON CONFLICT DO NOTHING;

-- Pending verification professional
INSERT INTO professional_profiles (user_id, profession, business_name, name, email, phone, photo_url, location, service_area, experience_years, projects_completed, rating, reviews_count, specializations, skills, price_per_visit, qualification, verification_status, identity_verified, credential_verified, availability, bio) VALUES
  ('a1000000-0000-0000-0000-000000000010', 'plumber', 'Coimbatore Plumbing Co', 'Vikram Singh', 'vikram@buildmatch.ai', '+91 98765 43213', 'https://images.unsplash.com/photo-1500648766842-5729b1ab24c7?w=200&h=200&fit=crop', 'Pollachi', 'Pollachi, Coimbatore', 5, 80, 4.2, 15, ARRAY['Residential Plumbing', 'Kitchen Fitting'], ARRAY['Pipe Fitting', 'Kitchen Installation'], 400, 'ITI Plumbing', 'pending', false, false, 'Available', 'Plumber serving Pollachi area.')
ON CONFLICT DO NOTHING;

-- Subscription plans
INSERT INTO subscription_plans (name, tier, price_monthly, price_yearly, features, max_listings, max_projects, priority_support, verified_badge) VALUES
  ('Free', 'free', 0, 0, ARRAY['Basic profile', 'Up to 3 listings', 'Standard search ranking'], 3, 3, false, false),
  ('Pro', 'pro', 999, 9999, ARRAY['Enhanced profile', 'Up to 25 listings', 'Priority search ranking', 'Analytics dashboard', 'Verified badge eligibility'], 25, 25, true, true),
  ('Business', 'business', 2999, 29999, ARRAY['Premium profile', 'Unlimited listings', 'Top search ranking', 'Advanced analytics', 'Dedicated support', 'Verified badge', 'Team accounts'], 999, 999, true, true)
ON CONFLICT DO NOTHING;

-- Subscriptions for demo professionals
INSERT INTO subscriptions (user_id, plan_id, tier, status, billing_cycle, expires_at)
  SELECT 'a1000000-0000-0000-0000-000000000003', sp.id, 'pro', 'active', 'yearly', now() + interval '1 year'
  FROM subscription_plans sp WHERE sp.tier = 'pro'
ON CONFLICT DO NOTHING;

INSERT INTO subscriptions (user_id, plan_id, tier, status, billing_cycle, expires_at)
  SELECT 'a1000000-0000-0000-0000-000000000010', sp.id, 'pro', 'active', 'monthly', now() + interval '1 month'
  FROM subscription_plans sp WHERE sp.tier = 'pro'
ON CONFLICT DO NOTHING;

INSERT INTO subscriptions (user_id, plan_id, tier, status, billing_cycle, expires_at)
  SELECT 'a1000000-0000-0000-0000-000000000012', sp.id, 'business', 'active', 'yearly', now() + interval '1 year'
  FROM subscription_plans sp WHERE sp.tier = 'business'
ON CONFLICT DO NOTHING;

-- Materials for BuildMart
INSERT INTO materials (shop_id, name, category, description, price, unit, stock, availability, image_url) VALUES
  ('a1000000-0000-0000-0000-000000000012', 'UltraTech Cement 53 Grade', 'Cement', 'High-quality Portland cement for structural construction', 380, 'bag (50kg)', 500, 'in_stock', 'https://images.unsplash.com/photo-1581094271901-8022df4d6f03?w=400&h=300&fit=crop'),
  ('a1000000-0000-0000-0000-000000000012', 'TMT Steel Bars Fe 500D', 'Steel', 'High-strength TMT steel bars for reinforcement', 65000, 'ton', 20, 'in_stock', 'https://images.unsplash.com/photo-1565793298595-7e6d059c5f5d?w=400&h=300&fit=crop'),
  ('a1000000-0000-0000-0000-000000000012', 'Red Clay Bricks (Class A)', 'Bricks', 'First quality red clay bricks for wall construction', 8, 'piece', 50000, 'in_stock', 'https://images.unsplash.com/photo-1605152270590-c5d5d6e5e5c1?w=400&h=300&fit=crop'),
  ('a1000000-0000-0000-0000-000000000012', 'M-Sand (Manufactured Sand)', 'Sand', 'Clean manufactured sand for construction', 45, 'cubic ft', 1000, 'in_stock', 'https://images.unsplash.com/photo-1597588404308-0d1d3e3e3e3e?w=400&h=300&fit=crop'),
  ('a1000000-0000-0000-0000-000000000012', 'Anchor Electrical Switches', 'Electrical', 'Modular electrical switches and sockets', 85, 'piece', 2000, 'in_stock', 'https://images.unsplash.com/photo-1620712943543-bcc4688e7150?w=400&h=300&fit=crop'),
  ('a1000000-0000-0000-0000-000000000012', 'PVC Pipes 4 inch', 'Plumbing', 'PVC drainage pipes for plumbing systems', 250, 'piece', 800, 'low_stock', 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=400&h=300&fit=crop'),
  ('a1000000-0000-0000-0000-000000000012', 'Vitrified Floor Tiles 2x2', 'Tiles', 'Premium vitrified floor tiles', 45, 'piece', 5000, 'in_stock', 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop'),
  ('a1000000-0000-0000-0000-000000000012', 'Asian Paints Apex Ultima', 'Paint', 'Premium exterior emulsion paint', 850, 'liter', 300, 'in_stock', 'https://images.unsplash.com/photo-1581094288278-8e1e8c0e5e3e?w=400&h=300&fit=crop'),
  ('a1000000-0000-0000-0000-000000000012', 'Door Hinges Set (Stainless)', 'Hardware', 'Stainless steel door hinges set', 120, 'set', 500, 'in_stock', 'https://images.unsplash.com/photo-1605152270590-c5d5d6e5e5c1?w=400&h=300&fit=crop'),
  ('a1000000-0000-0000-0000-000000000012', 'Concrete Mix Additive', 'Other', 'Chemical additive for stronger concrete', 220, 'liter', 150, 'low_stock', 'https://images.unsplash.com/photo-1581094271901-8022df4d6f03?w=400&h=300&fit=crop')
ON CONFLICT DO NOTHING;

-- Sample material order
INSERT INTO material_orders (material_id, shop_id, buyer_id, project_id, quantity, total_price, status)
  SELECT m.id, 'a1000000-0000-0000-0000-000000000012', 'a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 100, 38000, 'delivered'
  FROM materials m WHERE m.name = 'UltraTech Cement 53 Grade'
ON CONFLICT DO NOTHING;

-- Sample professional request
INSERT INTO professional_requests (project_id, homeowner_id, professional_id, professional_type, status, title, description, budget, expected_date)
  SELECT 'b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000010', 'plumber', 'accepted', 'Bathroom Plumbing Installation', 'Need plumbing work for 2 bathrooms in the villa', 15000, '2025-10-15'
  WHERE EXISTS (SELECT 1 FROM projects WHERE id = 'b1000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- Sample verification request
INSERT INTO verification_requests (user_id, professional_type, status)
  VALUES ('a1000000-0000-0000-0000-000000000011', 'electrician', 'pending')
ON CONFLICT DO NOTHING;

-- Sample certificate
INSERT INTO certificates (verification_request_id, user_id, title, issuing_authority, certificate_number, issue_date)
  SELECT vr.id, 'a1000000-0000-0000-0000-000000000011', 'Electrical License Grade A', 'Tamil Nadu Electrical Licensing Board', 'TN-EL-2019-4521', '2019-06-15'
  FROM verification_requests vr WHERE vr.user_id = 'a1000000-0000-0000-0000-000000000011'
ON CONFLICT DO NOTHING;

-- Sample notifications
INSERT INTO notifications (user_id, type, title, message, read, link) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'request', 'Plumber Accepted Your Request', 'Rajesh Plumbing has accepted your plumbing request for Green Villa project.', false, '/app/projects'),
  ('a1000000-0000-0000-0000-000000000001', 'material', 'Material Order Delivered', 'Your cement order from BuildMart has been delivered.', true, '/app/materials'),
  ('a1000000-0000-0000-0000-000000000003', 'project', 'New Project Assignment', 'You have been assigned to Green Villa project.', false, '/app/engineer')
ON CONFLICT DO NOTHING;
