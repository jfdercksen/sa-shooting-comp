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

type SighterMode = 'count_sighter_1' | 'count_sighter_2' | 'count_none'

interface StageScore {
  stageId: string
  rounds: RoundScore[]
  totalScore: number
  xCount: number
  vCount: number
  isDNF: boolean
  isDQ: boolean
  notes: string
  sighterMode: SighterMode
}

const STORAGE_PREFIX = 'score_draft_'

const DEFAULT_SIGHTER_MODE: SighterMode = 'count_none'

const getTotalShots = (stage: Stage) => {
  const scoringRounds = stage.rounds || 10
  const sighters = stage.sighters || 0
  return scoringRounds + sighters
}

const getScoringWindow = (totalShots: number, scoringRounds: number, sighterMode: SighterMode) => {
  const preferredStart =
    sighterMode === 'count_sighter_1' ? 1 : sighterMode === 'count_sighter_2' ? 2 : 3

  const maxStart = Math.max(1, totalShots - scoringRounds + 1)
  const start = Math.min(preferredStart, maxStart)
  const end = Math.min(totalShots, start + scoringRounds - 1)

  return { start, end }
}

const calculateTotals = (rounds: RoundScore[], scoringWindow: { start: number; end: number }) => {
  const scoringRounds = rounds.filter(
    (round) => round.round >= scoringWindow.start && round.round <= scoringWindow.end
  )
  const baseScore = scoringRounds.reduce((sum, round) => sum + round.score, 0)
  const xCount = scoringRounds.filter((round) => round.isX).length
  const vCount = scoringRounds.filter((round) => round.isV).length
  const vBonus = vCount * 0.001

  return {
    totalScore: Number((baseScore + vBonus).toFixed(3)),
    xCount,
    vCount,
  }
}

const normalizeRoundsForScoringWindow = (
  rounds: RoundScore[],
  scoringWindow: { start: number; end: number }
) => {
  return rounds.map((round) => {
    const isScoringShot = round.round >= scoringWindow.start && round.round <= scoringWindow.end
    if (isScoringShot) return round
    return {
      ...round,
      score: 0,
      isX: false,
      isV: false,
    }
  })
}

const buildScoreNotes = (stageScore: StageScore) => {
  return JSON.stringify({
    version: 2,
    sighterMode: stageScore.sighterMode,
    rounds: stageScore.rounds,
    userNotes: stageScore.notes || '',
  })
}

const parseScoreNotes = (rawNotes: string | null) => {
  if (!rawNotes) {
    return {
      rounds: null as RoundScore[] | null,
      sighterMode: DEFAULT_SIGHTER_MODE,
      userNotes: '',
    }
  }

  try {
    const parsed = JSON.parse(rawNotes)
    const parsedRounds = Array.isArray(parsed?.rounds) ? (parsed.rounds as RoundScore[]) : null
    const parsedMode = parsed?.sighterMode as SighterMode | undefined

    return {
      rounds: parsedRounds,
      sighterMode:
        parsedMode === 'count_sighter_1' ||
        parsedMode === 'count_sighter_2' ||
        parsedMode === 'count_none'
          ? parsedMode
          : DEFAULT_SIGHTER_MODE,
      userNotes: typeof parsed?.userNotes === 'string' ? parsed.userNotes : '',
    }
  } catch {
    // Legacy/plain notes format: keep the original note text.
    return {
      rounds: null as RoundScore[] | null,
      sighterMode: DEFAULT_SIGHTER_MODE,
      userNotes: rawNotes,
    }
  }
}

