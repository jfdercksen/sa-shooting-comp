# Admin User Management Guide

## Overview

The Admin User Management page allows administrators to view all users, search/filter them, and assign roles including **Team Captain**.

## Access

1. Log in as an admin (`admin` or `super_admin` role)
2. Go to `/admin` (Admin Dashboard)
3. Click on "Total Active Shooters" card, or
4. Navigate directly to `/admin/users`

## Features

### 1. View All Users

- See all registered users in a table
- View user details: name, email, SABU number, club, province, role
- Role statistics at the top showing count for each role

### 2. Search Users

Search by:
- Name (first or last)
- Email address
- SABU number
- Club name

### 3. Filter by Role

Filter users by role:
- All Roles
- Shooter
- Team Captain
- Range Officer
- Stats Officer
- Admin
- Super Admin

### 4. Assign Team Captain Role

**Steps:**

1. **Find the user:**
   - Use search to find by name, email, or SABU number
   - Or filter by "Shooter" role to see all regular shooters

2. **Click "Change Role":**
   - Click the "Change Role" button next to the user

3. **Select Team Captain:**
   - A modal will open showing current role
   - Select "Team Captain" from the role options
   - Click "Update Role"

4. **Confirm:**
   - The role is updated immediately
   - User will see "Create Team" button after logging out and back in

### 5. Change Any Role

You can assign any role:
- **Shooter** - Regular shooter (default)
- **Team Captain** - Can create and manage teams
- **Range Officer** - Range officer permissions
- **Stats Officer** - Stats officer permissions
- **Admin** - Full admin access
- **Super Admin** - Super admin access

## Role Colors

Roles are color-coded for easy identification:
- 🟦 **Team Captain** - Blue
- 🟩 **Range Officer** - Green
- 🟪 **Stats Officer** - Purple
- 🟨 **Admin** - Amber
- 🟥 **Super Admin** - Red
- ⚪ **Shooter** - Gray

## Quick Actions

### Assign Multiple Team Captains

1. Filter by "Shooter" role
2. Search for specific users (by club, province, etc.)
3. Assign Team Captain role one by one

### Find All Team Captains

1. Filter by "Team Captain" role
2. See all current team captains
3. Can change their role if needed

### Verify Role Assignment

1. After assigning role, check the role badge in the table
2. User should log out and log back in
3. They should see "Create Team" button at `/dashboard/teams`

## Troubleshooting

### User Still Can't Create Teams

1. **Check role in table:**
   - Verify role shows "Team Captain" in the users table

2. **User must log out/in:**
   - Role changes require a new session
   - Have user log out and log back in

3. **Check browser console:**
   - User should see `User role: 'team_captain'` in console
   - Check `/dashboard/teams` page console logs

### Can't See Users Page

1. **Check your role:**
   - Must be `admin` or `super_admin`
   - Check your profile: `SELECT role FROM profiles WHERE id = 'your-id';`

2. **Check navigation:**
   - Admin menu should show "Admin Dashboard"
   - Click "Total Active Shooters" card

### Role Update Fails

1. **Check RLS policies:**
   - Admins should have UPDATE permission on profiles table
   - Check Supabase dashboard for RLS policies

2. **Check error message:**
   - Look for specific error in toast notification
   - Check browser console for details

## Best Practices

1. **Document Changes:**
   - Keep track of who you assign Team Captain role to
   - Note why they were assigned (club captain, team leader, etc.)

2. **Verify Before Assigning:**
   - Check user's profile to ensure they're active
   - Verify they have completed registration

3. **Regular Audits:**
   - Periodically review Team Captains
   - Remove role if user is no longer active

4. **Bulk Operations:**
   - For multiple assignments, use the SQL script: `assign-team-captain.sql`
   - Or use the command-line script: `npm run assign-captain`

## Related Files

- **Admin Page:** `src/app/(dashboard)/admin/users/page.tsx`
- **SQL Script:** `assign-team-captain.sql`
- **CLI Script:** `src/scripts/assign-team-captain.ts`
- **Guide:** `ASSIGN-TEAM-CAPTAIN.md`

## Security Notes

- Only users with `admin` or `super_admin` role can access this page
- Role changes are logged in the database
- Users must re-authenticate to see role changes
- RLS policies protect against unauthorized role changes

