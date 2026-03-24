'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft, ChevronRight, CheckCircle, Target, Trophy, Users, FileText, DollarSign, X } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import type { Database } from '@/types/database'

type Competition = Database['public']['Tables']['competitions']['Row']
type CompetitionMatch = Database['public']['Tables']['competition_matches']['Row']

interface Discipline {
  id: string
  name: string
  color: string | null
  fees: {
    standard: number | null
    u19: number | null
    u25: number | null
    maxEntries: number | null
  }
}

interface MatchDiscipline {
  match_id: string
  discipline_id: string
}

interface EventRegistrationProps {
  competition: Competition
  disciplines: Discipline[]
  matches: CompetitionMatch[]
  matchDisciplines: MatchDiscipline[]
}

export default function EventRegistration({ competition, disciplines, matches, matchDisciplines }: EventRegistrationProps) {
  const [showModal, setShowModal] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [teams, setTeams] = useState<any[]>([])
  const [entryNumber, setEntryNumber] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const [formData, setFormData] = useState({
    disciplineIds: [] as string[],
    selectedMatches: [] as string[],
    allMatches: false,
    entryType: 'individual' as 'individual' | 'team',
    teamId: '',
    requiresImportPermit: false,
    permitApplicationBy: '',
  })

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        setUser(authUser)
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single()
        if (profileData) {
          setProfile(profileData)
          // Fetch user's teams (where user is captain or member)
          const { data: teamMemberships } = await supabase
            .from('team_members')
            .select('team_id')
            .eq('user_id', authUser.id)

          const memberTeamIds = teamMemberships?.map(tm => tm.team_id).filter((id): id is string => id !== null) || []

          // Get teams where user is captain
          const { data: captainTeams } = await supabase
            .from('teams')
            .select('*')
            .eq('captain_id', authUser.id)

          const captainTeamIds = captainTeams?.map(t => t.id).filter((id): id is string => id !== null) || []
          const allTeamIds: string[] = [...new Set([...memberTeamIds, ...captainTeamIds])]

          if (allTeamIds.length > 0) {
            const { data: teamsData } = await supabase
              .from('teams')
              .select('*')
              .in('id', allTeamIds)
              .order('name')
            if (teamsData) {
              setTeams(teamsData)
            }
          }
        }
      }
    }
    fetchUser()
  }, [supabase])

  // Disciplines selected by the user
  const selectedDisciplines = disciplines.filter((d) => formData.disciplineIds.includes(d.id))

  // Matches available for the selected disciplines (via match_stages mapping)
  const availableMatchIds = new Set(
    matchDisciplines
      .filter((md) => formData.disciplineIds.includes(md.discipline_id))
      .map((md) => md.match_id)
  )
  // If no match_stages data, fall back to showing all matches
  const filteredMatches = matchDisciplines.length > 0
    ? matches.filter((m) => availableMatchIds.has(m.id))
    : matches

  // Calculate fees
  const calculateFees = () => {
    const breakdown: Array<{ label: string; amount: number }> = []
    let total = 0

    // Fee per selected discipline
    selectedDisciplines.forEach((d) => {
      const fees = d.fees
      let fee = 0
      if (profile?.age_classification === 'Under_19' && fees.u19 !== null) {
        fee = fees.u19
        breakdown.push({ label: `${d.name} (U19)`, amount: fee })
      } else if (profile?.age_classification === 'Under_25' && fees.u25 !== null) {
        fee = fees.u25
        breakdown.push({ label: `${d.name} (U25)`, amount: fee })
      } else if (fees.standard !== null) {
        fee = fees.standard
        breakdown.push({ label: d.name, amount: fee })
      }
      total += fee
    })

    // Match fees
    if (formData.allMatches) {
      const matchFees = filteredMatches
        .filter((m) => !m.is_optional)
        .reduce((sum, m) => sum + m.entry_fee, 0)
      if (matchFees > 0) {
        breakdown.push({ label: 'All Matches', amount: matchFees })
        total += matchFees
      }
    } else {
      formData.selectedMatches.forEach((matchId) => {
        const match = matches.find((m) => m.id === matchId)
        if (match) {
          breakdown.push({ label: match.match_name || matchId, amount: match.entry_fee })
          total += match.entry_fee
        }
      })
    }

    // Additional fees
    if (competition.compulsory_range_fee) {
      breakdown.push({ label: 'Compulsory Range Fee', amount: competition.compulsory_range_fee })
      total += competition.compulsory_range_fee
    }

    if (formData.requiresImportPermit && competition.import_export_permit_fee) {
      breakdown.push({ label: 'Import/Export Permit Fee', amount: competition.import_export_permit_fee })
      total += competition.import_export_permit_fee
    }

    return { total, breakdown }
  }

  const fees = calculateFees()

  const handleNext = () => {
    if (currentStep === 1 && formData.disciplineIds.length === 0) {
      toast.error('Please select at least one discipline')
      return
    }
    if (currentStep === 2 && !formData.allMatches && formData.selectedMatches.length === 0) {
      toast.error('Please select at least one match')
      return
    }
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    if (!user || !profile) {
      toast.error('Please log in to register')
      return
    }

    setLoading(true)

    try {
      // Generate entry number
      const entryNum = `ENT-${competition.slug.toUpperCase()}-${Date.now().toString().slice(-6)}`

      // Validate required fields
      if (formData.disciplineIds.length === 0) {
        throw new Error('Please select at least one discipline')
      }

      if (!profile?.age_classification) {
        throw new Error('Age classification is missing from your profile. Please update your profile.')
      }

      if (fees.total === undefined || fees.total === null || isNaN(fees.total)) {
        throw new Error('Unable to calculate registration fees. Please try again.')
      }

      if (!formData.allMatches && formData.selectedMatches.length === 0) {
        throw new Error('Please select at least one match')
      }

      // Create one registration per selected discipline
      const feePerDiscipline = fees.total / formData.disciplineIds.length

      for (const disciplineId of formData.disciplineIds) {
        const registrationData = {
          user_id: user.id,
          competition_id: competition.id,
          discipline_id: disciplineId,
          age_classification: profile.age_classification,
          all_matches: formData.allMatches,
          team_id: formData.teamId || null,
          requires_import_permit: formData.requiresImportPermit || false,
          permit_application_by: formData.requiresImportPermit && formData.permitApplicationBy ? formData.permitApplicationBy : null,
          total_fee: feePerDiscipline,
          registration_status: 'confirmed' as const,
          payment_status: 'pending' as const,
          entry_number: entryNum,
          registered_at: new Date().toISOString(),
        }

        const { data: registration, error: regError } = await supabase
          .from('registrations')
          .insert(registrationData)
          .select()
          .single()

        if (regError) throw regError

        // Link selected matches to this registration
        if (registration && !formData.allMatches && formData.selectedMatches.length > 0) {
          const registrationMatchesData = formData.selectedMatches.map(matchId => ({
            registration_id: registration.id,
            match_id: matchId,
            fee_paid: matches.find(m => m.id === matchId)?.entry_fee || 0,
          }))

          const { error: matchesError } = await supabase
            .from('registration_matches')
            .insert(registrationMatchesData)

          if (matchesError) {
            console.error('Error creating registration matches:', matchesError)
            toast.warning('Registration created but match selection may not have been saved.')
          }
        }
      }

      // Auto-enrol in championship if this event belongs to one
      const championshipId = (competition as any).championship_id
      if (championshipId) {
        for (const disciplineId of formData.disciplineIds) {
          const { error: crError } = await (supabase as any)
            .from('championship_registrations')
            .upsert(
              {
                championship_id: championshipId,
                user_id: user.id,
                discipline_id: disciplineId,
                registration_status: 'pending',
                payment_status: 'pending',
                registered_at: new Date().toISOString(),
              },
              { onConflict: 'championship_id,user_id,discipline_id', ignoreDuplicates: true }
            )
          if (crError) {
            // Non-fatal — log but don't block registration
            console.error('Championship auto-enrol error:', crError)
          }
        }
      }

      setEntryNumber(entryNum)
      setCurrentStep(6) // Success step
      toast.success('Registration submitted successfully!')
    } catch (error: any) {
      console.error('Registration error:', error)
      console.error('Error type:', typeof error)
      console.error('Error keys:', Object.keys(error || {}))
      
      // Extract error message from various possible formats
      let errorMessage = 'Error submitting registration'
      
      if (error?.message) {
        errorMessage = error.message
      } else if (error?.details) {
        errorMessage = error.details
      } else if (error?.hint) {
        errorMessage = error.hint
      } else if (typeof error === 'string') {
        errorMessage = error
      } else if (error?.code) {
        // Handle specific error codes
        switch (error.code) {
          case '23505': // Unique constraint violation
            errorMessage = 'You are already registered for this competition'
            break
          case '23503': // Foreign key violation
            errorMessage = 'Invalid competition or discipline selected'
            break
          case '42501': // Insufficient privileges
            errorMessage = 'Permission denied. Please ensure your account is verified.'
            break
          case 'PGRST116': // Not found
            errorMessage = 'Competition or discipline not found'
            break
          default:
            errorMessage = `Registration failed: ${error.code}`
        }
      }
      
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const steps = [
    { number: 1, title: 'Select Disciplines', icon: Target },
    { number: 2, title: 'Choose Matches', icon: Trophy },
    { number: 3, title: 'Team Option', icon: Users },
    { number: 4, title: 'Additional Options', icon: FileText },
    { number: 5, title: 'Fee Summary', icon: DollarSign },
  ]

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="w-full px-6 py-3 bg-[#1e40af] text-white rounded-lg hover:bg-[#1e3a8a] transition-colors font-semibold"
      >
        Register Now
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between z-10">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Register for {competition.name}</h2>
                {currentStep <= 5 && (
                  <div className="flex items-center mt-2">
                    {steps.map((step, index) => {
                      const StepIcon = step.icon
                      const isActive = currentStep === step.number
                      const isCompleted = currentStep > step.number

                      return (
                        <div key={step.number} className="flex items-center">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              isActive
                                ? 'bg-[#1e40af] text-white'
                                : isCompleted
                                ? 'bg-green-500 text-white'
                                : 'bg-gray-200 text-gray-400'
                            }`}
                          >
                            {isCompleted ? <CheckCircle className="h-5 w-5" /> : <StepIcon className="h-5 w-5" />}
                          </div>
                          {index < steps.length - 1 && (
                            <div
                              className={`h-1 w-12 mx-1 ${
                                isCompleted ? 'bg-green-500' : 'bg-gray-200'
                              }`}
                            />
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
              {currentStep < 6 && (
                <button
                  onClick={() => {
                    setShowModal(false)
                    setCurrentStep(1)
                    setFormData({
                      disciplineIds: [],
                      selectedMatches: [],
                      allMatches: false,
                      entryType: 'individual',
                      teamId: '',
                      requiresImportPermit: false,
                      permitApplicationBy: '',
                    })
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              )}
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Step 1: Select Disciplines */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-gray-900">Select Disciplines</h3>
                    <p className="text-sm text-gray-500 mt-1">You can select one or more disciplines to enter.</p>
                  </div>
                  <div className="space-y-3">
                    {disciplines.map((discipline) => {
                      const checked = formData.disciplineIds.includes(discipline.id)
                      return (
                        <label
                          key={discipline.id}
                          className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                            checked ? 'border-[#1e40af] bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const ids = e.target.checked
                                ? [...formData.disciplineIds, discipline.id]
                                : formData.disciplineIds.filter(id => id !== discipline.id)
                              // Clear match selection when disciplines change
                              setFormData({ ...formData, disciplineIds: ids, selectedMatches: [], allMatches: false })
                            }}
                            className="w-4 h-4 mr-3 accent-[#1e40af]"
                          />
                          <div
                            className="w-3 h-3 rounded-full mr-3 flex-shrink-0"
                            style={{ backgroundColor: discipline.color || '#1e40af' }}
                          />
                          <div className="flex-1">
                            <span className="font-semibold text-gray-900">{discipline.name}</span>
                          </div>
                          <div className="text-right text-sm text-gray-600 ml-3">
                            {discipline.fees.standard !== null && (
                              <span>R{discipline.fees.standard.toFixed(2)}</span>
                            )}
                          </div>
                        </label>
                      )
                    })}
                  </div>
                  {formData.disciplineIds.length > 0 && (
                    <p className="text-sm text-[#1e40af] font-medium">
                      ✓ {formData.disciplineIds.length} discipline{formData.disciplineIds.length > 1 ? 's' : ''} selected
                    </p>
                  )}
                </div>
              )}

              {/* Step 2: Choose Matches */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-gray-900">Choose Matches</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Showing matches for: <span className="font-medium text-gray-700">{selectedDisciplines.map(d => d.name).join(', ')}</span>
                    </p>
                  </div>

                  <label className="flex items-center p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-gray-300">
                    <input
                      type="checkbox"
                      checked={formData.allMatches}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          allMatches: e.target.checked,
                          selectedMatches: e.target.checked ? [] : formData.selectedMatches,
                        })
                      }}
                      className="w-4 h-4 mr-3 accent-[#1e40af]"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">All Matches</div>
                      <div className="text-sm text-gray-600">
                        Register for all available matches (excluding optional)
                      </div>
                    </div>
                  </label>

                  {!formData.allMatches && (
                    <div className="space-y-2">
                      {filteredMatches.length === 0 ? (
                        <p className="text-sm text-gray-500 italic p-4 border border-dashed border-gray-300 rounded-lg">
                          No matches found for the selected disciplines.
                        </p>
                      ) : (
                        filteredMatches.map((match) => (
                          <label
                            key={match.id}
                            className={`flex items-center justify-between p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                              formData.selectedMatches.includes(match.id)
                                ? 'border-[#1e40af] bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                checked={formData.selectedMatches.includes(match.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFormData({ ...formData, selectedMatches: [...formData.selectedMatches, match.id] })
                                  } else {
                                    setFormData({ ...formData, selectedMatches: formData.selectedMatches.filter((m) => m !== match.id) })
                                  }
                                }}
                                className="w-4 h-4 mr-3 accent-[#1e40af]"
                              />
                              <div>
                                <div className="font-semibold text-gray-900">{match.match_name}</div>
                                <div className="text-sm text-gray-600">
                                  {match.distance}
                                  {match.match_date && ` • ${format(new Date(match.match_date), 'MMM d')}`}
                                  {match.is_optional && ' • Optional'}
                                </div>
                              </div>
                            </div>
                            <span className="font-semibold text-gray-900">R{match.entry_fee.toFixed(2)}</span>
                          </label>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Team Option */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Entry Type</h3>
                  
                  {/* Option 1: Individual Entry */}
                  <label className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    formData.teamId === ''
                      ? 'border-[#1e40af] bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <input
                      type="radio"
                      name="entryType"
                      value="individual"
                      checked={formData.teamId === ''}
                      onChange={() => setFormData({ ...formData, teamId: '' })}
                      className="mt-1 mr-3"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 mb-1">Option 1: Individual Entry</div>
                      <div className="text-sm text-gray-600">Competing solo (not as part of a team)</div>
                    </div>
                  </label>

                  {/* Option 2: Team Member Entry */}
                  {teams.length > 0 ? (
                    <div className="space-y-3">
                      <label 
                        className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                          formData.teamId !== ''
                            ? 'border-[#1e40af] bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => {
                          if (formData.teamId === '' && teams.length > 0) {
                            setFormData({ ...formData, teamId: teams[0].id })
                          }
                        }}
                      >
                        <input
                          type="radio"
                          name="entryType"
                          value="team"
                          checked={formData.teamId !== ''}
                          onChange={() => {
                            if (teams.length > 0) {
                              setFormData({ ...formData, teamId: teams[0].id })
                            }
                          }}
                          className="mt-1 mr-3"
                        />
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900 mb-1">Option 2: Team Member Entry</div>
                          <div className="text-sm text-gray-600">Competing as part of a team</div>
                        </div>
                      </label>
                      
                      {formData.teamId !== '' && (
                        <div className="ml-7 space-y-3">
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <p className="text-sm text-blue-800 font-medium mb-1">Important:</p>
                            <p className="text-sm text-blue-700">Each team member must register separately. Your individual scores will count towards the team total.</p>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Select Your Team:
                            </label>
                            <select
                              value={formData.teamId}
                              onChange={(e) => setFormData({ ...formData, teamId: e.target.value })}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                            >
                              <option value="">-- Select a team --</option>
                              {teams.map((team) => (
                                <option key={team.id} value={team.id}>
                                  {team.name}{team.province ? ` (${team.province})` : ''}
                                </option>
                              ))}
                            </select>
                          </div>
                          
                          {formData.teamId && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                              <p className="text-sm text-green-800 font-medium">✓ Your individual scores will count towards team total</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-2">
                        <strong>Option 2: Team Member Entry</strong> is not available because you are not a member of any teams.
                      </p>
                      <p className="text-sm text-gray-600">
                        Create or join a team from the <Link href="/teams" className="text-[#1e40af] hover:underline">Teams page</Link> to register as a team member.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Step 4: Additional Options */}
              {currentStep === 4 && (
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Additional Options</h3>
                  <label className="flex items-start p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-gray-300">
                    <input
                      type="checkbox"
                      checked={formData.requiresImportPermit}
                      onChange={(e) => setFormData({ ...formData, requiresImportPermit: e.target.checked })}
                      className="mt-1 mr-3"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">Requires Import/Export Permit</div>
                      <div className="text-sm text-gray-600 mt-1">
                        Check if you need an import/export permit for your firearm
                      </div>
                      {competition.import_export_permit_fee && (
                        <div className="text-sm text-gray-600 mt-1">
                          Fee: R{competition.import_export_permit_fee.toFixed(2)}
                        </div>
                      )}
                    </div>
                  </label>

                  {formData.requiresImportPermit && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Permit Application By
                      </label>
                      <input
                        type="date"
                        value={formData.permitApplicationBy}
                        onChange={(e) => setFormData({ ...formData, permitApplicationBy: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Step 5: Fee Summary */}
              {currentStep === 5 && (
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Fee Summary</h3>
                  <div className="bg-gray-50 rounded-lg p-6 space-y-3">
                    {fees.breakdown.map((item, index) => (
                      <div key={index} className="flex justify-between">
                        <span className="text-gray-700">{item.label}</span>
                        <span className="font-semibold text-gray-900">R{item.amount.toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="border-t border-gray-300 pt-3 flex justify-between">
                      <span className="text-lg font-bold text-gray-900">Total</span>
                      <span className="text-lg font-bold text-[#1e40af]">R{fees.total.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      After submitting your registration, you will receive payment instructions via email.
                    </p>
                  </div>
                </div>
              )}

              {/* Step 6: Success */}
              {currentStep === 6 && (
                <div className="text-center py-8">
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Registration Successful!</h3>
                  <p className="text-gray-600 mb-4">Your entry number is:</p>
                  <div className="bg-[#1e40af] text-white rounded-lg p-4 mb-6">
                    <div className="text-2xl font-bold">{entryNumber}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-left space-y-2 text-sm text-gray-700">
                    <p className="font-semibold">Next Steps:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Your registration is confirmed</li>
                      <li>Check your email for payment instructions</li>
                      <li>You can now submit scores for this competition</li>
                      <li>Visit your dashboard to view all registrations</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Navigation */}
              {currentStep < 6 && (
                <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={handlePrevious}
                    disabled={currentStep === 1}
                    className={`flex items-center px-6 py-2 border rounded-lg transition-colors ${
                      currentStep === 1
                        ? 'border-gray-300 text-gray-400 cursor-not-allowed'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <ChevronLeft className="h-5 w-5 mr-2" />
                    Previous
                  </button>

                  {currentStep < 5 ? (
                    <button
                      type="button"
                      onClick={handleNext}
                      className="flex items-center px-6 py-2 bg-[#1e40af] text-white rounded-lg hover:bg-[#1e3a8a] transition-colors"
                    >
                      Next
                      <ChevronRight className="h-5 w-5 ml-2" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={loading}
                      className="flex items-center px-6 py-2 bg-[#1e40af] text-white rounded-lg hover:bg-[#1e3a8a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          Submit Registration
                          <ChevronRight className="h-5 w-5 ml-2" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}

              {currentStep === 6 && (
                <div className="flex justify-center mt-8">
                  <button
                    onClick={() => {
                      setShowModal(false)
                      router.push('/dashboard')
                    }}
                    className="px-6 py-2 bg-[#1e40af] text-white rounded-lg hover:bg-[#1e3a8a] transition-colors"
                  >
                    Go to Dashboard
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

