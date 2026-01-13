'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, Edit, Shield, User, Mail, Phone, MapPin, Filter, X, Check, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import type { Database } from '@/types/database'

type Profile = Database['public']['Tables']['profiles']['Row']
type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

const ROLES: Array<{ value: Database['public']['Enums']['user_role']; label: string; color: string }> = [
  { value: 'shooter', label: 'Shooter', color: 'bg-gray-100 text-gray-800' },
  { value: 'team_captain', label: 'Team Captain', color: 'bg-blue-100 text-blue-800' },
  { value: 'range_officer', label: 'Range Officer', color: 'bg-green-100 text-green-800' },
  { value: 'stats_officer', label: 'Stats Officer', color: 'bg-purple-100 text-purple-800' },
  { value: 'admin', label: 'Admin', color: 'bg-amber-100 text-amber-800' },
  { value: 'super_admin', label: 'Super Admin', color: 'bg-red-100 text-red-800' },
]

export default function AdminUsersPage() {
  const [users, setUsers] = useState<Profile[]>([])
  const [filteredUsers, setFilteredUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<Database['public']['Enums']['user_role'] | 'all'>('all')
  const [editingUser, setEditingUser] = useState<Profile | null>(null)
  const [updating, setUpdating] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    filterUsers()
  }, [users, searchTerm, roleFilter])

  async function fetchUsers() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      setUsers(data || [])
    } catch (error: any) {
      console.error('Error fetching users:', error)
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  function filterUsers() {
    let filtered = [...users]

    // Apply role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter((user) => user.role === roleFilter)
    }

    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (user) =>
          user.full_names?.toLowerCase().includes(term) ||
          user.surname?.toLowerCase().includes(term) ||
          user.email?.toLowerCase().includes(term) ||
          user.sabu_number?.toLowerCase().includes(term) ||
          user.club?.toLowerCase().includes(term)
      )
    }

    setFilteredUsers(filtered)
  }

  async function handleRoleUpdate(userId: string, newRole: Database['public']['Enums']['user_role']) {
    setUpdating(true)
    console.log('=== ROLE UPDATE DEBUG ===')
    console.log('User ID:', userId)
    console.log('New Role:', newRole)
    console.log('Current User Being Edited:', editingUser)
    
    try {
      // First, verify current user is admin
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      if (authError || !authUser) {
        throw new Error('Not authenticated')
      }

      console.log('Authenticated user ID:', authUser.id)

      const { data: currentUserProfile, error: profileError } = await supabase
        .from('profiles')
        .select('role, full_names, surname')
        .eq('id', authUser.id)
        .single()

      console.log('Current admin profile:', currentUserProfile)
      console.log('Profile fetch error:', profileError)
      
      if (profileError || !currentUserProfile) {
        throw new Error('Failed to fetch your profile')
      }
      
      if (!['admin', 'super_admin'].includes(currentUserProfile.role || '')) {
        console.error('User does not have admin role:', currentUserProfile.role)
        throw new Error('You do not have permission to update user roles. You must be an admin or super_admin.')
      }

      // Check current role of target user
      const { data: targetUser, error: targetError } = await supabase
        .from('profiles')
        .select('role, full_names, surname')
        .eq('id', userId)
        .single()

      console.log('Target user before update:', targetUser)
      console.log('Target user fetch error:', targetError)

      if (targetError || !targetUser) {
        throw new Error('User not found')
      }

      // Attempt update with select to get updated data back
      console.log('Attempting to update role from', targetUser.role, 'to', newRole)
      const { data: updatedData, error } = await supabase
        .from('profiles')
        .update({ role: newRole } as ProfileUpdate)
        .eq('id', userId)
        .select()
        .single()

      console.log('Update response:', { updatedData, error })

      if (error) {
        console.error('Update error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        })
        throw error
      }

      if (!updatedData) {
        console.error('No data returned from update - likely RLS policy blocking')
        throw new Error('Update returned no data. This usually means RLS policies are blocking the update. Check that admins have UPDATE permission on profiles table.')
      }

      console.log('Update successful! Updated user:', updatedData)
      toast.success(`Role updated to ${ROLES.find((r) => r.value === newRole)?.label}`)
      setEditingUser(null)
      
      // Refresh users list
      await fetchUsers()
    } catch (error: any) {
      console.error('Error updating role:', error)
      let errorMessage = 'Failed to update role'
      
      if (error.message) {
        errorMessage = error.message
      } else if (error.code) {
        switch (error.code) {
          case '42501':
            errorMessage = 'Permission denied. Check RLS policies - admins need UPDATE permission on profiles table.'
            break
          case 'PGRST301':
            errorMessage = 'No rows updated. RLS policy may be blocking the update. Check Supabase RLS policies.'
            break
          case 'PGRST116':
            errorMessage = 'User not found in database.'
            break
          default:
            errorMessage = `Error ${error.code}: ${error.message || error.hint || 'Unknown error'}`
        }
      }
      
      toast.error(errorMessage)
      console.error('Full error object:', JSON.stringify(error, null, 2))
    } finally {
      setUpdating(false)
    }
  }

  const roleCounts = ROLES.reduce((acc, role) => {
    acc[role.value] = users.filter((u) => u.role === role.value).length
    return acc
  }, {} as Record<string, number>)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1e40af] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading users...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-2">Manage user roles and permissions</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {ROLES.map((role) => (
            <div key={role.value} className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <div className="text-2xl font-bold text-gray-900">{roleCounts[role.value] || 0}</div>
              <div className={`text-xs font-medium px-2 py-1 rounded mt-1 inline-block ${role.color}`}>
                {role.label}
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search by name, email, SABU number, or club..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
              />
            </div>

            {/* Role Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-400" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
              >
                <option value="all">All Roles</option>
                {ROLES.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Club / Province
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      {searchTerm || roleFilter !== 'all' ? 'No users found matching your filters' : 'No users found'}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-[#1e40af] to-[#1e3a8a] flex items-center justify-center text-white font-semibold">
                            {user.full_names?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.full_names} {user.surname}
                            </div>
                            <div className="text-sm text-gray-500">
                              {user.sabu_number ? `SABU: ${user.sabu_number}` : 'No SABU number'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 flex items-center gap-1">
                          <Mail className="h-4 w-4 text-gray-400" />
                          {user.email}
                        </div>
                        {user.mobile_number && (
                          <div className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                            <Phone className="h-4 w-4 text-gray-400" />
                            {user.mobile_number}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{user.club || 'N/A'}</div>
                        {user.province && (
                          <div className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            {user.province}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded ${
                            ROLES.find((r) => r.value === user.role)?.color || 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {ROLES.find((r) => r.value === user.role)?.label || user.role || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => setEditingUser(user)}
                          className="text-[#1e40af] hover:text-[#1e3a8a] flex items-center gap-1"
                        >
                          <Edit className="h-4 w-4" />
                          Change Role
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Info */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="text-sm text-gray-700">
              Showing <span className="font-medium">{filteredUsers.length}</span> of{' '}
              <span className="font-medium">{users.length}</span> users
            </div>
          </div>
        </div>

        {/* Role Edit Modal */}
        {editingUser && (
          <RoleEditModal
            user={editingUser}
            onClose={() => setEditingUser(null)}
            onUpdate={(newRole) => handleRoleUpdate(editingUser.id, newRole)}
            updating={updating}
          />
        )}
      </div>
    </div>
  )
}

