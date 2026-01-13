'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Users, Plus, Settings, X, Mail, Trophy, Calendar, UserPlus, Trash2, Edit2 } from 'lucide-react'
import { toast } from 'sonner'
import { SA_PROVINCES } from '@/lib/validations/registration'
import type { Database } from '@/types/database'

type Team = Database['public']['Tables']['teams']['Row']
type TeamMember = Database['public']['Tables']['team_members']['Row']
type Profile = Database['public']['Tables']['profiles']['Row']
type Registration = Database['public']['Tables']['registrations']['Row']
type Competition = Database['public']['Tables']['competitions']['Row']
type Score = Database['public']['Tables']['scores']['Row']

interface TeamWithDetails extends Team {
  captain: Profile | null
  members: Array<TeamMember & { profile: Profile | null }>
  member_count: number
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<TeamWithDetails[]>([])
  const [user, setUser] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState<TeamWithDetails | null>(null)
  const [showManageModal, setShowManageModal] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    console.log('=== LOAD DATA DEBUG ===')
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      console.log('Auth user:', authUser)
      console.log('Auth error:', authError)
      
      if (!authUser) {
        console.error('No auth user found')
        toast.error('Please log in to view teams')
        return
      }

      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()

      console.log('User profile:', profile)
      console.log('Profile error:', profileError)
      
      setUser(profile)

      // Get teams where user is captain or member
      const { data: teamMemberships, error: membershipsError } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', authUser.id)

      console.log('Team memberships:', teamMemberships)
      console.log('Memberships error:', membershipsError)
      
      const teamIds = teamMemberships?.map(tm => tm.team_id) || []
      console.log('Team IDs from memberships:', teamIds)

      // Get teams where user is captain
      const { data: captainTeams, error: captainTeamsError } = await supabase
        .from('teams')
        .select('*')
        .eq('captain_id', authUser.id)

      console.log('Captain teams:', captainTeams)
      console.log('Captain teams error:', captainTeamsError)
      
      const captainTeamIds = captainTeams?.map(t => t.id) || []
      console.log('Captain team IDs:', captainTeamIds)
      
      const allTeamIds = [...new Set([...teamIds.filter((id): id is string => id !== null), ...captainTeamIds])]
      console.log('All team IDs:', allTeamIds)

      if (allTeamIds.length === 0) {
        setTeams([])
        setLoading(false)
        return
      }

      // Fetch all teams with details
      const { data: teamsData, error: teamsDataError } = await supabase
        .from('teams')
        .select('*')
        .in('id', allTeamIds)

      console.log('Teams data:', teamsData)
      console.log('Teams data error:', teamsDataError)

      if (!teamsData) {
        console.log('No teams data found')
        setTeams([])
        setLoading(false)
        return
      }

      // Fetch team members and captain for each team
      const teamsWithDetails: TeamWithDetails[] = await Promise.all(
        teamsData.map(async (team) => {
          // Get captain
          const { data: captain } = team.captain_id
            ? await supabase
                .from('profiles')
                .select('*')
                .eq('id', team.captain_id)
                .single()
            : { data: null }

          // Get members
          const { data: membersData } = await supabase
            .from('team_members')
            .select('*')
            .eq('team_id', team.id)

          const members = await Promise.all(
            (membersData || []).map(async (member) => {
              const { data: profile } = member.user_id
                ? await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', member.user_id)
                    .single()
                : { data: null }
              return { ...member, profile }
            })
          )

          return {
            ...team,
            captain,
            members,
            member_count: members.length,
          }
        })
      )

