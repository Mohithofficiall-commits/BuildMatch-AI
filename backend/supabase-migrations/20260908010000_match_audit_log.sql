-- ============================================================
-- MATCH AUDIT LOG — records every explainable-match invocation
-- for accountability, debugging, and future ML training data.
-- ============================================================

CREATE TABLE IF NOT EXISTS match_logs (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id      UUID NOT NULL,
  requirement   JSONB NOT NULL,
  top_engineer  UUID REFERENCES engineers(id),
  top_engineer_score  INTEGER,
  total_engineers     INTEGER DEFAULT 0,
  total_professionals INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Only the service role (Edge Functions) inserts; anyone authenticated can read their own matches.
ALTER TABLE match_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can insert match logs"
  ON match_logs FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read match logs"
  ON match_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX idx_match_logs_match_id ON match_logs(match_id);
CREATE INDEX idx_match_logs_created  ON match_logs(created_at DESC);