function RoleEditModal({
  user,
  onClose,
  onUpdate,
  updating,
}: {
  user: Profile
  onUpdate: (role: Database['public']['Enums']['user_role']) => void
  onClose: () => void
  updating: boolean
}) {
  const [selectedRole, setSelectedRole] = useState<Database['public']['Enums']['user_role']>(user.role || 'shooter')

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Change User Role</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-4">
            <div className="text-sm text-gray-600 mb-1">User</div>
            <div className="text-lg font-semibold text-gray-900">
              {user.full_names} {user.surname}
            </div>
            <div className="text-sm text-gray-500">{user.email}</div>
            {user.sabu_number && <div className="text-sm text-gray-500">SABU: {user.sabu_number}</div>}
          </div>

          <div className="mb-6">
            <div className="text-sm font-medium text-gray-700 mb-3">Current Role</div>
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5 text-gray-400" />
              <span
                className={`px-3 py-1 text-sm font-semibold rounded ${
                  ROLES.find((r) => r.value === user.role)?.color || 'bg-gray-100 text-gray-800'
                }`}
              >
                {ROLES.find((r) => r.value === user.role)?.label || user.role || 'Unknown'}
              </span>
            </div>

            <div className="text-sm font-medium text-gray-700 mb-3">Select New Role</div>
            <div className="space-y-2">
              {ROLES.map((role) => (
                <label
                  key={role.value}
                  className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                    selectedRole === role.value
                      ? 'border-[#1e40af] bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={role.value}
                    checked={selectedRole === role.value}
                    onChange={(e) => setSelectedRole(e.target.value as Database['public']['Enums']['user_role'])}
                    className="h-4 w-4 text-[#1e40af] focus:ring-[#1e40af]"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${role.color}`}>
                        {role.label}
                      </span>
                      {selectedRole === role.value && (
                        <Check className="h-4 w-4 text-[#1e40af]" />
                      )}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {selectedRole === user.role && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="text-sm text-yellow-800">
                This user already has the selected role. No changes will be made.
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={updating}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={() => onUpdate(selectedRole)}
              disabled={updating || selectedRole === user.role}
              className="flex-1 px-4 py-2 bg-[#1e40af] text-white rounded-lg hover:bg-[#1e3a8a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {updating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Updating...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4" />
                  Update Role
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
