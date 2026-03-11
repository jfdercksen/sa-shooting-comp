-- Add discipline_id to stages table to allow per-discipline stages
ALTER TABLE stages ADD COLUMN discipline_id UUID REFERENCES disciplines(id) ON DELETE CASCADE;

-- Add comment for documentation
COMMENT ON COLUMN stages.discipline_id IS 'Optional link to a specific discipline. If NULL, the stage is shared by all disciplines in the competition.';

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_stages_discipline_id ON stages(discipline_id);