      setTeams(teamsWithDetails)
    } catch (error) {
      console.error('Error loading teams:', error)
      toast.error('Failed to load teams')
    } finally {
      setLoading(false)
    }
  }

  // Only users with 'team_captain' role can create teams
  const canCreateTeam = user?.role === 'team_captain'
  
  // Debug logging
  useEffect(() => {
    console.log('=== TEAMS PAGE DEBUG ===')
    console.log('Current user:', user)
    console.log('User role:', user?.role)
    console.log('Can create team:', canCreateTeam)
    console.log('Teams loaded:', teams.length)
    console.log('Teams data:', teams)
  }, [user, canCreateTeam, teams])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1e40af] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading teams...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Teams</h1>
            <p className="text-gray-600 mt-2">Manage your shooting teams</p>
          </div>
          {canCreateTeam && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#1e40af] text-white rounded-lg hover:bg-[#1e3a8a] transition-colors"
            >
              <Plus className="h-5 w-5" />
              Create Team
            </button>
          )}
        </div>

        {teams.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Teams Yet</h2>
            <p className="text-gray-600 mb-6">
              {canCreateTeam
                ? 'Create your first team to get started'
                : 'You are not a member of any teams yet'}
            </p>
            {canCreateTeam && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="px-6 py-3 bg-[#1e40af] text-white rounded-lg hover:bg-[#1e3a8a] transition-colors"
              >
                Create Team
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teams.map((team) => (
              <TeamCard
                key={team.id}
                team={team}
                currentUserId={user?.id}
                onManage={() => {
                  setSelectedTeam(team)
                  setShowManageModal(true)
                }}
                onLeave={async () => {
                  await handleLeaveTeam(team.id)
                }}
              />
            ))}
          </div>
        )}

        {/* Create Team Form */}
        {showCreateForm && (
          <CreateTeamForm
            onClose={() => setShowCreateForm(false)}
            onSuccess={() => {
              setShowCreateForm(false)
              loadData()
            }}
            userId={user?.id}
          />
        )}

        {/* Team Management Modal */}
        {showManageModal && selectedTeam && (
          <TeamManagementModal
            team={selectedTeam}
            currentUserId={user?.id}
            onClose={() => {
              setShowManageModal(false)
              setSelectedTeam(null)
            }}
            onUpdate={loadData}
          />
        )}
      </div>
    </div>
  )

  async function handleLeaveTeam(teamId: string) {
    if (!user?.id) return

    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('team_id', teamId)
        .eq('user_id', user.id)

      if (error) throw error

      toast.success('Left team successfully')
      loadData()
    } catch (error) {
      console.error('Error leaving team:', error)
      toast.error('Failed to leave team')
    }
  }
}

function TeamCard({
  team,
  currentUserId,
  onManage,
  onLeave,
}: {
  team: TeamWithDetails
  currentUserId?: string
  onManage: () => void
  onLeave: () => void
}) {
  const isCaptain = team.captain_id === currentUserId
  const displayMembers = team.members.slice(0, 4)
  const remainingCount = team.member_count - displayMembers.length

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {team.logo_url ? (
            <img src={team.logo_url} alt={team.name} className="w-12 h-12 rounded-full object-cover" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#1e40af] to-[#1e3a8a] flex items-center justify-center">
              <Users className="h-6 w-6 text-white" />
            </div>
          )}
          <div>
            <h3 className="text-lg font-bold text-gray-900">{team.name}</h3>
            {team.province && (
              <p className="text-sm text-gray-600">{team.province}</p>
            )}
          </div>
        </div>
        {isCaptain && (
          <span className="px-2 py-1 text-xs font-semibold bg-[#eab308] text-gray-900 rounded">Captain</span>
        )}
      </div>

      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-2">
          <strong>Captain:</strong> {team.captain ? `${team.captain.full_names} ${team.captain.surname}` : 'N/A'}
        </p>
        <p className="text-sm text-gray-600 mb-2">
          <strong>Members:</strong> {team.member_count}
          {team.max_members && ` / ${team.max_members}`}
        </p>
        {displayMembers.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-semibold text-gray-700 mb-2">Team Members:</p>
            <div className="flex flex-wrap gap-2">
              {displayMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs text-gray-700"
                >
                  {member.profile?.profile_image ? (
                    <img
                      src={member.profile.profile_image}
                      alt={member.profile.full_names}
                      className="w-4 h-4 rounded-full"
                    />
                  ) : (
                    <Users className="w-4 h-4 text-gray-400" />
                  )}
                  <span>
                    {member.profile ? `${member.profile.full_names} ${member.profile.surname}` : 'Unknown'}
                  </span>
                </div>
              ))}
              {remainingCount > 0 && (
                <span className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-700">
                  +{remainingCount} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {isCaptain ? (
          <button
            onClick={onManage}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#1e40af] text-white rounded-lg hover:bg-[#1e3a8a] transition-colors text-sm"
          >
            <Settings className="h-4 w-4" />
            Manage
          </button>
        ) : (
          <button
            onClick={onLeave}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
          >
            <X className="h-4 w-4" />
            Leave Team
          </button>
        )}
      </div>
    </div>
  )
}

