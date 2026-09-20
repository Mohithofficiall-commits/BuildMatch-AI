-- ============================================================
-- AI Matching Expansion — extend the professional directory to
-- interior designers and furniture providers.
--
-- What this adds (additive only; nothing existing is replaced):
--   1. Extends `app_users.role` to include 'interior_designer'
--      and 'furniture_provider'.
--   2. Extends `professional_profiles.profession` to include the
--      two new service categories used by the homeowner
--      "All Services AI Recommendations" section.
--   3. Seeds realistic demo profiles for interior designers and
--      furniture providers — the same demo-data pattern used for
--      carpenter/mason/painter/fabricator/hvac in the
--      construction-team migration.
-- ============================================================

-- 1. Extend app_users role constraint to include the new roles
ALTER TABLE app_users DROP CONSTRAINT IF EXISTS app_users_role_check;
ALTER TABLE app_users ADD CONSTRAINT app_users_role_check
  CHECK (role IN ('homeowner', 'engineer', 'plumber', 'electrician', 'material_shop',
                  'carpenter', 'mason', 'painter', 'fabricator', 'hvac',
                  'interior_designer', 'furniture_provider', 'admin'));

-- 2. Extend professional_profiles profession constraint
ALTER TABLE professional_profiles DROP CONSTRAINT IF EXISTS professional_profiles_profession_check;
ALTER TABLE professional_profiles ADD CONSTRAINT professional_profiles_profession_check
  CHECK (profession IN ('plumber', 'electrician', 'material_shop', 'carpenter', 'mason', 'painter', 'fabricator', 'hvac',
                        'interior_designer', 'furniture_provider'));

-- ============================================================
-- SEED — interior designers & furniture providers (demo data)
-- ============================================================

-- Demo users for the new service categories
INSERT INTO app_users (id, name, email, role, avatar_url, phone, location) VALUES
  ('a1000000-0000-0000-0000-000000000018', 'Aura Interior Studio', 'interior@buildmatch.ai', 'interior_designer', '/people/woman-1.jpg', '+91 98765 43230', 'Coimbatore'),
  ('a1000000-0000-0000-0000-000000000019', 'WoodCraft Furniture House', 'furniture@buildmatch.ai', 'furniture_provider', '/people/carpenter-1.jpg', '+91 98765 43231', 'Coimbatore')
ON CONFLICT (email) DO NOTHING;

-- Professional profiles for the new categories
INSERT INTO professional_profiles (user_id, profession, business_name, name, email, phone, photo_url, location, service_area, experience_years, projects_completed, rating, reviews_count, specializations, skills, price_per_visit, qualification, verification_status, identity_verified, credential_verified, availability, bio) VALUES
  ('a1000000-0000-0000-0000-000000000018', 'interior_designer', 'Aura Interior Studio', 'Meera Krishnan', 'interior@buildmatch.ai', '+91 98765 43230', '/people/woman-1.jpg', 'Coimbatore', 'Coimbatore, Chennai, Bengaluru', 10, 85, 4.8, 41, ARRAY['Modern Interiors', 'Contemporary', 'Space Planning', 'Turnkey Interiors'], ARRAY['3D Visualisation', 'Material Selection', 'Colour Consultation', 'Lighting Design'], 1500, 'B.Arch — Interior Design Specialisation', 'verified', true, true, 'Available', 'Interior designer specialising in modern and contemporary residential interiors, space planning and turnkey execution.'),
  ('a1000000-0000-0000-0000-000000000019', 'furniture_provider', 'WoodCraft Furniture House', 'Selvam', 'furniture@buildmatch.ai', '+91 98765 43231', '/people/carpenter-1.jpg', 'Coimbatore', 'Coimbatore, Pollachi, Tiruppur', 12, 210, 4.4, 63, ARRAY['Modular Kitchens', 'Wardrobes', 'Sofas & Living Sets', 'Office Furniture'], ARRAY['Custom Manufacturing', 'Teak & Plywood Work', 'Upholstery', 'Delivery & Installation'], 900, 'Furniture Manufacturing — 12 yrs workshop', 'verified', true, true, 'Busy', 'Furniture manufacturer and supplier for modular kitchens, wardrobes, sofas and custom woodwork.')
ON CONFLICT DO NOTHING;
