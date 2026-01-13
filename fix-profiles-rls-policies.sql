-- Fix RLS Policies for Profiles Table to Allow Admins to Update Roles
-- Run this in Supabase SQL Editor

-- 1. Check current RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- 2. Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename = 'profiles'
AND schemaname = 'public';

-- 3. Drop existing UPDATE policies if they exist (optional - only if you want to recreate)
-- DROP POLICY IF EXISTS "Admins can update profiles" ON profiles;
-- DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- 4. Create policy for admins to update any profile
CREATE POLICY "Admins can update any profile"
ON profiles
FOR UPDATE
TO authenticated
USING (
  -- Allow if user is admin or super_admin
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
)
WITH CHECK (
  -- Same check for WITH CHECK
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
);

-- 5. Create policy for users to update their own profile (except role)
CREATE POLICY "Users can update own profile"
ON profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid()
  -- Prevent users from changing their own role
  AND (
    role = (SELECT role FROM profiles WHERE id = auth.uid())
    OR role IS NULL
  )
);

-- 6. Verify policies were created
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'profiles'
AND cmd = 'UPDATE'
ORDER BY policyname;

-- 7. Test query (run as admin user)
-- This should return true if policies work:
-- SELECT EXISTS (
--   SELECT 1 FROM profiles
--   WHERE id = auth.uid()
--   AND role IN ('admin', 'super_admin')
-- );