function CreateTeamForm({
  onClose,
  onSuccess,
  userId,
}: {
  onClose: () => void
  onSuccess: () => void
  userId?: string
}) {
  const [name, setName] = useState('')
  const [province, setProvince] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) {
      toast.error('User not found')
      return
    }

    console.log('=== CREATE TEAM DEBUG ===')
    console.log('User ID:', userId)
    console.log('Team name:', name)
    console.log('Province:', province)
    console.log('Logo file:', logoFile?.name)

    setLoading(true)
    try {
      let logoUrl: string | null = null

      // Upload logo if provided
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop()
        const fileName = `${Math.random()}.${fileExt}`
        const filePath = `team-logos/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('team-assets')
          .upload(filePath, logoFile)

        if (uploadError) {
          // If bucket doesn't exist, just continue without logo
          console.warn('Logo upload failed:', uploadError)
        } else {
          const { data } = supabase.storage.from('team-assets').getPublicUrl(filePath)
          logoUrl = data.publicUrl
        }
      }

      // Create team
      const teamData = {
        name,
        province: province || null,
        captain_id: userId,
        logo_url: logoUrl,
        max_members: 12,
      }
      console.log('Creating team with data:', teamData)
      
      const { data: team, error } = await supabase
        .from('teams')
        .insert(teamData)
        .select()
        .single()

      console.log('Team creation response:', { team, error })
      
      if (error) {
        console.error('Team creation error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        })
        throw error
      }

      console.log('Team created successfully:', team)
      toast.success('Team created successfully')
      onSuccess()
    } catch (error: any) {
      console.error('Error creating team:', error)
      toast.error(error.message || 'Failed to create team')
    } finally {
      setLoading(false)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setLogoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Create New Team</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Team Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
              placeholder="Enter team name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Province</label>
            <select
              value={province}
              onChange={(e) => setProvince(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
            >
              <option value="">Select Province</option>
              {SA_PROVINCES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Team Logo (Optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
            />
            {logoPreview && (
              <div className="mt-2">
                <img src={logoPreview} alt="Logo preview" className="w-24 h-24 object-cover rounded-lg" />
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-[#1e40af] text-white rounded-lg hover:bg-[#1e3a8a] transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Team'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function TeamManagementModal({
  team,
  currentUserId,
  onClose,
  onUpdate,
}: {
  team: TeamWithDetails
  currentUserId?: string
  onClose: () => void
  onUpdate: () => void
}) {
  const [activeTab, setActiveTab] = useState<'members' | 'details' | 'registrations'>('members')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteSabu, setInviteSabu] = useState('')
  const [inviteMethod, setInviteMethod] = useState<'email' | 'sabu'>('email')
  const [inviting, setInviting] = useState(false)
  const [teamName, setTeamName] = useState(team.name)
  const [teamProvince, setTeamProvince] = useState(team.province || '')
  const [updating, setUpdating] = useState(false)
  const supabase = createClient()

  const isCaptain = team.captain_id === currentUserId

  async function handleInviteMember() {
    console.log('=== ADD MEMBER DEBUG ===')
    console.log('Team ID:', team.id)
    console.log('Invite method:', inviteMethod)
    console.log('Email:', inviteEmail)
    console.log('SABU:', inviteSabu)
    
    if ((inviteMethod === 'email' && !inviteEmail.trim()) || (inviteMethod === 'sabu' && !inviteSabu.trim()) || !team.id) {
      toast.error(`Please enter a ${inviteMethod === 'email' ? 'valid email address' : 'SABU number'}`)
      return
    }

    // Check max members
    const currentMemberCount = team.member_count + 1 // +1 for captain
    console.log('Current member count:', currentMemberCount, 'Max:', team.max_members)
    if (team.max_members && currentMemberCount >= team.max_members) {
      toast.error(`Team is full. Maximum ${team.max_members} members allowed.`)
      return
    }

    setInviting(true)
    try {
      let profile: any = null

      // Find user by email or SABU number
      if (inviteMethod === 'email') {
        console.log('Searching for user by email:', inviteEmail.trim().toLowerCase())
        const { data, error } = await supabase
          .from('profiles')
          .select('id, email, full_names, surname, sabu_number')
          .eq('email', inviteEmail.trim().toLowerCase())
          .maybeSingle()

        if (error) {
          console.error('Error finding user by email:', error)
          throw error
        }

        if (!data) {
          console.log('User not found with email:', inviteEmail)
          toast.error(`No user found with email: ${inviteEmail}`)
          setInviting(false)
          return
        }
        console.log('Found user by email:', profile)
        profile = data
      } else {
        // Find by SABU number
        console.log('Searching for user by SABU number:', inviteSabu.trim())
        const { data, error } = await supabase
          .from('profiles')
          .select('id, email, full_names, surname, sabu_number')
          .eq('sabu_number', inviteSabu.trim())
          .maybeSingle()

        if (error) {
          console.error('Error finding user by SABU number:', error)
          throw error
        }

        if (!data) {
          console.log('User not found with SABU number:', inviteSabu)
          toast.error(`No user found with SABU number: ${inviteSabu}`)
          setInviting(false)
          return
        }
        console.log('Found user by SABU:', data)
        profile = data
      }

      // Check if already a member
      const { data: existing, error: checkError } = await supabase
        .from('team_members')
        .select('*')
        .eq('team_id', team.id)
        .eq('user_id', profile.id)
        .maybeSingle()

      if (checkError) {
        console.error('Error checking existing membership:', checkError)
        throw checkError
      }

      if (existing) {
        toast.error(`${profile.full_names} ${profile.surname} is already a team member`)
        setInviting(false)
        return
      }

      // Check if user is captain
      if (team.captain_id === profile.id) {
        toast.error('The team captain is already part of the team')
        setInviting(false)
        return
      }

      // Add member to team_members table
      const memberData = {
        team_id: team.id,
        user_id: profile.id,
        joined_at: new Date().toISOString(),
      }
      console.log('Adding team member with data:', memberData)
      
      const { data: insertedMember, error: insertError } = await supabase
        .from('team_members')
        .insert(memberData)
        .select()
        .single()

      console.log('Member addition response:', { insertedMember, insertError })

      if (insertError) {
        console.error('Error adding team member - details:', {
          message: insertError.message,
          code: insertError.code,
          details: insertError.details,
          hint: insertError.hint,
        })
        throw insertError
      }

      console.log('Member added successfully:', insertedMember)
      toast.success(`Successfully added ${profile.full_names} ${profile.surname}${profile.sabu_number ? ` (${profile.sabu_number})` : ''} to the team`)
      setInviteEmail('')
      setInviteSabu('')
      onUpdate()
    } catch (error: any) {
      console.error('Error adding team member:', error)
      toast.error(error.message || 'Failed to add team member. Please try again.')
    } finally {
      setInviting(false)
    }
  }

  async function handleRemoveMember(memberId: string) {
    if (!confirm('Are you sure you want to remove this member?')) return

    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId)

      if (error) throw error

      toast.success('Member removed successfully')
      onUpdate()
    } catch (error: any) {
      console.error('Error removing member:', error)
      toast.error(error.message || 'Failed to remove member')
    }
  }

  async function handleUpdateTeam() {
    if (!team.id) return

    setUpdating(true)
    try {
      const { error } = await supabase
        .from('teams')
        .update({
          name: teamName,
          province: teamProvince || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', team.id)

      if (error) throw error

      toast.success('Team updated successfully')
      onUpdate()
    } catch (error: any) {
      console.error('Error updating team:', error)
      toast.error(error.message || 'Failed to update team')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <TeamManagementContent
      team={team}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      inviteEmail={inviteEmail}
      setInviteEmail={setInviteEmail}
      inviteSabu={inviteSabu}
      setInviteSabu={setInviteSabu}
      inviteMethod={inviteMethod}
      setInviteMethod={setInviteMethod}
      onInvite={handleInviteMember}
      inviting={inviting}
      onRemoveMember={handleRemoveMember}
      teamName={teamName}
      setTeamName={setTeamName}
      teamProvince={teamProvince}
      setTeamProvince={setTeamProvince}
      onUpdateTeam={handleUpdateTeam}
      updating={updating}
      onClose={onClose}
      isCaptain={isCaptain}
    />
  )
}

function TeamManagementContent({
  team,
  activeTab,
  setActiveTab,
  inviteEmail,
  setInviteEmail,
  inviteSabu,
  setInviteSabu,
  inviteMethod,
  setInviteMethod,
  onInvite,
  inviting,
  onRemoveMember,
  teamName,
  setTeamName,
  teamProvince,
  setTeamProvince,
  onUpdateTeam,
  updating,
  onClose,
  isCaptain,
}: {
  team: TeamWithDetails
  activeTab: 'members' | 'details' | 'registrations'
  setActiveTab: (tab: 'members' | 'details' | 'registrations') => void
  inviteEmail: string
  setInviteEmail: (email: string) => void
  inviteSabu: string
  setInviteSabu: (sabu: string) => void
  inviteMethod: 'email' | 'sabu'
  setInviteMethod: (method: 'email' | 'sabu') => void
  onInvite: () => void
  inviting: boolean
  onRemoveMember: (memberId: string) => void
  teamName: string
  setTeamName: (name: string) => void
  teamProvince: string
  setTeamProvince: (province: string) => void
  onUpdateTeam: () => void
  updating: boolean
  onClose: () => void
  isCaptain: boolean
}) {
  const [registrations, setRegistrations] = useState<Array<Registration & { competition: Competition | null }>>([])
  const [scores, setScores] = useState<Score[]>([])
  const [loadingRegistrations, setLoadingRegistrations] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (activeTab === 'registrations') {
      loadRegistrations()
    }
  }, [activeTab, team.id])

  async function loadRegistrations() {
    if (!team.id) return

    setLoadingRegistrations(true)
    try {
      // Get team registrations
      const { data: regs } = await supabase
        .from('registrations')
        .select('*')
        .eq('team_id', team.id)

      if (!regs) {
        setRegistrations([])
        return
      }

      // Get competitions
      const competitionIds = regs.map(r => r.competition_id).filter(Boolean) as string[]
      const { data: competitions } = competitionIds.length > 0
        ? await supabase
            .from('competitions')
            .select('*')
            .in('id', competitionIds)
        : { data: [] }

      const competitionsMap = new Map(competitions?.map(c => [c.id, c]) || [])

      setRegistrations(
        regs.map(r => ({
          ...r,
          competition: r.competition_id ? competitionsMap.get(r.competition_id) || null : null,
        }))
      )

      // Get scores for these registrations
      const registrationIds = regs.map(r => r.id)
      const { data: scoresData } = registrationIds.length > 0
        ? await supabase
            .from('scores')
            .select('*')
            .in('registration_id', registrationIds)
        : { data: [] }

      setScores(scoresData || [])
    } catch (error) {
      console.error('Error loading registrations:', error)
      toast.error('Failed to load registrations')
    } finally {
      setLoadingRegistrations(false)
    }
  }

  // Calculate combined team scores
  const teamScoresByCompetition = registrations.reduce((acc, reg) => {
    if (!reg.competition_id) return acc
    const compId = reg.competition_id
    if (!acc[compId]) {
      acc[compId] = {
        competition: reg.competition,
        totalScore: 0,
        totalX: 0,
        totalV: 0,
        registrationCount: 0,
      }
    }
    const regScores = scores.filter(s => s.registration_id === reg.id)
    const regTotal = regScores.reduce((sum, s) => sum + s.score, 0)
    const regX = regScores.reduce((sum, s) => sum + (s.x_count || 0), 0)
    const regV = regScores.reduce((sum, s) => sum + (s.v_count || 0), 0)
    acc[compId].totalScore += regTotal
    acc[compId].totalX += regX
    acc[compId].totalV += regV
    acc[compId].registrationCount += 1
    return acc
  }, {} as Record<string, {
    competition: Competition | null
    totalScore: number
    totalX: number
    totalV: number
    registrationCount: number
  }>)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Manage Team: {team.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('members')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'members'
                ? 'border-b-2 border-[#1e40af] text-[#1e40af]'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <UserPlus className="h-4 w-4 inline mr-2" />
            Members
          </button>
          <button
            onClick={() => setActiveTab('details')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'details'
                ? 'border-b-2 border-[#1e40af] text-[#1e40af]'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Edit2 className="h-4 w-4 inline mr-2" />
            Team Details
          </button>
          <button
            onClick={() => setActiveTab('registrations')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'registrations'
                ? 'border-b-2 border-[#1e40af] text-[#1e40af]'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Trophy className="h-4 w-4 inline mr-2" />
            Registrations & Scores
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'members' && (
            <div className="space-y-4">
              {isCaptain && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-blue-900">Add Member</h3>
                    <UserPlus className="h-5 w-5 text-blue-600" />
                  </div>
                  
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Search Method</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setInviteMethod('email')
                          setInviteEmail('')
                          setInviteSabu('')
                        }}
                        className={`flex-1 px-3 py-2 text-sm rounded transition-colors ${
                          inviteMethod === 'email'
                            ? 'bg-[#1e40af] text-white shadow-md'
                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <Mail className="h-4 w-4 inline mr-1" />
                        By Email
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setInviteMethod('sabu')
                          setInviteEmail('')
                          setInviteSabu('')
                        }}
                        className={`flex-1 px-3 py-2 text-sm rounded transition-colors ${
                          inviteMethod === 'sabu'
                            ? 'bg-[#1e40af] text-white shadow-md'
                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <UserPlus className="h-4 w-4 inline mr-1" />
                        By SABU Number
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    {inviteMethod === 'email' ? (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email Address
                        </label>
                        <input
                          type="email"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          placeholder="shooter@example.com"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && inviteEmail && !inviting) {
                              onInvite()
                            }
                          }}
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          SABU Number
                        </label>
                        <input
                          type="text"
                          value={inviteSabu}
                          onChange={(e) => setInviteSabu(e.target.value)}
                          placeholder="Enter SABU number"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && inviteSabu && !inviting) {
                              onInvite()
                            }
                          }}
                        />
                      </div>
                    )}
                    
                    <button
                      onClick={onInvite}
                      disabled={inviting || (inviteMethod === 'email' ? !inviteEmail.trim() : !inviteSabu.trim())}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#1e40af] text-white rounded-lg hover:bg-[#1e3a8a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {inviting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Adding Member...
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4" />
                          Add Member
                        </>
                      )}
                    </button>
                  </div>
                  
                  {team.max_members && (
                    <p className="text-xs text-gray-600 mt-3 text-center">
                      Members: {team.member_count + 1} / {team.max_members} (including captain)
                    </p>
                  )}
                </div>
              )}

              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Team Members ({team.member_count})</h3>
                <div className="space-y-2">
                  {team.captain && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        {team.captain.profile_image ? (
                          <img
                            src={team.captain.profile_image}
                            alt={team.captain.full_names}
                            className="w-10 h-10 rounded-full"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1e40af] to-[#1e3a8a] flex items-center justify-center">
                            <Users className="h-5 w-5 text-white" />
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-gray-900">
                            {team.captain.full_names} {team.captain.surname}
                          </div>
                          <div className="text-sm text-gray-600">Captain</div>
                        </div>
                      </div>
                    </div>
                  )}
                  {team.members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        {member.profile?.profile_image ? (
                          <img
                            src={member.profile.profile_image}
                            alt={member.profile.full_names}
                            className="w-10 h-10 rounded-full"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <Users className="h-5 w-5 text-gray-600" />
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-gray-900">
                            {member.profile ? `${member.profile.full_names} ${member.profile.surname}` : 'Unknown'}
                          </div>
                          <div className="text-sm text-gray-600">
                            {member.profile?.sabu_number || 'N/A'}
                          </div>
                        </div>
                      </div>
                      {isCaptain && member.user_id !== team.captain_id && (
                        <button
                          onClick={() => onRemoveMember(member.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'details' && (
            <div className="space-y-4">
              {isCaptain ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Team Name</label>
                    <input
                      type="text"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Province</label>
                    <select
                      value={teamProvince}
                      onChange={(e) => setTeamProvince(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                    >
                      <option value="">Select Province</option>
                      {SA_PROVINCES.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={onUpdateTeam}
                    disabled={updating}
                    className="px-6 py-2 bg-[#1e40af] text-white rounded-lg hover:bg-[#1e3a8a] transition-colors disabled:opacity-50"
                  >
                    {updating ? 'Updating...' : 'Update Team'}
                  </button>
                </>
              ) : (
                <div className="text-center py-8 text-gray-600">
                  Only team captains can edit team details
                </div>
              )}
            </div>
          )}

          {activeTab === 'registrations' && (
            <div className="space-y-6">
              {loadingRegistrations ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e40af] mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading registrations...</p>
                </div>
              ) : registrations.length === 0 ? (
                <div className="text-center py-8 text-gray-600">
                  <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p>No registrations yet</p>
                </div>
              ) : (
                <>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-4">Team Registrations</h3>
                    <div className="space-y-4">
                      {Object.entries(teamScoresByCompetition).map(([compId, data]) => (
                        <div key={compId} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="font-semibold text-gray-900">
                                {data.competition?.name || 'Unknown Competition'}
                              </h4>
                              {data.competition && (
                                <p className="text-sm text-gray-600">
                                  {new Date(data.competition.start_date).toLocaleDateString()} -{' '}
                                  {new Date(data.competition.end_date).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                            <div>
                              <div className="text-sm text-gray-600">Combined Score</div>
                              <div className="text-lg font-bold text-gray-900">{data.totalScore}</div>
                            </div>
                            <div>
                              <div className="text-sm text-gray-600">X Count</div>
                              <div className="text-lg font-bold text-gray-900">{data.totalX}</div>
                            </div>
                            <div>
                              <div className="text-sm text-gray-600">V Count</div>
                              <div className="text-lg font-bold text-gray-900">{data.totalV}</div>
                            </div>
                            <div>
                              <div className="text-sm text-gray-600">Members</div>
                              <div className="text-lg font-bold text-gray-900">{data.registrationCount}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
