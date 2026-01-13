# Auth Trigger Setup Guide

This guide helps you verify and set up the authentication trigger that automatically creates user profiles when new users sign up.

## Problem

When users register through the `/register` page, a profile should be automatically created in the `profiles` table. If this isn't happening, the auth trigger is missing or not working.

## Quick Check

Run the check script:
```bash
npm run check-trigger
```

Or manually check in Supabase SQL Editor:
```sql
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```

## Solution

### Option 1: Using Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Go to your project dashboard
   - Navigate to SQL Editor

2. **Run the SQL Script**
   - Open `supabase-auth-trigger.sql`
   - Copy the entire script
   - Paste into SQL Editor
   - Click "Run"

3. **Verify**
   - Run the verification query at the bottom of the script
   - Should show the trigger is enabled

### Option 2: Using Supabase CLI

If you have Supabase CLI installed:

```bash
# Connect to your project
supabase link --project-ref dcmbbafkqemxxctozick

# Run the migration
supabase db push
```

Or create a migration file:
```bash
supabase migration new create_auth_trigger
# Then paste the SQL from supabase-auth-trigger.sql
supabase db push
```

## What the Trigger Does

The `handle_new_user()` function:
- Automatically creates a profile when a new user signs up
- Extracts user metadata (full_names, surname, role) from signup
- Sets default role to 'shooter' if not specified
- Handles conflicts gracefully (won't duplicate if profile exists)

## Troubleshooting

### Trigger Not Firing

1. **Check if trigger exists:**
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
   ```

2. **Check if function exists:**
   ```sql
   SELECT * FROM pg_proc WHERE proname = 'handle_new_user';
   ```

3. **Check trigger is enabled:**
   ```sql
   SELECT tgenabled FROM pg_trigger WHERE tgname = 'on_auth_user_created';
   -- Should return 'O' for enabled
   ```

### Users Without Profiles

If you have existing users without profiles:

```sql
-- Find users without profiles
SELECT u.id, u.email, u.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- Manually create profiles for existing users (if needed)
-- This should be done carefully, one at a time
```

### Testing the Trigger

1. Create a test user via the registration form
2. Check if profile was created:
   ```sql
   SELECT * FROM profiles WHERE email = 'test@example.com';
   ```
3. If profile exists, trigger is working!

## Manual Profile Creation (Fallback)

If the trigger isn't working and you need to create profiles manually:

```sql
-- For a specific user
INSERT INTO public.profiles (
  id,
  full_names,
  surname,
  email,
  role
)
SELECT 
  id,
  COALESCE(raw_user_meta_data->>'full_names', 'User'),
  COALESCE(raw_user_meta_data->>'surname', ''),
  email,
  COALESCE((raw_user_meta_data->>'role')::user_role, 'shooter')
FROM auth.users
WHERE email = 'user@example.com'
ON CONFLICT (id) DO NOTHING;
```

## Security Note

The trigger function uses `SECURITY DEFINER`, which means it runs with the privileges of the function creator (usually a superuser). This is necessary to insert into the `profiles` table, which may have RLS policies that prevent regular users from inserting.

## Related Files

- `supabase-auth-trigger.sql` - SQL script to create the trigger
- `src/scripts/check-auth-trigger.ts` - Script to check trigger status
- `src/app/(auth)/register/page.tsx` - Registration page that should trigger profile creation

