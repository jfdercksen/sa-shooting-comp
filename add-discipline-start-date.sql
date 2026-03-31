-- Per-discipline start date within an event
-- NULL = uses the competition's own start_date (default behaviour)
-- e.g. F-Sport starts 3 days into the SA Open while TR/F-TR/F-Open start on day 1

ALTER TABLE competition_disciplines
  ADD COLUMN IF NOT EXISTS start_date date NULL;
