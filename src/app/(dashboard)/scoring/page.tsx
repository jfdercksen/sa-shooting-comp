'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Trophy, Target, Save, CheckCircle, Clock, XCircle, Edit, Users } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import type { Database } from '@/types/database'

type Registration = Database['public']['Tables']['registrations']['Row']
type Stage = Database['public']['Tables']['stages']['Row']
type Score = Database['public']['Tables']['scores']['Row']
type Competition = Database['public']['Tables']['competitions']['Row']
type Discipline = Database['public']['Tables']['disciplines']['Row']

interface RoundScore {
  round: number
  score: number
  isX: boolean
  isV: boolean
}

interface StageScore {
  stageId: string
  rounds: RoundScore[]
  totalScore: number
  xCount: number
  vCount: number
  isDNF: boolean
  isDQ: boolean
  notes: string
}

const STORAGE_PREFIX = 'score_draft_'

export default function ScoringPage() {
  const [registrations, setRegistrations] = useState<any[]>([])
  const [stages, setStages] = useState<Record<string, Stage[]>>({})
  const [submittedScores, setSubmittedScores] = useState<Score[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRegistration, setSelectedRegistration] = useState<string | null>(null)
  const [stageScores, setStageScores] = useState<Record<string, StageScore>>({})
  const [saving, setSaving] = useState(false)
  const [editingScoreId, setEditingScoreId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    // Check for competition filter in URL after registrations are loaded
    if (registrations.length > 0 && !selectedRegistration) {
      const params = new URLSearchParams(window.location.search)
      const competitionId = params.get('competition')
      if (competitionId) {
        const reg = registrations.find((r: any) => r.competition_id === competitionId)
        if (reg) {
          setSelectedRegistration(reg.id)
        }
      }
    }
  }, [registrations])

  useEffect(() => {
    if (selectedRegistration && registrations.length > 0) {
      loadDraft(selectedRegistration)
    }
  }, [selectedRegistration])

  const fetchData = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setLoading(false)
      return
    }

    // Fetch user's registrations - only confirmed registrations
    const { data: regs } = await supabase
      .from('registrations')
      .select(`
        *,
        competitions (
          id,
          name,
          start_date,
          end_date
        ),
        disciplines (
          id,
          name,
          code
        ),
        teams (
          id,
          name,
          province
        )
      `)
      .eq('user_id', user.id)
      .eq('registration_status', 'confirmed')

    if (regs) {
      setRegistrations(regs)

      // Fetch stages for each registration's competition
      const stagesMap: Record<string, Stage[]> = {}

      for (const reg of regs) {
        if (reg.competition_id) {
          const { data: compStages } = await supabase
            .from('stages')
            .select('*')
            .eq('competition_id', reg.competition_id)
            .order('stage_number', { ascending: true })

          if (compStages) {
            stagesMap[reg.competition_id] = compStages
          }
        }
      }
      setStages(stagesMap)
    }

    // Fetch submitted scores for this user
    const { data: scores } = await supabase
      .from('scores')
      .select(`
        *,
        stages (
          id,
          name,
          stage_number
        ),
        registrations (
          id,
          competition_id,
          competitions (
            name
          ),
          disciplines (
            name
          )
        ),
        verified_by_profile:profiles!scores_verified_by_fkey (
          full_names,
          surname
        )
      `)
      .eq('submitted_by', user.id)
      .order('submitted_at', { ascending: false })

    if (scores) {
      setSubmittedScores(scores)
    }

    setLoading(false)
  }

  const loadDraft = (registrationId: string) => {
    // First check for existing submitted scores
    const reg = registrations.find((r: any) => r.id === registrationId)
    if (!reg) return

    // Check if there are any pending scores to load
    const hasPendingScores = submittedScores.some(
      (s: any) => s.registration_id === registrationId && !s.verified_at
    )

    if (hasPendingScores) {
      // Load from existing scores
      initializeScores(registrationId)
    } else {
      // Try to load from localStorage draft
      const draft = localStorage.getItem(`${STORAGE_PREFIX}${registrationId}`)
      if (draft) {
        try {
          const parsed = JSON.parse(draft)
          setStageScores(parsed)
          toast.info('Draft loaded')
        } catch (error) {
          console.error('Error loading draft:', error)
          initializeScores(registrationId)
        }
      } else {
        initializeScores(registrationId)
      }
    }
  }

  const initializeScores = (registrationId: string) => {
    const reg = registrations.find((r: any) => r.id === registrationId)
    if (reg) {
      const compStages = stages[reg.competition_id] || []
      const newScores: Record<string, StageScore> = {}

      compStages.forEach((stage) => {
        // Check if score already exists for this stage
        const existingScore = submittedScores.find(
          (s: any) => s.registration_id === registrationId && s.stage_id === stage.id
        )

        if (existingScore && !existingScore.verified_at) {
          // Load existing pending score for editing
          // Try to parse rounds from notes if available
          let rounds: RoundScore[] = []
          const numRounds = stage.rounds || 10
          
          if (existingScore.notes) {
            try {
              const notesData = JSON.parse(existingScore.notes)
              if (notesData.rounds && Array.isArray(notesData.rounds)) {
                rounds = notesData.rounds
              }
            } catch {
              // If parsing fails, initialize empty rounds
            }
          }

          // If no rounds parsed, initialize empty
          if (rounds.length === 0) {
            for (let i = 1; i <= numRounds; i++) {
              rounds.push({ round: i, score: 0, isX: false, isV: false })
            }
          }

          newScores[stage.id] = {
            stageId: stage.id,
            rounds,
            totalScore: existingScore.score || 0,
            xCount: existingScore.x_count || 0,
            vCount: existingScore.v_count || 0,
            isDNF: existingScore.is_dnf || false,
            isDQ: existingScore.is_dq || false,
            notes: existingScore.notes || '',
          }
          setEditingScoreId(existingScore.id)
        } else {
          // Initialize new score entry
          const rounds: RoundScore[] = []
          const numRounds = stage.rounds || 10
          for (let i = 1; i <= numRounds; i++) {
            rounds.push({ round: i, score: 0, isX: false, isV: false })
          }

          newScores[stage.id] = {
            stageId: stage.id,
            rounds,
            totalScore: 0,
            xCount: 0,
            vCount: 0,
            isDNF: false,
            isDQ: false,
            notes: '',
          }
        }
      })

      setStageScores(newScores)
    }
  }

  const saveDraft = () => {
    if (!selectedRegistration) return

    localStorage.setItem(`${STORAGE_PREFIX}${selectedRegistration}`, JSON.stringify(stageScores))
    toast.success('Draft saved')
  }

  const updateRoundScore = (
    stageId: string,
    roundIndex: number,
    field: 'score' | 'isX' | 'isV',
    value: number | boolean
  ) => {
    const stageScore = stageScores[stageId]
    if (!stageScore) return

    const newRounds = [...stageScore.rounds]
    newRounds[roundIndex] = {
      ...newRounds[roundIndex],
      [field]: value,
    }

    // Recalculate totals
    const totalScore = newRounds.reduce((sum, r) => sum + r.score, 0)
    const xCount = newRounds.filter((r) => r.isX).length
    const vCount = newRounds.filter((r) => r.isV).length

    setStageScores({
      ...stageScores,
      [stageId]: {
        ...stageScore,
        rounds: newRounds,
        totalScore,
        xCount,
        vCount,
      },
    })
  }

  const handleSubmit = async (stageId?: string) => {
    if (!selectedRegistration) return

    setSaving(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const reg = registrations.find((r: any) => r.id === selectedRegistration)
      if (!reg) throw new Error('Registration not found')

      // If stageId is provided, submit only that stage, otherwise submit all stages
      const stagesToSubmit: Array<[string, StageScore]> = stageId 
        ? (stageScores[stageId] ? [[stageId, stageScores[stageId]] as [string, StageScore]] : [])
        : Object.entries(stageScores).filter((entry): entry is [string, StageScore] => !!entry[1])

      // Submit each stage score
      for (const [sid, stageScore] of stagesToSubmit) {
        if (!stageScore || typeof stageScore === 'string') continue

        // Check if score already exists for this stage
        const existingScore = submittedScores.find(
          (s: any) => s.registration_id === selectedRegistration && s.stage_id === sid
        )

        const scoreData = {
          registration_id: selectedRegistration,
          stage_id: sid,
          score: stageScore.isDNF || stageScore.isDQ ? 0 : stageScore.totalScore,
          x_count: stageScore.xCount,
          v_count: stageScore.vCount,
          is_dnf: stageScore.isDNF || false,
          is_dq: stageScore.isDQ || false,
          notes: stageScore.notes || null,
          submitted_by: user.id,
          submitted_at: new Date().toISOString(),
        }

        if (existingScore && !existingScore.verified_at) {
          // Update existing pending score
          const { error } = await supabase
            .from('scores')
            .update(scoreData)
            .eq('id', existingScore.id)

          if (error) {
            console.error('Error updating score for stage:', sid, error)
            throw error
          }
        } else {
          // Insert new score
          const { error } = await supabase.from('scores').insert(scoreData)

          if (error) {
            console.error('Error submitting score for stage:', sid, error)
            if (error.code === '23505') {
              toast.error('Score already submitted for this stage')
              continue
            }
            throw error
          }
        }
      }

      // Clear draft for submitted stages
      if (stageId) {
        // Only clear this stage from draft
        const updatedScores = { ...stageScores }
        delete updatedScores[stageId]
        setStageScores(updatedScores)
        localStorage.setItem(`${STORAGE_PREFIX}${selectedRegistration}`, JSON.stringify(updatedScores))
      } else {
        // Clear all drafts
        localStorage.removeItem(`${STORAGE_PREFIX}${selectedRegistration}`)
        setStageScores({})
      }

      setEditingScoreId(null)
      toast.success(stageId ? 'Score submitted for verification' : 'All scores submitted for verification')
      fetchData()
    } catch (error: any) {
      console.error('Error submitting scores:', error)
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      })
      
      let errorMessage = 'Error submitting scores'
      if (error.message) {
        errorMessage = error.message
      } else if (error.details) {
        errorMessage = error.details
      } else if (error.hint) {
        errorMessage = error.hint
      } else if (error.code) {
        switch (error.code) {
          case '23503': // Foreign key violation
            errorMessage = 'Invalid registration or stage. Please refresh and try again.'
            break
          case '23505': // Unique constraint violation
            errorMessage = 'Score already submitted for this stage.'
            break
          case '42501': // Insufficient privileges
            errorMessage = 'Permission denied. Please ensure your account is verified.'
            break
          default:
            errorMessage = `Error submitting scores: ${error.code}`
        }
      }
      
      toast.error(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const getStatusBadge = (score: Score) => {
    if (score.verified_at) {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 flex items-center">
          <CheckCircle className="h-3 w-3 mr-1" />
          Verified
        </span>
      )
    }
    if (score.submitted_at) {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 flex items-center">
          <Clock className="h-3 w-3 mr-1" />
          Pending
        </span>
      )
    }
    return null
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-[#1e40af] rounded-full animate-spin" />
      </div>
    )
  }

  const selectedReg = selectedRegistration
    ? registrations.find((r: any) => r.id === selectedRegistration)
    : null
  const selectedStages = selectedReg ? stages[selectedReg.competition_id] || [] : []

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Scoring</h1>
        <p className="text-gray-600">Enter and submit your competition scores</p>
      </div>

      {/* My Competitions */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
          <Trophy className="h-5 w-5 mr-2 text-[#1e40af]" />
          My Competitions
        </h2>

        {registrations.length === 0 ? (
          <p className="text-gray-600">You are not registered for any competitions.</p>
        ) : (
          <div className="space-y-4">
            {registrations.map((reg: any) => (
              <div
                key={reg.id}
                className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                  selectedRegistration === reg.id
                    ? 'border-[#1e40af] bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedRegistration(reg.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{reg.competitions?.name}</h3>
                    <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-600">
                      <div className="flex items-center">
                        <Target className="h-4 w-4 mr-1" />
                        {reg.disciplines?.name}
                      </div>
                      {reg.squad_number && (
                        <span>Squad: {reg.squad_number}</span>
                      )}
                      {reg.target_number && (
                        <span>Target: {reg.target_number}</span>
                      )}
                      {reg.competitions?.start_date && (
                        <span>
                          {format(new Date(reg.competitions.start_date), 'MMM d')} -{' '}
                          {format(new Date(reg.competitions.end_date), 'MMM d, yyyy')}
                        </span>
                      )}
                    </div>
                  </div>
                  {selectedRegistration === reg.id && (
                    <span className="text-[#1e40af] font-semibold">Selected</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Score Entry */}
      {selectedReg && selectedStages.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-start">
            <Target className="h-6 w-6 text-yellow-600 mr-3 mt-1" />
            <div>
              <h3 className="text-lg font-semibold text-yellow-900 mb-2">No Stages Available</h3>
              <p className="text-yellow-800 mb-4">
                This competition doesn't have any stages set up yet. Please contact the competition administrator to add stages before you can submit scores.
              </p>
              <p className="text-sm text-yellow-700">
                Competition: <strong>{selectedReg.competitions?.name}</strong>
              </p>
            </div>
          </div>
        </div>
      )}
      
      {selectedReg && selectedStages.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          {/* Competition Header */}
          <div className="mb-6 pb-4 border-b border-gray-200">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                  <Trophy className="h-6 w-6 mr-2 text-[#1e40af]" />
                  {selectedReg.competitions?.name}
                </h2>
                <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-600">
                  <div className="flex items-center">
                    <Target className="h-4 w-4 mr-1" />
                    {selectedReg.disciplines?.name}
                  </div>
                  {selectedReg.competitions?.start_date && (
                    <span>
                      {format(new Date(selectedReg.competitions.start_date), 'MMM d')} -{' '}
                      {format(new Date(selectedReg.competitions.end_date), 'MMM d, yyyy')}
                    </span>
                  )}
                </div>
              </div>
              {selectedReg.team_id && selectedReg.teams && (
                <div className="ml-4">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                    <Users className="h-4 w-4 mr-1.5" />
                    Competing for: {selectedReg.teams.name}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Stages List */}
          <div className="space-y-4">
            {selectedStages.map((stage) => {
              // Check if score already exists for this stage
              const existingScore = submittedScores.find(
                (s: any) => s.registration_id === selectedRegistration && s.stage_id === stage.id
              )
              const isVerified = !!existingScore?.verified_at
              const isPending = existingScore && !existingScore.verified_at

              const stageScore = stageScores[stage.id] || {
                stageId: stage.id,
                rounds: Array.from({ length: stage.rounds || 10 }, (_, i) => ({
                  round: i + 1,
                  score: 0,
                  isX: false,
                  isV: false,
                })),
                totalScore: 0,
                xCount: 0,
                vCount: 0,
                isDNF: false,
                isDQ: false,
                notes: '',
              }

              return (
                <div key={stage.id} className={`border-l-4 rounded-lg p-4 ml-4 ${isVerified ? 'border-green-500 bg-green-50' : isPending ? 'border-yellow-500 bg-yellow-50' : 'border-gray-300 bg-gray-50'}`}>
                  <div className="mb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-gray-400 mr-3"></div>
                        <h3 className="text-lg font-bold text-gray-900">{stage.name}</h3>
                      </div>
                      {isVerified && (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 flex items-center">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Verified
                        </span>
                      )}
                      {isPending && (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          Pending Verification
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600 mt-1">
                      {stage.distance && <span>Distance: {stage.distance}m</span>}
                      {stage.rounds && <span>Rounds: {stage.rounds}</span>}
                      {stage.max_score && <span>Max Score: {stage.max_score}</span>}
                    </div>
                    {existingScore && (
                      <div className="mt-2 text-sm">
                        <span className="text-gray-600">Current Score: </span>
                        <span className="font-semibold text-gray-900">
                          {existingScore.is_dnf ? 'DNF' : existingScore.is_dq ? 'DQ' : existingScore.score}
                        </span>
                        {existingScore.x_count !== null && existingScore.v_count !== null && (
                          <span className="text-gray-600 ml-2">
                            (X: {existingScore.x_count}, V: {existingScore.v_count})
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {isVerified ? (
                    <div className="bg-white rounded-lg p-4 border border-green-200">
                      <p className="text-sm text-green-800">
                        This score has been verified and cannot be edited. If you need to make changes, please contact an administrator.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* DNF/DQ Options */}
                      <div className="mb-4 flex gap-4">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={stageScore.isDNF}
                            onChange={(e) => {
                              setStageScores({
                                ...stageScores,
                                [stage.id]: { ...stageScore, isDNF: e.target.checked, isDQ: false },
                              })
                            }}
                            className="mr-2"
                            disabled={isVerified}
                          />
                          <span className="text-sm text-gray-700">DNF (Did Not Finish)</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={stageScore.isDQ ?? false}
                            onChange={(e) => {
                              setStageScores({
                                ...stageScores,
                                [stage.id]: { ...stageScore, isDQ: e.target.checked, isDNF: false },
                              })
                            }}
                            className="mr-2"
                            disabled={isVerified}
                          />
                          <span className="text-sm text-gray-700">DQ (Disqualified)</span>
                        </label>
                      </div>

                      {!stageScore.isDNF && !stageScore.isDQ && (
                    <>
                      {/* Score Grid */}
                      <div className="overflow-x-auto mb-4">
                        <table className="min-w-full border-collapse">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold text-gray-700">
                                Round
                              </th>
                              <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold text-gray-700">
                                Score
                              </th>
                              <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold text-gray-700">
                                X
                              </th>
                              <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold text-gray-700">
                                V
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {stageScore.rounds.map((round, index) => (
                              <tr key={round.round}>
                                <td className="border border-gray-300 px-3 py-2 text-sm font-medium text-gray-900">
                                  {round.round}
                                </td>
                                <td className="border border-gray-300 px-3 py-2">
                                  <select
                                    value={round.score}
                                    onChange={(e) =>
                                      updateRoundScore(stage.id, index, 'score', parseInt(e.target.value))
                                    }
                                    disabled={isVerified}
                                    className={`w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-[#1e40af] focus:border-transparent ${isVerified ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                  >
                                    {[0, 1, 2, 3, 4, 5].map((val) => (
                                      <option key={val} value={val}>
                                        {val}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td className="border border-gray-300 px-3 py-2 text-center">
                                  <input
                                    type="checkbox"
                                    checked={round.isX}
                                    onChange={(e) =>
                                      updateRoundScore(stage.id, index, 'isX', e.target.checked)
                                    }
                                    disabled={isVerified}
                                    className="h-4 w-4 text-[#1e40af] focus:ring-[#1e40af] disabled:opacity-50 disabled:cursor-not-allowed"
                                  />
                                </td>
                                <td className="border border-gray-300 px-3 py-2 text-center">
                                  <input
                                    type="checkbox"
                                    checked={round.isV}
                                    onChange={(e) =>
                                      updateRoundScore(stage.id, index, 'isV', e.target.checked)
                                    }
                                    disabled={isVerified}
                                    className="h-4 w-4 text-[#1e40af] focus:ring-[#1e40af] disabled:opacity-50 disabled:cursor-not-allowed"
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Running Total */}
                      <div className="bg-gray-50 rounded-lg p-4 mb-4">
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <div className="text-sm text-gray-600">Total Score</div>
                            <div className="text-2xl font-bold text-gray-900">{stageScore.totalScore}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">X Count</div>
                            <div className="text-2xl font-bold text-gray-900">{stageScore.xCount}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">V Count</div>
                            <div className="text-2xl font-bold text-gray-900">{stageScore.vCount}</div>
                          </div>
                        </div>
                      </div>

                      {/* Notes */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                        <textarea
                          value={stageScore.notes}
                          onChange={(e) => {
                            setStageScores({
                              ...stageScores,
                              [stage.id]: { ...stageScore, notes: e.target.value },
                            })
                          }}
                          rows={2}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                          placeholder="Any additional notes..."
                        />
                      </div>

                        {/* Individual Stage Submit Button */}
                        <div className="flex justify-end">
                          <button
                            onClick={() => handleSubmit(stage.id)}
                            disabled={saving || isVerified}
                            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {saving ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="h-4 w-4 mr-2" />
                                {isPending ? 'Update Score' : 'Save Score'}
                              </>
                            )}
                          </button>
                        </div>
                      </>
                    )}
                  </>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Previously Submitted */}
      {submittedScores.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Previously Submitted Scores</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Competition
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Discipline
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    X / V
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Verified By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitted
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {submittedScores.map((score: any) => {
                  const verifier = score.verified_by_profile
                  const verifierName = verifier
                    ? `${verifier.full_names} ${verifier.surname}`
                    : null
                  const isPending = !score.verified_at
                  const canEdit = isPending && score.registrations?.id === selectedRegistration

                  return (
                    <tr key={score.id} className={isPending ? 'bg-yellow-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {score.registrations?.competitions?.name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {score.registrations?.disciplines?.name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {score.stages?.name || `Stage ${score.stages?.stage_number || ''}`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {score.is_dnf ? (
                          <span className="text-red-600">DNF</span>
                        ) : score.is_dq ? (
                          <span className="text-red-600">DQ</span>
                        ) : (
                          score.score
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {score.x_count || 0} / {score.v_count || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(score)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {verifierName || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {score.submitted_at
                          ? format(new Date(score.submitted_at), 'MMM d, yyyy HH:mm')
                          : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {canEdit && (
                          <button
                            onClick={() => {
                              // Select the registration and load the score for editing
                              setSelectedRegistration(score.registrations.id)
                              setEditingScoreId(score.id)
                              // Initialize scores will load the existing score
                              setTimeout(() => {
                                initializeScores(score.registrations.id)
                              }, 100)
                            }}
                            className="text-[#1e40af] hover:text-[#1e3a8a] inline-flex items-center"
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
