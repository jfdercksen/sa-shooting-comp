-- Add is_warmup flag to competition_matches
-- Warm-up matches (e.g. Scottish Sword) are excluded from all standings and aggregates

ALTER TABLE competition_matches
  ADD COLUMN IF NOT EXISTS is_warmup boolean NOT NULL DEFAULT false;
