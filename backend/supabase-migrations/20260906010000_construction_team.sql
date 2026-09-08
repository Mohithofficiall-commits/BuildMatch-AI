-- ============================================================
-- Construction Team — extend the professional directory to the
-- full construction/home-service ecosystem.
--
-- What this adds (additive only; nothing existing is replaced):
--   1. Extends `app_users.role` to the construction trades so each
--      trade professional has a linked account.
--   2. Extends `professional_profiles.profession` to include the
--      trades shown in the homeowner "Construction Team" section.
--   3. Seeds realistic demo profiles for carpenter, mason, painter,
--      fabricator (aluminium & glass) and HVAC/AC professionals —
--      the same demo-data pattern used for plumber/electrician/shop.
-- ============================================================

-- 1. Extend app_users role constraint to include construction trades
ALTER TABLE app_users DROP CONSTRAINT IF EXISTS app_users_role_check;
ALTER TABLE app_users ADD CONSTRAINT app_users_role_check
  CHECK (role IN ('homeowner', 'engineer', 'plumber', 'electrician', 'material_shop', 'carpenter', 'mason', 'painter', 'fabricator', 'hvac', 'admin'));

-- 2. Extend professional_profiles profession constraint
ALTER TABLE professional_profiles DROP CONSTRAINT IF EXISTS professional_profiles_profession_check;
ALTER TABLE professional_profiles ADD CONSTRAINT professional_profiles_profession_check
  CHECK (profession IN ('plumber', 'electrician', 'material_shop', 'carpenter', 'mason', 'painter', 'fabricator', 'hvac'));

-- ============================================================
-- SEED — construction trade professionals (demo data)
-- ============================================================

-- Demo users for the new trades
INSERT INTO app_users (id, name, email, role, avatar_url, phone, location) VALUES
  ('a1000000-0000-0000-0000-000000000013', 'Precision Carpentry Co', 'carpenter@buildmatch.ai', 'carpenter', '/people/carpenter-1.jpg', '+91 98765 43220', 'Coimbatore'),
  ('a1000000-0000-0000-0000-000000000014', 'Sri Sai Masonry Works', 'mason@buildmatch.ai', 'mason', '/people/mason-1.jpg', '+91 98765 43221', 'Coimbatore'),
  ('a1000000-0000-0000-0000-000000000015', 'ColorCraft Painting', 'painter@buildmatch.ai', 'painter', '/people/painter-1.jpg', '+91 98765 43222', 'Coimbatore'),
  ('a1000000-0000-0000-0000-000000000016', 'Skyline Aluminium & Glass', 'fabricator@buildmatch.ai', 'fabricator', '/people/contractor-1.jpg', '+91 98765 43223', 'Coimbatore'),
  ('a1000000-0000-0000-0000-000000000017', 'CoolBreeze AC Services', 'hvac@buildmatch.ai', 'hvac', '/people/mechanic-1.jpg', '+91 98765 43224', 'Coimbatore')
ON CONFLICT (email) DO NOTHING;

-- Professional profiles for the trades
INSERT INTO professional_profiles (user_id, profession, business_name, name, email, phone, photo_url, location, service_area, experience_years, projects_completed, rating, reviews_count, specializations, skills, price_per_visit, qualification, verification_status, identity_verified, credential_verified, availability, bio) VALUES
  ('a1000000-0000-0000-0000-000000000013', 'carpenter', 'Precision Carpentry Co', 'Kumaravel', 'carpenter@buildmatch.ai', '+91 98765 43220', '/people/carpenter-1.jpg', 'Coimbatore', 'Coimbatore, Pollachi, Salem', 8, 95, 4.6, 28, ARRAY['Custom Furniture', 'Door & Window Frames', 'Kitchen Cabinets', 'Wooden Roofing'], ARRAY['Joinery', 'Cabinet Making', 'Frame Fitting', 'Polishing'], 700, 'ITI Carpentry Trade Certificate', 'verified', true, true, 'Available', 'Skilled carpenter specialising in custom furniture, door and window frames, and interior woodwork.'),
  ('a1000000-0000-0000-0000-000000000014', 'mason', 'Sri Sai Masonry Works', 'Murugan', 'mason@buildmatch.ai', '+91 98765 43221', '/people/mason-1.jpg', 'Coimbatore', 'Coimbatore, Tiruppur, Erode', 14, 140, 4.5, 35, ARRAY['Brickwork', 'Plinth & Foundation', 'Plastering', 'Flooring'], ARRAY['Block Laying', 'RCC Work', 'Plastering', 'Tile Flooring'], 650, 'Master Mason — 14 yrs site experience', 'verified', true, true, 'Available', 'Master mason with deep experience in foundations, brickwork, plastering and flooring.'),
  ('a1000000-0000-0000-0000-000000000015', 'painter', 'ColorCraft Painting', 'Dinesh', 'painter@buildmatch.ai', '+91 98765 43222', '/people/painter-1.jpg', 'Coimbatore', 'Coimbatore, Mettupalayam', 6, 70, 4.3, 18, ARRAY['Interior Painting', 'Exterior Painting', 'Texture & Design', 'Waterproofing'], ARRAY['Wall Preparation', 'Emulsion & Enamel', 'Texture Finishes', 'Crack Repair'], 550, 'Painting Contractor License', 'pending', false, false, 'Available', 'Interior and exterior painting with texture and waterproofing services.'),
  ('a1000000-0000-0000-0000-000000000016', 'fabricator', 'Skyline Aluminium & Glass', 'Fathima', 'fabricator@buildmatch.ai', '+91 98765 43223', '/people/contractor-1.jpg', 'Coimbatore', 'Coimbatore, Tamil Nadu', 9, 110, 4.7, 26, ARRAY['Aluminium Windows', 'Glass Partitions', 'Fabrication', 'Frames & Doors'], ARRAY['Aluminium Fabrication', 'Glass Fixing', 'Modular Partitions', 'Hardware Fitting'], 800, 'Aluminium Fabrication Diploma', 'verified', true, true, 'Available', 'Aluminium and glass specialist for windows, partitions, doors and custom fabrication.'),
  ('a1000000-0000-0000-0000-000000000017', 'hvac', 'CoolBreeze AC Services', 'Anwar', 'hvac@buildmatch.ai', '+91 98765 43224', '/people/mechanic-1.jpg', 'Coimbatore', 'Coimbatore, Tamil Nadu', 11, 150, 4.6, 32, ARRAY['AC Installation', 'Ducting', 'Ventilation', 'Maintenance'], ARRAY['Split AC Fitting', 'Duct Design', 'Gas Charging', 'Service & Repair'], 750, 'HVAC Technician Certification', 'verified', true, true, 'Available', 'HVAC and air-conditioning installation, ducting, ventilation and maintenance specialist.')
ON CONFLICT DO NOTHING;