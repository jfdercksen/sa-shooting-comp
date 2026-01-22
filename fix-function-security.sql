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
-- Check if function exists first, then fix it
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'handle_new_user'
  ) THEN
    -- Function exists, get its signature and fix it
    -- Try common signatures
    IF EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
        AND p.proname = 'handle_new_user'
        AND pg_get_function_arguments(p.oid) = ''
    ) THEN
      ALTER FUNCTION public.handle_new_user() SET search_path = 'public';
      RAISE NOTICE 'Fixed handle_new_user() function';
    ELSE
      -- Try to get the actual signature and fix it dynamically
      EXECUTE (
        SELECT 'ALTER FUNCTION public.handle_new_user(' || 
               pg_get_function_arguments(p.oid) || 
               ') SET search_path = ''public'''
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
          AND p.proname = 'handle_new_user'
        LIMIT 1
      );
      RAISE NOTICE 'Fixed handle_new_user function with custom signature';
    END IF;
  ELSE
    RAISE NOTICE 'handle_new_user function not found - it may not have been created yet';
    RAISE NOTICE 'If you need this function, run supabase-auth-trigger.sql first';
  END IF;
END $$;

-- Step 3: Fix calculate_age_classification if it exists
-- This function may have been created for age classification logic
DO $$
DECLARE
  func_signature text;
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'calculate_age_classification'
  ) THEN
    -- Get the actual function signature dynamically
    SELECT pg_get_function_arguments(p.oid)
    INTO func_signature
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'calculate_age_classification'
    LIMIT 1;
    
    -- Fix the function with its actual signature
    IF func_signature IS NOT NULL THEN
      EXECUTE format('ALTER FUNCTION public.calculate_age_classification(%s) SET search_path = ''public''', func_signature);
      RAISE NOTICE 'Fixed calculate_age_classification(%) function', func_signature;
    END IF;
  ELSE
    RAISE NOTICE 'calculate_age_classification function not found';
  END IF;
END $$;

-- Step 4: Remove broadcast_changes_trigger if it exists and is not needed
-- This function is often created by Supabase Realtime but may not be needed
-- Uncomment the line below if you want to remove it
-- DROP FUNCTION IF EXISTS public.broadcast_changes_trigger();

-- Step 5: Automatically fix ALL remaining custom functions
-- This will set search_path for any functions that don't have it set yet
DO $$
DECLARE
  func_record RECORD;
  func_signature text;
BEGIN
  FOR func_record IN
    SELECT 
      p.proname as func_name,
      pg_get_function_arguments(p.oid) as func_args,
      p.oid as func_oid
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      -- Only fix functions that don't already have search_path set
      AND (p.proconfig IS NULL OR NOT (p.proconfig::text[] && ARRAY['search_path=public']))
      -- Exclude functions we already fixed
      AND p.proname NOT IN ('handle_new_user', 'calculate_age_classification')
  LOOP
    func_signature := func_record.func_args;
    
    BEGIN
      IF func_signature = '' OR func_signature IS NULL THEN
        -- Function with no parameters
        EXECUTE format('ALTER FUNCTION public.%I() SET search_path = ''public''', func_record.func_name);
      ELSE
        -- Function with parameters - need to preserve the signature
        EXECUTE format('ALTER FUNCTION public.%I(%s) SET search_path = ''public''', 
                       func_record.func_name, func_signature);
      END IF;
      
      RAISE NOTICE 'Fixed function: public.%(%)', func_record.func_name, COALESCE(func_signature, 'no params');
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Could not fix function public.%(%): %', 
                    func_record.func_name, 
                    COALESCE(func_signature, 'no params'),
                    SQLERRM;
    END;
  END LOOP;
END $$;

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

