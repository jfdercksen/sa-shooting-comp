/**
 * Script to update match_type enum in Supabase
 * This script uses the service role key to update the database enum
 * 
 * Run with: npm run update-match-types
 * Or: tsx src/scripts/update-match-types.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase environment variables')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function updateMatchTypes() {
  console.log('Starting match type update...')

  try {
    // Step 1: Check current match types
    console.log('\n1. Checking current match types...')
    const { data: currentMatches, error: checkError } = await supabase
      .from('competition_matches')
      .select('match_type')
      .limit(10)

    if (checkError) {
      console.error('Error checking matches:', checkError)
    } else {
      const uniqueTypes = [...new Set(currentMatches?.map(m => m.match_type) || [])]
      console.log('Current match types in use:', uniqueTypes)
    }

    // Step 2: Update all existing matches to use '300M' as default
    // (You'll need to manually review and update specific matches if needed)
    console.log('\n2. Updating existing matches to 300M...')
    const { error: updateError } = await supabase.rpc('exec_sql', {
      sql: `
        -- First, let's see what we're working with
        SELECT DISTINCT match_type FROM competition_matches;
        
        -- Update all matches to 300M temporarily
        -- Note: This requires the enum to already include '300M'
        -- If the enum doesn't exist yet, you'll need to update it in Supabase SQL Editor first
      `
    })

    if (updateError) {
      console.log('Note: Direct RPC update not available. Please use SQL Editor.')
      console.log('\nPlease run this SQL in Supabase SQL Editor:')
      console.log(`
-- Step 1: Add new enum values (if they don't exist)
-- First, check if we can alter the enum
DO $$ 
BEGIN
  -- Try to add new values to existing enum
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = '300M' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'match_type')) THEN
    ALTER TYPE match_type ADD VALUE '300M';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = '600M' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'match_type')) THEN
    ALTER TYPE match_type ADD VALUE '600M';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = '800M' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'match_type')) THEN
    ALTER TYPE match_type ADD VALUE '800M';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = '900M' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'match_type')) THEN
    ALTER TYPE match_type ADD VALUE '900M';
  END IF;
END $$;

-- Step 2: Update existing matches to use 300M (or review and update manually)
UPDATE competition_matches 
SET match_type = '300M'::match_type
WHERE match_type NOT IN ('300M', '600M', '800M', '900M');

-- Step 3: Verify
SELECT DISTINCT match_type FROM competition_matches;
      `)
    }

    console.log('\n✅ Match type update instructions provided.')
    console.log('\nNext steps:')
    console.log('1. Go to Supabase Dashboard > SQL Editor')
    console.log('2. Run the SQL provided above')
    console.log('3. After updating, regenerate types: npx supabase gen types typescript --project-id dcmbbafkqemxxctozick > src/types/database.ts')

  } catch (error: any) {
    console.error('Error:', error.message)
    process.exit(1)
  }
}

updateMatchTypes()

