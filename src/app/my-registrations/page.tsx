'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FileText, Plus, Calendar, Target, ArrowRight, CheckCircle, Clock, XCircle, ExternalLink } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Database } from '@/types/database'

type Registration = Database['public']['Tables']['registrations']['Row']
type Competition = Database['public']['Tables']['competitions']['Row']
type Discipline = Database['public']['Tables']['disciplines']['Row']

interface RegistrationWithDetails extends Registration {
  competition: Competition | null
  discipline: Discipline | null
  team?: { id: string; name: string } | null
}

export default function MyRegistrationsPage() {
  const [registrations, setRegistrations] = useState<RegistrationWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'confirmed' | 'pending' | 'draft'>('all')
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    loadRegistrations()
  }, [])

  useEffect(() => {
    // Check authentication
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Please log in to view your registrations')
        router.push('/login')
      }
    }
    checkAuth()
  }, [supabase, router])

  async function loadRegistrations() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const { data: regsData, error } = await supabase
        .from('registrations')
        .select(`
          *,
          competitions (
            id,
            name,
            start_date,
            end_date,
            slug,
            location,
            venue_details
          ),
          disciplines (
            id,
            name,
            color,
            code
          ),
          teams (
            id,
            name
          )
        `)
        .eq('user_id', user.id)
        .order('registered_at', { ascending: false })

      if (error) throw error

      const regs = (regsData || []).map((reg: any) => ({
        ...reg,
        competition: reg.competitions || null,
        discipline: reg.disciplines || null,
        team: reg.teams || null,
      }))

      setRegistrations(regs)
    } catch (error: any) {
      console.error('Error loading registrations:', error)
      toast.error('Failed to load registrations')
    } finally {
      setLoading(false)
    }
  }

  function getStatusBadge(status: string | null) {
    switch (status) {
      case 'confirmed':
        return (
          <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full flex items-center gap-1 w-fit">
            <CheckCircle className="h-3 w-3" />
            Confirmed
          </span>
        )
      case 'pending':
        return (
          <span className="px-2 py-1 text-xs font-semibold bg-yellow-100 text-yellow-800 rounded-full flex items-center gap-1 w-fit">
            <Clock className="h-3 w-3" />
            Pending
          </span>
        )
      case 'draft':
        return (
          <span className="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-800 rounded-full flex items-center gap-1 w-fit">
            Draft
          </span>
        )
      case 'cancelled':
        return (
          <span className="px-2 py-1 text-xs font-semibold bg-red-100 text-red-800 rounded-full flex items-center gap-1 w-fit">
            <XCircle className="h-3 w-3" />
            Cancelled
          </span>
        )
      default:
        return (
          <span className="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-800 rounded-full">
            {status || 'Unknown'}
          </span>
        )
    }
  }

  function getPaymentStatusBadge(status: string | null) {
    switch (status) {
      case 'paid':
        return <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full">Paid</span>
      case 'pending':
        return (
          <span className="px-2 py-1 text-xs font-semibold bg-yellow-100 text-yellow-800 rounded-full">Pending</span>
        )
      case 'failed':
        return <span className="px-2 py-1 text-xs font-semibold bg-red-100 text-red-800 rounded-full">Failed</span>
      default:
        return <span className="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-800 rounded-full">Unknown</span>
    }
  }

  const filteredRegistrations = registrations.filter((reg) => {
    if (filter === 'all') return true
    return reg.registration_status === filter
  })

  const upcomingRegistrations = filteredRegistrations.filter((reg) => {
    if (!reg.competition?.start_date) return false
    return new Date(reg.competition.start_date) >= new Date()
  })

  const pastRegistrations = filteredRegistrations.filter((reg) => {
    if (!reg.competition?.end_date) return false
    return new Date(reg.competition.end_date) < new Date()
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1e40af] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your registrations...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Registrations</h1>
              <p className="text-gray-600 mt-2">View and manage your competition registrations</p>
            </div>
            <Link
              href="/events"
              className="flex items-center gap-2 px-4 py-2 bg-[#1e40af] text-white rounded-lg hover:bg-[#1e3a8a] transition-colors"
            >
              <Plus className="h-5 w-5" />
              Register for Competition
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="text-2xl font-bold text-gray-900">{registrations.length}</div>
            <div className="text-sm text-gray-600">Total Registrations</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="text-2xl font-bold text-green-600">
              {registrations.filter((r) => r.registration_status === 'confirmed').length}
            </div>
            <div className="text-sm text-gray-600">Confirmed</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="text-2xl font-bold text-yellow-600">
              {registrations.filter((r) => r.registration_status === 'pending').length}
            </div>
            <div className="text-sm text-gray-600">Pending</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="text-2xl font-bold text-blue-600">{upcomingRegistrations.length}</div>
            <div className="text-sm text-gray-600">Upcoming</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex gap-2">
            {(['all', 'confirmed', 'pending', 'draft'] as const).map((filterOption) => (
              <button
                key={filterOption}
                onClick={() => setFilter(filterOption)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === filterOption
                    ? 'bg-[#1e40af] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Registrations List */}
        {filteredRegistrations.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Registrations Found</h2>
            <p className="text-gray-600 mb-6">
              {filter === 'all'
                ? "You haven't registered for any competitions yet"
                : `No ${filter} registrations found`}
            </p>
            <Link
              href="/events"
              className="inline-flex items-center px-6 py-3 bg-[#1e40af] text-white rounded-lg hover:bg-[#1e3a8a] transition-colors"
            >
              <Plus className="h-5 w-5 mr-2" />
              Browse Competitions
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Upcoming Registrations */}
            {upcomingRegistrations.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Upcoming Competitions</h2>
                <div className="space-y-4">
                  {upcomingRegistrations.map((reg) => (
                    <RegistrationCard key={reg.id} registration={reg} getStatusBadge={getStatusBadge} getPaymentStatusBadge={getPaymentStatusBadge} />
                  ))}
                </div>
              </div>
            )}

            {/* Past Registrations */}
            {pastRegistrations.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Past Competitions</h2>
                <div className="space-y-4">
                  {pastRegistrations.map((reg) => (
                    <RegistrationCard key={reg.id} registration={reg} getStatusBadge={getStatusBadge} getPaymentStatusBadge={getPaymentStatusBadge} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function RegistrationCard({
  registration,
  getStatusBadge,
  getPaymentStatusBadge,
}: {
  registration: RegistrationWithDetails
  getStatusBadge: (status: string | null) => React.ReactNode
  getPaymentStatusBadge: (status: string | null) => React.ReactNode
}) {
  const isUpcoming = registration.competition?.start_date
    ? new Date(registration.competition.start_date) >= new Date()
    : false

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">
                {registration.competition?.name || 'Unknown Competition'}
              </h3>
              {registration.competition && (
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(registration.competition.start_date), 'MMM d')} -{' '}
                    {format(new Date(registration.competition.end_date), 'MMM d, yyyy')}
                  </div>
                  {registration.competition.location && (
                    <div className="flex items-center gap-1">
                      <Target className="h-4 w-4" />
                      {registration.competition.location}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              {getStatusBadge(registration.registration_status)}
              {getPaymentStatusBadge(registration.payment_status)}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <div className="text-sm text-gray-600 mb-1">Discipline</div>
              <div className="flex items-center gap-2">
                {registration.discipline?.color && (
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: registration.discipline.color }}
                  />
                )}
                <span className="font-medium text-gray-900">
                  {registration.discipline?.name || 'N/A'}
                </span>
                {registration.discipline?.code && (
                  <span className="text-sm text-gray-500">({registration.discipline.code})</span>
                )}
              </div>
            </div>

            <div>
              <div className="text-sm text-gray-600 mb-1">Entry Number</div>
              <div className="font-mono font-medium text-gray-900">
                {registration.entry_number || 'N/A'}
              </div>
            </div>

            {registration.team && (
              <div>
                <div className="text-sm text-gray-600 mb-1">Team</div>
                <div className="font-medium text-gray-900">{registration.team.name}</div>
              </div>
            )}

            <div>
              <div className="text-sm text-gray-600 mb-1">Registered</div>
              <div className="text-sm text-gray-900">
                {registration.registered_at
                  ? format(new Date(registration.registered_at), 'MMM d, yyyy HH:mm')
                  : 'N/A'}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 md:items-end">
          {isUpcoming && registration.registration_status === 'confirmed' && (
            <Link
              href={`/scoring?competition=${registration.competition_id}`}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
            >
              <Target className="h-4 w-4" />
              Submit Scores
            </Link>
          )}
          {registration.competition && (
            <Link
              href={`/events/${registration.competition.id}`}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              <ExternalLink className="h-4 w-4" />
              View Competition
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

