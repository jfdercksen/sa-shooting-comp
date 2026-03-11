-- ============================================================
-- Restructure: Stages → Disciplines, Matches → Stage Selection
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. Clean all existing stage and score data (clean slate)
DELETE FROM scores;
DELETE FROM match_stages; -- safe to run even if table doesn't exist yet
DELETE FROM stages;

-- 2. Modify stages table
--    - Remove competition_id (stages now belong only to disciplines)
--    - Remove stage_date (no longer needed on stages)
--    - Change distance from integer to text (free-form, e.g. "300m", "Long Range")
--    - Make discipline_id required
ALTER TABLE stages
  DROP COLUMN IF EXISTS competition_id,
  DROP COLUMN IF EXISTS stage_date,
  ALTER COLUMN distance TYPE text USING distance::text,
  ALTER COLUMN stage_number SET DEFAULT 1;

ALTER TABLE stages ALTER COLUMN discipline_id SET NOT NULL;

-- 3. Modify competition_matches
--    - Drop match_type enum column
--    - Add free-form distance text column
ALTER TABLE competition_matches
  ADD COLUMN IF NOT EXISTS distance text;

ALTER TABLE competition_matches
  DROP COLUMN IF EXISTS match_type;

-- 4. Create match_stages join table
--    Links a match to a stage for a specific discipline.
--    UNIQUE(match_id, discipline_id) enforces one stage per discipline per match.
CREATE TABLE IF NOT EXISTS match_stages (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id      uuid NOT NULL REFERENCES competition_matches(id) ON DELETE CASCADE,
  stage_id      uuid NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
  discipline_id uuid NOT NULL REFERENCES disciplines(id) ON DELETE CASCADE,
  created_at    timestamptz DEFAULT now(),
  UNIQUE(match_id, discipline_id)
);

-- RLS for match_stages: allow admins to write, authenticated users to read
ALTER TABLE match_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage match_stages"
  ON match_stages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Authenticated users can read match_stages"
  ON match_stages FOR SELECT
  USING (auth.role() = 'authenticated');

-- 5. Add match_id to scores (links a score to the specific match it was shot in)
ALTER TABLE scores
  ADD COLUMN IF NOT EXISTS match_id uuid REFERENCES competition_matches(id);

-- 6. Drop match_type enum now that it is no longer referenced
DROP TYPE IF EXISTS match_type;
