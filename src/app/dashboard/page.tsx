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

      // Load upcoming competitions user is registered for
      const { data: registrations } = await supabase
        .from('registrations')
        .select(`
          *,
          competitions (*)
        `)
        .eq('user_id', user.id)
        .in('registration_status', ['pending', 'confirmed'])
        .order('registered_at', { ascending: false })
        .limit(5)

      const upcoming = (registrations || []).map((reg: any) => ({
        ...reg.competitions,
        registration: reg,
      })).filter((comp: any) => comp && new Date(comp.start_date) >= new Date())

      setUpcomingCompetitions(upcoming)

      // Load recent scores
      const { data: scores } = await supabase
        .from('scores')
        .select(`
          *,
          registrations!inner (
            competition_id,
            discipline_id,
            competitions (*),
            disciplines (*)
          )
        `)
        .eq('registrations.user_id', user.id)
        .order('submitted_at', { ascending: false })
        .limit(5)

      const recent = (scores || []).map((score: any) => ({
        ...score,
        competition: score.registrations?.competitions || null,
        discipline: score.registrations?.disciplines || null,
      }))

      setRecentScores(recent)

      // Load teams
      const { data: teamMembers } = await supabase
        .from('team_members')
        .select(`
          *,
          teams (*)
        `)
        .eq('user_id', user.id)

      const userTeams = (teamMembers || []).map((tm: any) => tm.teams).filter(Boolean)
      setTeams(userTeams)

      // Load notifications
      const { data: notifs } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(5)

      setNotifications(notifs || [])
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
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

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Profile not found</h2>
            <p className="text-gray-600 mb-6">
              Your profile could not be loaded. Please complete your registration.
            </p>
            <Link
              href="/register"
              className="inline-block px-6 py-2 bg-[#1e40af] text-white rounded-lg hover:bg-[#1e3a8a] transition-colors"
            >
              Complete Registration
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Welcome Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {profile.full_names?.split(' ')[0] || 'Shooter'}!
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-gray-600">
            <div className="flex items-center">
              <Target className="h-5 w-5 mr-2" />
              <span>SABU Number: {profile.sabu_number || 'Not assigned'}</span>
            </div>
            {profile.club && (
              <div className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                <span>Club: {profile.club}</span>
              </div>
            )}
            <div className="flex items-center">
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                profile.role === 'super_admin' || profile.role === 'admin'
                  ? 'bg-purple-100 text-purple-800'
                  : profile.role === 'team_captain'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-green-100 text-green-800'
              }`}>
                {profile.role === 'super_admin' ? 'Super Admin' :
                 profile.role === 'admin' ? 'Admin' :
                 profile.role === 'team_captain' ? 'Team Captain' :
                 'Shooter'}
              </span>
            </div>
          </div>
        </div>

        {/* Activity Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <ActivityCard
            icon={<Calendar className="h-8 w-8" />}
            title="Upcoming Competitions"
            count={upcomingCompetitions.length}
            color="bg-blue-100 text-blue-600"
            link="/events"
          />
          <ActivityCard
            icon={<Trophy className="h-8 w-8" />}
            title="Recent Scores"
            count={recentScores.length}
            color="bg-amber-100 text-amber-600"
            link="/dashboard/scoring"
          />
          <ActivityCard
            icon={<Users className="h-8 w-8" />}
            title="My Teams"
            count={teams.length}
            color="bg-green-100 text-green-600"
            link="/teams"
          />
          <ActivityCard
            icon={<Bell className="h-8 w-8" />}
            title="Unread Notifications"
            count={notifications.length}
            color="bg-purple-100 text-purple-600"
            link="/dashboard"
          />
        </div>

        {/* Upcoming Competitions */}
        {upcomingCompetitions.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <Calendar className="h-6 w-6 mr-2 text-[#1e40af]" />
                Upcoming Competitions
              </h2>
              <Link
                href="/events"
                className="text-[#1e40af] hover:text-[#1e3a8a] font-semibold flex items-center"
              >
                View All <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </div>
            <div className="space-y-4">
              {upcomingCompetitions.map((competition: any) => (
                <div
                  key={competition.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {competition.name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                        <span>
                          {format(new Date(competition.start_date), 'MMM d')} -{' '}
                          {format(new Date(competition.end_date), 'MMM d, yyyy')}
                        </span>
                        <span>{competition.location}</span>
                        {competition.registration && (
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            competition.registration.registration_status === 'confirmed'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {competition.registration.registration_status === 'confirmed'
                              ? 'Confirmed'
                              : 'Pending'}
                          </span>
                        )}
                      </div>
                    </div>
                    <Link
                      href={`/events/${competition.id}`}
                      className="text-[#1e40af] hover:text-[#1e3a8a] font-semibold"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Scores */}
        {recentScores.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <Trophy className="h-6 w-6 mr-2 text-[#1e40af]" />
                Recent Scores
              </h2>
              <Link
                href="/dashboard/scoring"
                className="text-[#1e40af] hover:text-[#1e3a8a] font-semibold flex items-center"
              >
                View All <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </div>
            <div className="space-y-3">
              {recentScores.map((score: any) => (
                <div
                  key={score.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">
                      {score.competition?.name || 'Unknown Competition'}
                    </div>
                    <div className="text-sm text-gray-600">
                      {score.discipline?.name || 'Unknown Discipline'}
                      {score.submitted_at && (
                        <span className="ml-2">
                          • {format(new Date(score.submitted_at), 'MMM d, yyyy')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">{score.score || 0}</div>
                      <div className="text-xs text-gray-500">Total Score</div>
                    </div>
                    {score.verified_at ? (
                      <CheckCircle className="h-6 w-6 text-green-500" />
                    ) : (
                      <div className="h-6 w-6 rounded-full border-2 border-yellow-400"></div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Team Information */}
        {teams.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <Users className="h-6 w-6 mr-2 text-[#1e40af]" />
                My Teams
              </h2>
              <Link
                href="/teams"
                className="text-[#1e40af] hover:text-[#1e3a8a] font-semibold flex items-center"
              >
                Manage Teams <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {teams.map((team: any) => (
                <div
                  key={team.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <h3 className="font-semibold text-gray-900 mb-2">{team.name}</h3>
                  <div className="text-sm text-gray-600">
                    <div>Province: {team.province || 'Not specified'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/events"
              className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-[#1e40af] hover:bg-blue-50 transition-colors"
            >
              <Plus className="h-5 w-5 text-[#1e40af]" />
              <span className="font-medium text-gray-900">Register for Competition</span>
            </Link>
            <Link
              href="/dashboard/scoring"
              className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-[#1e40af] hover:bg-blue-50 transition-colors"
            >
              <FileText className="h-5 w-5 text-[#1e40af]" />
              <span className="font-medium text-gray-900">Submit Scores</span>
            </Link>
            <Link
              href="/results"
              className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-[#1e40af] hover:bg-blue-50 transition-colors"
            >
              <Award className="h-5 w-5 text-[#1e40af]" />
              <span className="font-medium text-gray-900">View Results</span>
            </Link>
            <Link
              href="/profile"
              className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-[#1e40af] hover:bg-blue-50 transition-colors"
            >
              <Users className="h-5 w-5 text-[#1e40af]" />
              <span className="font-medium text-gray-900">Update Profile</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function ActivityCard({
  icon,
  title,
  count,
  color,
  link,
}: {
  icon: React.ReactNode
  title: string
  count: number
  color: string
  link?: string
}) {
  const content = (
    <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-[#1e40af] hover:shadow-lg transition-shadow">
      <div className={`${color} w-16 h-16 rounded-lg flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <div className="text-3xl font-bold text-gray-900 mb-1">{count}</div>
      <div className="text-gray-600">{title}</div>
    </div>
  )

  if (link) {
    return <Link href={link}>{content}</Link>
  }

  return content
}
