import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Calendar, Users, Trophy, Target, ArrowRight, Clock } from 'lucide-react'
import { format } from 'date-fns'

export default async function Home() {
  console.log('[HomePage] Starting to load...')
  const startTime = Date.now()
  
  try {
    const supabase = await createClient()
    console.log('[HomePage] Supabase client created')

    const currentYear = new Date().getFullYear()
    const yearStart = `${currentYear}-01-01`
    const yearEnd = `${currentYear}-12-31`

    console.log('[HomePage] About to fetch data in parallel...')
    // Run all queries in parallel for better performance
    const [
    featuredCompetitionResult,
    upcomingCompetitionsResult,
    latestNewsResult,
    disciplinesResult,
    activeShootersResult,
    competitionsThisYearResult,
    registeredTeamsResult,
  ] = await Promise.all([
    // Fetch featured competition
    supabase
      .from('competitions')
      .select('*')
      .eq('is_featured', true)
      .eq('is_active', true)
      .order('start_date', { ascending: true })
      .limit(1)
      .single(),
    
    // Fetch upcoming competitions (next 3)
    supabase
      .from('competitions')
      .select('*')
      .eq('is_active', true)
      .gte('start_date', new Date().toISOString())
      .order('start_date', { ascending: true })
      .limit(3),
    
    // Fetch latest news posts
    supabase
      .from('news_posts')
      .select('*')
      .eq('is_published', true)
      .order('published_at', { ascending: false })
      .limit(3),
    
    // Fetch active disciplines
    supabase
      .from('disciplines')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true, nullsFirst: false }),
    
    // Fetch active shooters count
    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true }),
    
    // Fetch competitions this year count
    supabase
      .from('competitions')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .gte('start_date', yearStart)
      .lte('start_date', yearEnd),
    
    // Fetch registered teams count
    supabase
      .from('teams')
      .select('*', { count: 'exact', head: true }),
  ])

    const featuredCompetition = featuredCompetitionResult.data
    const upcomingCompetitions = upcomingCompetitionsResult.data
    const latestNews = latestNewsResult.data
    const disciplines = disciplinesResult.data
    const activeShooters = activeShootersResult.count
    const competitionsThisYear = competitionsThisYearResult.count
    const registeredTeams = registeredTeamsResult.count
    const disciplinesCount = disciplines?.length || 0

    const loadTime = Date.now() - startTime
    console.log(`[HomePage] Data fetched successfully in ${loadTime}ms`)
    console.log(`[HomePage] Featured competition: ${featuredCompetition ? 'found' : 'none'}`)
    console.log(`[HomePage] Upcoming competitions: ${upcomingCompetitions?.length || 0}`)
    console.log(`[HomePage] Latest news: ${latestNews?.length || 0}`)
    console.log(`[HomePage] Disciplines: ${disciplinesCount}`)

    const getRegistrationStatus = (competition: any) => {
      if (!competition) return 'closed'
      const now = new Date()
      const opens = competition.registration_opens ? new Date(competition.registration_opens) : null
      const closes = competition.registration_closes ? new Date(competition.registration_closes) : null

      if (opens && now < opens) return 'upcoming'
      if (closes && now > closes) return 'closed'
      if (opens && closes && now >= opens && now <= closes) return 'open'
      return 'open'
    }

    const formatDateRange = (startDate: string, endDate: string) => {
      const start = new Date(startDate)
      const end = new Date(endDate)
      if (format(start, 'MMM yyyy') === format(end, 'MMM yyyy')) {
        return `${format(start, 'MMM d')} - ${format(end, 'd, yyyy')}`
      }
      return `${format(start, 'MMM d, yyyy')} - ${format(end, 'MMM d, yyyy')}`
    }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[600px] flex items-center justify-center bg-gradient-to-r from-[#1e40af] to-[#1e3a8a] overflow-hidden">
        {/* Background Image - Shooting Range */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: "url('/hero-shooting-range.jpg')",
            backgroundPosition: 'center',
            backgroundSize: 'cover',
          }}
        ></div>
        {/* Lighter overlay to make image more visible */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/50"></div>
        
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
            SA BISLEY UNION
          </h1>
          <h2 className="text-3xl md:text-4xl font-semibold text-white mb-2">
            GAUTENG NOORD
          </h2>
          <p className="text-xl md:text-2xl text-gray-200 mb-8">
            Excellence in Target Shooting Sports
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/events"
              className="px-8 py-3 bg-[#eab308] text-white font-semibold rounded-lg hover:bg-[#ca8a04] transition-colors shadow-lg"
            >
              View Upcoming Events
            </Link>
            <Link
              href="/register"
              className="px-8 py-3 bg-white text-[#1e40af] font-semibold rounded-lg hover:bg-gray-100 transition-colors shadow-lg"
            >
              Register Now
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Competition Section */}
      {featuredCompetition && (
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Featured Competition</h2>
            <div className="bg-white rounded-lg shadow-xl overflow-hidden max-w-4xl mx-auto">
              <div className="p-8">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-[#1e40af] mb-2">{featuredCompetition.name}</h3>
                    <div className="flex items-center text-gray-600 mb-2">
                      <Calendar className="h-5 w-5 mr-2" />
                      <span>{formatDateRange(featuredCompetition.start_date, featuredCompetition.end_date)}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Target className="h-5 w-5 mr-2" />
                      <span>{featuredCompetition.location}</span>
                    </div>
                  </div>
                  <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
                    getRegistrationStatus(featuredCompetition) === 'open'
                      ? 'bg-green-100 text-green-800'
                      : getRegistrationStatus(featuredCompetition) === 'upcoming'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {getRegistrationStatus(featuredCompetition) === 'open' ? 'Registration Open' :
                     getRegistrationStatus(featuredCompetition) === 'upcoming' ? 'Registration Opens Soon' :
                     'Registration Closed'}
                  </span>
                </div>
                {featuredCompetition.description && (
                  <p className="text-gray-700 mb-6 line-clamp-3">{featuredCompetition.description}</p>
                )}
                <Link
                  href={`/events/${featuredCompetition.id}`}
                  className="inline-flex items-center px-6 py-3 bg-[#1e40af] text-white font-semibold rounded-lg hover:bg-[#1e3a8a] transition-colors"
                >
                  Register Now
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Quick Stats Row */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              icon={<Users className="h-8 w-8" />}
              value={activeShooters || 0}
              label="Active Shooters"
              color="bg-blue-100 text-blue-600"
            />
            <StatCard
              icon={<Trophy className="h-8 w-8" />}
              value={competitionsThisYear || 0}
              label="Competitions This Year"
              color="bg-amber-100 text-amber-600"
            />
            <StatCard
              icon={<Users className="h-8 w-8" />}
              value={registeredTeams || 0}
              label="Registered Teams"
              color="bg-green-100 text-green-600"
            />
            <StatCard
              icon={<Target className="h-8 w-8" />}
              value={disciplinesCount}
              label="Disciplines Offered"
              color="bg-purple-100 text-purple-600"
            />
          </div>
        </div>
      </section>

      {/* Upcoming Events */}
      {upcomingCompetitions && upcomingCompetitions.length > 0 && (
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold text-gray-900">Upcoming Events</h2>
              <Link
                href="/events"
                className="text-[#1e40af] hover:text-[#1e3a8a] font-semibold flex items-center"
              >
                View All
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingCompetitions.map((competition) => (
                <EventCard key={competition.id} competition={competition} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* News Section */}
      {latestNews && latestNews.length > 0 && (
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold text-gray-900">Latest News</h2>
              <Link
                href="/news"
                className="text-[#1e40af] hover:text-[#1e3a8a] font-semibold flex items-center"
              >
                View All News
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {latestNews.map((post) => (
                <NewsCard key={post.id} post={post} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Disciplines Grid */}
      {disciplines && disciplines.length > 0 && (
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Shooting Disciplines</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {disciplines.map((discipline) => (
                <DisciplineCard key={discipline.id} discipline={discipline} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
    )
  } catch (error) {
    const loadTime = Date.now() - startTime
    console.error(`[HomePage] Error occurred after ${loadTime}ms:`, error)
    throw error
  }
}

// Stat Card Component
function StatCard({ icon, value, label, color }: { icon: React.ReactNode; value: number; label: string; color: string }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-[#1e40af]">
      <div className={`${color} w-16 h-16 rounded-lg flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <div className="text-3xl font-bold text-gray-900 mb-1">{value.toLocaleString()}</div>
      <div className="text-gray-600">{label}</div>
    </div>
  )
}

// Event Card Component
function EventCard({ competition }: { competition: any }) {
  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    if (format(start, 'MMM yyyy') === format(end, 'MMM yyyy')) {
      return `${format(start, 'MMM d')} - ${format(end, 'd')}`
    }
    return `${format(start, 'MMM d')} - ${format(end, 'MMM d')}`
  }

  return (
    <Link href={`/events/${competition.id}`} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      <div className="h-48 bg-gradient-to-br from-[#1e40af] to-[#1e3a8a] flex items-center justify-center">
        <Target className="h-16 w-16 text-white opacity-50" />
      </div>
      <div className="p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2">{competition.name}</h3>
        <div className="flex items-center text-gray-600 mb-2">
          <Calendar className="h-4 w-4 mr-2" />
          <span className="text-sm">{formatDateRange(competition.start_date, competition.end_date)}</span>
        </div>
        <div className="flex items-center text-gray-600 mb-4">
          <Target className="h-4 w-4 mr-2" />
          <span className="text-sm">{competition.location}</span>
        </div>
        <div className="flex items-center text-[#1e40af] font-semibold">
          View Details
          <ArrowRight className="ml-2 h-4 w-4" />
        </div>
      </div>
    </Link>
  )
}

// News Card Component
function NewsCard({ post }: { post: any }) {
  return (
    <Link href={`/news/${post.slug}`} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      {post.featured_image && (
        <div className="h-48 bg-gray-200 relative">
          <img
            src={post.featured_image}
            alt={post.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">{post.title}</h3>
        {post.excerpt && (
          <p className="text-gray-600 mb-4 line-clamp-3">{post.excerpt}</p>
        )}
        {post.published_at && (
          <div className="flex items-center text-gray-500 text-sm">
            <Clock className="h-4 w-4 mr-2" />
            <span>{format(new Date(post.published_at), 'MMM d, yyyy')}</span>
          </div>
        )}
      </div>
    </Link>
  )
}

// Discipline Card Component
function DisciplineCard({ discipline }: { discipline: any }) {
  const bgColor = discipline.color || '#1e40af'
  
  return (
    <Link
      href={`/shooting-disciplines/${discipline.slug}`}
      className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-all hover:scale-105 text-center group"
    >
      <div
        className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-white"
        style={{ backgroundColor: bgColor }}
      >
        <Target className="h-8 w-8" />
      </div>
      <h3 className="font-semibold text-gray-900 group-hover:text-[#1e40af] transition-colors">
        {discipline.name}
      </h3>
    </Link>
  )
}
