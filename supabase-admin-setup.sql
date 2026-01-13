-- ============================================
-- Supabase Admin Setup Script
-- ============================================
-- This script helps you set up admin access for testing
-- 
-- IMPORTANT: Replace 'your-email@example.com' with your actual email address
-- ============================================

-- Step 1: Find your user by email
-- Uncomment and run this first to find your user ID:
-- SELECT id, email, created_at FROM auth.users WHERE email = 'your-email@example.com';

-- Step 2: Update your user to super_admin role
-- Replace 'paste-user-id-here' with the ID from Step 1
-- UPDATE profiles 
-- SET role = 'super_admin'
-- WHERE id = 'paste-user-id-here';

-- Alternative: Update by email directly (if email matches)
-- UPDATE profiles 
-- SET role = 'super_admin'
-- WHERE id IN (
--   SELECT id FROM auth.users WHERE email = 'your-email@example.com'
-- );

-- Step 3: Verify the update
-- SELECT 
--   p.id,
--   u.email,
--   p.role,
--   p.full_names,
--   p.surname
-- FROM profiles p
-- JOIN auth.users u ON p.id = u.id
-- WHERE u.email = 'your-email@example.com';

-- ============================================
-- Quick Setup (All in One)
-- ============================================
-- Replace 'your-email@example.com' with your email and run:

UPDATE profiles 
SET role = 'super_admin'
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'your-email@example.com'
);

-- Verify:
SELECT 
  p.id,
  u.email,
  p.role,
  p.full_names,
  p.surname,
  p.sabu_number
FROM profiles p
JOIN auth.users u ON p.id = u.id
WHERE u.email = 'your-email@example.com';

