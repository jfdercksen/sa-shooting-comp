-- Replace old distance-based match_type enum with a text column
-- for proper match type classification: individual, team, aggregate, progressive

-- Drop the old enum-based column (safe — old values were distance names, not meaningful data)
ALTER TABLE competition_matches DROP COLUMN IF EXISTS match_type;

-- Add new text column with check constraint
ALTER TABLE competition_matches
  ADD COLUMN match_type text NOT NULL DEFAULT 'individual'
  CHECK (match_type IN ('individual', 'team', 'aggregate', 'progressive'));
