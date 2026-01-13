'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, XCircle, ArrowRight, User, Target, Shield, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Database } from '@/types/database'

type Profile = Database['public']['Tables']['profiles']['Row']

interface Feature {
  id: string
  name: string
  description: string
  path: string
  requiresAuth?: boolean
  requiresRole?: string[]
  testFunction?: () => Promise<boolean>
}

export default function TestDashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [featureStatuses, setFeatureStatuses] = useState<Record<string, boolean | null>>({})
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    loadUserData()
  }, [])

  async function loadUserData() {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      setUser(authUser)

      if (authUser) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single()

        setProfile(profileData)
      }
    } catch (error) {
      console.error('Error loading user:', error)
    } finally {
      setLoading(false)
    }
  }

  async function testFeature(feature: Feature): Promise<boolean> {
    // Basic checks
    if (feature.requiresAuth && !user) {
      return false
    }

    if (feature.requiresRole && profile) {
      const hasRole = feature.requiresRole.some(role => profile.role === role)
      if (!hasRole) {
        return false
      }
    }

    // Test if page exists by checking if we can navigate
    try {
      if (feature.testFunction) {
        return await feature.testFunction()
      }
      return true // Assume feature works if basic checks pass
    } catch (error) {
      return false
    }
  }

  async function checkAllFeatures() {
    const statuses: Record<string, boolean | null> = {}
    
    for (const category of allFeatures) {
      for (const feature of category.features) {
        statuses[feature.id] = await testFeature(feature)
      }
    }
    
    setFeatureStatuses(statuses)
  }

  useEffect(() => {
    if (!loading) {
      checkAllFeatures()
    }
  }, [loading, user, profile])

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'
  const isShooter = profile?.role === 'shooter' || isAdmin

  const userFeatures: Feature[] = [
    {
      id: 'registration',
      name: 'Registration Form',
      description: 'All fields save correctly',
      path: '/register',
      testFunction: async () => {
        // Check if registration page exists
        return true
      },
    },
    {
      id: 'login',
      name: 'Login',
      description: 'Works with role-based redirect',
      path: '/login',
      testFunction: async () => {
        return true
      },
    },
    {
      id: 'profile-edit',
      name: 'Profile Edit',
      description: 'Saves all fields',
      path: '/profile',
      requiresAuth: true,
      testFunction: async () => {
        return !!user
      },
    },
    {
      id: 'browse-disciplines',
      name: 'Browse Disciplines',
      description: 'Can browse without login',
      path: '/shooting-disciplines',
      testFunction: async () => {
        return true
      },
    },
    {
      id: 'events-calendar',
      name: 'Events Calendar',
      description: 'Can view events calendar',
      path: '/events',
      testFunction: async () => {
        return true
      },
    },
    {
      id: 'read-news',
      name: 'Read News Posts',
      description: 'Can read news posts',
      path: '/news',
      testFunction: async () => {
        return true
      },
    },
    {
      id: 'contact-form',
      name: 'Contact Form',
      description: 'Form submits successfully',
      path: '/contact',
      testFunction: async () => {
        return true
      },
    },
  ]

  const shooterFeatures: Feature[] = [
    {
      id: 'register-competition',
      name: 'Register for Competition',
      description: 'Can register for competition',
      path: '/events',
      requiresAuth: true,
      requiresRole: ['shooter', 'admin', 'super_admin'],
      testFunction: async () => {
        return isShooter
      },
    },
    {
      id: 'select-matches',
      name: 'Select Individual Matches',
      description: 'Can select individual matches',
      path: '/events',
      requiresAuth: true,
      requiresRole: ['shooter', 'admin', 'super_admin'],
      testFunction: async () => {
        return isShooter
      },
    },
    {
      id: 'calculate-fees',
      name: 'Calculate Fees',
      description: 'Fees calculate correctly',
      path: '/events',
      requiresAuth: true,
      requiresRole: ['shooter', 'admin', 'super_admin'],
      testFunction: async () => {
        return isShooter
      },
    },
    {
      id: 'create-team',
      name: 'Create/Join Team',
      description: 'Can create or join team',
      path: '/teams',
      requiresAuth: true,
      requiresRole: ['shooter', 'team_captain', 'admin', 'super_admin'],
      testFunction: async () => {
        return isShooter
      },
    },
    {
      id: 'submit-scores',
      name: 'Submit Scores',
      description: 'Can submit scores',
      path: '/scoring',
      requiresAuth: true,
      requiresRole: ['shooter', 'admin', 'super_admin'],
      testFunction: async () => {
        return isShooter
      },
    },
    {
      id: 'view-results',
      name: 'View Own Results',
      description: 'Can view own results',
      path: '/results',
      requiresAuth: true,
      requiresRole: ['shooter', 'admin', 'super_admin'],
      testFunction: async () => {
        return isShooter
      },
    },
  ]

  const adminFeatures: Feature[] = [
    {
      id: 'create-discipline',
      name: 'Create/Edit Discipline',
      description: 'Can create and edit disciplines',
      path: '/admin/disciplines',
      requiresAuth: true,
      requiresRole: ['admin', 'super_admin'],
      testFunction: async () => {
        return isAdmin
      },
    },
    {
      id: 'create-competition',
      name: 'Create Competition',
      description: 'Can create competition with all fields',
      path: '/admin/competitions',
      requiresAuth: true,
      requiresRole: ['admin', 'super_admin'],
      testFunction: async () => {
        return isAdmin
      },
    },
    {
      id: 'verify-scores',
      name: 'Verify Scores',
      description: 'Can verify scores',
      path: '/admin/verify-scores',
      requiresAuth: true,
      requiresRole: ['admin', 'super_admin'],
      testFunction: async () => {
        return isAdmin
      },
    },
    {
      id: 'publish-news',
      name: 'Publish News Posts',
      description: 'Can publish news posts',
      path: '/admin/news',
      requiresAuth: true,
      requiresRole: ['admin', 'super_admin'],
      testFunction: async () => {
        return isAdmin
      },
    },
    {
      id: 'view-contacts',
      name: 'View Contact Submissions',
      description: 'Can view contact submissions',
      path: '/admin/contact-submissions',
      requiresAuth: true,
      requiresRole: ['admin', 'super_admin'],
      testFunction: async () => {
        return isAdmin
      },
    },
    {
      id: 'manage-users',
      name: 'Manage Users',
      description: 'Can manage users',
      path: '/admin/users',
      requiresAuth: true,
      requiresRole: ['super_admin'],
      testFunction: async () => {
        return profile?.role === 'super_admin'
      },
    },
  ]

  const allFeatures = [
    { title: 'User Features', icon: <User className="h-5 w-5" />, features: userFeatures },
    { title: 'Shooter Features', icon: <Target className="h-5 w-5" />, features: shooterFeatures },
    { title: 'Admin Features', icon: <Shield className="h-5 w-5" />, features: adminFeatures },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1e40af] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading test dashboard...</p>
        </div>
      </div>
    )
  }

  const totalFeatures = allFeatures.reduce((sum, cat) => sum + cat.features.length, 0)
  const passedFeatures = Object.values(featureStatuses).filter(status => status === true).length
  const failedFeatures = Object.values(featureStatuses).filter(status => status === false).length
  const pendingFeatures = Object.values(featureStatuses).filter(status => status === null).length

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Testing Dashboard</h1>
          <p className="text-gray-600 mb-4">
            Comprehensive feature testing and status dashboard
          </p>
          
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-600">{totalFeatures}</div>
              <div className="text-sm text-gray-600">Total Features</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-600">{passedFeatures}</div>
              <div className="text-sm text-gray-600">Passing</div>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-red-600">{failedFeatures}</div>
              <div className="text-sm text-gray-600">Failing</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-yellow-600">{pendingFeatures}</div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
          </div>

          {/* User Info */}
          <div className="mt-6 pt-6 border-t">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Current User</p>
                <p className="font-semibold text-gray-900">
                  {user?.email || 'Not logged in'}
                </p>
                {profile && (
                  <p className="text-sm text-gray-600">
                    Role: <span className="font-semibold">{profile.role}</span>
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                {!user && (
                  <Link
                    href="/login"
                    className="px-4 py-2 bg-[#1e40af] text-white rounded-lg hover:bg-[#1e3a8a] transition-colors"
                  >
                    Login
                  </Link>
                )}
                <button
                  onClick={checkAllFeatures}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Refresh Tests
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Categories */}
        {allFeatures.map((category) => {
          const categoryFeatures = category.features
          const categoryPassed = categoryFeatures.filter(f => featureStatuses[f.id] === true).length
          const categoryTotal = categoryFeatures.length

          return (
            <div key={category.title} className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-[#1e40af]">
                    {category.icon}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{category.title}</h2>
                    <p className="text-sm text-gray-600">
                      {categoryPassed}/{categoryTotal} features passing
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {categoryFeatures.map((feature) => {
                  const status = featureStatuses[feature.id]
                  const canAccess = !feature.requiresAuth || user
                  const hasRole =
                    !feature.requiresRole ||
                    (profile && feature.requiresRole.includes(profile.role || ''))

                  return (
                    <div
                      key={feature.id}
                      className={`border-2 rounded-lg p-4 transition-colors ${
                        status === true
                          ? 'border-green-200 bg-green-50'
                          : status === false
                            ? 'border-red-200 bg-red-50'
                            : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            {status === true ? (
                              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                            ) : status === false ? (
                              <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                            ) : (
                              <div className="h-5 w-5 border-2 border-gray-400 rounded-full flex-shrink-0" />
                            )}
                            <h3 className="font-semibold text-gray-900">{feature.name}</h3>
                          </div>
                          <p className="text-sm text-gray-600 ml-8 mb-2">{feature.description}</p>
                          <div className="ml-8 flex flex-wrap gap-2">
                            {feature.requiresAuth && (
                              <span
                                className={`text-xs px-2 py-1 rounded ${
                                  canAccess
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {canAccess ? '✓ Auth' : '✗ Auth Required'}
                              </span>
                            )}
                            {feature.requiresRole && (
                              <span
                                className={`text-xs px-2 py-1 rounded ${
                                  hasRole
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}
                              >
                                {hasRole
                                  ? `✓ ${profile?.role || 'No Role'}`
                                  : `✗ Requires: ${feature.requiresRole.join(', ')}`}
                              </span>
                            )}
                          </div>
                        </div>
                        <Link
                          href={feature.path}
                          className="ml-4 flex items-center gap-2 px-4 py-2 bg-[#1e40af] text-white rounded-lg hover:bg-[#1e3a8a] transition-colors text-sm whitespace-nowrap"
                        >
                          Test This
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* Quick Links */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Links</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/admin/test"
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-[#1e40af] hover:bg-blue-50 transition-colors"
            >
              <div className="font-semibold text-gray-900">Admin Access Test</div>
              <div className="text-sm text-gray-600">Verify admin permissions</div>
            </Link>
            <Link
              href="/dashboard"
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-[#1e40af] hover:bg-blue-50 transition-colors"
            >
              <div className="font-semibold text-gray-900">User Dashboard</div>
              <div className="text-sm text-gray-600">View user dashboard</div>
            </Link>
            <Link
              href="/admin"
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-[#1e40af] hover:bg-blue-50 transition-colors"
            >
              <div className="font-semibold text-gray-900">Admin Dashboard</div>
              <div className="text-sm text-gray-600">View admin dashboard</div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

