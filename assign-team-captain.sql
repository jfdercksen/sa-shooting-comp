-- Assign Team Captain Role to a Shooter
-- Run this in Supabase SQL Editor

-- Method 1: By User ID (if you know the user's auth ID)
UPDATE profiles
SET role = 'team_captain'
WHERE id = 'user-id-here';

-- Method 2: By Email
UPDATE profiles
SET role = 'team_captain'
WHERE email = 'shooter@example.com';

-- Method 3: By SABU Number
UPDATE profiles
SET role = 'team_captain'
WHERE sabu_number = 'SABU12345';

-- Method 4: View all shooters first, then update
-- First, see all shooters:
SELECT 
    id,
    full_names || ' ' || surname as name,
    email,
    sabu_number,
    role,
    created_at
FROM profiles
WHERE role = 'shooter'
ORDER BY created_at DESC;

-- Then update the specific one:
UPDATE profiles
SET role = 'team_captain'
WHERE id = 'user-id-from-above-query';

-- Verify the update:
SELECT 
    id,
    full_names || ' ' || surname as name,
    email,
    sabu_number,
    role
FROM profiles
WHERE id = 'user-id-here';

