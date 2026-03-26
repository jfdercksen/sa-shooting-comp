-- Per-event shot configuration overrides on match_stages
-- Run this in Supabase SQL Editor
--
-- These three columns allow rounds, sighters, and max score per shot
-- to vary between events while keeping the stage as a reusable template.
-- NULL = inherit from the stage definition (stages.rounds / sighters / max_score).

ALTER TABLE match_stages
  ADD COLUMN IF NOT EXISTS rounds      int,   -- override scoring shots (NULL = use stage default)
  ADD COLUMN IF NOT EXISTS sighters    int,   -- override practice shots (NULL = use stage default)
  ADD COLUMN IF NOT EXISTS max_score   int;   -- override max points per shot (NULL = use stage default)
