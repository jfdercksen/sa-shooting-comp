'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Users, Calendar, CheckCircle, Mail, Plus, FileText, ClipboardList, Download, TrendingUp, Target } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import type { Database } from '@/types/database'

type Profile = Database['public']['Tables']['profiles']['Row']
type Competition = Database['public']['Tables']['competitions']['Row']
type Score = Database['public']['Tables']['scores']['Row']
type Registration = Database['public']['Tables']['registrations']['Row']
type Discipline = Database['public']['Tables']['disciplines']['Row']
type ContactSubmission = Database['public']['Tables']['contact_submissions']['Row']

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    activeShooters: 0,
    competitionsThisMonth: 0,
    pendingVerifications: 0,
    unreadSubmissions: 0,
  })
  const [registrationsData, setRegistrationsData] = useState<Array<{ date: string; count: number }>>([])
  const [disciplineData, setDisciplineData] = useState<Array<{ name: string; count: number }>>([])
  const [provinceData, setProvinceData] = useState<Array<{ name: string; count: number }>>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadDashboardData()
  }, [])

  async function loadDashboardData() {
    setLoading(true)
    try {
      // Load stats
      const { count: activeShooters } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })

      const now = new Date()
      const monthStart = startOfMonth(now).toISOString()
      const monthEnd = endOfMonth(now).toISOString()

      const { count: competitionsThisMonth } = await supabase
        .from('competitions')
        .select('*', { count: 'exact', head: true })
        .gte('start_date', monthStart)
        .lte('start_date', monthEnd)

      const { data: pendingScores } = await supabase
        .from('scores')
        .select('id')
        .is('verified_at', null)
        .is('is_dnf', false)
        .is('is_dq', false)

      const { count: unreadSubmissions } = await supabase
        .from('contact_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false)

      setStats({
        activeShooters: activeShooters || 0,
        competitionsThisMonth: competitionsThisMonth || 0,
        pendingVerifications: pendingScores?.length || 0,
        unreadSubmissions: unreadSubmissions || 0,
      })

      // Load registrations over time (last 6 months)
      const sixMonthsAgo = subMonths(now, 6)
      const { data: registrations } = await supabase
        .from('registrations')
        .select('registered_at')
        .gte('registered_at', sixMonthsAgo.toISOString())
        .order('registered_at', { ascending: true })

      const registrationsByMonth: Record<string, number> = {}
      registrations?.forEach((reg) => {
        if (reg.registered_at) {
          const month = format(new Date(reg.registered_at), 'yyyy-MM')
          registrationsByMonth[month] = (registrationsByMonth[month] || 0) + 1
        }
      })

      setRegistrationsData(
        Object.entries(registrationsByMonth).map(([date, count]) => ({
          date,
          count,
        }))
      )

      // Load popular disciplines
      const { data: disciplineRegs } = await supabase
        .from('registrations')
        .select('discipline_id')
        .not('discipline_id', 'is', null)

      const disciplineCounts: Record<string, number> = {}
      disciplineRegs?.forEach((reg) => {
        if (reg.discipline_id) {
          disciplineCounts[reg.discipline_id] = (disciplineCounts[reg.discipline_id] || 0) + 1
        }
      })

      const { data: disciplines } = await supabase.from('disciplines').select('id, name')

      const disciplineList = Object.entries(disciplineCounts)
        .map(([id, count]) => {
          const discipline = disciplines?.find((d) => d.id === id)
          return {
            name: discipline?.name || 'Unknown',
            count,
          }
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)

      setDisciplineData(disciplineList)

      // Load province distribution
      const { data: profiles } = await supabase.from('profiles').select('province').not('province', 'is', null)

      const provinceCounts: Record<string, number> = {}
      profiles?.forEach((profile) => {
        if (profile.province) {
          provinceCounts[profile.province] = (provinceCounts[profile.province] || 0) + 1
        }
      })

      setProvinceData(
        Object.entries(provinceCounts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
      )
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

  const maxRegistrations = Math.max(...registrationsData.map((d) => d.count), 1)
  const maxDisciplines = Math.max(...disciplineData.map((d) => d.count), 1)
  const maxProvinces = Math.max(...provinceData.map((d) => d.count), 1)

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">Overview of your shooting competition system</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={<Users className="h-8 w-8" />}
            value={stats.activeShooters}
            label="Total Active Shooters"
            color="bg-blue-100 text-blue-600"
            link="/admin/users"
          />
          <StatCard
            icon={<Calendar className="h-8 w-8" />}
            value={stats.competitionsThisMonth}
            label="Competitions This Month"
            color="bg-amber-100 text-amber-600"
            link="/admin/competitions"
          />
          <StatCard
            icon={<CheckCircle className="h-8 w-8" />}
            value={stats.pendingVerifications}
            label="Pending Score Verifications"
            color="bg-green-100 text-green-600"
            link="/admin/verify-scores"
          />
          <StatCard
            icon={<Mail className="h-8 w-8" />}
            value={stats.unreadSubmissions}
            label="Unread Contact Submissions"
            color="bg-purple-100 text-purple-600"
            link="/admin/contact-submissions"
          />
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Link
              href="/admin/competitions"
              className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-[#1e40af] hover:bg-blue-50 transition-colors"
            >
              <Plus className="h-5 w-5 text-[#1e40af]" />
              <span className="font-medium text-gray-900">Create Competition</span>
            </Link>
            <Link
              href="/admin/disciplines"
              className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-[#1e40af] hover:bg-blue-50 transition-colors"
            >
              <Target className="h-5 w-5 text-[#1e40af]" />
              <span className="font-medium text-gray-900">Create Discipline</span>
            </Link>
            <Link
              href="/admin/news"
              className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-[#1e40af] hover:bg-blue-50 transition-colors"
            >
              <FileText className="h-5 w-5 text-[#1e40af]" />
              <span className="font-medium text-gray-900">Add News Post</span>
            </Link>
            <Link
              href="/admin/competitions"
              className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-[#1e40af] hover:bg-blue-50 transition-colors"
            >
              <ClipboardList className="h-5 w-5 text-[#1e40af]" />
              <span className="font-medium text-gray-900">View Registrations</span>
            </Link>
            <button
              onClick={() => toast.info('Export feature coming soon')}
              className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-[#1e40af] hover:bg-blue-50 transition-colors"
            >
              <Download className="h-5 w-5 text-[#1e40af]" />
              <span className="font-medium text-gray-900">Export Reports</span>
            </button>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Registrations Over Time */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[#1e40af]" />
              Registrations Over Time
            </h2>
            {registrationsData.length > 0 ? (
              <div className="space-y-2">
                {registrationsData.map((item) => (
                  <div key={item.date} className="flex items-center gap-4">
                    <div className="w-24 text-sm text-gray-600">
                      {format(new Date(item.date + '-01'), 'MMM yyyy')}
                    </div>
                    <div className="flex-1 bg-gray-200 rounded-full h-6 relative overflow-hidden">
                      <div
                        className="bg-[#1e40af] h-full rounded-full transition-all"
                        style={{ width: `${(item.count / maxRegistrations) * 100}%` }}
                      ></div>
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-gray-900">
                        {item.count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No registration data available</p>
            )}
          </div>

          {/* Popular Disciplines */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Popular Disciplines</h2>
            {disciplineData.length > 0 ? (
              <div className="space-y-3">
                {disciplineData.map((item) => (
                  <div key={item.name}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-gray-900">{item.name}</span>
                      <span className="text-sm text-gray-600">{item.count}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-amber-500 h-2 rounded-full transition-all"
                        style={{ width: `${(item.count / maxDisciplines) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No discipline data available</p>
            )}
          </div>

          {/* Province Distribution */}
          <div className="bg-white rounded-lg shadow-md p-6 lg:col-span-2">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Province Distribution</h2>
            {provinceData.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {provinceData.map((item) => (
                  <div key={item.name} className="text-center">
                    <div className="text-2xl font-bold text-[#1e40af] mb-1">{item.count}</div>
                    <div className="text-sm text-gray-600">{item.name}</div>
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-1">
                      <div
                        className="bg-green-500 h-1 rounded-full transition-all"
                        style={{ width: `${(item.count / maxProvinces) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No province data available</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  icon,
  value,
  label,
  color,
  link,
}: {
  icon: React.ReactNode
  value: number
  label: string
  color: string
  link?: string
}) {
  const content = (
    <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-[#1e40af] hover:shadow-lg transition-shadow">
      <div className={`${color} w-16 h-16 rounded-lg flex items-center justify-center mb-4`}>{icon}</div>
      <div className="text-3xl font-bold text-gray-900 mb-1">{value.toLocaleString()}</div>
      <div className="text-gray-600">{label}</div>
    </div>
  )

  if (link) {
    return <Link href={link}>{content}</Link>
  }

  return content
}

