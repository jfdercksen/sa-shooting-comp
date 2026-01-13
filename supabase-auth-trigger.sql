-- ============================================
-- Auth Trigger for Profile Creation
-- ============================================
-- This trigger automatically creates a profile when a new user signs up
-- ============================================

-- Step 1: Check if trigger exists
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  proname as function_name,
  tgenabled as enabled
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname = 'on_auth_user_created';

-- Step 2: Check if function exists
SELECT 
  proname as function_name,
  prosrc as function_body
FROM pg_proc
WHERE proname = 'handle_new_user';

-- ============================================
-- If trigger/function is missing, run below:
-- ============================================

-- Drop existing if any
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create function
CREATE OR REPLACE FUNCTION handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    full_names, 
    surname,
    email,
    role,
    created_at
  )
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_names', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'surname', ''),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'shooter'),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================
-- Verify trigger was created
-- ============================================
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  proname as function_name,
  CASE tgenabled 
    WHEN 'O' THEN 'Enabled'
    WHEN 'D' THEN 'Disabled'
    ELSE 'Unknown'
  END as status
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname = 'on_auth_user_created';

-- ============================================
-- Test the trigger (optional)
-- ============================================
-- Note: This is just for verification, don't run in production
-- The trigger will fire automatically when new users sign up

