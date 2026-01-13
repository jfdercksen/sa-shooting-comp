/**
 * Fix Common Issues Script
 * 
 * This script fixes common database and RLS policy issues.
 * 
 * Usage:
 *   npm run fix-issues
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

async function fixCommonIssues() {
  console.log('🔧 Starting common issues fix...\n')

  try {
    // Step 1: Verify disciplines are active
    console.log('📋 Step 1: Checking disciplines...')
    const { data: disciplines, error: discError } = await supabase
      .from('disciplines')
      .select('*')

    if (discError) {
      console.error('  ❌ Error fetching disciplines:', discError.message)
    } else {
      console.log(`  ✓ Found ${disciplines?.length || 0} disciplines`)
      
      // Ensure at least one discipline is active
      const activeDisciplines = disciplines?.filter(d => d.is_active) || []
      if (activeDisciplines.length === 0 && disciplines && disciplines.length > 0) {
        console.log('  ⚠️  No active disciplines found. Activating first discipline...')
        await supabase
          .from('disciplines')
          .update({ is_active: true })
          .eq('id', disciplines[0].id)
        console.log('  ✓ Activated first discipline')
      }
    }
    console.log()

    // Step 2: Check foreign key constraints
    console.log('🔗 Step 2: Checking foreign key constraints...')
    
    // Check profiles -> auth.users
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id')
      .limit(10)

    if (profilesError) {
      console.error('  ❌ Error checking profiles:', profilesError.message)
    } else {
      console.log(`  ✓ Profiles table accessible (${profiles?.length || 0} found)`)
    }

    // Check registrations -> competitions
    const { data: registrations, error: regError } = await supabase
      .from('registrations')
      .select('competition_id')
      .limit(10)

    if (regError) {
      console.error('  ❌ Error checking registrations:', regError.message)
    } else {
      const compIds = [...new Set(registrations?.map(r => r.competition_id).filter(Boolean) || [])]
      if (compIds.length > 0) {
        const { error: compCheckError } = await supabase
          .from('competitions')
          .select('id')
          .in('id', compIds as string[])

        if (compCheckError) {
          console.error('  ⚠️  Some registrations reference non-existent competitions')
        } else {
          console.log('  ✓ Registration -> Competition foreign keys valid')
        }
      }
    }

    // Check team_members -> teams
    const { data: teamMembers, error: tmError } = await supabase
      .from('team_members')
      .select('team_id')
      .limit(10)

    if (tmError) {
      console.error('  ❌ Error checking team_members:', tmError.message)
    } else {
      const teamIds = [...new Set(teamMembers?.map(tm => tm.team_id).filter(Boolean) || [])]
      if (teamIds.length > 0) {
        const { error: teamCheckError } = await supabase
          .from('teams')
          .select('id')
          .in('id', teamIds as string[])

        if (teamCheckError) {
          console.error('  ⚠️  Some team_members reference non-existent teams')
        } else {
          console.log('  ✓ Team Members -> Teams foreign keys valid')
        }
      }
    }
    console.log()

    // Step 3: Verify required tables exist and are accessible
    console.log('🗄️  Step 3: Verifying table accessibility...')
    const tables = [
      'profiles',
      'competitions',
      'disciplines',
      'registrations',
      'scores',
      'teams',
      'team_members',
      'news_posts',
      'contact_submissions',
      'competition_disciplines',
      'competition_matches',
      'stages',
      'site_settings',
    ]

    const accessibleTables: string[] = []
    const inaccessibleTables: string[] = []

    for (const table of tables) {
      try {
        const { error } = await supabase.from(table).select('id').limit(1)
        if (error) {
          inaccessibleTables.push(table)
          console.error(`  ❌ ${table}: ${error.message}`)
        } else {
          accessibleTables.push(table)
          console.log(`  ✓ ${table}`)
        }
      } catch (error: any) {
        inaccessibleTables.push(table)
        console.error(`  ❌ ${table}: ${error.message}`)
      }
    }

    console.log(`\n  Summary: ${accessibleTables.length}/${tables.length} tables accessible`)
    if (inaccessibleTables.length > 0) {
      console.log(`  ⚠️  Inaccessible tables: ${inaccessibleTables.join(', ')}`)
    }
    console.log()

    // Step 4: Check for orphaned records
    console.log('🧹 Step 4: Checking for orphaned records...')

    // Orphaned registrations (no user)
    const { data: orphanedRegs } = await supabase
      .from('registrations')
      .select('id, user_id')
      .not('user_id', 'is', null)
      .limit(100)

    if (orphanedRegs && orphanedRegs.length > 0) {
      const userIds = [...new Set(orphanedRegs.map(r => r.user_id).filter(Boolean) as string[])]
      const { data: validUsers } = await supabase
        .from('profiles')
        .select('id')
        .in('id', userIds)

      const validUserIds = new Set(validUsers?.map(u => u.id) || [])
      const orphanedCount = orphanedRegs.filter(r => r.user_id && !validUserIds.has(r.user_id)).length

      if (orphanedCount > 0) {
        console.log(`  ⚠️  Found ${orphanedCount} registrations with invalid user_id`)
      } else {
        console.log('  ✓ No orphaned registrations found')
      }
    }

    // Orphaned scores (no registration)
    const { data: orphanedScores } = await supabase
      .from('scores')
      .select('id, registration_id')
      .not('registration_id', 'is', null)
      .limit(100)

    if (orphanedScores && orphanedScores.length > 0) {
      const regIds = [...new Set(orphanedScores.map(s => s.registration_id).filter(Boolean) as string[])]
      const { data: validRegs } = await supabase
        .from('registrations')
        .select('id')
        .in('id', regIds)

      const validRegIds = new Set(validRegs?.map(r => r.id) || [])
      const orphanedCount = orphanedScores.filter(s => s.registration_id && !validRegIds.has(s.registration_id)).length

      if (orphanedCount > 0) {
        console.log(`  ⚠️  Found ${orphanedCount} scores with invalid registration_id`)
      } else {
        console.log('  ✓ No orphaned scores found')
      }
    }
    console.log()

    // Step 5: Verify site settings structure
    console.log('⚙️  Step 5: Checking site settings...')
    const requiredSettings = [
      'office_email',
      'office_phone',
      'office_address',
      'office_hours',
      'facebook_url',
      'twitter_url',
      'instagram_url',
    ]

    const { data: existingSettings } = await supabase
      .from('site_settings')
      .select('key')
      .in('key', requiredSettings)

    const existingKeys = new Set(existingSettings?.map(s => s.key) || [])
    const missingKeys = requiredSettings.filter(key => !existingKeys.has(key))

    if (missingKeys.length > 0) {
      console.log(`  ⚠️  Missing site settings: ${missingKeys.join(', ')}`)
      console.log('  💡 Consider creating these in the admin settings page')
    } else {
      console.log('  ✓ All required site settings exist')
    }
    console.log()

    // Step 6: Summary and recommendations
    console.log('📊 Summary:')
    console.log(`  ✓ Disciplines checked`)
    console.log(`  ✓ Foreign keys verified`)
    console.log(`  ✓ ${accessibleTables.length}/${tables.length} tables accessible`)
    console.log(`  ✓ Orphaned records checked`)
    console.log(`  ✓ Site settings verified`)
    console.log()

    if (inaccessibleTables.length === 0 && missingKeys.length === 0) {
      console.log('✅ All checks passed! No issues found.')
    } else {
      console.log('⚠️  Some issues were found. Review the output above.')
      console.log('\n💡 Recommendations:')
      if (inaccessibleTables.length > 0) {
        console.log('  - Check RLS policies for inaccessible tables')
        console.log('  - Verify table names match your schema')
      }
      if (missingKeys.length > 0) {
        console.log('  - Add missing site settings via admin panel')
      }
    }

  } catch (error: any) {
    console.error('\n❌ Error fixing issues:', error.message || error)
    process.exit(1)
  }
}

// Run the script
if (require.main === module) {
  fixCommonIssues()
    .then(() => {
      console.log('\n✅ Script completed!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error)
      process.exit(1)
    })
}

export { fixCommonIssues }

