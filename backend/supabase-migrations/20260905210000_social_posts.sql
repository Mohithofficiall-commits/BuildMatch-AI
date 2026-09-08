-- =========================================================
-- SOCIAL POST SYSTEM ENHANCEMENTS
-- Extends the network feed into a full professional post
-- system: rich media, visibility, location, project tagging,
-- hashtags, mentions, replies, saves, reposts, editing and
-- media storage. Safe to run standalone or after
-- 20260905200000_network_feed.sql (all additions are additive).
-- =========================================================

-- ---------- feed_posts: rich-post columns ----------
ALTER TABLE feed_posts
  ADD COLUMN IF NOT EXISTS media jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS project_title text,
  ADD COLUMN IF NOT EXISTS hashtags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS mentions jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS edited_at timestamptz,
  ADD COLUMN IF NOT EXISTS repost_of uuid REFERENCES feed_posts(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS repost_caption text;

-- ---------- feed_comments: threaded replies ----------
ALTER TABLE feed_comments
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES feed_comments(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_feed_comments_parent ON feed_comments(parent_id);

-- ---------- feed_post_saves ----------
CREATE TABLE IF NOT EXISTS feed_post_saves (
  post_id uuid NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_feed_saves_user ON feed_post_saves(user_id);

ALTER TABLE feed_post_saves ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fps_select" ON feed_post_saves;
CREATE POLICY "fps_select" ON feed_post_saves FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "fps_insert" ON feed_post_saves;
CREATE POLICY "fps_insert" ON feed_post_saves FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "fps_delete" ON feed_post_saves;
CREATE POLICY "fps_delete" ON feed_post_saves FOR DELETE TO anon, authenticated USING (true);

-- ---------- media storage bucket ----------
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-media', 'post-media', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "pm_select" ON storage.objects;
CREATE POLICY "pm_select" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'post-media');
DROP POLICY IF EXISTS "pm_insert" ON storage.objects;
CREATE POLICY "pm_insert" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'post-media');
DROP POLICY IF EXISTS "pm_delete" ON storage.objects;
CREATE POLICY "pm_delete" ON storage.objects FOR DELETE TO anon, authenticated USING (bucket_id = 'post-media');

-- =========================================================
-- SEED: feature-rich demo posts (hashtags, mentions, project,
-- multi-image media, location) authored by seeded identities
-- =========================================================
DO $$
DECLARE
  v_karthik uuid; v_rajesh uuid; v_suresh uuid;
BEGIN
  SELECT id INTO v_karthik FROM app_users WHERE email = 'karthik@buildmatch.ai' LIMIT 1;
  SELECT id INTO v_rajesh FROM app_users WHERE email = 'rajesh@buildmatch.ai' LIMIT 1;
  SELECT id INTO v_suresh FROM app_users WHERE email = 'spark@buildmatch.ai' LIMIT 1;

  -- Karthik: multi-image site progress with hashtags, project + location
  IF NOT EXISTS (SELECT 1 FROM feed_posts WHERE author_user_id = v_karthik AND content LIKE 'First-floor slab ready%') THEN
    INSERT INTO feed_posts (author_user_id, author_name, author_role, author_title, author_photo_url, author_verified,
      category, content, media, visibility, location, project_id, project_title, hashtags, mentions, created_at)
    SELECT v_karthik, 'Er. S. Karthik', 'engineer', 'Senior Civil Engineer · Structural & Residential Construction', '/people/engineer-1.jpg', true,
      'project_update',
      'First-floor slab is ready for the concrete pour at Dream Home. Reinforcement inspected and signed off this morning — rebar spacing, cover blocks and lapping all within spec. Great coordination with the site crew. #SiteProgress #StructuralEngineering #DreamHome',
      '[{"type":"image","url":"/project/construction-2.jpg"},{"type":"image","url":"/project/materials-1.jpg"}]'::jsonb,
      'public', 'Coimbatore, Tamil Nadu', id, 'Dream Home — 2BHK Modern',
      ARRAY['SiteProgress','StructuralEngineering','DreamHome'], '[]'::jsonb,
      now() - interval '26 hours'
    FROM projects WHERE id = (SELECT id FROM projects WHERE engineer_id = 'e2000000-0000-0000-0000-000000000001' ORDER BY created_at LIMIT 1);
  END IF;

  -- Rajesh: tip with hashtags + a mention of Suresh
  IF NOT EXISTS (SELECT 1 FROM feed_posts WHERE author_user_id = v_rajesh AND content LIKE 'Leak-proof bathroom tip%') THEN
    INSERT INTO feed_posts (author_user_id, author_name, author_role, author_title, author_photo_url, author_verified,
      category, content, visibility, location, hashtags, mentions, created_at)
    VALUES (v_rajesh, 'Rajesh Kumar', 'plumber', 'Master Plumber · Rajesh Plumbing Services', '/people/plumber-1.jpg', true,
      'tip',
      'Leak-proof bathroom tip: slope the shower floor at 1:60 to the drain and waterproof 300mm up every wall before tiling. Coordinate the drain position with @Suresh Kumar before the slab pour — retrofitting a drain after casting is a nightmare. #Plumbing #BathroomDesign #SiteTips',
      'public', 'Coimbatore', ARRAY['Plumbing','BathroomDesign','SiteTips'],
      '[{"name":"Suresh Kumar","role":"electrician"}]'::jsonb,
      now() - interval '2 days 12 hours');
  END IF;

  -- =========================================================
  -- SEED: notifications for the demo engineer (bell preview)
  -- =========================================================
  IF v_karthik IS NOT NULL AND NOT EXISTS (SELECT 1 FROM notifications WHERE user_id = v_karthik AND title = 'Suresh Kumar liked your post') THEN
    INSERT INTO notifications (user_id, type, title, message, read, link, created_at) VALUES
      (v_karthik, 'like', 'Suresh Kumar liked your post', 'Suresh Kumar liked your project update “Site update — Dream Home”.', false, '/app/engineer', now() - interval '2 hours'),
      (v_karthik, 'comment', 'Rajesh Kumar commented on your post', 'Rajesh Kumar: “Roofing looks great, Karthik! Bathroom plumbing rough-in is complete.”', false, '/app/engineer', now() - interval '1 hour'),
      (v_karthik, 'mention', 'Mohan Lal mentioned you', 'Mohan Lal mentioned you in a comment about precast vs cast-in-situ.', true, '/app/engineer', now() - interval '1 day'),
      (v_karthik, 'system', 'Verification approved', 'Your identity verification was approved. Your Verified badge is now live.', false, '/app/engineer/verification', now() - interval '3 days');
  END IF;
END $$;
