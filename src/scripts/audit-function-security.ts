/**
 * Database Function Security Audit Script
 * 
 * This script audits and fixes security issues with database functions,
 * specifically checking for mutable search_path settings.
 * 
 * Run with: npm run audit-function-security
 * Or: tsx src/scripts/audit-function-security.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { readFileSync } from 'fs'
import { join } from 'path'

// Load environment variables
dotenv.config({ path: join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

interface FunctionInfo {
  schemaname: string
  functionname: string
  definition: string
  search_path: string | null
}

async function auditFunctions() {
  console.log('🔍 Starting database function security audit...\n')

  try {
    // Query to get all custom functions in the public schema
    const query = `
      SELECT 
        n.nspname as schemaname,
        p.proname as functionname,
        pg_get_functiondef(p.oid) as definition,
        (
          SELECT setting 
          FROM pg_settings 
          WHERE name = 'search_path'
        ) as current_search_path
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
        AND p.prokind = 'f'
        AND p.prosrc NOT LIKE '%pg_catalog%'
      ORDER BY p.proname;
    `

    console.log('📋 Querying database for custom functions...')
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: query,
    })

    if (error) {
      // If exec_sql doesn't exist, try direct query
      console.log('⚠️  Direct RPC not available, using alternative method...')
      console.log('\n📝 Please run this query manually in Supabase SQL Editor:\n')
      console.log(query)
      console.log('\n')
      return
    }

    // If we can't use RPC, provide manual instructions
    console.log('\n📝 MANUAL AUDIT INSTRUCTIONS:\n')
    console.log('Since we cannot execute arbitrary SQL queries directly,')
    console.log('please run the following queries in your Supabase SQL Editor:\n')
    console.log('=' .repeat(80))
    console.log('\n1️⃣  STEP 1: List all custom functions\n')
    console.log(`
SELECT 
  n.nspname as schemaname,
  p.proname as functionname,
  pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prokind = 'f'
ORDER BY p.proname;
    `)

    console.log('\n2️⃣  STEP 2: Fix search_path for each function\n')
    console.log('For each function found, run:\n')
    console.log('ALTER FUNCTION public.function_name() SET search_path = \'public\';\n')

    console.log('3️⃣  STEP 3: Common functions to fix\n')
    console.log('-- Fix handle_new_user function')
    console.log("ALTER FUNCTION public.handle_new_user() SET search_path = 'public';\n")

    console.log('-- Fix calculate_age_classification if it exists')
    console.log("ALTER FUNCTION public.calculate_age_classification(DATE) SET search_path = 'public';\n")

    console.log('4️⃣  STEP 4: Remove broadcast_changes_trigger if not needed\n')
    console.log('DROP FUNCTION IF EXISTS public.broadcast_changes_trigger();\n')

    console.log('=' .repeat(80))
    console.log('\n✅ After running these commands, verify with:\n')
    console.log(`
SELECT 
  p.proname as function_name,
  pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prokind = 'f';
    `)

  } catch (error: any) {
    console.error('❌ Error during audit:', error.message)
    process.exit(1)
  }
}

// Generate SQL fix script
function generateFixScript() {
  console.log('\n📄 Generating SQL fix script...\n')
  
  const sqlScript = `-- ============================================
-- Database Function Security Fix Script
-- ============================================
-- This script fixes mutable search_path security issues
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: List all custom functions (for reference)
SELECT 
  n.nspname as schemaname,
  p.proname as functionname,
  pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prokind = 'f'
ORDER BY p.proname;

-- Step 2: Fix search_path for handle_new_user function
ALTER FUNCTION public.handle_new_user() 
SET search_path = 'public';

-- Step 3: Fix calculate_age_classification if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'calculate_age_classification'
      AND pg_get_function_arguments(p.oid) = 'date_of_birth date'
  ) THEN
    ALTER FUNCTION public.calculate_age_classification(DATE) 
    SET search_path = 'public';
    RAISE NOTICE 'Fixed calculate_age_classification function';
  ELSE
    RAISE NOTICE 'calculate_age_classification function not found';
  END IF;
END $$;

-- Step 4: Remove broadcast_changes_trigger if it exists and is not needed
-- (Uncomment if you want to remove it)
-- DROP FUNCTION IF EXISTS public.broadcast_changes_trigger();

-- Step 5: Fix any other custom functions
-- Replace 'your_function_name' with actual function names found in Step 1
-- ALTER FUNCTION public.your_function_name() SET search_path = 'public';

-- Step 6: Verify fixes
SELECT 
  p.proname as function_name,
  CASE 
    WHEN p.proconfig IS NULL THEN 'No search_path set'
    ELSE array_to_string(p.proconfig, ', ')
  END as search_path_config
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prokind = 'f'
ORDER BY p.proname;

-- ============================================
-- Security Note
-- ============================================
-- Setting search_path = 'public' ensures functions only look in the
-- public schema, preventing potential security vulnerabilities from
-- schema injection attacks.
-- ============================================
`

  const fs = require('fs')
  const path = require('path')
  const scriptPath = path.join(process.cwd(), 'fix-function-security.sql')
  
  fs.writeFileSync(scriptPath, sqlScript, 'utf-8')
  console.log(`✅ SQL script generated: ${scriptPath}`)
  console.log('\n📋 Next steps:')
  console.log('1. Open Supabase SQL Editor')
  console.log('2. Copy and paste the contents of fix-function-security.sql')
  console.log('3. Review the script')
  console.log('4. Run the script')
  console.log('5. Verify the fixes were applied\n')
}

// Main execution
async function main() {
  console.log('🔒 Database Function Security Audit\n')
  console.log('This script will help you audit and fix security issues')
  console.log('with database functions (mutable search_path).\n')

  await auditFunctions()
  generateFixScript()

  console.log('\n✅ Audit complete!')
  console.log('📝 Review the generated SQL script and run it in Supabase SQL Editor.\n')
}

main().catch((error) => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})

