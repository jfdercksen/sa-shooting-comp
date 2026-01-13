-- Check RLS Policies for Teams Functionality
-- Run this in Supabase SQL Editor

-- 1. Check teams table policies
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
WHERE tablename = 'teams'
ORDER BY policyname;

-- 2. Check team_members table policies
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
WHERE tablename = 'team_members'
ORDER BY policyname;

-- 3. Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename IN ('teams', 'team_members')
AND schemaname = 'public';

-- 4. Check teams data
SELECT 
    id,
    name,
    captain_id,
    province,
    max_members,
    created_at,
    updated_at
FROM teams
ORDER BY created_at DESC
LIMIT 10;

-- 5. Check team_members data
SELECT 
    tm.id,
    tm.team_id,
    tm.user_id,
    tm.joined_at,
    t.name as team_name,
    p.full_names || ' ' || p.surname as member_name,
    p.sabu_number,
    p.email
FROM team_members tm
LEFT JOIN teams t ON tm.team_id = t.id
LEFT JOIN profiles p ON tm.user_id = p.id
ORDER BY tm.joined_at DESC
LIMIT 20;

-- 6. Check team captains
SELECT 
    id,
    full_names,
    surname,
    sabu_number,
    email,
    role,
    created_at
FROM profiles
WHERE role = 'team_captain'
ORDER BY created_at DESC;

-- 7. Check teams with their captains
SELECT 
    t.id as team_id,
    t.name as team_name,
    t.captain_id,
    p.full_names || ' ' || p.surname as captain_name,
    p.email as captain_email,
    p.role as captain_role,
    COUNT(tm.id) as member_count,
    t.max_members
FROM teams t
LEFT JOIN profiles p ON t.captain_id = p.id
LEFT JOIN team_members tm ON t.id = tm.team_id
GROUP BY t.id, t.name, t.captain_id, p.full_names, p.surname, p.email, p.role, t.max_members
ORDER BY t.created_at DESC;

-- 8. Check for teams without captains
SELECT 
    id,
    name,
    captain_id,
    created_at
FROM teams
WHERE captain_id IS NULL;

-- 9. Check for orphaned team members (members without valid team)
SELECT 
    tm.id,
    tm.team_id,
    tm.user_id,
    p.full_names || ' ' || p.surname as member_name
FROM team_members tm
LEFT JOIN teams t ON tm.team_id = t.id
LEFT JOIN profiles p ON tm.user_id = p.id
WHERE t.id IS NULL;

-- 10. Check for duplicate memberships
SELECT 
    team_id,
    user_id,
    COUNT(*) as duplicate_count,
    array_agg(id) as membership_ids
FROM team_members
GROUP BY team_id, user_id
HAVING COUNT(*) > 1;

