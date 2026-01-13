import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Calendar, Target, ArrowLeft, Trophy } from 'lucide-react'
import { format } from 'date-fns'
import type { Database } from '@/types/database'

type Discipline = Database['public']['Tables']['disciplines']['Row']
type Competition = Database['public']['Tables']['competitions']['Row']

export default async function DisciplineDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()

  // Fetch discipline by slug
  const { data: discipline, error } = await supabase
    .from('disciplines')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error || !discipline) {
    notFound()
  }

  // Fetch upcoming competitions featuring this discipline
  const { data: upcomingCompetitions } = await supabase
    .from('competition_disciplines')
    .select(`
      *,
      competitions (
        id,
        name,
        slug,
        start_date,
        end_date,
        location,
        is_active
      )
    `)
    .eq('discipline_id', discipline.id)
    .gte('competitions.start_date', new Date().toISOString())
    .eq('competitions.is_active', true)
    .order('competitions.start_date', { ascending: true })
    .limit(5)

  // Fetch recent results (you'll need to implement results table query based on your schema)
  // For now, we'll show a placeholder

  const bgColor = discipline.color || '#1e40af'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div
        className="relative h-96 flex items-center justify-center text-white"
        style={{ backgroundColor: bgColor }}
      >
        <div className="absolute inset-0 bg-black/30"></div>
        {discipline.image_url && (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-20"
            style={{ backgroundImage: `url(${discipline.image_url})` }}
          ></div>
        )}
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <Target className="h-20 w-20 mx-auto mb-4 opacity-80" />
          <h1 className="text-5xl font-bold mb-4">{discipline.name}</h1>
          {discipline.code && (
            <p className="text-xl opacity-90">Code: {discipline.code}</p>
          )}
        </div>
      </div>

      {/* Back Button */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <Link
          href="/shooting-disciplines"
          className="inline-flex items-center text-[#1e40af] hover:text-[#1e3a8a] font-semibold"
        >
          <ArrowLeft className="mr-2 h-5 w-5" />
          Back to Disciplines
        </Link>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Description */}
            {discipline.description && (
              <section className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Description</h2>
                <div
                  className="prose prose-lg max-w-none text-gray-700"
                  dangerouslySetInnerHTML={{ __html: discipline.description }}
                />
              </section>
            )}

            {/* Equipment Requirements */}
            {discipline.equipment_requirements && (
              <section className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Equipment Requirements</h2>
                <div
                  className="prose prose-lg max-w-none text-gray-700"
                  dangerouslySetInnerHTML={{ __html: discipline.equipment_requirements }}
                />
              </section>
            )}

            {/* Rules Summary */}
            {discipline.rules_summary && (
              <section className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Rules Summary</h2>
                <div
                  className="prose prose-lg max-w-none text-gray-700"
                  dangerouslySetInnerHTML={{ __html: discipline.rules_summary }}
                />
              </section>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Upcoming Competitions */}
            {upcomingCompetitions && upcomingCompetitions.length > 0 && (
              <section className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <Calendar className="mr-2 h-5 w-5 text-[#1e40af]" />
                  Upcoming Competitions
                </h2>
                <div className="space-y-4">
                  {upcomingCompetitions.map((cd: any) => {
                    const comp = cd.competitions
                    if (!comp) return null
                    return (
                      <Link
                        key={comp.id}
                        href={`/events/${comp.id}`}
                        className="block p-4 border border-gray-200 rounded-lg hover:border-[#1e40af] hover:bg-blue-50 transition-colors"
                      >
                        <h3 className="font-semibold text-gray-900 mb-1">{comp.name}</h3>
                        <p className="text-sm text-gray-600">
                          {format(new Date(comp.start_date), 'MMM d')} - {format(new Date(comp.end_date), 'MMM d, yyyy')}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">{comp.location}</p>
                      </Link>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Recent Results Placeholder */}
            <section className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <Trophy className="mr-2 h-5 w-5 text-[#1e40af]" />
                Recent Results
              </h2>
              <p className="text-gray-600 text-sm">
                Recent competition results for this discipline will be displayed here.
              </p>
              <Link
                href="/results"
                className="mt-4 inline-flex items-center text-[#1e40af] hover:text-[#1e3a8a] font-semibold text-sm"
              >
                View All Results
                <ArrowLeft className="ml-2 h-4 w-4 rotate-180" />
              </Link>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
