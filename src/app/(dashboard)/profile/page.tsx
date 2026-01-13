'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  User,
  Target,
  Trophy,
  Award,
  Settings,
  Save,
  Upload,
  Camera,
  Lock,
  Bell,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { SA_PROVINCES } from '@/lib/validations/registration'
import type { Database } from '@/types/database'

type Profile = Database['public']['Tables']['profiles']['Row']
type Competition = Database['public']['Tables']['competitions']['Row']
type Registration = Database['public']['Tables']['registrations']['Row']
type Score = Database['public']['Tables']['scores']['Row']
type Discipline = Database['public']['Tables']['disciplines']['Row']

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<'personal' | 'shooting' | 'history' | 'achievements' | 'account'>(
    'personal'
  )
  const [profile, setProfile] = useState<Profile | null>(null)
  const [disciplines, setDisciplines] = useState<Discipline[]>([])
  const [competitionHistory, setCompetitionHistory] = useState<Array<Registration & { competition: Competition | null; discipline: Discipline | null; scores: Score[] }>>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    loadProfileData()
  }, [])

  async function loadProfileData() {
    setLoading(true)
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        toast.error('Please log in')
        router.push('/login')
        return
      }

      // Load profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError) {
        console.error('Profile fetch error:', profileError)
        console.error('Error code:', profileError.code)
        console.error('Error message:', profileError.message)
        console.error('Error details:', profileError.details)
        console.error('Error hint:', profileError.hint)
        
        if (profileError.code === 'PGRST116') {
          // No rows returned - profile doesn't exist
          toast.error('Profile not found. Please complete your registration.')
          setProfile(null)
          setLoading(false)
          return
        }
        
        // Other errors (RLS, permissions, etc.)
        toast.error('Failed to load profile: ' + (profileError.message || 'Unknown error'))
        setProfile(null)
        setLoading(false)
        return
      }

      if (!profileData) {
        toast.error('Profile not found. Please complete your registration.')
        setProfile(null)
        setLoading(false)
        return
      }

      setProfile(profileData)

      // Load disciplines
      const { data: disciplinesData } = await supabase
        .from('disciplines')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true })

      setDisciplines(disciplinesData || [])

      // Load competition history with discipline names
      const { data: registrations } = await supabase
        .from('registrations')
        .select(`
          *,
          competitions(*),
          scores(*),
          disciplines(id, name, color)
        `)
        .eq('user_id', user.id)
        .order('registered_at', { ascending: false })

      const history = (registrations || []).map((reg: any) => ({
        ...reg,
        competition: reg.competitions || null,
        discipline: reg.disciplines || null,
        scores: reg.scores || [],
      }))

      setCompetitionHistory(history)
    } catch (error) {
      console.error('Error loading profile:', error)
      toast.error('Failed to load profile data')
    } finally {
      setLoading(false)
    }
  }

  async function handleSavePersonalInfo(formData: FormData) {
    if (!profile) return

    setSaving(true)
    try {
      const updates: Partial<Profile> = {
        full_names: formData.get('full_names') as string,
        surname: formData.get('surname') as string,
        email: formData.get('email') as string,
        mobile_number: formData.get('mobile_number') as string || null,
        office_phone: formData.get('office_phone') as string || null,
        postal_address: formData.get('postal_address') as string || null,
        postal_code: formData.get('postal_code') as string || null,
        province: formData.get('province') as string || null,
        club: formData.get('club') as string || null,
        emergency_contact_name: formData.get('emergency_contact_name') as string || null,
        emergency_contact_phone: formData.get('emergency_contact_phone') as string || null,
        medical_info: formData.get('medical_info') as string || null,
        bio: formData.get('bio') as string || null,
      }

      const { error } = await supabase.from('profiles').update(updates).eq('id', profile.id)

      if (error) throw error

      toast.success('Profile updated successfully')
      loadProfileData()
    } catch (error: any) {
      console.error('Error saving profile:', error)
      toast.error(error.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveShootingPreferences(formData: FormData) {
    if (!profile) return

    setSaving(true)
    try {
      const preferredDisciplines = formData.getAll('preferred_disciplines') as string[]
      const updates: Partial<Profile> = {
        preferred_disciplines: preferredDisciplines,
        shoulder_preference: formData.get('shoulder_preference') as 'left' | 'right' || null,
      }

      const { error } = await supabase.from('profiles').update(updates).eq('id', profile.id)

      if (error) throw error

      toast.success('Shooting preferences updated successfully')
      loadProfileData()
    } catch (error: any) {
      console.error('Error saving preferences:', error)
      toast.error(error.message || 'Failed to update preferences')
    } finally {
      setSaving(false)
    }
  }

  async function handleUploadProfileImage(file: File) {
    if (!profile) return

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${profile.id}-${Date.now()}.${fileExt}`
      const filePath = `profile-images/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('profile-assets')
        .upload(filePath, file, { upsert: true })

      if (uploadError) {
        // Try alternative bucket name
        const { error: altError } = await supabase.storage
          .from('avatars')
          .upload(filePath, file, { upsert: true })

        if (altError) throw altError

        const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
        await supabase.from('profiles').update({ profile_image: data.publicUrl }).eq('id', profile.id)
      } else {
        const { data } = supabase.storage.from('profile-assets').getPublicUrl(filePath)
        await supabase.from('profiles').update({ profile_image: data.publicUrl }).eq('id', profile.id)
      }

      toast.success('Profile picture updated')
      loadProfileData()
    } catch (error: any) {
      console.error('Error uploading image:', error)
      toast.error(error.message || 'Failed to upload image')
    }
  }

  async function handleChangePassword(currentPassword: string, newPassword: string, confirmPassword: string) {
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match')
      return
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) throw error

      toast.success('Password updated successfully')
    } catch (error: any) {
      console.error('Error changing password:', error)
      toast.error(error.message || 'Failed to change password')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1e40af] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Profile not found</h2>
            <p className="text-gray-600 mb-6">
              Your profile could not be loaded. This may happen if you haven't completed registration or if there was an error loading your profile.
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => router.push('/register')}
                className="px-6 py-2 bg-[#1e40af] text-white rounded-lg hover:bg-[#1e3a8a] transition-colors"
              >
                Complete Registration
              </button>
              <button
                onClick={() => loadProfileData()}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Profile Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center gap-6">
            <div className="relative">
              {profile.profile_image ? (
                <img
                  src={profile.profile_image}
                  alt={profile.full_names}
                  className="w-24 h-24 rounded-full object-cover border-4 border-[#1e40af]"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#1e40af] to-[#1e3a8a] flex items-center justify-center border-4 border-[#1e40af]">
                  <User className="h-12 w-12 text-white" />
                </div>
              )}
              <label
                htmlFor="profile-image-upload"
                className="absolute bottom-0 right-0 bg-[#1e40af] text-white rounded-full p-2 cursor-pointer hover:bg-[#1e3a8a] transition-colors"
              >
                <Camera className="h-4 w-4" />
              </label>
              <input
                id="profile-image-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleUploadProfileImage(file)
                }}
              />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">
                {profile.full_names} {profile.surname}
              </h1>
              <p className="text-gray-600 mt-1">SABU Number: {profile.sabu_number}</p>
              {profile.club && <p className="text-gray-600">Club: {profile.club}</p>}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="flex border-b overflow-x-auto">
            <TabButton
              active={activeTab === 'personal'}
              onClick={() => setActiveTab('personal')}
              icon={<User className="h-4 w-4" />}
              label="Personal Information"
            />
            <TabButton
              active={activeTab === 'shooting'}
              onClick={() => setActiveTab('shooting')}
              icon={<Target className="h-4 w-4" />}
              label="Shooting Preferences"
            />
            <TabButton
              active={activeTab === 'history'}
              onClick={() => setActiveTab('history')}
              icon={<Trophy className="h-4 w-4" />}
              label="Competition History"
            />
            <TabButton
              active={activeTab === 'achievements'}
              onClick={() => setActiveTab('achievements')}
              icon={<Award className="h-4 w-4" />}
              label="Achievements"
            />
            <TabButton
              active={activeTab === 'account'}
              onClick={() => setActiveTab('account')}
              icon={<Settings className="h-4 w-4" />}
              label="Account Settings"
            />
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'personal' && (
              <PersonalInfoTab profile={profile} onSave={handleSavePersonalInfo} saving={saving} />
            )}
            {activeTab === 'shooting' && (
              <ShootingPreferencesTab
                profile={profile}
                disciplines={disciplines}
                onSave={handleSaveShootingPreferences}
                saving={saving}
              />
            )}
            {activeTab === 'history' && <CompetitionHistoryTab history={competitionHistory} />}
            {activeTab === 'achievements' && <AchievementsTab profile={profile} />}
            {activeTab === 'account' && <AccountSettingsTab onChangePassword={handleChangePassword} />}
          </div>
        </div>
      </div>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors whitespace-nowrap ${
        active
          ? 'border-b-2 border-[#1e40af] text-[#1e40af]'
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

function PersonalInfoTab({
  profile,
  onSave,
  saving,
}: {
  profile: Profile
  onSave: (formData: FormData) => void
  saving: boolean
}) {
  return (
    <form action={onSave} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <User className="h-4 w-4 inline mr-2" />
            Full Names *
          </label>
          <input
            type="text"
            name="full_names"
            defaultValue={profile.full_names}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Surname *</label>
          <input
            type="text"
            name="surname"
            defaultValue={profile.surname}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Mail className="h-4 w-4 inline mr-2" />
            Email *
          </label>
          <input
            type="email"
            name="email"
            defaultValue={profile.email || ''}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Phone className="h-4 w-4 inline mr-2" />
            Mobile Number
          </label>
          <input
            type="tel"
            name="mobile_number"
            defaultValue={profile.mobile_number || ''}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Office Phone</label>
          <input
            type="tel"
            name="office_phone"
            defaultValue={profile.office_phone || ''}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <MapPin className="h-4 w-4 inline mr-2" />
            Province
          </label>
          <select
            name="province"
            defaultValue={profile.province || ''}
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
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">Postal Address</label>
          <textarea
            name="postal_address"
            defaultValue={profile.postal_address || ''}
            rows={2}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Postal Code</label>
          <input
            type="text"
            name="postal_code"
            defaultValue={profile.postal_code || ''}
            maxLength={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Club</label>
          <input
            type="text"
            name="club"
            defaultValue={profile.club || ''}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Emergency Contact Name</label>
          <input
            type="text"
            name="emergency_contact_name"
            defaultValue={profile.emergency_contact_name || ''}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Emergency Contact Phone</label>
          <input
            type="tel"
            name="emergency_contact_phone"
            defaultValue={profile.emergency_contact_phone || ''}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">Medical Information</label>
          <textarea
            name="medical_info"
            defaultValue={profile.medical_info || ''}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
            placeholder="Any medical conditions or allergies..."
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
          <textarea
            name="bio"
            defaultValue={profile.bio || ''}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
            placeholder="Tell us about yourself..."
          />
        </div>
      </div>
      <div className="flex justify-end pt-4 border-t">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2 bg-[#1e40af] text-white rounded-lg hover:bg-[#1e3a8a] transition-colors disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}

function ShootingPreferencesTab({
  profile,
  disciplines,
  onSave,
  saving,
}: {
  profile: Profile
  disciplines: Discipline[]
  onSave: (formData: FormData) => void
  saving: boolean
}) {
  return (
    <form action={onSave} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Preferred Disciplines</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {disciplines.map((discipline) => (
            <label key={discipline.id} className="flex items-center gap-2 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                name="preferred_disciplines"
                value={discipline.id}
                defaultChecked={profile.preferred_disciplines?.includes(discipline.id)}
                className="w-4 h-4 text-[#1e40af] border-gray-300 rounded focus:ring-[#1e40af]"
              />
              <span className="text-gray-900">{discipline.name}</span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Shoulder Preference</label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="shoulder_preference"
              value="left"
              defaultChecked={profile.shoulder_preference === 'left'}
              className="w-4 h-4 text-[#1e40af] border-gray-300 focus:ring-[#1e40af]"
            />
            <span>Left</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="shoulder_preference"
              value="right"
              defaultChecked={profile.shoulder_preference === 'right'}
              className="w-4 h-4 text-[#1e40af] border-gray-300 focus:ring-[#1e40af]"
            />
            <span>Right</span>
          </label>
        </div>
      </div>
      <div className="flex justify-end pt-4 border-t">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2 bg-[#1e40af] text-white rounded-lg hover:bg-[#1e3a8a] transition-colors disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}

function CompetitionHistoryTab({
  history,
}: {
  history: Array<Registration & { competition: Competition | null; discipline: Discipline | null; scores: Score[] }>
}) {
  if (history.length === 0) {
    return (
      <div className="text-center py-12">
        <Trophy className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No competition history yet</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Competition
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Discipline
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Total Score
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {history.map((reg) => {
            const totalScore = reg.scores.reduce((sum, s) => sum + s.score, 0)
            return (
              <tr key={reg.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {reg.competition?.name || 'Unknown'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-600">
                    {reg.competition
                      ? format(new Date(reg.competition.start_date), 'MMM d, yyyy')
                      : 'N/A'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-600">
                    {reg.discipline?.name || reg.discipline_id || 'N/A'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-semibold text-gray-900">{totalScore}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      reg.registration_status === 'confirmed'
                        ? 'bg-green-100 text-green-800'
                        : reg.registration_status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {reg.registration_status || 'Pending'}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function AchievementsTab({ profile }: { profile: Profile }) {
  const achievements = profile.achievements || []

  if (achievements.length === 0) {
    return (
      <div className="text-center py-12">
        <Award className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No achievements yet</p>
        <p className="text-sm text-gray-500 mt-2">Achievements will appear here as you compete</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {achievements.map((achievement, index) => (
        <div key={index} className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-6 border-2 border-amber-300">
          <Award className="h-12 w-12 text-amber-600 mb-3" />
          <h3 className="font-bold text-gray-900 text-lg">{achievement}</h3>
        </div>
      ))}
    </div>
  )
}

function AccountSettingsTab({ onChangePassword }: { onChangePassword: (current: string, newPassword: string, confirm: string) => void }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Lock className="h-5 w-5" />
          Change Password
        </h3>
        <div className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
            />
          </div>
          <button
            onClick={() => onChangePassword(currentPassword, newPassword, confirmPassword)}
            className="flex items-center gap-2 px-6 py-2 bg-[#1e40af] text-white rounded-lg hover:bg-[#1e3a8a] transition-colors"
          >
            <Lock className="h-4 w-4" />
            Update Password
          </button>
        </div>
      </div>
    </div>
  )
}
