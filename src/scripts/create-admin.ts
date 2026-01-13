/**
 * Admin Account Creation Script
 * 
 * This script creates a dedicated admin account for testing.
 * 
 * Usage:
 * 1. Set environment variables:
 *    - NEXT_PUBLIC_SUPABASE_URL
 *    - SUPABASE_SERVICE_ROLE_KEY (server-side only!)
 * 
 * 2. Update the admin details below
 * 
 * 3. Run: npx tsx src/scripts/create-admin.ts
 *    OR: ts-node src/scripts/create-admin.ts
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') })

// ============================================
// CONFIGURATION - Update these values
// ============================================
const ADMIN_CONFIG = {
  email: 'johan@aiautomations.co.za',
  password: 'Johan.123', // Change this to a secure password
  fullNames: 'Johan',
  surname: 'Dercksen',
  sabuNumber: 'ADMIN001',
  mobileNumber: '+27827728254',
  province: 'Gauteng',
  club: 'SA Bisley Union',
}

// ============================================
// Script Execution
// ============================================

async function createAdminAccount() {
  // Validate environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing required environment variables:')
    console.error('   - NEXT_PUBLIC_SUPABASE_URL')
    console.error('   - SUPABASE_SERVICE_ROLE_KEY')
    console.error('\nMake sure these are set in your .env.local file')
    process.exit(1)
  }

  // Create Supabase client with service role (bypasses RLS)
  const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  try {
    console.log('🚀 Creating admin account...')
    console.log(`📧 Email: ${ADMIN_CONFIG.email}`)

    // Step 1: Check if user already exists
    const { data: usersList, error: listError } = await supabase.auth.admin.listUsers()
    
    if (listError) {
      console.error('❌ Error listing users:', listError)
      throw listError
    }

    const existingUser = usersList?.users?.find(u => u.email === ADMIN_CONFIG.email)
    
    if (existingUser) {
      console.log('⚠️  User already exists. Updating to super_admin...')
      
      // Update profile role
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ role: 'super_admin' })
        .eq('id', existingUser.id)

      if (updateError) {
        console.error('❌ Error updating profile:', updateError)
        throw updateError
      }

      console.log('✅ User updated to super_admin successfully!')
      console.log(`\n📋 User Details:`)
      console.log(`   ID: ${existingUser.id}`)
      console.log(`   Email: ${existingUser.email}`)
      console.log(`   Role: super_admin`)
      return
    }

    // Step 2: Create auth user
    console.log('📝 Creating authentication user...')
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: ADMIN_CONFIG.email,
      password: ADMIN_CONFIG.password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_names: ADMIN_CONFIG.fullNames,
        surname: ADMIN_CONFIG.surname,
      },
    })

    if (authError) {
      console.error('❌ Error creating auth user:', authError)
      throw authError
    }

    if (!authData.user) {
      throw new Error('Failed to create user')
    }

    console.log('✅ Auth user created successfully!')

    // Step 3: Create profile with super_admin role
    console.log('👤 Creating profile...')
    const { error: profileError } = await supabase.from('profiles').insert({
      id: authData.user.id,
      email: ADMIN_CONFIG.email,
      full_names: ADMIN_CONFIG.fullNames,
      surname: ADMIN_CONFIG.surname,
      sabu_number: ADMIN_CONFIG.sabuNumber,
      mobile_number: ADMIN_CONFIG.mobileNumber,
      province: ADMIN_CONFIG.province,
      club: ADMIN_CONFIG.club,
      role: 'super_admin',
      age_classification: 'Open',
      shoulder_preference: 'right',
      sa_citizen: true,
      first_sa_championships: false,
    })

    if (profileError) {
      console.error('❌ Error creating profile:', profileError)
      
      // Try to clean up auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authData.user.id)
      throw profileError
    }

    console.log('✅ Profile created successfully!')

    // Step 4: Success summary
    console.log('\n🎉 Admin account created successfully!')
    console.log('\n📋 Account Details:')
    console.log(`   Email: ${ADMIN_CONFIG.email}`)
    console.log(`   Password: ${ADMIN_CONFIG.password}`)
    console.log(`   Role: super_admin`)
    console.log(`   User ID: ${authData.user.id}`)
    console.log('\n⚠️  IMPORTANT: Change the password after first login!')
    console.log('\n🔗 You can now log in at: /login')

  } catch (error: any) {
    console.error('\n❌ Failed to create admin account:')
    console.error(error.message || error)
    process.exit(1)
  }
}

// Run the script
if (require.main === module) {
  createAdminAccount()
    .then(() => {
      console.log('\n✅ Script completed successfully!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error)
      process.exit(1)
    })
}

export { createAdminAccount }

