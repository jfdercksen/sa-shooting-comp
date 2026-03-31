-- Aggregate match definitions: links an aggregate competition_match to its source matches
-- e.g. Grand Aggregate = [Free State Cup, Jack Mitchley, ...]

CREATE TABLE IF NOT EXISTS aggregate_match_sources (
  aggregate_match_id uuid NOT NULL REFERENCES competition_matches(id) ON DELETE CASCADE,
  source_match_id     uuid NOT NULL REFERENCES competition_matches(id) ON DELETE CASCADE,
  PRIMARY KEY (aggregate_match_id, source_match_id)
);

-- Index for fast lookup of sources given an aggregate match
CREATE INDEX IF NOT EXISTS idx_agg_sources_aggregate_id
  ON aggregate_match_sources(aggregate_match_id);
