/**
 * Debug script for teams functionality
 * Run with: npx tsx src/scripts/debug-teams.ts
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

async function debugTeams() {
  console.log('=== TEAMS FUNCTIONALITY DEBUG ===\n')

  try {
    // 1. Check teams table
    console.log('1. CHECKING TEAMS TABLE:')
    console.log('─'.repeat(50))
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('*')
      .order('created_at', { ascending: false })

    if (teamsError) {
      console.error('Error fetching teams:', teamsError)
    } else {
      console.log(`Found ${teams?.length || 0} teams:`)
      teams?.forEach((team, index) => {
        console.log(`\n  Team ${index + 1}:`)
        console.log(`    ID: ${team.id}`)
        console.log(`    Name: ${team.name}`)
        console.log(`    Captain ID: ${team.captain_id}`)
        console.log(`    Province: ${team.province || 'N/A'}`)
        console.log(`    Max Members: ${team.max_members || 'N/A'}`)
        console.log(`    Created: ${team.created_at}`)
      })
    }

    // 2. Check team_members table
    console.log('\n\n2. CHECKING TEAM_MEMBERS TABLE:')
    console.log('─'.repeat(50))
    const { data: teamMembers, error: membersError } = await supabase
      .from('team_members')
      .select('*, profiles(id, full_names, surname, sabu_number, email)')
      .order('joined_at', { ascending: false })

    if (membersError) {
      console.error('Error fetching team members:', membersError)
    } else {
      console.log(`Found ${teamMembers?.length || 0} team memberships:`)
      teamMembers?.forEach((member, index) => {
        console.log(`\n  Membership ${index + 1}:`)
        console.log(`    ID: ${member.id}`)
        console.log(`    Team ID: ${member.team_id}`)
        console.log(`    User ID: ${member.user_id}`)
        console.log(`    Joined: ${member.joined_at}`)
        if (member.profiles) {
          const profile = member.profiles as any
          console.log(`    User: ${profile.full_names} ${profile.surname} (${profile.sabu_number || 'N/A'})`)
        }
      })
    }

    // 3. Check team captains
    console.log('\n\n3. CHECKING TEAM CAPTAINS:')
    console.log('─'.repeat(50))
    const { data: captains, error: captainsError } = await supabase
      .from('profiles')
      .select('id, full_names, surname, sabu_number, email, role')
      .eq('role', 'team_captain')

    if (captainsError) {
      console.error('Error fetching captains:', captainsError)
    } else {
      console.log(`Found ${captains?.length || 0} team captains:`)
      captains?.forEach((captain, index) => {
        console.log(`\n  Captain ${index + 1}:`)
        console.log(`    ID: ${captain.id}`)
        console.log(`    Name: ${captain.full_names} ${captain.surname}`)
        console.log(`    SABU: ${captain.sabu_number || 'N/A'}`)
        console.log(`    Email: ${captain.email}`)
        console.log(`    Role: ${captain.role}`)
      })
    }

    // 4. Check RLS policies
    console.log('\n\n4. CHECKING RLS POLICIES:')
    console.log('─'.repeat(50))
    
    // Get all policies for teams table
    const { data: teamsPolicies, error: teamsPoliciesError } = await supabase.rpc(
      'get_table_policies',
      { table_name: 'teams' }
    ).catch(() => ({ data: null, error: { message: 'Function not available' } }))

    if (teamsPoliciesError) {
      console.log('Note: Cannot query RLS policies directly via RPC')
      console.log('Please check RLS policies in Supabase Dashboard:')
      console.log('  - Teams table: Should allow SELECT for authenticated users')
      console.log('  - Teams table: Should allow INSERT for users with team_captain role')
      console.log('  - Teams table: Should allow UPDATE/DELETE for team captains')
      console.log('  - Team_members table: Should allow SELECT for team members')
      console.log('  - Team_members table: Should allow INSERT for team captains')
      console.log('  - Team_members table: Should allow DELETE for team captains')
    } else {
      console.log('Teams table policies:', teamsPolicies)
    }

    // 5. Test team creation (dry run)
    console.log('\n\n5. TESTING TEAM CREATION (DRY RUN):')
    console.log('─'.repeat(50))
    console.log('To test team creation:')
    console.log('  1. Log in as a user with role = "team_captain"')
    console.log('  2. Go to /dashboard/teams')
    console.log('  3. Click "Create Team"')
    console.log('  4. Check browser console for debug logs')
    console.log('  5. Check network tab for API errors')

    // 6. Test member addition (dry run)
    console.log('\n\n6. TESTING MEMBER ADDITION (DRY RUN):')
    console.log('─'.repeat(50))
    console.log('To test member addition:')
    console.log('  1. Log in as a team captain')
    console.log('  2. Go to /dashboard/teams')
    console.log('  3. Click "Manage" on a team')
    console.log('  4. Try adding a member by email or SABU number')
    console.log('  5. Check browser console for debug logs')
    console.log('  6. Check network tab for API errors')

    // 7. Check for common issues
    console.log('\n\n7. COMMON ISSUES CHECK:')
    console.log('─'.repeat(50))
    
    // Check if teams have captains
    if (teams && teams.length > 0) {
      const teamsWithoutCaptains = teams.filter(t => !t.captain_id)
      if (teamsWithoutCaptains.length > 0) {
        console.log(`⚠️  WARNING: ${teamsWithoutCaptains.length} team(s) without captain_id:`)
        teamsWithoutCaptains.forEach(team => {
          console.log(`    - Team "${team.name}" (ID: ${team.id})`)
        })
      }
    }

    // Check for orphaned team members (members without valid team)
    if (teamMembers && teamMembers.length > 0) {
      const teamIds = teams?.map(t => t.id) || []
      const orphanedMembers = teamMembers.filter(m => !teamIds.includes(m.team_id))
      if (orphanedMembers.length > 0) {
        console.log(`⚠️  WARNING: ${orphanedMembers.length} orphaned team member(s):`)
        orphanedMembers.forEach(member => {
          console.log(`    - Member ID: ${member.id}, Team ID: ${member.team_id} (team doesn't exist)`)
        })
      }
    }

    // Check for duplicate memberships
    if (teamMembers && teamMembers.length > 0) {
      const memberMap = new Map<string, string[]>()
      teamMembers.forEach(member => {
        const key = `${member.team_id}-${member.user_id}`
        if (!memberMap.has(key)) {
          memberMap.set(key, [])
        }
        memberMap.get(key)!.push(member.id)
      })
      
      const duplicates = Array.from(memberMap.entries()).filter(([_, ids]) => ids.length > 1)
      if (duplicates.length > 0) {
        console.log(`⚠️  WARNING: Found duplicate memberships:`)
        duplicates.forEach(([key, ids]) => {
          console.log(`    - ${key}: ${ids.length} duplicate entries (IDs: ${ids.join(', ')})`)
        })
      }
    }

    console.log('\n\n=== DEBUG COMPLETE ===')
  } catch (error: any) {
    console.error('Debug script error:', error)
  }
}

debugTeams()

