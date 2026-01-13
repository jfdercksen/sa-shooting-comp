/**
 * Script to assign team_captain role to a shooter
 * Usage: npx tsx src/scripts/assign-team-captain.ts <email|sabu|id> <value>
 * 
 * Examples:
 *   npx tsx src/scripts/assign-team-captain.ts email shooter@example.com
 *   npx tsx src/scripts/assign-team-captain.ts sabu SABU12345
 *   npx tsx src/scripts/assign-team-captain.ts id user-uuid-here
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function assignTeamCaptain(method: string, value: string) {
  console.log(`Assigning team_captain role using ${method}: ${value}\n`)

  try {
    let profile: any = null

    // Find the user based on method
    if (method === 'email') {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', value.toLowerCase())
        .single()

      if (error || !data) {
        console.error(`User not found with email: ${value}`)
        process.exit(1)
      }
      profile = data
    } else if (method === 'sabu') {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('sabu_number', value)
        .single()

      if (error || !data) {
        console.error(`User not found with SABU number: ${value}`)
        process.exit(1)
      }
      profile = data
    } else if (method === 'id') {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', value)
        .single()

      if (error || !data) {
        console.error(`User not found with ID: ${value}`)
        process.exit(1)
      }
      profile = data
    } else {
      console.error('Invalid method. Use: email, sabu, or id')
      process.exit(1)
    }

    // Show current profile
    console.log('Found user:')
    console.log(`  ID: ${profile.id}`)
    console.log(`  Name: ${profile.full_names} ${profile.surname}`)
    console.log(`  Email: ${profile.email}`)
    console.log(`  SABU Number: ${profile.sabu_number || 'N/A'}`)
    console.log(`  Current Role: ${profile.role}`)

    if (profile.role === 'team_captain') {
      console.log('\n✅ User already has team_captain role')
      return
    }

    // Update role
    console.log('\nUpdating role to team_captain...')
    const { data: updated, error: updateError } = await supabase
      .from('profiles')
      .update({ role: 'team_captain' })
      .eq('id', profile.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating role:', updateError)
      process.exit(1)
    }

    console.log('\n✅ Successfully assigned team_captain role!')
    console.log(`Updated profile:`)
    console.log(`  Name: ${updated.full_names} ${updated.surname}`)
    console.log(`  Email: ${updated.email}`)
    console.log(`  New Role: ${updated.role}`)
  } catch (error: any) {
    console.error('Error:', error.message)
    process.exit(1)
  }
}

// Get command line arguments
const args = process.argv.slice(2)

if (args.length !== 2) {
  console.log('Usage: npx tsx src/scripts/assign-team-captain.ts <method> <value>')
  console.log('\nMethods:')
  console.log('  email  - Find by email address')
  console.log('  sabu   - Find by SABU number')
  console.log('  id     - Find by user ID')
  console.log('\nExamples:')
  console.log('  npx tsx src/scripts/assign-team-captain.ts email shooter@example.com')
  console.log('  npx tsx src/scripts/assign-team-captain.ts sabu SABU12345')
  console.log('  npx tsx src/scripts/assign-team-captain.ts id user-uuid-here')
  process.exit(1)
}

const [method, value] = args
assignTeamCaptain(method, value)

