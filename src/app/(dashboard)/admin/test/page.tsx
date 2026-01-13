'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Shield,
  Mail,
  User,
  LayoutDashboard,
  Users,
  Calendar,
  FileText,
  CheckCircle,
  Target,
  Settings,
  MessageSquare,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import type { Database } from '@/types/database'

type Profile = Database['public']['Tables']['profiles']['Row']

export default function AdminTestPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadUserData()
  }, [])

  async function loadUserData() {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      
      if (!authUser) {
        toast.error('Please log in to access this page')
        return
      }

      setUser(authUser)

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()

      setProfile(profileData)

      // Check admin access
      if (profileData && !['super_admin', 'admin'].includes(profileData.role || '')) {
        toast.error('You do not have admin access')
      }
    } catch (error) {
      console.error('Error loading user data:', error)
      toast.error('Failed to load user data')
    } finally {
      setLoading(false)
    }
  }

  const isAdmin = profile?.role === 'super_admin' || profile?.role === 'admin'
  const isSuperAdmin = profile?.role === 'super_admin'

  const adminRoutes = [
    {
      name: 'Dashboard',
      path: '/admin',
      icon: <LayoutDashboard className="h-5 w-5" />,
      description: 'Overview of system statistics and quick actions',
      available: isAdmin,
    },
    {
      name: 'Competitions',
      path: '/admin/competitions',
      icon: <Calendar className="h-5 w-5" />,
      description: 'Manage competitions, matches, and registrations',
      available: isAdmin,
    },
    {
      name: 'Disciplines',
      path: '/admin/disciplines',
      icon: <Target className="h-5 w-5" />,
      description: 'Manage shooting disciplines and their details',
      available: isAdmin,
    },
    {
      name: 'News Management',
      path: '/admin/news',
      icon: <FileText className="h-5 w-5" />,
      description: 'Create and manage news posts and announcements',
      available: isAdmin,
    },
    {
      name: 'Score Verification',
      path: '/admin/verify-scores',
      icon: <CheckCircle className="h-5 w-5" />,
      description: 'Verify and manage submitted scores',
      available: isAdmin,
    },
    {
      name: 'Users',
      path: '/admin/users',
      icon: <Users className="h-5 w-5" />,
      description: 'Manage user accounts and profiles',
      available: isSuperAdmin,
    },
    {
      name: 'Contact Submissions',
      path: '/admin/contact-submissions',
      icon: <MessageSquare className="h-5 w-5" />,
      description: 'View and manage contact form submissions',
      available: isAdmin,
    },
    {
      name: 'Site Settings',
      path: '/admin/settings',
      icon: <Settings className="h-5 w-5" />,
      description: 'Configure site-wide settings and content',
      available: isSuperAdmin,
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1e40af] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-[#1e40af] to-[#1e3a8a] rounded-lg flex items-center justify-center">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Access Test</h1>
              <p className="text-gray-600">Verify your admin permissions and access</p>
            </div>
          </div>
        </div>

        {/* User Info Card */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <User className="h-5 w-5" />
            Current User Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Email</label>
              <div className="flex items-center gap-2 mt-1">
                <Mail className="h-4 w-4 text-gray-400" />
                <p className="text-gray-900 font-medium">{user?.email || 'N/A'}</p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Role</label>
              <div className="flex items-center gap-2 mt-1">
                <Shield className="h-4 w-4 text-gray-400" />
                <span
                  className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    isSuperAdmin
                      ? 'bg-purple-100 text-purple-800'
                      : isAdmin
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {profile?.role || 'shooter'}
                </span>
              </div>
            </div>
            {profile && (
              <>
                <div>
                  <label className="text-sm font-medium text-gray-500">Full Name</label>
                  <p className="text-gray-900 mt-1">
                    {profile.full_names} {profile.surname}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">SABU Number</label>
                  <p className="text-gray-900 mt-1">{profile.sabu_number || 'N/A'}</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Access Status */}
        <div
          className={`rounded-lg shadow-md p-6 mb-6 ${
            isAdmin ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'
          }`}
        >
          <div className="flex items-center gap-3">
            {isAdmin ? (
              <>
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div>
                  <h3 className="text-lg font-bold text-green-900">Admin Access Granted</h3>
                  <p className="text-green-700">
                    You have {isSuperAdmin ? 'super admin' : 'admin'} access to the system.
                  </p>
                </div>
              </>
            ) : (
              <>
                <X className="h-8 w-8 text-red-600" />
                <div>
                  <h3 className="text-lg font-bold text-red-900">Admin Access Denied</h3>
                  <p className="text-red-700">
                    Your current role ({profile?.role || 'shooter'}) does not have admin privileges.
                  </p>
                  <p className="text-sm text-red-600 mt-2">
                    Contact a super admin to upgrade your account, or use the SQL script to update your role.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Admin Routes */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Available Admin Routes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {adminRoutes.map((route) => (
              <Link
                key={route.path}
                href={route.path}
                className={`p-4 border-2 rounded-lg transition-all ${
                  route.available
                    ? 'border-gray-200 hover:border-[#1e40af] hover:bg-blue-50 cursor-pointer'
                    : 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                }`}
                onClick={(e) => {
                  if (!route.available) {
                    e.preventDefault()
                    toast.error('You do not have access to this route')
                  }
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      route.available ? 'bg-blue-100 text-[#1e40af]' : 'bg-gray-200 text-gray-400'
                    }`}
                  >
                    {route.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{route.name}</h3>
                      {route.available ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <X className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{route.description}</p>
                    <p className="text-xs text-gray-500 mt-1 font-mono">{route.path}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        {isAdmin && (
          <div className="mt-6 bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/admin"
                className="px-4 py-2 bg-[#1e40af] text-white rounded-lg hover:bg-[#1e3a8a] transition-colors"
              >
                Go to Dashboard
              </Link>
              <Link
                href="/admin/competitions"
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Create Competition
              </Link>
              <Link
                href="/admin/news"
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Add News Post
              </Link>
              {isSuperAdmin && (
                <Link
                  href="/admin/settings"
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                >
                  Site Settings
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

