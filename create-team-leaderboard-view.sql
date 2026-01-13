-- Create team_leaderboard view for team results aggregation
-- This view aggregates verified scores by team and calculates team totals
-- For teams with 4 members, uses best 3 scores

CREATE OR REPLACE VIEW team_leaderboard AS
WITH team_scores AS (
  SELECT 
    r.team_id,
    r.competition_id,
    r.discipline_id,
    r.user_id,
    -- Aggregate all stage scores for this registration
    SUM(CASE WHEN s.is_dnf = false AND s.is_dq = false THEN s.score ELSE 0 END) AS total_score,
    SUM(CASE WHEN s.is_dnf = false AND s.is_dq = false THEN COALESCE(s.x_count, 0) ELSE 0 END) AS total_x_count,
    SUM(CASE WHEN s.is_dnf = false AND s.is_dq = false THEN COALESCE(s.v_count, 0) ELSE 0 END) AS total_v_count,
    BOOL_OR(s.is_dnf = true) AS has_dnf,
    BOOL_OR(s.is_dq = true) AS has_dq
  FROM registrations r
  INNER JOIN scores s ON s.registration_id = r.id
  WHERE r.team_id IS NOT NULL
    AND s.verified_at IS NOT NULL
    AND r.registration_status = 'confirmed'
  GROUP BY r.team_id, r.competition_id, r.discipline_id, r.user_id
),
ranked_scores AS (
  SELECT 
    ts.*,
    ROW_NUMBER() OVER (
      PARTITION BY ts.team_id, ts.competition_id, ts.discipline_id 
      ORDER BY ts.total_score DESC, ts.total_x_count DESC, ts.total_v_count DESC
    ) AS score_rank
  FROM team_scores ts
),
team_totals AS (
  SELECT 
    rs.team_id,
    rs.competition_id,
    rs.discipline_id,
    -- For teams with 4 members, take best 3 scores
    -- Otherwise, take all scores
    SUM(CASE WHEN rs.score_rank <= 3 THEN rs.total_score ELSE 0 END) AS team_total_score,
    SUM(CASE WHEN rs.score_rank <= 3 THEN rs.total_x_count ELSE 0 END) AS team_total_x,
    SUM(CASE WHEN rs.score_rank <= 3 THEN rs.total_v_count ELSE 0 END) AS team_total_v,
    COUNT(*) AS member_count,
    COUNT(CASE WHEN rs.score_rank <= 3 THEN 1 END) AS scores_counted
  FROM ranked_scores rs
  GROUP BY rs.team_id, rs.competition_id, rs.discipline_id
)
SELECT 
  tt.team_id,
  tt.competition_id,
  tt.discipline_id,
  t.name AS team_name,
  t.province,
  tt.team_total_score AS total_score,
  tt.team_total_x AS total_x_count,
  tt.team_total_v AS total_v_count,
  tt.member_count,
  tt.scores_counted,
  c.name AS competition_name,
  d.name AS discipline_name
FROM team_totals tt
INNER JOIN teams t ON t.id = tt.team_id
INNER JOIN competitions c ON c.id = tt.competition_id
INNER JOIN disciplines d ON d.id = tt.discipline_id;

-- Grant access to authenticated users
GRANT SELECT ON team_leaderboard TO authenticated;

-- Add comment
COMMENT ON VIEW team_leaderboard IS 'Aggregated team leaderboard showing team totals for verified scores. For teams with 4 members, uses best 3 scores.';

