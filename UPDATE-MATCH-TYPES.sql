-- Copy and paste this entire script into Supabase SQL Editor
-- Go to: Supabase Dashboard > SQL Editor > New Query
-- Then paste this and click "Run"

-- Step 1: Add new enum values (300M, 600M, 800M, 900M)
DO $$ 
BEGIN
  -- Add '300M' if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = '300M' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'match_type')
  ) THEN
    ALTER TYPE match_type ADD VALUE '300M';
  END IF;
  
  -- Add '600M' if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = '600M' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'match_type')
  ) THEN
    ALTER TYPE match_type ADD VALUE '600M';
  END IF;
  
  -- Add '800M' if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = '800M' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'match_type')
  ) THEN
    ALTER TYPE match_type ADD VALUE '800M';
  END IF;
  
  -- Add '900M' if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = '900M' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'match_type')
  ) THEN
    ALTER TYPE match_type ADD VALUE '900M';
  END IF;
END $$;

-- Step 2: Update all existing matches to use '300M' as default
-- (You can manually update specific matches later if needed)
UPDATE competition_matches 
SET match_type = '300M'::match_type
WHERE match_type NOT IN ('300M', '600M', '800M', '900M');

-- Step 3: Verify the update
SELECT DISTINCT match_type, COUNT(*) as count
FROM competition_matches
GROUP BY match_type
ORDER BY match_type;

