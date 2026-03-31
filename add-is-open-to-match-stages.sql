-- Add is_open flag to match_stages
-- Controls whether a distance is open for score entry on the day
-- Admin toggles this during the event as each distance opens and closes

ALTER TABLE match_stages
  ADD COLUMN IF NOT EXISTS is_open boolean NOT NULL DEFAULT false;
