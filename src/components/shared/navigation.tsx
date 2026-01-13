'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'
import { 
  Menu, 
  X, 
  ChevronDown, 
  User, 
  LogOut, 
  Target,
  Home,
  Calendar,
  Trophy,
  Newspaper,
  Info,
  Mail,
  UserCircle,
  ClipboardList,
  LayoutDashboard,
  Shield
} from 'lucide-react'

type Discipline = Database['public']['Tables']['disciplines']['Row']
type Profile = Database['public']['Tables']['profiles']['Row']

export default function Navigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isDisciplinesOpen, setIsDisciplinesOpen] = useState(false)
  const [isMobileDisciplinesOpen, setIsMobileDisciplinesOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [disciplines, setDisciplines] = useState<Discipline[]>([])
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Fetch disciplines
    const fetchDisciplines = async () => {
      const { data, error } = await supabase
        .from('disciplines')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true, nullsFirst: false })

      if (!error && data) {
        setDisciplines(data)
      }
    }

    // Check auth state
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
      
      setLoading(false)
    }

    fetchDisciplines()
    checkAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user)
        supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
            if (data) setProfile(data)
          })
      } else {
        setUser(null)
        setProfile(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.user-menu-container')) {
        setIsUserMenuOpen(false)
      }
    }

    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isUserMenuOpen])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/'
    }
    return pathname.startsWith(path)
  }

  const hasDashboardAccess = () => {
    // All authenticated users have access to their personal dashboard
    // Admin dashboard is at /admin and has its own access control
    return !!user && !!profile
  }

  const hasAdminAccess = () => {
    if (!profile?.role) return false
    return ['super_admin', 'admin', 'team_captain'].includes(profile.role)
  }

  const getUserDisplayName = () => {
    if (profile?.full_names) {
      return profile.full_names.split(' ')[0] // First name
    }
    return user?.email?.split('@')[0] || 'User'
  }

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <Link href="/" className="flex items-center space-x-2 group">
            <Target className="h-8 w-8 text-[#1e40af] group-hover:text-[#1e3a8a] transition-colors" />
            <span className="text-xl font-bold text-[#1e40af] group-hover:text-[#1e3a8a] transition-colors">
              GAUTENG NOORD
            </span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-1 flex-1 justify-center">
            <NavLink href="/" icon={<Home className="h-4 w-4" />} isActive={isActive('/')}>
              Home
            </NavLink>

            {/* Disciplines Dropdown */}
            <div 
              className="relative"
              onMouseEnter={() => setIsDisciplinesOpen(true)}
              onMouseLeave={() => setIsDisciplinesOpen(false)}
            >
              <button
                className={`flex items-center space-x-1 px-4 py-2 rounded-md transition-colors ${
                  isActive('/shooting-disciplines')
                    ? 'text-[#1e40af] border-b-2 border-[#eab308]'
                    : 'text-gray-700 hover:text-[#1e3a8a] hover:bg-gray-50'
                }`}
              >
                <Target className="h-4 w-4" />
                <span>Shooting Disciplines</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${isDisciplinesOpen ? 'rotate-180' : ''}`} />
              </button>

              {isDisciplinesOpen && disciplines.length > 0 && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-md shadow-lg border border-gray-200 py-2">
                  {disciplines.map((discipline) => (
                    <Link
                      key={discipline.id}
                      href={`/shooting-disciplines/${discipline.slug}`}
                      className="block px-4 py-2 text-gray-700 hover:bg-[#1e40af] hover:text-white transition-colors"
                      onClick={() => setIsDisciplinesOpen(false)}
                    >
                      {discipline.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <NavLink href="/events" icon={<Calendar className="h-4 w-4" />} isActive={isActive('/events')}>
              Events
            </NavLink>
            <NavLink href="/results" icon={<Trophy className="h-4 w-4" />} isActive={isActive('/results')}>
              Results
            </NavLink>
            <NavLink href="/news" icon={<Newspaper className="h-4 w-4" />} isActive={isActive('/news')}>
              News
            </NavLink>
            <NavLink href="/about" icon={<Info className="h-4 w-4" />} isActive={isActive('/about')}>
              About
            </NavLink>
            <NavLink href="/contact" icon={<Mail className="h-4 w-4" />} isActive={isActive('/contact')}>
              Get In Touch
            </NavLink>
          </div>

          {/* User Menu */}
          <div className="hidden md:flex items-center space-x-4">
            {loading ? (
              <div className="w-8 h-8 border-2 border-gray-300 border-t-[#1e40af] rounded-full animate-spin" />
            ) : user ? (
              <div className="relative user-menu-container">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-2 px-4 py-2 rounded-md text-gray-700 hover:text-[#1e3a8a] hover:bg-gray-50 transition-colors"
                >
                  <UserCircle className="h-5 w-5" />
                  <span className="text-sm font-medium">{getUserDisplayName()}</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-md shadow-lg border border-gray-200 py-2 z-50">
                    <Link
                      href="/profile"
                      className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:bg-[#1e40af] hover:text-white transition-colors"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <User className="h-4 w-4" />
                      <span>Profile</span>
                    </Link>
                    <Link
                      href="/my-registrations"
                      className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:bg-[#1e40af] hover:text-white transition-colors"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <ClipboardList className="h-4 w-4" />
                      <span>My Registrations</span>
                    </Link>
                    {hasDashboardAccess() && (
                      <Link
                        href="/dashboard"
                        className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:bg-[#1e40af] hover:text-white transition-colors"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        <span>Dashboard</span>
                      </Link>
                    )}
                    {hasAdminAccess() && (
                      <Link
                        href="/admin"
                        className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:bg-[#1e40af] hover:text-white transition-colors border-t border-gray-200 mt-2 pt-2"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <Shield className="h-4 w-4" />
                        <span>Admin Dashboard</span>
                      </Link>
                    )}
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center space-x-2 px-4 py-2 text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  href="/login"
                  className="px-4 py-2 text-gray-700 hover:text-[#1e3a8a] transition-colors"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 bg-[#1e40af] text-white rounded-md hover:bg-[#1e3a8a] transition-colors"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-md text-gray-700 hover:text-[#1e3a8a] hover:bg-gray-50"
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200">
          <div className="px-4 py-2 space-y-1">
            <MobileNavLink href="/" icon={<Home className="h-4 w-4" />} onClick={() => setIsMobileMenuOpen(false)}>
              Home
            </MobileNavLink>

            {/* Mobile Disciplines */}
            <div>
              <button
                onClick={() => setIsMobileDisciplinesOpen(!isMobileDisciplinesOpen)}
                className="w-full flex items-center justify-between px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-md"
              >
                <div className="flex items-center space-x-2">
                  <Target className="h-4 w-4" />
                  <span>Shooting Disciplines</span>
                </div>
                <ChevronDown className={`h-4 w-4 transition-transform ${isMobileDisciplinesOpen ? 'rotate-180' : ''}`} />
              </button>
              {isMobileDisciplinesOpen && (
                <div className="pl-8 mt-1 space-y-1">
                  {disciplines.map((discipline) => (
                    <Link
                      key={discipline.id}
                      href={`/shooting-disciplines/${discipline.slug}`}
                      className="block px-4 py-2 text-gray-600 hover:bg-[#1e40af] hover:text-white rounded-md transition-colors"
                      onClick={() => {
                        setIsMobileDisciplinesOpen(false)
                        setIsMobileMenuOpen(false)
                      }}
                    >
                      {discipline.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <MobileNavLink href="/events" icon={<Calendar className="h-4 w-4" />} onClick={() => setIsMobileMenuOpen(false)}>
              Events
            </MobileNavLink>
            <MobileNavLink href="/results" icon={<Trophy className="h-4 w-4" />} onClick={() => setIsMobileMenuOpen(false)}>
              Results
            </MobileNavLink>
            <MobileNavLink href="/news" icon={<Newspaper className="h-4 w-4" />} onClick={() => setIsMobileMenuOpen(false)}>
              News
            </MobileNavLink>
            <MobileNavLink href="/about" icon={<Info className="h-4 w-4" />} onClick={() => setIsMobileMenuOpen(false)}>
              About
            </MobileNavLink>
            <MobileNavLink href="/contact" icon={<Mail className="h-4 w-4" />} onClick={() => setIsMobileMenuOpen(false)}>
              Get In Touch
            </MobileNavLink>

            {/* Mobile User Menu */}
            <div className="border-t border-gray-200 pt-2 mt-2">
              {loading ? (
                <div className="px-4 py-2 flex justify-center">
                  <div className="w-6 h-6 border-2 border-gray-300 border-t-[#1e40af] rounded-full animate-spin" />
                </div>
              ) : user ? (
                <>
                  <div className="px-4 py-2 text-sm font-medium text-gray-700">
                    {getUserDisplayName()}
                  </div>
                  <MobileNavLink href="/profile" icon={<User className="h-4 w-4" />} onClick={() => setIsMobileMenuOpen(false)}>
                    Profile
                  </MobileNavLink>
                  <MobileNavLink href="/my-registrations" icon={<ClipboardList className="h-4 w-4" />} onClick={() => setIsMobileMenuOpen(false)}>
                    My Registrations
                  </MobileNavLink>
                  {hasDashboardAccess() && (
                    <MobileNavLink href="/dashboard" icon={<LayoutDashboard className="h-4 w-4" />} onClick={() => setIsMobileMenuOpen(false)}>
                      Dashboard
                    </MobileNavLink>
                  )}
                  {hasAdminAccess() && (
                    <MobileNavLink href="/admin" icon={<Shield className="h-4 w-4" />} onClick={() => setIsMobileMenuOpen(false)}>
                      Admin Dashboard
                    </MobileNavLink>
                  )}
                  <button
                    onClick={() => {
                      handleLogout()
                      setIsMobileMenuOpen(false)
                    }}
                    className="w-full flex items-center space-x-2 px-4 py-2 text-gray-700 hover:bg-red-50 hover:text-red-600 rounded-md transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </button>
                </>
              ) : (
                <div className="space-y-2 px-4">
                  <Link
                    href="/login"
                    className="block w-full text-center px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    className="block w-full text-center px-4 py-2 bg-[#1e40af] text-white rounded-md hover:bg-[#1e3a8a] transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Register
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}

// Desktop NavLink Component
function NavLink({ 
  href, 
  icon, 
  children, 
  isActive 
}: { 
  href: string
  icon?: React.ReactNode
  children: React.ReactNode
  isActive: boolean
}) {
  return (
    <Link
      href={href}
      className={`flex items-center space-x-1 px-4 py-2 rounded-md transition-colors ${
        isActive
          ? 'text-[#1e40af] border-b-2 border-[#eab308]'
          : 'text-gray-700 hover:text-[#1e3a8a] hover:bg-gray-50'
      }`}
    >
      {icon}
      <span>{children}</span>
    </Link>
  )
}

// Mobile NavLink Component
function MobileNavLink({ 
  href, 
  icon, 
  children, 
  onClick 
}: { 
  href: string
  icon?: React.ReactNode
  children: React.ReactNode
  onClick: () => void
}) {
  const pathname = usePathname()
  const isActive = pathname === href || (href !== '/' && pathname.startsWith(href))

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
        isActive
          ? 'text-[#1e40af] bg-blue-50 border-l-4 border-[#eab308]'
          : 'text-gray-700 hover:bg-gray-50'
      }`}
    >
      {icon}
      <span>{children}</span>
    </Link>
  )
}

