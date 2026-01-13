# Teams Functionality Debug Guide

This guide helps you debug issues with the teams functionality.

## Quick Debug Steps

### 1. Run the Debug Script

```bash
npm run debug-teams
```

This will show:
- All teams in the database
- All team memberships
- All team captains
- Common issues (orphaned members, duplicates, etc.)

### 2. Check Browser Console

When using the teams page (`/dashboard/teams`), open your browser's Developer Console (F12) and look for:

- `=== TEAMS PAGE DEBUG ===` - Shows user role and permissions
- `=== LOAD DATA DEBUG ===` - Shows data loading process
- `=== CREATE TEAM DEBUG ===` - Shows team creation process
- `=== ADD MEMBER DEBUG ===` - Shows member addition process

### 3. Check Database Directly

Run these SQL queries in Supabase SQL Editor:

```sql
-- See all teams
SELECT * FROM teams;

-- See all team members
SELECT * FROM team_members;

-- See team captains
SELECT * FROM profiles WHERE role = 'team_captain';

-- See teams with details
SELECT 
    t.*,
    p.full_names || ' ' || p.surname as captain_name,
    COUNT(tm.id) as member_count
FROM teams t
LEFT JOIN profiles p ON t.captain_id = p.id
LEFT JOIN team_members tm ON t.id = tm.team_id
GROUP BY t.id, p.full_names, p.surname;
```

### 4. Check RLS Policies

Run `check-teams-rls.sql` in Supabase SQL Editor to see all RLS policies.

**Required RLS Policies:**

#### Teams Table:
- **SELECT**: All authenticated users should be able to view teams they're members of or captains of
- **INSERT**: Users with `role = 'team_captain'` should be able to create teams
- **UPDATE**: Team captains should be able to update their teams
- **DELETE**: Team captains should be able to delete their teams

#### Team Members Table:
- **SELECT**: Team members and captains should be able to view team memberships
- **INSERT**: Team captains should be able to add members
- **DELETE**: Team captains should be able to remove members

### 5. Common Issues and Solutions

#### Issue: "Create Team" button not visible

**Check:**
1. User role in console: `console.log('User role:', user?.role)`
2. Should be `'team_captain'`
3. Check profile in database: `SELECT role FROM profiles WHERE id = 'your-user-id';`

**Solution:**
- Update user role: `UPDATE profiles SET role = 'team_captain' WHERE id = 'your-user-id';`

#### Issue: Team creation fails

**Check:**
1. Browser console for error details
2. Network tab for API response
3. Check RLS policies allow INSERT for team_captain role

**Common Errors:**
- `new row violates row-level security policy` → RLS policy issue
- `foreign key constraint violation` → captain_id doesn't exist in profiles
- `duplicate key value` → Team name already exists (if unique constraint)

#### Issue: Can't add team members

**Check:**
1. Browser console for member search results
2. Verify user exists: `SELECT * FROM profiles WHERE email = 'user@example.com' OR sabu_number = '12345';`
3. Check if user is already a member: `SELECT * FROM team_members WHERE team_id = 'team-id' AND user_id = 'user-id';`
4. Check team capacity: `SELECT member_count, max_members FROM teams WHERE id = 'team-id';`

**Common Errors:**
- `User not found` → User doesn't exist in profiles table
- `User is already a team member` → Already added
- `Team is full` → Reached max_members limit
- `new row violates row-level security policy` → RLS policy issue

#### Issue: Teams not loading

**Check:**
1. Browser console for load errors
2. Verify user is authenticated
3. Check if user is member or captain of any teams
4. Check RLS policies allow SELECT

**Debug Query:**
```sql
-- Check if user is member or captain
SELECT 
    'captain' as type,
    t.id as team_id,
    t.name as team_name
FROM teams t
WHERE t.captain_id = 'your-user-id'
UNION ALL
SELECT 
    'member' as type,
    t.id as team_id,
    t.name as team_name
FROM team_members tm
JOIN teams t ON tm.team_id = t.id
WHERE tm.user_id = 'your-user-id';
```

### 6. Test Flow

1. **Create Team:**
   - Log in as user with `role = 'team_captain'`
   - Go to `/dashboard/teams`
   - Click "Create Team"
   - Fill in form and submit
   - Check console for debug logs
   - Verify team appears in database

2. **Add Member:**
   - Click "Manage" on a team
   - Go to "Members" tab
   - Try adding by email or SABU number
   - Check console for debug logs
   - Verify member appears in `team_members` table

3. **View Teams:**
   - Log in as any user
   - Go to `/dashboard/teams`
   - Should see teams where user is captain or member
   - Check console for load debug logs

### 7. Error Messages Reference

| Error | Cause | Solution |
|-------|-------|----------|
| `new row violates row-level security policy` | RLS policy blocking operation | Update RLS policies |
| `foreign key constraint violation` | Referenced ID doesn't exist | Verify foreign key exists |
| `duplicate key value` | Unique constraint violation | Use different value |
| `permission denied` | User doesn't have required role | Update user role |
| `User not found` | Profile doesn't exist | Create profile first |
| `Team is full` | Max members reached | Remove members or increase limit |

### 8. SQL to Fix Common Issues

```sql
-- Make a user a team captain
UPDATE profiles SET role = 'team_captain' WHERE id = 'user-id';

-- Remove duplicate memberships
DELETE FROM team_members
WHERE id IN (
    SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY team_id, user_id ORDER BY joined_at) as rn
        FROM team_members
    ) t WHERE rn > 1
);

-- Fix orphaned team members (remove memberships for deleted teams)
DELETE FROM team_members
WHERE team_id NOT IN (SELECT id FROM teams);

-- Increase team capacity
UPDATE teams SET max_members = 20 WHERE id = 'team-id';
```

## Next Steps

If you're still experiencing issues:

1. Share the console logs from browser
2. Share the output from `npm run debug-teams`
3. Share any error messages from the network tab
4. Check Supabase logs for server-side errors

