-- Simple SQL script to update match_type enum
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- Step 1: Add new enum values to the existing enum
DO $$ 
BEGIN
  -- Add new values if they don't already exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = '300M' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'match_type')
  ) THEN
    ALTER TYPE match_type ADD VALUE '300M';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = '600M' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'match_type')
  ) THEN
    ALTER TYPE match_type ADD VALUE '600M';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = '800M' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'match_type')
  ) THEN
    ALTER TYPE match_type ADD VALUE '800M';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = '900M' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'match_type')
  ) THEN
    ALTER TYPE match_type ADD VALUE '900M';
  END IF;
END $$;

-- Step 2: Update existing matches to use 300M as default
-- (You can manually review and update specific matches if needed)
UPDATE competition_matches 
SET match_type = '300M'::match_type
WHERE match_type NOT IN ('300M', '600M', '800M', '900M');

-- Step 3: Verify the update
SELECT DISTINCT match_type, COUNT(*) as count
FROM competition_matches
GROUP BY match_type
ORDER BY match_type;

-- Note: The old enum values (SCOTTISH_SWORD, etc.) will still exist in the enum
-- but won't be used. You can optionally remove them later if needed.
-- To remove old values, you would need to recreate the enum type, which is more complex.

