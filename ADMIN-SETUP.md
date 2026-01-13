# Admin Access Setup Guide

This guide will help you set up admin access for testing the SA Bisley Union shooting competition system.

## Option 1: Update Existing User (SQL Script)

### Quick Setup

1. Open your Supabase dashboard SQL Editor
2. Open the file `supabase-admin-setup.sql`
3. Replace `'your-email@example.com'` with your actual email address
4. Run the SQL script

```sql
UPDATE profiles 
SET role = 'super_admin'
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'your-email@example.com'
);
```

5. Verify the update:
```sql
SELECT 
  p.id,
  u.email,
  p.role,
  p.full_names,
  p.surname
FROM profiles p
JOIN auth.users u ON p.id = u.id
WHERE u.email = 'your-email@example.com';
```

## Option 2: Create Dedicated Admin Account (TypeScript Script)

### Prerequisites

- Node.js installed
- Environment variables set in `.env.local`:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`

### Steps

1. **Update the admin configuration** in `src/scripts/create-admin.ts`:
   ```typescript
   const ADMIN_CONFIG = {
     email: 'admin@sa-bisley-union.local',
     password: 'Admin123!@#', // Change this!
     fullNames: 'Admin',
     surname: 'User',
     sabuNumber: 'ADMIN001',
     mobileNumber: '+27123456789',
     province: 'Gauteng',
     club: 'SA Bisley Union',
   }
   ```

2. **Install tsx** (if not already installed):
   ```bash
   npm install -D tsx
   ```

3. **Run the script**:
   ```bash
   npx tsx src/scripts/create-admin.ts
   ```

   OR if you have ts-node:
   ```bash
   npx ts-node src/scripts/create-admin.ts
   ```

4. **Log in** with the credentials shown in the output

## Option 3: Verify Admin Access

After setting up admin access, visit:

**http://localhost:3000/admin/test**

This page will show:
- Your current user email
- Your current role
- List of all admin routes
- Quick links to admin functions
- Access status (granted/denied)

## Admin Roles

- **super_admin**: Full access to all admin functions including user management and site settings
- **admin**: Access to competitions, disciplines, news, score verification, and contact submissions

## Available Admin Routes

- `/admin` - Dashboard with statistics
- `/admin/competitions` - Manage competitions
- `/admin/disciplines` - Manage disciplines
- `/admin/news` - Manage news posts
- `/admin/verify-scores` - Verify submitted scores
- `/admin/users` - Manage users (super_admin only)
- `/admin/contact-submissions` - View contact submissions
- `/admin/settings` - Site settings (super_admin only)

## Troubleshooting

### "You do not have admin access"
- Verify your role in the database: Check the `profiles` table
- Make sure you're logged in with the correct account
- Try logging out and logging back in

### Script fails with "Missing environment variables"
- Ensure `.env.local` exists in the project root
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set (not the anon key!)
- Restart your development server after adding env variables

### User already exists error
- The script will automatically update existing users to super_admin
- Or use Option 1 (SQL script) to update manually

## Security Notes

⚠️ **IMPORTANT**: 
- The `SUPABASE_SERVICE_ROLE_KEY` bypasses all Row Level Security (RLS)
- Never commit this key to version control
- Only use the admin creation script in development/testing
- Change default passwords after first login
- Remove test admin accounts before production deployment

