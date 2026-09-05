-- =========================================================
-- PROFESSIONAL NETWORK FEED (LinkedIn-style activity feed)
-- Demo posts are authored by the seeded demo identities so the
-- feed shows a realistic cross-role construction network. New
-- posts/comments/likes written from the UI follow the same
-- permissive-demo RLS pattern used across this prototype.
-- =========================================================

CREATE TABLE IF NOT EXISTS feed_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  author_role text NOT NULL,
  author_title text,
  author_photo_url text,
  author_verified boolean DEFAULT false,
  category text NOT NULL CHECK (category IN ('project_update', 'discussion', 'tip', 'achievement', 'opportunity', 'news')),
  content text NOT NULL,
  image_url text,
  likes_count int NOT NULL DEFAULT 0,
  comments_count int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS feed_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
  author_user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  author_role text NOT NULL,
  author_photo_url text,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS feed_post_likes (
  post_id uuid NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_feed_posts_created ON feed_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_posts_author ON feed_posts(author_user_id);
CREATE INDEX IF NOT EXISTS idx_feed_comments_post ON feed_comments(post_id, created_at);
CREATE INDEX IF NOT EXISTS idx_feed_likes_post ON feed_post_likes(post_id);

ALTER TABLE feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_post_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "feed_posts_select" ON feed_posts;
CREATE POLICY "feed_posts_select" ON feed_posts FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "feed_posts_insert" ON feed_posts;
CREATE POLICY "feed_posts_insert" ON feed_posts FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "feed_posts_delete" ON feed_posts;
CREATE POLICY "feed_posts_delete" ON feed_posts FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "feed_comments_select" ON feed_comments;
CREATE POLICY "feed_comments_select" ON feed_comments FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "feed_comments_insert" ON feed_comments;
CREATE POLICY "feed_comments_insert" ON feed_comments FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "feed_comments_delete" ON feed_comments;
CREATE POLICY "feed_comments_delete" ON feed_comments FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "feed_likes_select" ON feed_post_likes;
CREATE POLICY "feed_likes_select" ON feed_post_likes FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "feed_likes_insert" ON feed_post_likes;
CREATE POLICY "feed_likes_insert" ON feed_post_likes FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "feed_likes_delete" ON feed_post_likes;
CREATE POLICY "feed_likes_delete" ON feed_post_likes FOR DELETE TO anon, authenticated USING (true);

-- =========================================================
-- SEED: realistic demo feed from the seeded demo identities
-- =========================================================
DO $$
DECLARE
  v_karthik uuid; v_nishi uuid; v_admin uuid;
  v_rajesh uuid; v_suresh uuid; v_mohan uuid;
BEGIN
  SELECT id INTO v_karthik FROM app_users WHERE email = 'karthik@buildmatch.ai' LIMIT 1;
  SELECT id INTO v_nishi FROM app_users WHERE email = 'nishi.sharma@example.com' LIMIT 1;
  SELECT id INTO v_admin FROM app_users WHERE email = 'admin@buildmatch.ai' LIMIT 1;
  SELECT id INTO v_rajesh FROM app_users WHERE email = 'rajesh@buildmatch.ai' LIMIT 1;
  SELECT id INTO v_suresh FROM app_users WHERE email = 'spark@buildmatch.ai' LIMIT 1;
  SELECT id INTO v_mohan FROM app_users WHERE email = 'buildmart@buildmatch.ai' LIMIT 1;

  -- 1. Karthik — Dream Home roofing progress update (ties to the real project)
  IF NOT EXISTS (SELECT 1 FROM feed_posts WHERE author_user_id = v_karthik AND category = 'project_update' AND content LIKE 'Site update — Dream Home%') THEN
    INSERT INTO feed_posts (author_user_id, author_name, author_role, author_title, author_photo_url, author_verified, category, content, image_url, created_at)
    VALUES (v_karthik, 'Er. S. Karthik', 'engineer', 'Senior Civil Engineer · Structural & Residential Construction', '/people/engineer-1.jpg', true, 'project_update',
      'Site update — Dream Home (2BHK Modern), Coimbatore is now at the Roofing milestone at 60% overall progress. Structure phase completed on schedule and the foundation + structure milestones are verified with site evidence. Rajesh is on track with the bathroom plumbing rough-in. Thanks to Nishi Sharma for the seamless coordination!',
      '/project/construction-2.jpg', now() - interval '3 hours');
  END IF;

  -- 2. Rajesh — plumbing tip
  IF NOT EXISTS (SELECT 1 FROM feed_posts WHERE author_user_id = v_rajesh AND category = 'tip' AND content LIKE 'Plumbing tip%') THEN
    INSERT INTO feed_posts (author_user_id, author_name, author_role, author_title, author_photo_url, author_verified, category, content, created_at)
    VALUES (v_rajesh, 'Rajesh Kumar', 'plumber', 'Master Plumber · Rajesh Plumbing Services', '/people/plumber-1.jpg', true, 'tip',
      'Plumbing tip of the day: always pressure-test concealed pipes BEFORE tiling starts. A 30-minute test at working pressure catches joint leaks while they are still cheap to fix — after tiling, the same leak costs you a full bathroom redo.', now() - interval '6 hours');
  END IF;

  -- 3. Karthik — professional achievement
  IF NOT EXISTS (SELECT 1 FROM feed_posts WHERE author_user_id = v_karthik AND category = 'achievement' AND content LIKE 'Proud milestone%') THEN
    INSERT INTO feed_posts (author_user_id, author_name, author_role, author_title, author_photo_url, author_verified, category, content, created_at)
    VALUES (v_karthik, 'Er. S. Karthik', 'engineer', 'Senior Civil Engineer · Structural & Residential Construction', '/people/engineer-1.jpg', true, 'achievement',
      'Proud milestone: 48 residential projects delivered across Tamil Nadu with a 94% on-time record and zero complaints logged. Grateful to every homeowner who trusted the process — and to the site teams who made it possible. On to the next 50.', now() - interval '1 day');
  END IF;

  -- 4. Nishi (homeowner) — thanks + coordination note
  IF NOT EXISTS (SELECT 1 FROM feed_posts WHERE author_user_id = v_nishi AND category = 'discussion' AND content LIKE 'To the incredible team%') THEN
    INSERT INTO feed_posts (author_user_id, author_name, author_role, author_title, author_photo_url, author_verified, category, content, created_at)
    VALUES (v_nishi, 'Nishi Sharma', 'homeowner', 'Homeowner · Dream Home project, Coimbatore', '/people/homeowner-1.jpg', false, 'discussion',
      'To the incredible team on our Dream Home project — thank you Er. S. Karthik for the transparent milestone updates, and Rajesh for the careful plumbing work. Homeowners: ask for the verified reviews and trust scores before you hire. It makes all the difference.', now() - interval '2 days');
  END IF;

  -- 5. Suresh — electrical safety checklist
  IF NOT EXISTS (SELECT 1 FROM feed_posts WHERE author_user_id = v_suresh AND category = 'tip' AND content LIKE 'Electrical safety checklist%') THEN
    INSERT INTO feed_posts (author_user_id, author_name, author_role, author_title, author_photo_url, author_verified, category, content, created_at)
    VALUES (v_suresh, 'Suresh Kumar', 'electrician', 'Licensed Electrician · Spark Electricals', '/people/electrician-1.jpg', true, 'tip',
      'Electrical safety checklist for new homes: (1) dedicated circuits for high-load appliances, (2) 30mA RCCB protection on every distribution board, (3) colour-coded wiring with a proper earthing pit, (4) label every breaker. Safety is not a line item — it is the design.', now() - interval '2 days 4 hours');
  END IF;

  -- 6. Mohan — material availability announcement (opportunity)
  IF NOT EXISTS (SELECT 1 FROM feed_posts WHERE author_user_id = v_mohan AND category = 'opportunity' AND content LIKE 'BuildMart Supplies now stocking%') THEN
    INSERT INTO feed_posts (author_user_id, author_name, author_role, author_title, author_photo_url, author_verified, category, content, created_at)
    VALUES (v_mohan, 'Mohan Lal', 'material_shop', 'BuildMart Supplies · Coimbatore', '/people/shop-1.jpg', true, 'opportunity',
      'BuildMart Supplies is now stocking UltraTech 53-grade cement and Fe500D TMT steel at our Coimbatore yard, with same-week delivery to site. Bulk quotes for contractors and engineers available — verified supplier with 4.5★ across 22 reviews.', now() - interval '3 days');
  END IF;

  -- 7. Karthik — engineering discussion
  IF NOT EXISTS (SELECT 1 FROM feed_posts WHERE author_user_id = v_karthik AND category = 'discussion' AND content LIKE 'Discussion: precast vs cast-in-situ%') THEN
    INSERT INTO feed_posts (author_user_id, author_name, author_role, author_title, author_photo_url, author_verified, category, content, created_at)
    VALUES (v_karthik, 'Er. S. Karthik', 'engineer', 'Senior Civil Engineer · Structural & Residential Construction', '/people/engineer-1.jpg', true, 'discussion',
      'Discussion: precast vs cast-in-situ slabs for 2BHK construction in Coimbatore weather. Precast gives faster cycles and cleaner timelines; cast-in-situ is more forgiving with local labour and site access. What are your experiences with shrinkage cracking either way? Would value inputs from fellow structural engineers.', now() - interval '4 days');
  END IF;

  -- 8. Admin — platform tip (news)
  IF NOT EXISTS (SELECT 1 FROM feed_posts WHERE author_user_id = v_admin AND category = 'news' AND content LIKE 'BuildMatch tip%') THEN
    INSERT INTO feed_posts (author_user_id, author_name, author_role, author_title, author_photo_url, author_verified, category, content, created_at)
    VALUES (v_admin, 'BuildMatch Team', 'admin', 'BuildMatch AI · Platform Team', '/people/admin-1.jpg', true, 'news',
      'BuildMatch tip: keep your certificates current in Verification to keep the Verified badge visible on your profile and in homeowner search results. Verification requests are reviewed by our admin team — upload identity + credential documents from your Verification tab.', now() - interval '5 days');
  END IF;

  -- Comments
  IF NOT EXISTS (SELECT 1 FROM feed_comments WHERE author_user_id = v_rajesh AND content LIKE 'Roofing looks great%') THEN
    INSERT INTO feed_comments (post_id, author_user_id, author_name, author_role, author_photo_url, content, created_at)
    SELECT id, v_rajesh, 'Rajesh Kumar', 'plumber', '/people/plumber-1.jpg', 'Roofing looks great, Karthik! Bathroom plumbing rough-in is complete and ready for your inspection.', now() - interval '2 hours'
    FROM feed_posts WHERE author_user_id = v_karthik AND category = 'project_update' AND content LIKE 'Site update — Dream Home%' LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM feed_comments WHERE author_user_id = v_suresh AND content LIKE 'Nice progress%') THEN
    INSERT INTO feed_comments (post_id, author_user_id, author_name, author_role, author_photo_url, content, created_at)
    SELECT id, v_suresh, 'Suresh Kumar', 'electrician', '/people/electrician-1.jpg', 'Nice progress — I will be on site Thursday for the electrical first-fix walkthrough.', now() - interval '1 hour'
    FROM feed_posts WHERE author_user_id = v_karthik AND category = 'project_update' AND content LIKE 'Site update — Dream Home%' LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM feed_comments WHERE author_user_id = v_mohan AND content LIKE 'We supply both%') THEN
    INSERT INTO feed_comments (post_id, author_user_id, author_name, author_role, author_photo_url, content, created_at)
    SELECT id, v_mohan, 'Mohan Lal', 'material_shop', '/people/shop-1.jpg', 'We supply both. Precast gives cleaner timelines; cast-in-situ is more forgiving for local labour. Happy to quote either for your next project.', now() - interval '3 days 2 hours'
    FROM feed_posts WHERE author_user_id = v_karthik AND category = 'discussion' AND content LIKE 'Discussion: precast vs cast-in-situ%' LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM feed_comments WHERE author_user_id = v_karthik AND content LIKE 'Booked a bulk quote%') THEN
    INSERT INTO feed_comments (post_id, author_user_id, author_name, author_role, author_photo_url, content, created_at)
    SELECT id, v_karthik, 'Er. S. Karthik', 'engineer', '/people/engineer-1.jpg', 'Booked a bulk quote for the Dream Home roofing phase — delivery expected next week.', now() - interval '2 days 20 hours'
    FROM feed_posts WHERE author_user_id = v_mohan AND category = 'opportunity' AND content LIKE 'BuildMart Supplies now stocking%' LIMIT 1;
  END IF;

  -- Likes (post_id, user_id)
  INSERT INTO feed_post_likes (post_id, user_id)
  SELECT id, v_rajesh FROM feed_posts WHERE author_user_id = v_karthik AND category = 'project_update' AND content LIKE 'Site update — Dream Home%' LIMIT 1
  ON CONFLICT DO NOTHING;
  INSERT INTO feed_post_likes (post_id, user_id)
  SELECT id, v_nishi FROM feed_posts WHERE author_user_id = v_karthik AND category = 'project_update' AND content LIKE 'Site update — Dream Home%' LIMIT 1
  ON CONFLICT DO NOTHING;
  INSERT INTO feed_post_likes (post_id, user_id)
  SELECT id, v_suresh FROM feed_posts WHERE author_user_id = v_karthik AND category = 'project_update' AND content LIKE 'Site update — Dream Home%' LIMIT 1
  ON CONFLICT DO NOTHING;
  INSERT INTO feed_post_likes (post_id, user_id)
  SELECT id, v_karthik FROM feed_posts WHERE author_user_id = v_rajesh AND category = 'tip' AND content LIKE 'Plumbing tip%' LIMIT 1
  ON CONFLICT DO NOTHING;
  INSERT INTO feed_post_likes (post_id, user_id)
  SELECT id, v_nishi FROM feed_posts WHERE author_user_id = v_karthik AND category = 'achievement' AND content LIKE 'Proud milestone%' LIMIT 1
  ON CONFLICT DO NOTHING;
  INSERT INTO feed_post_likes (post_id, user_id)
  SELECT id, v_admin FROM feed_posts WHERE author_user_id = v_karthik AND category = 'achievement' AND content LIKE 'Proud milestone%' LIMIT 1
  ON CONFLICT DO NOTHING;
  INSERT INTO feed_post_likes (post_id, user_id)
  SELECT id, v_karthik FROM feed_posts WHERE author_user_id = v_mohan AND category = 'opportunity' AND content LIKE 'BuildMart Supplies now stocking%' LIMIT 1
  ON CONFLICT DO NOTHING;
  INSERT INTO feed_post_likes (post_id, user_id)
  SELECT id, v_suresh FROM feed_posts WHERE author_user_id = v_mohan AND category = 'opportunity' AND content LIKE 'BuildMart Supplies now stocking%' LIMIT 1
  ON CONFLICT DO NOTHING;
  INSERT INTO feed_post_likes (post_id, user_id)
  SELECT id, v_mohan FROM feed_posts WHERE author_user_id = v_suresh AND category = 'tip' AND content LIKE 'Electrical safety checklist%' LIMIT 1
  ON CONFLICT DO NOTHING;
  INSERT INTO feed_post_likes (post_id, user_id)
  SELECT id, v_rajesh FROM feed_posts WHERE author_user_id = v_suresh AND category = 'tip' AND content LIKE 'Electrical safety checklist%' LIMIT 1
  ON CONFLICT DO NOTHING;
  INSERT INTO feed_post_likes (post_id, user_id)
  SELECT id, v_rajesh FROM feed_posts WHERE author_user_id = v_karthik AND category = 'discussion' AND content LIKE 'Discussion: precast vs cast-in-situ%' LIMIT 1
  ON CONFLICT DO NOTHING;
  INSERT INTO feed_post_likes (post_id, user_id)
  SELECT id, v_mohan FROM feed_posts WHERE author_user_id = v_karthik AND category = 'discussion' AND content LIKE 'Discussion: precast vs cast-in-situ%' LIMIT 1
  ON CONFLICT DO NOTHING;

  -- Keep stored counts consistent with the like/comment rows
  UPDATE feed_posts p SET
    likes_count = (SELECT count(*) FROM feed_post_likes l WHERE l.post_id = p.id),
    comments_count = (SELECT count(*) FROM feed_comments c WHERE c.post_id = p.id);
END $$;
