# Database Function Security Audit Guide

This guide helps you audit and fix security issues with database functions, specifically addressing mutable `search_path` vulnerabilities.

## Why This Matters

Functions without an explicit `search_path` may be vulnerable to schema injection attacks where an attacker could manipulate the search path to execute malicious code.

## Quick Fix

### Option 1: Run the SQL Script (Recommended)

1. **Open Supabase SQL Editor**
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor

2. **Run the Fix Script**
   - Open `fix-function-security.sql`
   - Copy the entire contents
   - Paste into SQL Editor
   - Click "Run"

3. **Verify the Fix**
   - Review the output from Step 6 in the script
   - All functions should show "✅ search_path configured"

### Option 2: Manual Fix

If you prefer to fix functions one by one:

```sql
-- 1. List all custom functions
SELECT 
  n.nspname as schemaname,
  p.proname as functionname,
  pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prokind = 'f'
ORDER BY p.proname;

-- 2. Fix each function
ALTER FUNCTION public.handle_new_user() SET search_path = 'public';
ALTER FUNCTION public.calculate_age_classification(DATE) SET search_path = 'public';

-- 3. Remove unnecessary functions (if any)
DROP FUNCTION IF EXISTS public.broadcast_changes_trigger();
```

## Functions to Fix

### 1. `handle_new_user()`
This is the auth trigger function that creates profiles when users sign up.

```sql
ALTER FUNCTION public.handle_new_user() SET search_path = 'public';
```

### 2. `calculate_age_classification(DATE)` (if exists)
This function may calculate age classifications for shooters.

```sql
ALTER FUNCTION public.calculate_age_classification(DATE) SET search_path = 'public';
```

### 3. `broadcast_changes_trigger()` (if exists)
This function is often created by Supabase Realtime but may not be needed. If you're not using Realtime broadcasts, you can remove it:

```sql
DROP FUNCTION IF EXISTS public.broadcast_changes_trigger();
```

## Verification

After running the fixes, verify with:

```sql
SELECT 
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  CASE 
    WHEN p.proconfig IS NULL THEN '⚠️  No search_path set'
    WHEN array_to_string(p.proconfig, ', ') LIKE '%search_path%' THEN '✅ search_path configured'
    ELSE '⚠️  Other config: ' || array_to_string(p.proconfig, ', ')
  END as security_status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prokind = 'f'
ORDER BY p.proname;
```

All functions should show "✅ search_path configured".

## Using the Audit Script

You can also run the TypeScript audit script:

```bash
npm run audit-function-security
```

This will:
- Generate a SQL script with all necessary fixes
- Provide instructions for manual execution
- List all functions that need attention

## Prevention

To prevent this issue in the future:

1. **Always set search_path when creating functions:**
   ```sql
   CREATE FUNCTION my_function() ...
   ALTER FUNCTION my_function() SET search_path = 'public';
   ```

2. **Update existing SQL files:**
   - The `supabase-auth-trigger.sql` file has been updated to include the search_path fix
   - Any new functions should follow this pattern

3. **Regular audits:**
   - Run the audit script periodically
   - Check Supabase security warnings
   - Review function definitions

## Related Files

- `fix-function-security.sql` - Complete SQL script to fix all functions
- `src/scripts/audit-function-security.ts` - TypeScript audit script
- `supabase-auth-trigger.sql` - Updated to include search_path fix

## Security Best Practices

1. ✅ Always set explicit `search_path` for functions
2. ✅ Use `SECURITY DEFINER` only when necessary
3. ✅ Regularly audit database functions
4. ✅ Remove unused functions
5. ✅ Review Supabase security warnings

## Need Help?

If you encounter issues:

1. Check Supabase logs for errors
2. Verify function names match exactly (including parameter types)
3. Ensure you have proper permissions
4. Review the function definitions in Step 1 of the SQL script

