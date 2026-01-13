# Role Update Troubleshooting Guide

If role updates aren't working in the admin panel, follow these steps:

## Step 1: Check Browser Console

1. Open `/admin/users` page
2. Open Developer Console (F12)
3. Try to update a role
4. Look for `=== ROLE UPDATE DEBUG ===` logs
5. Check for any error messages

## Step 2: Check Your Admin Role

Verify you're logged in as an admin:

```sql
-- Check your role
SELECT id, email, role 
FROM profiles 
WHERE id = auth.uid();
```

You should see `role` as `'admin'` or `'super_admin'`.

If not, update it:
```sql
UPDATE profiles 
SET role = 'admin' 
WHERE id = auth.uid();
```

## Step 3: Check RLS Policies

The most common issue is RLS policies blocking updates.

### Check Current Policies

Run in Supabase SQL Editor:

```sql
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'profiles'
AND cmd = 'UPDATE';
```

### Fix RLS Policies

Run `fix-profiles-rls-policies.sql` in Supabase SQL Editor. This will:

1. Create a policy allowing admins to update any profile
2. Create a policy allowing users to update their own profile (but not role)
3. Verify policies are created correctly

## Step 4: Test Update Directly

Try updating a role directly in SQL:

```sql
-- Replace 'user-id-here' with actual user ID
UPDATE profiles
SET role = 'team_captain'
WHERE id = 'user-id-here'
RETURNING id, full_names, surname, role;
```

If this works, the issue is with the application code.
If this fails, the issue is with RLS policies or permissions.

## Step 5: Check Error Messages

Common errors and solutions:

### Error: "Permission denied" (42501)
**Solution:** RLS policy is blocking. Run `fix-profiles-rls-policies.sql`

### Error: "No rows updated" (PGRST301)
**Solution:** RLS policy is blocking OR user doesn't exist. Check:
- User exists: `SELECT * FROM profiles WHERE id = 'user-id';`
- RLS policies allow UPDATE

### Error: "new row violates row-level security policy"
**Solution:** The WITH CHECK clause is blocking. Update RLS policy to allow role changes.

### No Error, But Role Doesn't Change
**Solution:** 
1. Check browser console for silent failures
2. Verify RLS policies allow UPDATE
3. Check if update actually happened: `SELECT role FROM profiles WHERE id = 'user-id';`
4. Refresh the page after update

## Step 6: Verify Update Worked

After updating, check the database:

```sql
SELECT id, full_names, surname, email, role
FROM profiles
WHERE id = 'user-id-here';
```

The `role` should be updated.

## Step 7: Force Refresh

If the UI doesn't update:
1. Hard refresh the page (Ctrl+F5 or Cmd+Shift+R)
2. Check if the role changed in database
3. Clear browser cache if needed

## Quick Fix Script

If you have service role access, you can bypass RLS temporarily:

```sql
-- This bypasses RLS (use service role key)
-- Only for testing!
UPDATE profiles
SET role = 'team_captain'
WHERE id = 'user-id-here';
```

## Still Not Working?

1. **Check Supabase Logs:**
   - Go to Supabase Dashboard → Logs
   - Look for errors related to profiles table updates

2. **Check Network Tab:**
   - Open Developer Tools → Network tab
   - Try updating a role
   - Check the request/response
   - Look for error status codes

3. **Verify Table Structure:**
   ```sql
   SELECT column_name, data_type, is_nullable
   FROM information_schema.columns
   WHERE table_name = 'profiles'
   AND column_name = 'role';
   ```

4. **Check Constraints:**
   ```sql
   SELECT conname, contype, pg_get_constraintdef(oid)
   FROM pg_constraint
   WHERE conrelid = 'profiles'::regclass;
   ```

## Expected Behavior

When working correctly:
1. Click "Change Role" → Modal opens
2. Select new role → Click "Update Role"
3. See success toast: "Role updated to Team Captain"
4. Modal closes
5. Table refreshes showing new role
6. Console shows: "Update successful! Updated user: {...}"

## Contact Support

If none of these steps work, provide:
1. Browser console logs (especially `=== ROLE UPDATE DEBUG ===`)
2. Network tab request/response
3. Supabase logs
4. RLS policy output from Step 3

