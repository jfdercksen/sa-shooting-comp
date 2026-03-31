-- Configurable team top-N scoring rule per discipline per competition
-- NULL = count all team members (default behaviour)
-- e.g. 3 = top 3 scores count (classic "top 3 of 4" rule)

ALTER TABLE competition_disciplines
  ADD COLUMN IF NOT EXISTS team_top_n integer NULL;
