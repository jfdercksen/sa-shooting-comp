-- Configurable tiebreak method per discipline
-- score_x_v = Score → X-count → V-bulls (default, used by pistol/other disciplines)
-- score_v   = Score → V-bulls only (SA Open TR / F-class disciplines, no X-count used)

ALTER TABLE disciplines
  ADD COLUMN IF NOT EXISTS tiebreak_method text NOT NULL DEFAULT 'score_x_v'
  CHECK (tiebreak_method IN ('score_v', 'score_x_v'));
