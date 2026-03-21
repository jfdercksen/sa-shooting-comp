'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { 
  Home,
  Calendar,
  Target,
  Trophy,
  User,
  Bell,
  ChevronUp,
  Shield,
  ClipboardList,
  LogOut
} from 'lucide-react'

export default function MobileBottomNavigation() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [notificationCount, setNotificationCount] = useState(0)
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    checkAuth()
    if (user) {
      fetchNotificationCount()
    }
  }, [user])

  const checkAuth = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    
    if (authUser) {
      setUser(authUser)
      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()
      
      if (profileData) {
        setProfile(profileData)
      }
    }
  }

  const fetchNotificationCount = async () => {
    if (!user) return
    
    const { data, error } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_read', false)
    
    if (!error && data) {
      setNotificationCount(data.length)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    await fetch('/auth/logout', { method: 'POST' })
    window.location.href = '/'
  }

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return pathname === '/dashboard' || pathname === '/'
    }
    return pathname.startsWith(path)
  }

  const hasAdminAccess = () => {
    if (!profile?.role) return false
    return ['super_admin', 'admin', 'team_captain'].includes(profile.role)
  }

  // Don't show on auth pages
  if (pathname?.startsWith('/login') || pathname?.startsWith('/register') || pathname?.startsWith('/forgot-password')) {
    return null
  }

  // Only show for authenticated users
  if (!user || !profile) {
    return null
  }

  const navItems = [
    {
      href: '/dashboard',
      icon: Home,
      label: 'Home',
      isActive: isActive('/dashboard')
    },
    {
      href: '/events',
      icon: Calendar,
      label: 'Events',
      isActive: isActive('/events')
    },
    {
      href: '/scoring',
      icon: Target,
      label: 'Scoring',
      isActive: isActive('/scoring')
    },
    {
      href: '/results',
      icon: Trophy,
      label: 'Results',
      isActive: isActive('/results')
    },
    {
      href: '#profile',
      icon: User,
      label: 'Profile',
      isActive: isActive('/profile') || isProfileMenuOpen,
      onClick: () => setIsProfileMenuOpen(!isProfileMenuOpen),
      isButton: true
    }
  ]

  return (
    <>
      {/* Profile Menu Overlay */}
      {isProfileMenuOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-25 z-40"
            onClick={() => setIsProfileMenuOpen(false)}
          />
          
          {/* Profile Menu */}
          <div className="fixed bottom-20 right-4 left-4 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
            {/* User Info Header */}
            <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-[#1e40af] to-[#1e3a8a] text-white rounded-t-lg">
              <p className="font-semibold">{profile.full_names || 'User'}</p>
              <p className="text-sm opacity-90">{user.email}</p>
              {profile.sabu_number && (
                <p className="text-xs opacity-75">SABU: {profile.sabu_number}</p>
              )}
            </div>
            
            {/* Menu Items */}
            <div className="py-2">
              <Link
                href="/profile"
                className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-50 active:bg-gray-100"
                onClick={() => setIsProfileMenuOpen(false)}
              >
                <User className="h-5 w-5 text-gray-500" />
                <span>Edit Profile</span>
              </Link>
              
              <Link
                href="/my-registrations"
                className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-50 active:bg-gray-100"
                onClick={() => setIsProfileMenuOpen(false)}
              >
                <ClipboardList className="h-5 w-5 text-gray-500" />
                <span>My Registrations</span>
              </Link>
              
              {hasAdminAccess() && (
                <Link
                  href="/admin"
                  className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-50 active:bg-gray-100 border-t border-gray-200"
                  onClick={() => setIsProfileMenuOpen(false)}
                >
                  <Shield className="h-5 w-5 text-gray-500" />
                  <span>Admin Dashboard</span>
                </Link>
              )}
              
              <button
                onClick={() => {
                  setIsProfileMenuOpen(false)
                  handleLogout()
                }}
                className="w-full flex items-center space-x-3 px-4 py-3 text-red-600 hover:bg-red-50 active:bg-red-100"
              >
                <LogOut className="h-5 w-5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30">
        <div className="flex">
          {navItems.map((item) => {
            const IconComponent = item.icon
            
            if (item.isButton) {
              return (
                <button
                  key={item.href}
                  onClick={item.onClick}
                  className={`flex-1 flex flex-col items-center justify-center py-2 px-1 text-xs transition-colors ${
                    item.isActive
                      ? 'text-[#1e40af] bg-blue-50'
                      : 'text-gray-600 hover:text-gray-900 active:bg-gray-50'
                  }`}
                >
                  <div className="relative">
                    <IconComponent className={`h-6 w-6 mb-1 ${item.isActive ? 'fill-current' : ''}`} />
                    {item.href === '#profile' && notificationCount > 0 && (
                      <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                        {notificationCount > 9 ? '9+' : notificationCount}
                      </div>
                    )}
                  </div>
                  <span className="font-medium">{item.label}</span>
                  {item.isActive && <ChevronUp className="h-3 w-3 mt-0.5" />}
                </button>
              )
            }
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 flex flex-col items-center justify-center py-2 px-1 text-xs transition-colors ${
                  item.isActive
                    ? 'text-[#1e40af] bg-blue-50'
                    : 'text-gray-600 hover:text-gray-900 active:bg-gray-50'
                }`}
              >
                <IconComponent className={`h-6 w-6 mb-1 ${item.isActive ? 'fill-current' : ''}`} />
                <span className="font-medium">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Bottom padding to prevent content from being hidden behind the nav */}
      <div className="md:hidden h-16" />
    </>
  )
}