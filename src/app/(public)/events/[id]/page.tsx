import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Calendar, MapPin, FileText, ArrowLeft, Target, Trophy } from 'lucide-react'
import { format } from 'date-fns'
import EventRegistration from '@/components/content/event-registration'
import type { Database } from '@/types/database'

type Competition = Database['public']['Tables']['competitions']['Row']
type Discipline = Database['public']['Tables']['disciplines']['Row']
type CompetitionDiscipline = Database['public']['Tables']['competition_disciplines']['Row']
type CompetitionMatch = Database['public']['Tables']['competition_matches']['Row']

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch competition
  const { data: competition, error: compError } = await supabase
    .from('competitions')
    .select('*')
    .eq('id', id)
    .single()

  if (compError || !competition) {
    notFound()
  }

  // Fetch competition disciplines with discipline details
  const { data: competitionDisciplines } = await supabase
    .from('competition_disciplines')
    .select(`
      *,
      disciplines (
        id,
        name,
        color,
        slug,
        description
      )
    `)
    .eq('competition_id', id)

  // Fetch competition matches
  const { data: matches } = await supabase
    .from('competition_matches')
    .select('*')
    .eq('competition_id', id)
    .order('match_date', { ascending: true, nullsFirst: false })

  // Count registrations
  const { count: registeredCount } = await supabase
    .from('registrations')
    .select('*', { count: 'exact', head: true })
    .eq('competition_id', id)
    .in('registration_status', ['pending', 'confirmed'])

  // Check if user is logged in
  const { data: { user } } = await supabase.auth.getUser()

  const getRegistrationStatus = () => {
    const now = new Date()
    const opens = competition.registration_opens ? new Date(competition.registration_opens) : null
    const closes = competition.registration_closes ? new Date(competition.registration_closes) : null

    // If registration_opens is set and current time is before it, registration hasn't opened yet
    if (opens && now < opens) {
      return {
        status: 'upcoming',
        text: 'Registration Opens Soon',
        color: 'bg-blue-100 text-blue-800',
        canRegister: false,
      }
    }
    
    // If registration_closes is set and current time is after it, registration is closed
    if (closes && now > closes) {
      return {
        status: 'closed',
        text: 'Registration Closed',
        color: 'bg-gray-100 text-gray-800',
        canRegister: false,
      }
    }
    
    // If capacity is set and reached, competition is full
    if (competition.capacity && registeredCount && registeredCount >= competition.capacity) {
      return {
        status: 'full',
        text: 'Competition Full',
        color: 'bg-red-100 text-red-800',
        canRegister: false,
      }
    }
    
    // If registration_opens is null or current time is >= opens, and closes is null or current time is <= closes
    // Registration is open
    return {
      status: 'open',
      text: 'Registration Open',
      color: 'bg-green-100 text-green-800',
      canRegister: true,
    }
  }

  const regStatus = getRegistrationStatus()
  const daysUntilClosing = competition.registration_closes
    ? Math.ceil((new Date(competition.registration_closes).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null

  const disciplines = competitionDisciplines?.map((cd: any) => ({
    ...cd.disciplines,
    fees: {
      standard: cd.all_matches_fee,
      u19: cd.all_matches_u19_fee,
      u25: cd.all_matches_u25_fee,
      maxEntries: cd.max_entries,
    },
  })) || []

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Back Button */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            href="/events"
            className="inline-flex items-center text-[#1e40af] hover:text-[#1e3a8a] font-semibold"
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
            Back to Events
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Competition Header */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">{competition.name}</h1>
              <div className="flex flex-wrap items-center gap-6 text-gray-600">
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  <span>
                    {format(new Date(competition.start_date), 'MMMM d')} -{' '}
                    {format(new Date(competition.end_date), 'MMMM d, yyyy')}
                  </span>
                </div>
                <div className="flex items-center">
                  <MapPin className="h-5 w-5 mr-2" />
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(competition.location)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-[#1e40af] underline"
                  >
                    {competition.location}
                  </a>
                </div>
              </div>
            </div>

            {/* Description */}
            {competition.description && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Description</h2>
                <div
                  className="prose prose-lg max-w-none text-gray-700"
                  dangerouslySetInnerHTML={{ __html: competition.description }}
                />
              </div>
            )}

            {/* Available Disciplines */}
            {disciplines.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                  <Target className="h-6 w-6 mr-2 text-[#1e40af]" />
                  Available Disciplines
                </h2>
                <div className="space-y-4">
                  {disciplines.map((discipline: any) => (
                    <div
                      key={discipline.id}
                      className="border border-gray-200 rounded-lg p-4"
                      style={{ borderLeftColor: discipline.color || '#1e40af', borderLeftWidth: '4px' }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">{discipline.name}</h3>
                          {discipline.description && (
                            <div
                              className="text-gray-600 text-sm mb-3 prose prose-sm max-w-none"
                              dangerouslySetInnerHTML={{ __html: discipline.description }}
                            />
                          )}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            {discipline.fees.standard !== null && (
                              <div>
                                <span className="text-gray-500">Standard Fee:</span>
                                <span className="font-semibold text-gray-900 ml-2">
                                  R{discipline.fees.standard.toFixed(2)}
                                </span>
                              </div>
                            )}
                            {discipline.fees.u19 !== null && (
                              <div>
                                <span className="text-gray-500">U19 Fee:</span>
                                <span className="font-semibold text-gray-900 ml-2">
                                  R{discipline.fees.u19.toFixed(2)}
                                </span>
                              </div>
                            )}
                            {discipline.fees.u25 !== null && (
                              <div>
                                <span className="text-gray-500">U25 Fee:</span>
                                <span className="font-semibold text-gray-900 ml-2">
                                  R{discipline.fees.u25.toFixed(2)}
                                </span>
                              </div>
                            )}
                            {discipline.fees.maxEntries !== null && (
                              <div>
                                <span className="text-gray-500">Max Entries:</span>
                                <span className="font-semibold text-gray-900 ml-2">
                                  {discipline.fees.maxEntries}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Matches List */}
            {matches && matches.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                  <Trophy className="h-6 w-6 mr-2 text-[#1e40af]" />
                  Competition Matches
                </h2>
                <div className="space-y-3">
                  {matches.map((match) => (
                    <div
                      key={match.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                    >
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{match.match_name}</h3>
                        <p className="text-sm text-gray-600">
                          {match.match_type}
                          {match.match_date && ` • ${format(new Date(match.match_date), 'MMM d, yyyy')}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-gray-900">R{match.entry_fee.toFixed(2)}</div>
                        {match.is_optional && (
                          <span className="text-xs text-gray-500">Optional</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rules Document */}
            {competition.rules_document_url && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <a
                  href={competition.rules_document_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center text-[#1e40af] hover:text-[#1e3a8a] font-semibold"
                >
                  <FileText className="h-5 w-5 mr-2" />
                  Download Rules Document
                </a>
              </div>
            )}

            {/* Venue Details */}
            {competition.venue_details && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Venue Details</h2>
                <p className="text-gray-700 whitespace-pre-wrap">{competition.venue_details}</p>
              </div>
            )}
          </div>

          {/* Right Column - Registration Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Registration</h3>

              {/* Status Badge */}
              <div className="mb-4">
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${regStatus.color}`}>
                  {regStatus.text}
                </span>
              </div>

              {/* Days Until Closing */}
              {daysUntilClosing !== null && daysUntilClosing > 0 && regStatus.status === 'open' && (
                <p className="text-sm text-gray-600 mb-4">
                  {daysUntilClosing} {daysUntilClosing === 1 ? 'day' : 'days'} until registration closes
                </p>
              )}

              {/* Capacity Info */}
              {competition.capacity && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">Registered</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {registeredCount || 0} / {competition.capacity}
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className="bg-[#1e40af] h-2 rounded-full"
                      style={{
                        width: `${Math.min(((registeredCount || 0) / competition.capacity) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Register Button */}
              {regStatus.canRegister ? (
                user ? (
                  <EventRegistration
                    competition={competition}
                    disciplines={disciplines}
                    matches={matches || []}
                  />
                ) : (
                  <Link
                    href="/login"
                    className="block w-full text-center px-6 py-3 bg-[#1e40af] text-white rounded-lg hover:bg-[#1e3a8a] transition-colors font-semibold"
                  >
                    Login to Register
                  </Link>
                )
              ) : (
                <button
                  disabled
                  className="w-full px-6 py-3 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed font-semibold"
                >
                  Registration Not Available
                </button>
              )}

              {/* Additional Fees */}
              {(competition.compulsory_range_fee ||
                competition.late_entry_fee ||
                competition.import_export_permit_fee) && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Additional Fees</h4>
                  <div className="space-y-1 text-sm text-gray-600">
                    {competition.compulsory_range_fee && (
                      <div>Range Fee: R{competition.compulsory_range_fee.toFixed(2)}</div>
                    )}
                    {competition.late_entry_fee && (
                      <div>Late Entry: R{competition.late_entry_fee.toFixed(2)}</div>
                    )}
                    {competition.import_export_permit_fee && (
                      <div>Import/Export Permit: R{competition.import_export_permit_fee.toFixed(2)}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
