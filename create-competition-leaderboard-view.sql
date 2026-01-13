-- Create competition_leaderboard view for live leaderboard display
-- This view aggregates verified scores by registration and calculates totals

CREATE OR REPLACE VIEW competition_leaderboard AS
SELECT 
  r.id AS registration_id,
  r.user_id,
  r.competition_id,
  r.discipline_id,
  r.age_classification,
  r.team_id,
  p.full_names,
  p.surname,
  p.sabu_number,
  p.club,
  p.province,
  d.name AS discipline_name,
  t.name AS team_name,
  -- Aggregate scores
  SUM(CASE WHEN s.is_dnf = false AND s.is_dq = false THEN s.score ELSE 0 END) AS total_score,
  SUM(CASE WHEN s.is_dnf = false AND s.is_dq = false THEN COALESCE(s.x_count, 0) ELSE 0 END) AS total_x_count,
  SUM(CASE WHEN s.is_dnf = false AND s.is_dq = false THEN COALESCE(s.v_count, 0) ELSE 0 END) AS total_v_count,
  BOOL_OR(s.is_dnf = true) AS has_dnf,
  BOOL_OR(s.is_dq = true) AS has_dq,
  -- Stage scores as JSON object (optional - can be expanded)
  jsonb_object_agg(
    CASE WHEN s.stage_id IS NOT NULL THEN st.stage_number::text ELSE NULL END,
    CASE WHEN s.is_dnf = false AND s.is_dq = false THEN s.score ELSE NULL END
  ) FILTER (WHERE s.stage_id IS NOT NULL AND s.is_dnf = false AND s.is_dq = false) AS stage_scores
FROM registrations r
INNER JOIN profiles p ON r.user_id = p.id
INNER JOIN disciplines d ON r.discipline_id = d.id
LEFT JOIN teams t ON r.team_id = t.id
INNER JOIN scores s ON s.registration_id = r.id
LEFT JOIN stages st ON s.stage_id = st.id
WHERE s.verified_at IS NOT NULL
  AND r.registration_status = 'confirmed'
GROUP BY 
  r.id,
  r.user_id,
  r.competition_id,
  r.discipline_id,
  r.age_classification,
  r.team_id,
  p.full_names,
  p.surname,
  p.sabu_number,
  p.club,
  p.province,
  d.name,
  t.name;

-- Grant access to authenticated users
GRANT SELECT ON competition_leaderboard TO authenticated;

-- Add comment
COMMENT ON VIEW competition_leaderboard IS 'Aggregated leaderboard view showing total scores, X counts, and V counts per registration for verified scores only';

