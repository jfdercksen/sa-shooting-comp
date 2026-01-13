# How to Assign Team Captain Role

There are several ways to give a shooter the `team_captain` role. Choose the method that works best for you.

## Method 1: Using SQL (Supabase Dashboard)

### Step 1: Find the User

Run this query in Supabase SQL Editor to find the shooter:

```sql
-- Find by email
SELECT id, full_names, surname, email, sabu_number, role
FROM profiles
WHERE email = 'shooter@example.com';

-- OR find by SABU number
SELECT id, full_names, surname, email, sabu_number, role
FROM profiles
WHERE sabu_number = 'SABU12345';

-- OR list all shooters
SELECT id, full_names, surname, email, sabu_number, role
FROM profiles
WHERE role = 'shooter'
ORDER BY created_at DESC;
```

### Step 2: Update the Role

Once you have the user's ID, run:

```sql
UPDATE profiles
SET role = 'team_captain'
WHERE id = 'user-id-here';
```

### Step 3: Verify

```sql
SELECT id, full_names, surname, email, role
FROM profiles
WHERE id = 'user-id-here';
```

**Quick SQL Script:** See `assign-team-captain.sql` for ready-to-use queries.

---

## Method 2: Using Command Line Script

### Prerequisites

Make sure you have `.env.local` with your Supabase credentials.

### Usage

```bash
# By email
npx tsx src/scripts/assign-team-captain.ts email shooter@example.com

# By SABU number
npx tsx src/scripts/assign-team-captain.ts sabu SABU12345

# By user ID
npx tsx src/scripts/assign-team-captain.ts id user-uuid-here
```

The script will:
1. Find the user
2. Show their current role
3. Update to `team_captain` if not already set
4. Confirm the update

---

## Method 3: Using Supabase Dashboard (Table Editor)

### Step 1: Open Table Editor

1. Go to your Supabase project dashboard
2. Click on "Table Editor" in the sidebar
3. Select the `profiles` table

### Step 2: Find the User

1. Use the search/filter to find the shooter by:
   - Email
   - SABU number
   - Name

### Step 3: Edit the Role

1. Click on the row for the shooter
2. Find the `role` column
3. Change the value from `shooter` to `team_captain`
4. Click "Save" or press Enter

---

## Method 4: Bulk Assignment (Multiple Users)

If you need to assign multiple users at once:

```sql
-- Update multiple users by their IDs
UPDATE profiles
SET role = 'team_captain'
WHERE id IN (
  'user-id-1',
  'user-id-2',
  'user-id-3'
);

-- Update all users from a specific club
UPDATE profiles
SET role = 'team_captain'
WHERE club = 'Club Name Here';
```

⚠️ **Warning:** Be careful with bulk updates!

---

## Verification

After assigning the role, verify it worked:

### Check in Database

```sql
SELECT 
    id,
    full_names || ' ' || surname as name,
    email,
    sabu_number,
    role
FROM profiles
WHERE role = 'team_captain'
ORDER BY updated_at DESC;
```

### Check in Application

1. Have the user log out and log back in
2. Go to `/dashboard/teams`
3. They should now see the "Create Team" button
4. Check browser console for: `User role: 'team_captain'`

---

## Troubleshooting

### User Still Can't Create Teams

1. **Check role in database:**
   ```sql
   SELECT role FROM profiles WHERE id = 'user-id';
   ```

2. **Check browser console:**
   - Open Developer Tools (F12)
   - Look for `=== TEAMS PAGE DEBUG ===`
   - Check `User role:` value

3. **Clear browser cache:**
   - User should log out and log back in
   - Or clear browser cache/cookies

### Role Not Updating

1. **Check RLS policies:**
   - Make sure you have permission to update profiles
   - If using service role key, RLS is bypassed

2. **Check for errors:**
   - Look at Supabase logs
   - Check console for error messages

### Finding User ID

If you need to find a user's ID:

```sql
-- By email
SELECT id FROM profiles WHERE email = 'shooter@example.com';

-- By SABU number
SELECT id FROM profiles WHERE sabu_number = 'SABU12345';

-- By name
SELECT id FROM profiles 
WHERE full_names ILIKE '%John%' AND surname ILIKE '%Doe%';
```

---

## Available Roles

The system supports these roles:

- `shooter` - Regular shooter (default)
- `team_captain` - Can create and manage teams
- `range_officer` - Range officer
- `stats_officer` - Stats officer
- `admin` - Administrator (full access)
- `super_admin` - Super administrator (full access)

---

## Quick Reference

| Method | Best For | Difficulty |
|--------|----------|------------|
| SQL Editor | One-time updates | Easy |
| Command Script | Quick updates | Easy |
| Table Editor | Visual editing | Very Easy |
| Bulk SQL | Multiple users | Medium |

---

## Next Steps

After assigning the role:

1. ✅ User can create teams at `/dashboard/teams`
2. ✅ User can manage team members
3. ✅ User can invite members by email or SABU number
4. ✅ User can register teams for competitions

For more information, see `TEAMS-DEBUG-GUIDE.md`.