const normalizeStageScoreForStage = (stage: Stage, incoming?: Partial<StageScore>): StageScore => {
  const scoringRounds = stage.rounds || 10
  const totalShots = getTotalShots(stage)
  const sighterMode: SighterMode =
    incoming?.sighterMode === 'count_sighter_1' ||
    incoming?.sighterMode === 'count_sighter_2' ||
    incoming?.sighterMode === 'count_none'
      ? incoming.sighterMode
      : DEFAULT_SIGHTER_MODE

  const sourceRounds = Array.isArray(incoming?.rounds) ? incoming.rounds : []
  const rounds: RoundScore[] = Array.from({ length: totalShots }, (_, index) => {
    const existing = sourceRounds[index]
    return {
      round: index + 1,
      score: typeof existing?.score === 'number' ? existing.score : 0,
      isX: !!existing?.isX,
      isV: !!existing?.isV,
    }
  })

  const scoringWindow = getScoringWindow(rounds.length, scoringRounds, sighterMode)
  const normalizedRounds = normalizeRoundsForScoringWindow(rounds, scoringWindow)
  const totals = calculateTotals(normalizedRounds, scoringWindow)

  return {
    stageId: stage.id,
    rounds: normalizedRounds,
    totalScore: totals.totalScore,
    xCount: totals.xCount,
    vCount: totals.vCount,
    isDNF: !!incoming?.isDNF,
    isDQ: !!incoming?.isDQ,
    notes: typeof incoming?.notes === 'string' ? incoming.notes : '',
    sighterMode,
  }
}

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

      // Fetch stages for each registration's competition in parallel
      const stagesMap: Record<string, Stage[]> = {}
      
      // Get unique competition IDs
      const uniqueCompetitionIds = [...new Set(
        regs
          .map(reg => reg.competition_id)
          .filter((id): id is string => id !== null)
      )]

      // Fetch all stages in parallel
      const stagePromises = uniqueCompetitionIds.map(competitionId =>
        supabase
          .from('stages')
          .select('*')
          .eq('competition_id', competitionId)
          .order('stage_number', { ascending: true })
          .then(result => ({ competitionId, stages: result.data || [] }))
      )

      const stageResults = await Promise.all(stagePromises)
      
      // Build stages map
      stageResults.forEach(({ competitionId, stages }) => {
        if (stages.length > 0) {
          stagesMap[competitionId] = stages
        }
      })
      
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
          const parsed = JSON.parse(draft) as Record<string, Partial<StageScore>>
          const compStages = stages[reg.competition_id] || []
          const normalizedScores: Record<string, StageScore> = {}
          compStages.forEach((stage) => {
            normalizedScores[stage.id] = normalizeStageScoreForStage(stage, parsed?.[stage.id])
          })
          setStageScores(normalizedScores)
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
        const scoringRounds = stage.rounds || 10
        const totalShots = getTotalShots(stage)

        if (existingScore && !existingScore.verified_at) {
          // Load existing pending score for editing
          // Try to parse rounds from notes if available
          let rounds: RoundScore[] = []
          const parsedNotes = parseScoreNotes(existingScore.notes)
          let sighterMode: SighterMode = parsedNotes.sighterMode
          
          if (parsedNotes.rounds) {
            rounds = parsedNotes.rounds
          }

          // If no rounds parsed, initialize empty
          if (rounds.length === 0) {
            for (let i = 1; i <= totalShots; i++) {
              rounds.push({ round: i, score: 0, isX: false, isV: false })
            }
          }

          const scoringWindow = getScoringWindow(rounds.length, scoringRounds, sighterMode)
          const normalizedRounds = normalizeRoundsForScoringWindow(rounds, scoringWindow)
          const totals = calculateTotals(normalizedRounds, scoringWindow)

          newScores[stage.id] = {
            stageId: stage.id,
            rounds: normalizedRounds,
            totalScore: totals.totalScore,
            xCount: totals.xCount,
            vCount: totals.vCount,
            isDNF: existingScore.is_dnf || false,
            isDQ: existingScore.is_dq || false,
            notes: parsedNotes.userNotes,
            sighterMode,
          }
          setEditingScoreId(existingScore.id)
        } else {
          // Initialize new score entry
          const rounds: RoundScore[] = []
          for (let i = 1; i <= totalShots; i++) {
            rounds.push({ round: i, score: 0, isX: false, isV: false })
          }
          const scoringWindow = getScoringWindow(totalShots, scoringRounds, DEFAULT_SIGHTER_MODE)
          const totals = calculateTotals(rounds, scoringWindow)

          newScores[stage.id] = {
            stageId: stage.id,
            rounds,
            totalScore: totals.totalScore,
            xCount: totals.xCount,
            vCount: totals.vCount,
            isDNF: false,
            isDQ: false,
            notes: '',
            sighterMode: DEFAULT_SIGHTER_MODE,
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
    const currentStage = selectedStages.find((stage) => stage.id === stageId)
    const scoringRounds = currentStage?.rounds || 10

    const newRounds = [...stageScore.rounds]
    newRounds[roundIndex] = {
      ...newRounds[roundIndex],
      [field]: value,
    }

    // Recalculate totals from the selected 10-shot scoring window.
    const scoringWindow = getScoringWindow(newRounds.length, scoringRounds, stageScore.sighterMode)
    const totals = calculateTotals(newRounds, scoringWindow)

    setStageScores({
      ...stageScores,
      [stageId]: {
        ...stageScore,
        rounds: newRounds,
        totalScore: totals.totalScore,
        xCount: totals.xCount,
        vCount: totals.vCount,
      },
    })
  }

  const updateSighterMode = (stageId: string, sighterMode: SighterMode) => {
    const currentStage = selectedStages.find((stage) => stage.id === stageId)
    if (!currentStage) return
    const scoringRounds = currentStage.rounds || 10
    const totalShots = getTotalShots(currentStage)
    const current = stageScores[stageId]

    const baseRounds: RoundScore[] = Array.from({ length: totalShots }, (_, index) => {
      const existing = current?.rounds[index]
      return {
        round: index + 1,
        score: typeof existing?.score === 'number' ? existing.score : 0,
        isX: !!existing?.isX,
        isV: !!existing?.isV,
      }
    })

    const scoringWindow = getScoringWindow(baseRounds.length, scoringRounds, sighterMode)
    const normalizedRounds = normalizeRoundsForScoringWindow(baseRounds, scoringWindow)
    const totals = calculateTotals(normalizedRounds, scoringWindow)

    setStageScores({
      ...stageScores,
      [stageId]: {
        stageId,
        rounds: normalizedRounds,
        sighterMode,
        totalScore: totals.totalScore,
        xCount: totals.xCount,
        vCount: totals.vCount,
        isDNF: current?.isDNF || false,
        isDQ: current?.isDQ || false,
        notes: current?.notes || '',
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
        const currentStage = selectedStages.find((stage) => stage.id === sid)
        const scoringRounds = currentStage?.rounds || 10
        const scoringWindow = getScoringWindow(
          stageScore.rounds.length,
          scoringRounds,
          stageScore.sighterMode
        )
        const totals = calculateTotals(stageScore.rounds, scoringWindow)

        // Check if score already exists for this stage
        const existingScore = submittedScores.find(
          (s: any) => s.registration_id === selectedRegistration && s.stage_id === sid
        )

        const scoreData = {
          registration_id: selectedRegistration,
          stage_id: sid,
          score: stageScore.isDNF || stageScore.isDQ ? 0 : totals.totalScore,
          x_count: totals.xCount,
          v_count: totals.vCount,
          is_dnf: stageScore.isDNF || false,
          is_dq: stageScore.isDQ || false,
          notes: buildScoreNotes(stageScore),
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
                rounds: Array.from({ length: getTotalShots(stage) }, (_, i) => ({
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
                sighterMode: DEFAULT_SIGHTER_MODE,
              }
              const scoringRounds = stage.rounds || 10
              const scoringWindow = getScoringWindow(
                stageScore.rounds.length,
                scoringRounds,
                stageScore.sighterMode
              )

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
                      {/* Sighter Count Mode */}
                      <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
                        <div className="text-sm font-semibold text-blue-900 mb-2">
                          Sighter Count Option (10 scoring shots total)
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-blue-800">
                          <label className="inline-flex items-center">
                            <input
                              type="radio"
                              name={`sighter-mode-${stage.id}`}
                              checked={stageScore.sighterMode === 'count_sighter_1'}
                              onChange={() => updateSighterMode(stage.id, 'count_sighter_1')}
                              className="mr-2"
                            />
                            Count Sighter 1 (shots 1-10)
                          </label>
                          <label className="inline-flex items-center">
                            <input
                              type="radio"
                              name={`sighter-mode-${stage.id}`}
                              checked={stageScore.sighterMode === 'count_sighter_2'}
                              onChange={() => updateSighterMode(stage.id, 'count_sighter_2')}
                              className="mr-2"
                            />
                            Count Sighter 2 (shots 2-11)
                          </label>
                          <label className="inline-flex items-center">
                            <input
                              type="radio"
                              name={`sighter-mode-${stage.id}`}
                              checked={stageScore.sighterMode === 'count_none'}
                              onChange={() => updateSighterMode(stage.id, 'count_none')}
                              className="mr-2"
                            />
                            Count No Sighters (shots 3-12)
                          </label>
                        </div>
                        <div className="mt-2 text-xs text-blue-700">
                          Shots 1 and 2 are always marked as sighters on the card.
                        </div>
                      </div>

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
                              <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold text-gray-700">
                                Shot Type
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
                                  {round.round >= scoringWindow.start && round.round <= scoringWindow.end ? (
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
                                  ) : (
                                    <div className="w-full px-2 py-1 bg-gray-100 text-gray-500 rounded border border-gray-200 text-center">
                                      -
                                    </div>
                                  )}
                                </td>
                                <td className="border border-gray-300 px-3 py-2 text-xs">
                                  {round.round <= 2 ? (
                                    round.round >= scoringWindow.start && round.round <= scoringWindow.end ? (
                                      <span className="inline-flex rounded-full bg-purple-100 px-2 py-1 font-semibold text-purple-800">
                                        Sighter + Scoring
                                      </span>
                                    ) : (
                                      <span className="inline-flex rounded-full bg-yellow-100 px-2 py-1 font-semibold text-yellow-800">
                                        Sighter
                                      </span>
                                    )
                                  ) : round.round >= scoringWindow.start && round.round <= scoringWindow.end ? (
                                    <span className="inline-flex rounded-full bg-green-100 px-2 py-1 font-semibold text-green-800">
                                      Scoring
                                    </span>
                                  ) : (
                                    <span className="inline-flex rounded-full bg-gray-100 px-2 py-1 font-semibold text-gray-700">
                                      Excluded
                                    </span>
                                  )}
                                </td>
                                <td className="border border-gray-300 px-3 py-2 text-center">
                                  <input
                                    type="checkbox"
                                    checked={round.isX}
                                    onChange={(e) =>
                                      updateRoundScore(stage.id, index, 'isX', e.target.checked)
                                    }
                                    disabled={
                                      isVerified ||
                                      !(round.round >= scoringWindow.start && round.round <= scoringWindow.end)
                                    }
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
                                    disabled={
                                      isVerified ||
                                      !(round.round >= scoringWindow.start && round.round <= scoringWindow.end)
                                    }
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
                        <div className="text-xs text-gray-600 mb-2">
                          Counting shots {scoringWindow.start}-{scoringWindow.end} for scoring totals
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <div className="text-sm text-gray-600">Total Score (incl. V bonus)</div>
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
