'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Calendar,
  Target,
  Trophy,
  Users,
  Bell,
  Plus,
  FileText,
  Award,
  ArrowRight,
  CheckCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { format } from 'date-fns'
import type { Database } from '@/types/database'

type Profile = Database['public']['Tables']['profiles']['Row']
type Competition = Database['public']['Tables']['competitions']['Row']
type Registration = Database['public']['Tables']['registrations']['Row']
type Score = Database['public']['Tables']['scores']['Row']
type Team = Database['public']['Tables']['teams']['Row']
type Notification = Database['public']['Tables']['notifications']['Row']

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [upcomingCompetitions, setUpcomingCompetitions] = useState<Array<Competition & { registration: Registration | null }>>([])
  const [recentScores, setRecentScores] = useState<Array<Score & { competition: Competition | null; discipline: any }>>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadDashboardData()
  }, [])

  async function loadDashboardData() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Please log in')
        return
      }

      // Load profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      setProfile(profileData)

      // Load upcoming competitions where user is registered
      const { data: registrations } = await supabase
        .from('registrations')
        .select('*, competitions(*)')
        .eq('user_id', user.id)
        .order('competitions(start_date)', { ascending: true })

      const upcoming = (registrations || [])
        .filter((reg: any) => {
          const comp = reg.competitions
          return comp && new Date(comp.start_date) >= new Date()
        })
        .slice(0, 3)
        .map((reg: any) => ({
          ...reg.competitions,
          registration: reg,
        }))

      setUpcomingCompetitions(upcoming)

      // Load recent scores (last 5)
      const { data: scoresData } = await supabase
        .from('scores')
        .select('*, registrations!inner(*, competitions(*), disciplines(*))')
        .eq('registrations.user_id', user.id)
        .order('submitted_at', { ascending: false })
        .limit(5)

      const recent = (scoresData || []).map((score: any) => ({
        ...score,
        competition: score.registrations?.competitions || null,
        discipline: score.registrations?.disciplines || null,
      }))

      setRecentScores(recent)

      // Load teams
      const { data: teamMemberships } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)

      const teamIds = teamMemberships?.map(tm => tm.team_id).filter((id): id is string => id !== null) || []

      const { data: captainTeams } = await supabase
        .from('teams')
        .select('*')
        .eq('captain_id', user.id)

      const captainTeamIds = captainTeams?.map(t => t.id).filter((id): id is string => id !== null) || []
      const allTeamIds: string[] = [...new Set([...teamIds, ...captainTeamIds])]

      if (allTeamIds.length > 0) {
        const { data: teamsData } = await supabase
          .from('teams')
          .select('*')
          .in('id', allTeamIds)

        setTeams(teamsData || [])
      }

      // Load unread notifications
      const { data: notificationsData } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(5)

      setNotifications(notificationsData || [])
    } catch (error) {
      console.error('Error loading dashboard:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  function getMembershipStatus() {
    if (!profile) return { label: 'Unknown', color: 'bg-gray-500' }
    if (profile.life_member) return { label: 'Life Member', color: 'bg-purple-500' }
    if (profile.membership_paid_until) {
      const paidUntil = new Date(profile.membership_paid_until)
      if (paidUntil > new Date()) {
        return { label: 'Active', color: 'bg-green-500' }
      }
      return { label: 'Expired', color: 'bg-red-500' }
    }
    return { label: 'Pending', color: 'bg-yellow-500' }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1e40af] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  const membershipStatus = getMembershipStatus()

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-[#1e40af] to-[#1e3a8a] rounded-lg shadow-md p-8 mb-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                Welcome back, {profile?.full_names?.split(' ')[0] || 'Shooter'}!
              </h1>
              <div className="flex items-center gap-4 mt-4">
                <div className="flex items-center gap-2">
                  <span className="text-gray-200">SABU Number:</span>
                  <span className="font-semibold text-lg">{profile?.sabu_number || 'N/A'}</span>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-semibold ${membershipStatus.color}`}>
                  {membershipStatus.label}
                </div>
              </div>
            </div>
            {profile?.profile_image && (
              <div className="hidden md:block">
                <img
                  src={profile.profile_image}
                  alt={profile.full_names}
                  className="w-24 h-24 rounded-full border-4 border-white object-cover"
                />
              </div>
            )}
          </div>
        </div>

        {/* My Activity Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Upcoming Competitions */}
          <ActivityCard
            title="Upcoming Competitions"
            icon={<Calendar className="h-6 w-6" />}
            count={upcomingCompetitions.length}
            link="/events"
            linkText="View All Events"
          >
            {upcomingCompetitions.length === 0 ? (
              <p className="text-gray-500 text-sm">No upcoming competitions registered</p>
            ) : (
              <div className="space-y-3">
                {upcomingCompetitions.map((comp) => (
                  <div key={`${comp.id}-${comp.registration?.id || ''}`} className="border-l-4 border-[#1e40af] pl-4">
                    <h4 className="font-semibold text-gray-900">{comp.name}</h4>
                    <p className="text-sm text-gray-600">
                      {format(new Date(comp.start_date), 'MMM d')} -{' '}
                      {format(new Date(comp.end_date), 'MMM d, yyyy')}
                    </p>
                    <Link
                      href={`/events/${comp.id}`}
                      className="text-sm text-[#1e40af] hover:underline inline-flex items-center gap-1 mt-1"
                    >
                      View Details <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </ActivityCard>

          {/* Recent Scores */}
          <ActivityCard
            title="Recent Scores"
            icon={<Target className="h-6 w-6" />}
            count={recentScores.length}
            link="/scoring"
            linkText="View All Scores"
          >
            {recentScores.length === 0 ? (
              <p className="text-gray-500 text-sm">No scores submitted yet</p>
            ) : (
              <div className="space-y-3">
                {recentScores.map((score) => (
                  <div key={score.id} className="flex justify-between items-center border-l-4 border-green-500 pl-4">
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {score.competition?.name || 'Unknown Competition'}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {score.discipline?.name || 'N/A'} • {format(new Date(score.submitted_at || ''), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900">{score.score}</div>
                      {score.verified_at && (
                        <CheckCircle className="h-4 w-4 text-green-500 inline-block ml-1" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ActivityCard>

          {/* Team Information */}
          <ActivityCard
            title="My Teams"
            icon={<Users className="h-6 w-6" />}
            count={teams.length}
            link="/teams"
            linkText="Manage Teams"
          >
            {teams.length === 0 ? (
              <p className="text-gray-500 text-sm">You are not a member of any teams</p>
            ) : (
              <div className="space-y-3">
                {teams.slice(0, 3).map((team) => (
                  <div key={team.id} className="flex items-center justify-between border-l-4 border-blue-500 pl-4">
                    <div>
                      <h4 className="font-semibold text-gray-900">{team.name}</h4>
                      {team.province && <p className="text-sm text-gray-600">{team.province}</p>}
                    </div>
                    {team.captain_id === profile?.id && (
                      <span className="px-2 py-1 text-xs font-semibold bg-[#eab308] text-gray-900 rounded">
                        Captain
                      </span>
                    )}
                  </div>
                ))}
                {teams.length > 3 && (
                  <p className="text-sm text-gray-500">+{teams.length - 3} more teams</p>
                )}
              </div>
            )}
          </ActivityCard>

          {/* Unread Notifications */}
          <ActivityCard
            title="Notifications"
            icon={<Bell className="h-6 w-6" />}
            count={notifications.length}
            link="#"
            linkText="View All"
            badge={notifications.length > 0 ? notifications.length : undefined}
          >
            {notifications.length === 0 ? (
              <p className="text-gray-500 text-sm">No unread notifications</p>
            ) : (
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <div key={notification.id} className="border-l-4 border-yellow-500 pl-4">
                    <h4 className="font-semibold text-gray-900">{notification.title}</h4>
                    <p className="text-sm text-gray-600 line-clamp-2">{notification.message}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {format(new Date(notification.created_at || ''), 'MMM d, yyyy')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </ActivityCard>
        </div>

        {/* My Registrations Section */}
        <MyRegistrationsSection />

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/events"
              className="flex flex-col items-center gap-3 p-6 border border-gray-200 rounded-lg hover:border-[#1e40af] hover:bg-blue-50 transition-colors"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Plus className="h-6 w-6 text-[#1e40af]" />
              </div>
              <span className="font-medium text-gray-900 text-center">Register for Competition</span>
            </Link>
            <Link
              href="/scoring"
              className="flex flex-col items-center gap-3 p-6 border border-gray-200 rounded-lg hover:border-[#1e40af] hover:bg-blue-50 transition-colors"
            >
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Target className="h-6 w-6 text-green-600" />
              </div>
              <span className="font-medium text-gray-900 text-center">Submit Scores</span>
            </Link>
            <Link
              href="/results"
              className="flex flex-col items-center gap-3 p-6 border border-gray-200 rounded-lg hover:border-[#1e40af] hover:bg-blue-50 transition-colors"
            >
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                <Trophy className="h-6 w-6 text-amber-600" />
              </div>
              <span className="font-medium text-gray-900 text-center">View Results</span>
            </Link>
            <Link
              href="/profile"
              className="flex flex-col items-center gap-3 p-6 border border-gray-200 rounded-lg hover:border-[#1e40af] hover:bg-blue-50 transition-colors"
            >
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <FileText className="h-6 w-6 text-purple-600" />
              </div>
              <span className="font-medium text-gray-900 text-center">Update Profile</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function ActivityCard({
  title,
  icon,
  count,
  link,
  linkText,
  badge,
  children,
}: {
  title: string
  icon: React.ReactNode
  count: number
  link: string
  linkText: string
  badge?: number
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-[#1e40af]">
            {icon}
          </div>
          <div>
            <h3 className="font-bold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-600">{count} items</p>
          </div>
        </div>
        {badge !== undefined && badge > 0 && (
          <span className="px-2 py-1 bg-red-500 text-white text-xs font-semibold rounded-full">{badge}</span>
        )}
      </div>
      <div className="mb-4">{children}</div>
      <Link href={link} className="text-sm text-[#1e40af] hover:underline inline-flex items-center gap-1">
        {linkText} <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  )
}

function MyRegistrationsSection() {
  const [registrations, setRegistrations] = useState<Array<Registration & { competition: Competition | null; discipline: any }>>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadRegistrations()
  }, [])

  async function loadRegistrations() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: regsData } = await supabase
        .from('registrations')
        .select(`
          *,
          competitions (
            id,
            name,
            start_date,
            end_date,
            slug
          ),
          disciplines (
            id,
            name,
            color
          )
        `)
        .eq('user_id', user.id)
        .order('registered_at', { ascending: false })

      const regs = (regsData || []).map((reg: any) => ({
        ...reg,
        competition: reg.competitions || null,
        discipline: reg.disciplines || null,
      }))

      setRegistrations(regs)
    } catch (error) {
      console.error('Error loading registrations:', error)
      toast.error('Failed to load registrations')
    } finally {
      setLoading(false)
    }
  }

  function getStatusBadge(status: string | null) {
    switch (status) {
      case 'confirmed':
        return <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full">Confirmed</span>
      case 'pending':
        return <span className="px-2 py-1 text-xs font-semibold bg-yellow-100 text-yellow-800 rounded-full">Pending</span>
      case 'draft':
        return <span className="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-800 rounded-full">Draft</span>
      default:
        return <span className="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-800 rounded-full">{status || 'Unknown'}</span>
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-[#1e40af] rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mt-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-[#1e40af]">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">My Registrations</h2>
            <p className="text-sm text-gray-600">{registrations.length} registration{registrations.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <Link
          href="/events"
          className="text-sm text-[#1e40af] hover:underline inline-flex items-center gap-1"
        >
          Register for Competition <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {registrations.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">No registrations yet</p>
          <p className="text-sm text-gray-500 mb-4">Register for a competition to get started</p>
          <Link
            href="/events"
            className="inline-flex items-center px-4 py-2 bg-[#1e40af] text-white rounded-lg hover:bg-[#1e3a8a] transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            Browse Competitions
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Competition
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Discipline
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Entry Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Registered
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {registrations.map((reg) => (
                <tr key={reg.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {reg.competition?.name || 'Unknown Competition'}
                    </div>
                    {reg.competition && (
                      <div className="text-sm text-gray-500">
                        {format(new Date(reg.competition.start_date), 'MMM d')} -{' '}
                        {format(new Date(reg.competition.end_date), 'MMM d, yyyy')}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {reg.discipline?.color && (
                        <div
                          className="w-3 h-3 rounded-full mr-2"
                          style={{ backgroundColor: reg.discipline.color }}
                        />
                      )}
                      <span className="text-sm text-gray-900">{reg.discipline?.name || 'N/A'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-mono text-gray-900">{reg.entry_number || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(reg.registration_status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600">
                      {reg.registered_at ? format(new Date(reg.registered_at), 'MMM d, yyyy') : 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {reg.competition && (
                      <Link
                        href={`/scoring?competition=${reg.competition.id}`}
                        className="text-[#1e40af] hover:text-[#1e3a8a] inline-flex items-center"
                      >
                        <Target className="h-4 w-4 mr-1" />
                        Submit Scores
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
