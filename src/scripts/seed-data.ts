/**
 * Database Seed Script
 * 
 * Populates the database with test data for development and testing.
 * 
 * Usage:
 *   npm run seed
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

// Test data generators
const firstNames = [
  'John', 'Sarah', 'Michael', 'Emma', 'David', 'Olivia', 'James', 'Sophia',
  'Robert', 'Isabella', 'William', 'Charlotte', 'Richard', 'Amelia', 'Joseph', 'Mia',
  'Thomas', 'Harper', 'Charles', 'Evelyn'
]

const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Wilson', 'Anderson', 'Thomas', 'Taylor',
  'Moore', 'Jackson', 'Martin', 'Lee'
]

const clubs = [
  'Gauteng Shooting Club', 'Pretoria Rifle Club', 'Johannesburg Marksmen', 
  'Centurion Shooting Range', 'Sandton Sports Club', 'Midrand Shooting Academy'
]

const provinces = [
  'Gauteng', 'Western Cape', 'KwaZulu-Natal', 'Eastern Cape', 'Free State',
  'Limpopo', 'Mpumalanga', 'Northern Cape', 'North West'
]

const newsCategories = ['News', 'Results', 'Announcements', 'Technical']
const newsTitles = [
  '2024 Championship Dates Announced',
  'New Shooting Range Opens in Pretoria',
  'Record Breaking Scores at Last Competition',
  'Safety Protocol Updates',
  'Junior Shooter Achieves Perfect Score',
  'Equipment Regulations Revised',
  'Team Selection for International Competition',
  'Training Workshop Schedule Released',
  'Competition Results Published',
  'Membership Drive Success'
]

async function seedData() {
  console.log('🌱 Starting database seed...\n')

  try {
    // Step 1: Get existing disciplines
    console.log('📋 Fetching disciplines...')
    const { data: disciplines, error: discError } = await supabase
      .from('disciplines')
      .select('*')
      .eq('is_active', true)

    if (discError) throw discError
    if (!disciplines || disciplines.length === 0) {
      console.error('❌ No active disciplines found. Please create disciplines first.')
      return
    }

    console.log(`✅ Found ${disciplines.length} disciplines\n`)

    // Step 2: Create test shooters
    console.log('👥 Creating test shooters...')
    const shooterEmails: string[] = []
    const shooterIds: string[] = []

    for (let i = 0; i < 20; i++) {
      const firstName = firstNames[i]
      const lastName = lastNames[i]
      const email = `shooter${i + 1}@test.com`
      const sabuNumber = `TEST${String(i + 1).padStart(4, '0')}`

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password: 'Test123!',
        email_confirm: true,
        user_metadata: {
          full_names: firstName,
          surname: lastName,
        },
      })

      if (authError && !authError.message.includes('already registered')) {
        console.error(`  ⚠️  Error creating user ${email}:`, authError.message)
        continue
      }

      if (!authData?.user) {
        // User might already exist, try to get it
        const { data: users } = await supabase.auth.admin.listUsers()
        const existingUser = users?.users?.find(u => u.email === email)
        if (existingUser) {
          shooterIds.push(existingUser.id)
          shooterEmails.push(email)
          continue
        }
        continue
      }

      // Create profile
      const { error: profileError } = await supabase.from('profiles').insert({
        id: authData.user.id,
        email,
        full_names: firstName,
        surname: lastName,
        sabu_number: sabuNumber,
        mobile_number: `+2782${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`,
        province: provinces[Math.floor(Math.random() * provinces.length)],
        club: clubs[Math.floor(Math.random() * clubs.length)],
        role: 'shooter',
        age_classification: ['Open', 'Under_19', 'Under_25', 'Veteran_60_plus'][Math.floor(Math.random() * 4)] as any,
        shoulder_preference: Math.random() > 0.5 ? 'right' : 'left',
        sa_citizen: true,
        first_sa_championships: Math.random() > 0.7,
        gender: Math.random() > 0.5 ? 'Male' : 'Female',
        postal_address: `${Math.floor(Math.random() * 999)} Test Street`,
        postal_code: `${Math.floor(Math.random() * 9000) + 1000}`,
        emergency_contact_name: `Emergency Contact ${i + 1}`,
        emergency_contact_phone: `+2783${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`,
      })

      if (profileError && !profileError.message.includes('duplicate')) {
        console.error(`  ⚠️  Error creating profile for ${email}:`, profileError.message)
      } else {
        shooterIds.push(authData.user.id)
        shooterEmails.push(email)
        process.stdout.write(`  ✓ Created shooter ${i + 1}/20\r`)
      }
    }
    console.log(`\n✅ Created ${shooterIds.length} test shooters\n`)

    // Step 3: Create competitions
    console.log('🏆 Creating competitions...')
    const competitionIds: string[] = []
    const now = new Date()
    
    const competitions = [
      {
        name: 'Gauteng Open Championships 2024',
        slug: 'gauteng-open-2024',
        start_date: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Next week
        end_date: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        registration_opens: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(), // Opened a week ago
        registration_closes: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        location: 'Pretoria Shooting Range',
        venue_details: 'Main Range, Building A',
        description: 'Annual Gauteng Open Championships featuring all disciplines.',
        is_featured: true,
        is_active: true,
      },
      {
        name: 'SA National Championships 2024',
        slug: 'sa-national-2024',
        start_date: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(), // Next month
        end_date: new Date(now.getTime() + 35 * 24 * 60 * 60 * 1000).toISOString(),
        registration_opens: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000).toISOString(), // Opens in 20 days
        registration_closes: new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000).toISOString(),
        location: 'Johannesburg Sports Complex',
        venue_details: 'Olympic Shooting Range',
        description: 'The premier national shooting competition of the year.',
        is_featured: false,
        is_active: true,
      },
      {
        name: 'Winter Championships 2024',
        slug: 'winter-championships-2024',
        start_date: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 3 months
        end_date: new Date(now.getTime() + 95 * 24 * 60 * 60 * 1000).toISOString(),
        registration_opens: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString(), // Opens in 60 days
        registration_closes: new Date(now.getTime() + 88 * 24 * 60 * 60 * 1000).toISOString(),
        location: 'Cape Town Shooting Club',
        venue_details: 'Coastal Range Facility',
        description: 'Winter season championship competition.',
        is_featured: false,
        is_active: true,
      },
    ]

    for (const comp of competitions) {
      const { data: compData, error: compError } = await supabase
        .from('competitions')
        .insert(comp)
        .select()
        .single()

      if (compError && !compError.message.includes('duplicate')) {
        console.error(`  ⚠️  Error creating competition:`, compError.message)
      } else if (compData) {
        competitionIds.push(compData.id)
        console.log(`  ✓ Created: ${comp.name}`)
      }
    }
    console.log(`✅ Created ${competitionIds.length} competitions\n`)

    // Step 4: Add disciplines to competitions
    console.log('🎯 Adding disciplines to competitions...')
    for (const compId of competitionIds) {
      for (const discipline of disciplines) {
        const { error } = await supabase.from('competition_disciplines').insert({
          competition_id: compId,
          discipline_id: discipline.id,
          all_matches_fee: Math.floor(Math.random() * 500) + 200,
          all_matches_u19_fee: Math.floor(Math.random() * 300) + 100,
          all_matches_u25_fee: Math.floor(Math.random() * 400) + 150,
          max_entries: Math.floor(Math.random() * 50) + 20,
        })

        if (error && !error.message.includes('duplicate')) {
          console.error(`  ⚠️  Error adding discipline to competition:`, error.message)
        }
      }
    }
    console.log(`✅ Added disciplines to competitions\n`)

    // Step 5: Create teams
    console.log('👥 Creating test teams...')
    const teamIds: string[] = []
    const teamNames = [
      'Gauteng Eagles', 'Pretoria Panthers', 'Johannesburg Jaguars',
      'Centurion Chargers', 'Sandton Snipers'
    ]

    for (let i = 0; i < 5; i++) {
      const captainId = shooterIds[i * 4] // Assign captains
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .insert({
          name: teamNames[i],
          captain_id: captainId,
          province: provinces[Math.floor(Math.random() * provinces.length)],
          max_members: 4,
        })
        .select()
        .single()

      if (teamError && !teamError.message.includes('duplicate')) {
        console.error(`  ⚠️  Error creating team:`, teamError.message)
      } else if (teamData) {
        teamIds.push(teamData.id)
        
        // Add members to team
        const membersToAdd = shooterIds.slice(i * 4, (i + 1) * 4)
        for (const memberId of membersToAdd) {
          await supabase.from('team_members').insert({
            team_id: teamData.id,
            user_id: memberId,
          })
        }
        console.log(`  ✓ Created team: ${teamNames[i]}`)
      }
    }
    console.log(`✅ Created ${teamIds.length} teams\n`)

    // Step 6: Create registrations for first competition
    if (competitionIds.length > 0 && disciplines.length > 0) {
      console.log('📝 Creating registrations...')
      const firstCompId = competitionIds[0]
      const firstDisciplineId = disciplines[0].id
      let regCount = 0

      for (let i = 0; i < Math.min(15, shooterIds.length); i++) {
        const { error } = await supabase.from('registrations').insert({
          competition_id: firstCompId,
          discipline_id: firstDisciplineId,
          user_id: shooterIds[i],
          registration_status: ['pending', 'confirmed'][Math.floor(Math.random() * 2)] as any,
          payment_status: ['pending', 'paid'][Math.floor(Math.random() * 2)] as any,
          age_classification: ['Open', 'Under_19', 'Under_25'][Math.floor(Math.random() * 3)] as any,
          all_matches: Math.random() > 0.5,
          squad_number: Math.floor(Math.random() * 10) + 1,
          target_number: Math.floor(Math.random() * 20) + 1,
          total_fee: Math.floor(Math.random() * 500) + 200,
        })

        if (!error) regCount++
      }
      console.log(`✅ Created ${regCount} registrations\n`)
    }

    // Step 7: Create news posts
    console.log('📰 Creating news posts...')
    const authors = shooterIds.slice(0, 3) // Use first 3 shooters as authors
    let newsCount = 0

    for (let i = 0; i < 10; i++) {
      const { error } = await supabase.from('news_posts').insert({
        title: newsTitles[i],
        slug: newsTitles[i].toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        content: `<p>This is a sample news post about ${newsTitles[i].toLowerCase()}. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p><p>More content here about the topic and its implications for the shooting community.</p>`,
        excerpt: `Sample excerpt for ${newsTitles[i]}. This post covers important information for all members.`,
        category: newsCategories[Math.floor(Math.random() * newsCategories.length)],
        is_published: true,
        published_at: new Date(now.getTime() - i * 2 * 24 * 60 * 60 * 1000).toISOString(),
        author_id: authors[Math.floor(Math.random() * authors.length)],
        views_count: Math.floor(Math.random() * 500),
        is_featured: i < 2,
      })

      if (!error) newsCount++
    }
    console.log(`✅ Created ${newsCount} news posts\n`)

    // Step 8: Create contact submissions
    console.log('📧 Creating contact submissions...')
    const subjects = [
      'General Inquiry',
      'Competition Information',
      'Registration Help',
      'Technical Support',
      'Membership',
    ]
    let contactCount = 0

    for (let i = 0; i < 8; i++) {
      const { error } = await supabase.from('contact_submissions').insert({
        name: `${firstNames[i]} ${lastNames[i]}`,
        email: `contact${i + 1}@test.com`,
        phone: `+2782${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`,
        subject: subjects[Math.floor(Math.random() * subjects.length)],
        message: `This is a sample contact submission ${i + 1}. I have a question about ${subjects[Math.floor(Math.random() * subjects.length)]}.`,
        is_read: i >= 5, // First 5 unread, last 3 read
      })

      if (!error) contactCount++
    }
    console.log(`✅ Created ${contactCount} contact submissions\n`)

    // Step 9: Create stages and sample scores
    if (competitionIds.length > 0) {
      console.log('🎯 Creating stages and sample scores...')
      const stageIds: string[] = []

      // Create stages for first competition
      const stageNames = ['Stage 1', 'Stage 2', 'Stage 3']
      const matchTypes: ('SCOTTISH_SWORD' | 'FREESTATE_CUP' | 'KINGS_NORTON' | 'DALRYMPLE_CUP' | 'DAVE_SMITH_CUP')[] = [
        'SCOTTISH_SWORD',
        'FREESTATE_CUP',
        'KINGS_NORTON'
      ]
      for (let i = 0; i < 3; i++) {
        const { data: stageData, error: stageError } = await supabase
          .from('stages')
          .insert({
            competition_id: competitionIds[0],
            name: stageNames[i],
            stage_number: i + 1,
            distance: [300, 500, 600][i],
            rounds: 10,
            match_type: matchTypes[i],
            max_score: 50,
          })
          .select()
          .single()

        if (!stageError && stageData) {
          stageIds.push(stageData.id)
        }
      }

      if (stageIds.length > 0) {
        const { data: registrations } = await supabase
          .from('registrations')
          .select('id, user_id')
          .eq('competition_id', competitionIds[0])
          .limit(10)

        if (registrations && registrations.length > 0) {
          let scoreCount = 0
          for (const reg of registrations) {
            for (const stageId of stageIds) {
              const score = Math.floor(Math.random() * 50) + 45
              const xCount = Math.floor(Math.random() * 5)
              const vCount = Math.floor(Math.random() * 10) + 5

              const { error } = await supabase.from('scores').insert({
                registration_id: reg.id,
                stage_id: stageId,
                score,
                x_count: xCount,
                v_count: vCount,
                submitted_at: new Date().toISOString(),
                submitted_by: reg.user_id || reg.id,
                verified_at: Math.random() > 0.3 ? new Date().toISOString() : null,
              })

              if (!error) scoreCount++
            }
          }
          console.log(`✅ Created ${stageIds.length} stages and ${scoreCount} sample scores\n`)
        }
      }
    }

    console.log('🎉 Database seeding completed successfully!')
    console.log('\n📊 Summary:')
    console.log(`   - ${shooterIds.length} test shooters`)
    console.log(`   - ${competitionIds.length} competitions`)
    console.log(`   - ${teamIds.length} teams`)
    console.log(`   - ${newsCount} news posts`)
    console.log(`   - ${contactCount} contact submissions`)
    console.log('\n🔑 Test Account Credentials:')
    console.log('   Email: shooter1@test.com')
    console.log('   Password: Test123!')
    console.log('\n✅ You can now test the application with this data!')

  } catch (error: any) {
    console.error('\n❌ Error seeding database:', error.message || error)
    process.exit(1)
  }
}

// Run the script
if (require.main === module) {
  seedData()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error)
      process.exit(1)
    })
}

export { seedData }

