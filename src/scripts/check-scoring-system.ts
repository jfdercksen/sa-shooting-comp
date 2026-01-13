/**
 * Script to check if the scoring system has all required components
 * 
 * Run with: npm run check-scoring
 * Or: tsx src/scripts/check-scoring-system.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase environment variables')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function checkScoringSystem() {
  console.log('🔍 Checking Scoring System Components...\n')
  console.log('=' .repeat(60))

  try {
    // 1. Check if tables exist and have data
    console.log('\n1️⃣  CHECKING DATABASE TABLES\n')
    
    // Check registrations table
    const { data: registrations, error: regError } = await supabase
      .from('registrations')
      .select('id')
      .limit(1)
    
    if (regError) {
      console.error('❌ Registrations table error:', regError.message)
    } else {
      const { count: regCount } = await supabase
        .from('registrations')
        .select('*', { count: 'exact', head: true })
      console.log(`✅ Registrations table: ${regCount || 0} records`)
    }

    // Check stages table
    const { data: stages, error: stageError } = await supabase
      .from('stages')
      .select('id')
      .limit(1)
    
    if (stageError) {
      console.error('❌ Stages table error:', stageError.message)
    } else {
      const { count: stageCount } = await supabase
        .from('stages')
        .select('*', { count: 'exact', head: true })
      console.log(`✅ Stages table: ${stageCount || 0} records`)
    }

    // Check scores table
    const { data: scores, error: scoreError } = await supabase
      .from('scores')
      .select('id')
      .limit(1)
    
    if (scoreError) {
      console.error('❌ Scores table error:', scoreError.message)
    } else {
      const { count: scoreCount } = await supabase
        .from('scores')
        .select('*', { count: 'exact', head: true })
      console.log(`✅ Scores table: ${scoreCount || 0} records`)
    }

    // 2. Check if stages exist for competitions
    console.log('\n2️⃣  CHECKING STAGES FOR COMPETITIONS\n')
    
    const { data: competitionsWithStages, error: compStageError } = await supabase
      .from('competitions')
      .select(`
        id,
        name,
        stages(count)
      `)
      .eq('is_active', true)
    
    if (compStageError) {
      console.error('❌ Error checking competition stages:', compStageError.message)
    } else {
      if (competitionsWithStages && competitionsWithStages.length > 0) {
        console.log('Competitions and their stage counts:')
        competitionsWithStages.forEach((comp: any) => {
          const stageCount = comp.stages?.[0]?.count || 0
          const status = stageCount > 0 ? '✅' : '⚠️'
          console.log(`  ${status} ${comp.name}: ${stageCount} stages`)
        })
      } else {
        console.log('⚠️  No active competitions found')
      }
    }

    // Alternative query using RPC or direct join
    const { data: compStagesData } = await supabase
      .from('competitions')
      .select(`
        id,
        name,
        stages(id, name, stage_number)
      `)
      .eq('is_active', true)
    
    if (compStagesData) {
      console.log('\nDetailed breakdown:')
      compStagesData.forEach((comp: any) => {
        const stageList = comp.stages || []
        if (stageList.length === 0) {
          console.log(`  ⚠️  ${comp.name}: NO STAGES`)
        } else {
          console.log(`  ✅ ${comp.name}: ${stageList.length} stage(s)`)
          stageList.forEach((stage: any) => {
            console.log(`     - ${stage.name || `Stage ${stage.stage_number}`}`)
          })
        }
      })
    }

    // 3. Check if users are registered for competitions
    console.log('\n3️⃣  CHECKING USER REGISTRATIONS\n')
    
    // Get all users
    const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers()
    const users = usersData?.users || []
    
    if (usersError) {
      console.error('❌ Error fetching users:', usersError.message)
    } else if (users.length > 0) {
      console.log(`Found ${users.length} users. Checking registrations...\n`)
      
      // Check registrations for first 10 users
      const usersToCheck = users.slice(0, 10)
      
      for (const user of usersToCheck) {
        const { data: userRegs, error: userRegError } = await supabase
          .from('registrations')
          .select(`
            id,
            registration_status,
            competitions(name),
            disciplines(name)
          `)
          .eq('user_id', user.id)
        
        if (!userRegError && userRegs) {
          if (userRegs.length > 0) {
            console.log(`✅ User ${user.email}: ${userRegs.length} registration(s)`)
            userRegs.forEach((reg: any) => {
              console.log(`   - ${reg.competitions?.name || 'Unknown'} (${reg.disciplines?.name || 'N/A'}) - ${reg.registration_status}`)
            })
          } else {
            console.log(`⚠️  User ${user.email}: No registrations`)
          }
        }
      }
      
      if (users.length > 10) {
        console.log(`\n... and ${users.length - 10} more users`)
      }
    } else {
      console.log('⚠️  No users found')
    }
    
    // Alternative: Check registrations directly
    console.log('\n📊 Registration Summary:')
    const { data: allRegs } = await supabase
      .from('registrations')
      .select(`
        id,
        user_id,
        registration_status,
        competitions(name),
        disciplines(name)
      `)
      .limit(20)
    
    if (allRegs && allRegs.length > 0) {
      console.log(`Total registrations found: ${allRegs.length}`)
      allRegs.forEach((reg: any) => {
        console.log(`  - ${reg.competitions?.name || 'Unknown'} (${reg.disciplines?.name || 'N/A'}) - ${reg.registration_status}`)
      })
    } else {
      console.log('  No registrations found')
    }

    // 4. Check for competitions without stages
    console.log('\n4️⃣  SUMMARY\n')
    
    const { data: allCompetitions } = await supabase
      .from('competitions')
      .select(`
        id,
        name,
        start_date,
        stages(id)
      `)
      .eq('is_active', true)
    
    if (allCompetitions) {
      const competitionsWithoutStages = allCompetitions.filter((comp: any) => 
        !comp.stages || comp.stages.length === 0
      )
      
      const competitionsWithStages = allCompetitions.filter((comp: any) => 
        comp.stages && comp.stages.length > 0
      )
      
      console.log(`Total Active Competitions: ${allCompetitions.length}`)
      console.log(`✅ Competitions WITH stages: ${competitionsWithStages.length}`)
      console.log(`⚠️  Competitions WITHOUT stages: ${competitionsWithoutStages.length}`)
      
      if (competitionsWithoutStages.length > 0) {
        console.log('\n⚠️  Competitions missing stages:')
        competitionsWithoutStages.forEach((comp: any) => {
          console.log(`   - ${comp.name} (ID: ${comp.id})`)
          console.log(`     Start Date: ${comp.start_date}`)
        })
      }
    }

    console.log('\n' + '='.repeat(60))
    console.log('✅ Scoring system check complete!')
    
  } catch (error: any) {
    console.error('\n❌ Error during check:', error.message)
    console.error('Full error:', error)
    process.exit(1)
  }
}

checkScoringSystem()

