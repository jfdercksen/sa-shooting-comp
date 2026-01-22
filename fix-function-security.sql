-- ============================================
-- Database Function Security Fix Script
-- ============================================
-- This script fixes mutable search_path security issues
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: List all custom functions (for reference)
-- Review this output to see all functions in your database
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
-- This is the auth trigger function that creates profiles
ALTER FUNCTION public.handle_new_user() 
SET search_path = 'public';

-- Step 3: Fix calculate_age_classification if it exists
-- This function may have been created for age classification logic
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'calculate_age_classification'
  ) THEN
    -- Try different function signatures
    IF EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
        AND p.proname = 'calculate_age_classification'
        AND pg_get_function_arguments(p.oid) = 'date_of_birth date'
    ) THEN
      ALTER FUNCTION public.calculate_age_classification(DATE) 
      SET search_path = 'public';
      RAISE NOTICE 'Fixed calculate_age_classification(DATE) function';
    END IF;
    
    -- Check for other signatures
    IF EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
        AND p.proname = 'calculate_age_classification'
        AND pg_get_function_arguments(p.oid) = 'birth_date date'
    ) THEN
      ALTER FUNCTION public.calculate_age_classification(birth_date DATE) 
      SET search_path = 'public';
      RAISE NOTICE 'Fixed calculate_age_classification(birth_date DATE) function';
    END IF;
  ELSE
    RAISE NOTICE 'calculate_age_classification function not found';
  END IF;
END $$;

-- Step 4: Remove broadcast_changes_trigger if it exists and is not needed
-- This function is often created by Supabase Realtime but may not be needed
-- Uncomment the line below if you want to remove it
-- DROP FUNCTION IF EXISTS public.broadcast_changes_trigger();

-- Step 5: Fix any other custom functions found in Step 1
-- After reviewing Step 1 output, add ALTER FUNCTION statements here
-- Example:
-- ALTER FUNCTION public.your_function_name() SET search_path = 'public';
-- ALTER FUNCTION public.your_function_name(param_type) SET search_path = 'public';

-- Step 6: Verify fixes were applied
-- Check that search_path is set for all functions
SELECT 
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  CASE 
    WHEN p.proconfig IS NULL THEN '⚠️  No search_path set'
    WHEN array_to_string(p.proconfig, ', ') LIKE '%search_path%' THEN '✅ search_path configured'
    ELSE '⚠️  Other config: ' || array_to_string(p.proconfig, ', ')
  END as security_status,
  pg_get_functiondef(p.oid) as definition
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
--
-- Functions without an explicit search_path may be vulnerable to
-- search_path manipulation attacks where an attacker could inject
-- malicious functions or objects into the search path.
-- ============================================

