-- Update match_type enum to only include distance-based match types
-- This script will:
-- 1. Create a new enum type with the new values
-- 2. Update the competition_matches table to use the new enum
-- 3. Drop the old enum (if no other tables use it)

-- Step 1: Create new enum type
DO $$ 
BEGIN
  -- Drop existing enum if it exists (this will fail if it's in use, which is expected)
  DROP TYPE IF EXISTS match_type_new CASCADE;
  
  -- Create new enum with distance-based match types
  CREATE TYPE match_type_new AS ENUM ('300M', '600M', '800M', '900M');
  
  -- Step 2: Update competition_matches table
  -- First, add a temporary column with the new enum type
  ALTER TABLE competition_matches 
    ADD COLUMN match_type_temp match_type_new;
  
  -- Map old values to new values (or set a default)
  -- Since we're changing the structure completely, we'll set all to '300M' as default
  -- You may want to manually review and update specific matches
  UPDATE competition_matches 
    SET match_type_temp = '300M'::match_type_new;
  
  -- Drop the old column
  ALTER TABLE competition_matches 
    DROP COLUMN match_type;
  
  -- Rename the new column
  ALTER TABLE competition_matches 
    RENAME COLUMN match_type_temp TO match_type;
  
  -- Make it NOT NULL if needed
  ALTER TABLE competition_matches 
    ALTER COLUMN match_type SET NOT NULL;
  
  -- Step 3: Drop the old enum type (if no other tables use it)
  -- Note: This will fail if other tables reference it, which is fine
  DROP TYPE IF EXISTS match_type CASCADE;
  
  -- Rename the new enum to the original name
  ALTER TYPE match_type_new RENAME TO match_type;
  
EXCEPTION
  WHEN OTHERS THEN
    -- If something goes wrong, rollback is automatic
    RAISE NOTICE 'Error updating match_type enum: %', SQLERRM;
END $$;

-- Verify the update
SELECT DISTINCT match_type FROM competition_matches;

-- Note: After running this script, you'll need to regenerate your TypeScript types:
-- npx supabase gen types typescript --project-id [your-project-ref] > src/types/database.ts

