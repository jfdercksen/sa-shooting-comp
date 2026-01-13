/**
 * Check Auth Trigger Script
 * 
 * Verifies that the auth trigger for profile creation exists and is working.
 * 
 * Usage:
 *   npm run check-trigger
 * 
 * Requirements:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY (in .env.local)
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function checkAuthTrigger() {
  console.log('🔍 Checking Auth Trigger Status...\n')
  console.log('  ⚠️  Note: Direct trigger checking requires Supabase SQL Editor')
  console.log('  This script checks for symptoms of missing trigger instead.\n')

  try {
    // Check if we can query the profiles table
    console.log('📋 Step 1: Checking profiles table accessibility...')
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)

    if (profilesError) {
      console.error('  ❌ Cannot access profiles table:', profilesError.message)
      return
    } else {
      console.log('  ✓ Profiles table is accessible')
    }

    // Check for users without profiles
    console.log('\n📋 Step 2: Checking for users without profiles...')
    const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers()
    
    if (usersError) {
      console.error('  ❌ Cannot list users:', usersError.message)
      return
    } else {
      const users = usersData?.users || []
      console.log(`  ✓ Found ${users.length} auth users`)
      
      if (users.length > 0) {
        const userIds = users.map(u => u.id)
        const { data: existingProfiles } = await supabase
          .from('profiles')
          .select('id')
          .in('id', userIds)

        const profileIds = new Set(existingProfiles?.map(p => p.id) || [])
        const missingProfiles = users.filter(u => !profileIds.has(u.id))

        if (missingProfiles.length > 0) {
          console.log(`\n  ⚠️  Found ${missingProfiles.length} users without profiles:`)
          missingProfiles.slice(0, 10).forEach((user, index) => {
            console.log(`    ${index + 1}. ${user.email} (${user.id.substring(0, 8)}...)`)
          })
          if (missingProfiles.length > 10) {
            console.log(`    ... and ${missingProfiles.length - 10} more`)
          }
          console.log('\n  💡 This suggests the trigger may not be working.')
          console.log('  💡 Run the SQL from supabase-auth-trigger.sql to fix this.')
        } else {
          console.log('  ✅ All users have profiles - trigger appears to be working!')
        }
      }
    }

    // Test: Check recent users
    console.log('\n📋 Step 3: Checking recent user registrations...')
    const { data: recentUsersData } = await supabase.auth.admin.listUsers()
    const recentUsers = recentUsersData?.users || []
    
    if (recentUsers.length > 0) {
      const recentUser = recentUsers[0]
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', recentUser.id)
        .single()

      if (profile) {
        console.log('  ✅ Most recent user has a profile')
        console.log(`     User: ${recentUser.email}`)
        console.log(`     Profile: ${profile.full_names} ${profile.surname}`)
      } else {
        console.log('  ❌ Most recent user does NOT have a profile')
        console.log(`     User: ${recentUser.email}`)
        console.log('  💡 This confirms the trigger is not working')
      }
    }

    // Summary
    console.log('\n📊 Summary:')
    console.log('  To fix the trigger:')
    console.log('  1. Open Supabase Dashboard')
    console.log('  2. Go to SQL Editor')
    console.log('  3. Run the SQL from: supabase-auth-trigger.sql')
    console.log('  4. Or use the Supabase CLI: supabase db reset')
    console.log('\n  The trigger should automatically create profiles when users sign up.')

  } catch (error: any) {
    console.error('\n❌ Error checking trigger:', error.message || error)
    console.log('\n💡 Manual Check Instructions:')
    console.log('  1. Open Supabase Dashboard')
    console.log('  2. Go to SQL Editor')
    console.log('  3. Run: SELECT * FROM pg_trigger WHERE tgname = \'on_auth_user_created\';')
    console.log('  4. If empty, run the SQL from supabase-auth-trigger.sql')
  }
}

// Run the script
if (require.main === module) {
  checkAuthTrigger()
    .then(() => {
      console.log('\n✅ Check completed!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Check failed:', error)
      process.exit(1)
    })
}

export { checkAuthTrigger }

