'use client'

import { useState, useEffect } from 'react'
import {
  Trophy,
  Target,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Users,
  CheckCircle,
  Clock,
  ArrowLeft,
  Crosshair,
  List
} from 'lucide-react'
import { format } from 'date-fns'
import ShooterScoreEntry from './shooter-score-entry'

interface MobileScoringPageProps {
  registrations: any[]
  scoringStages: Record<string, any[]>
  submittedScores: any[]
  onSubmitSimpleScore: (stageId: string, matchId: string, score: number, vCount: number) => Promise<void>
  saving: boolean
}

type ViewMode = 'today' | 'competitions' | 'stages' | 'scoring'

interface TodayItem {
  stage: any
  registration: any
  stageIndexInReg: number
  existingScore: any | null
  status: 'not-started' | 'pending' | 'verified'
}

export default function MobileScoringPage({
  registrations,
  scoringStages,
  submittedScores,
  onSubmitSimpleScore,
  saving
}: MobileScoringPageProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('today')
  const [selectedRegistration, setSelectedRegistration] = useState<string | null>(null)
  const [selectedStageIndex, setSelectedStageIndex] = useState(0)
  const [scoringBackView, setScoringBackView] = useState<'today' | 'stages'>('today')

  // Get selected registration data
  const selectedReg = selectedRegistration
    ? registrations.find(r => r.id === selectedRegistration)
    : null

  // Get stages for selected registration
  const selectedStages = selectedReg
    ? (scoringStages[selectedReg.competition_id] || []).filter(
        s => s.discipline_id === selectedReg.discipline_id
      )
    : []

  const currentStage = selectedStages[selectedStageIndex]

  // Flat list of all open stages across all registrations
  const todayItems: TodayItem[] = registrations.flatMap(reg => {
    const stages = (scoringStages[reg.competition_id] || []).filter(
      s => s.discipline_id === reg.discipline_id
    )
    return stages.map((stage, idx) => {
      const existingScore = submittedScores.find(
        s => s.registration_id === reg.id &&
             s.stage_id === stage.id &&
             s.match_id === stage.matchId
      ) || null
      let status: TodayItem['status'] = 'not-started'
      if (existingScore?.verified_at) status = 'verified'
      else if (existingScore) status = 'pending'
      return { stage, registration: reg, stageIndexInReg: idx, existingScore, status }
    })
  })

  // Check URL params for competition filter
  useEffect(() => {
    if (registrations.length > 0 && !selectedRegistration) {
      const params = new URLSearchParams(window.location.search)
      const competitionId = params.get('competition')
      if (competitionId) {
        const reg = registrations.find(r => r.competition_id === competitionId)
        if (reg) {
          setSelectedRegistration(reg.id)
          setViewMode('stages')
        }
      }
    }
  }, [registrations])

  const getRegistrationStatus = (registration: any) => {
    const regScores = submittedScores.filter(s => s.registration_id === registration.id)
    const regStages = (scoringStages[registration.competition_id] || []).filter(
      s => s.discipline_id === registration.discipline_id
    )

    const completedStages = regScores.filter(s => s.verified_at).length
    const pendingStages = regScores.filter(s => !s.verified_at).length
    const totalStages = regStages.length

    return {
      completed: completedStages,
      pending: pendingStages,
      total: totalStages,
      hasActivity: completedStages > 0 || pendingStages > 0
    }
  }

  const getStageStatus = (stage: any) => {
    const existingScore = submittedScores.find(
      s => s.registration_id === selectedRegistration &&
           s.stage_id === stage.id &&
           s.match_id === stage.matchId
    )

    if (existingScore?.verified_at) return 'verified'
    if (existingScore && !existingScore.verified_at) return 'pending'
    return 'not-started'
  }

  const handleSimpleSubmit = async (score: number, vCount: number) => {
    await onSubmitSimpleScore(currentStage.id, currentStage.matchId, score, vCount)
    // Move to next stage if available, otherwise back to where we came from
    if (selectedStageIndex < selectedStages.length - 1) {
      setSelectedStageIndex(selectedStageIndex + 1)
    } else {
      setViewMode(scoringBackView)
    }
  }

  const nextStage = () => {
    if (selectedStageIndex < selectedStages.length - 1) {
      setSelectedStageIndex(selectedStageIndex + 1)
    }
  }

  const prevStage = () => {
    if (selectedStageIndex > 0) {
      setSelectedStageIndex(selectedStageIndex - 1)
    }
  }

  // Shared tab bar used in today and competitions views
  const TabBar = ({ active }: { active: 'today' | 'competitions' }) => (
    <div className="flex border-b border-gray-200">
      <button
        onClick={() => setViewMode('today')}
        className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
          active === 'today'
            ? 'text-[#1e40af] border-b-2 border-[#1e40af]'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        <Crosshair className="h-4 w-4" />
        Today
      </button>
      <button
        onClick={() => setViewMode('competitions')}
        className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
          active === 'competitions'
            ? 'text-[#1e40af] border-b-2 border-[#1e40af]'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        <List className="h-4 w-4" />
        All Events
      </button>
    </div>
  )

  // Today View
  if (viewMode === 'today') {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-4 pt-4 pb-0">
            <h1 className="text-xl font-bold text-gray-900">Score Entry</h1>
            <p className="text-sm text-gray-600 mt-0.5">Open distances ready to score</p>
          </div>
          <TabBar active="today" />
        </div>

        <div className="p-4 space-y-3">
          {todayItems.length === 0 ? (
            <div className="bg-white rounded-lg p-8 text-center shadow-sm border border-gray-200">
              <Crosshair className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Nothing Open Right Now</h3>
              <p className="text-gray-600 text-sm">
                No distances are open for scoring yet. Check back when the range officer opens scoring.
              </p>
            </div>
          ) : (
            todayItems.map((item) => (
              <button
                key={`${item.registration.id}-${item.stage.id}`}
                onClick={() => {
                  setSelectedRegistration(item.registration.id)
                  setSelectedStageIndex(item.stageIndexInReg)
                  setScoringBackView('today')
                  setViewMode('scoring')
                }}
                className="w-full bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                {/* Competition + discipline */}
                <div className="flex items-start justify-between mb-1">
                  <div className="flex-1 min-w-0 mr-2">
                    <p className="text-xs text-gray-500 truncate">
                      {item.registration.competitions?.name} · {item.registration.disciplines?.name}
                    </p>
                  </div>
                  {item.status === 'verified' && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium flex items-center gap-1 flex-shrink-0">
                      <CheckCircle className="h-3 w-3" />
                      Verified
                    </span>
                  )}
                  {item.status === 'pending' && (
                    <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium flex items-center gap-1 flex-shrink-0">
                      <Clock className="h-3 w-3" />
                      Pending
                    </span>
                  )}
                </div>

                {/* Match + distance */}
                <div className="text-[#1e40af] font-semibold text-base leading-tight">
                  {item.stage.matchName}
                  {item.stage.matchDistance && (
                    <span className="font-normal text-gray-700"> · {item.stage.matchDistance}</span>
                  )}
                </div>

                {/* Stage info + score */}
                <div className="flex items-end justify-between mt-1">
                  <div className="text-xs text-gray-500">
                    {item.stage.sighters != null && `${item.stage.sighters} sighters + `}
                    {item.stage.rounds || 10} shots
                    {item.stage.max_score && ` · Max ${(item.stage.rounds || 10) * item.stage.max_score}`}
                  </div>
                  {item.existingScore && !item.existingScore.is_dnf && !item.existingScore.is_dq && (
                    <div className="text-right">
                      <span className="text-lg font-bold text-gray-900">{item.existingScore.score}</span>
                      {item.existingScore.v_count != null && item.existingScore.v_count > 0 && (
                        <span className="text-xs text-gray-500 ml-1">V:{item.existingScore.v_count}</span>
                      )}
                    </div>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    )
  }

  // Competitions List View
  if (viewMode === 'competitions') {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-4 pt-4 pb-0">
            <h1 className="text-xl font-bold text-gray-900">Score Entry</h1>
            <p className="text-sm text-gray-600 mt-0.5">Choose a competition to enter scores</p>
          </div>
          <TabBar active="competitions" />
        </div>

        {/* Competitions List */}
        <div className="p-4 space-y-3">
          {registrations.length === 0 ? (
            <div className="bg-white rounded-lg p-8 text-center shadow-sm border border-gray-200">
              <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">No Events</h3>
              <p className="text-gray-600 text-sm">You are not registered for any competitions.</p>
            </div>
          ) : (
            registrations.map((registration) => {
              const status = getRegistrationStatus(registration)

              return (
                <button
                  key={registration.id}
                  onClick={() => {
                    setSelectedRegistration(registration.id)
                    setViewMode('stages')
                    setSelectedStageIndex(0)
                  }}
                  className="w-full bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors"
                >
                  {/* Competition Name */}
                  <h3 className="font-semibold text-gray-900 mb-2">
                    {registration.competitions?.name}
                  </h3>

                  {/* Competition Details */}
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center text-sm text-gray-600">
                      <Target className="h-4 w-4 mr-2" />
                      {registration.disciplines?.name}
                    </div>

                    {registration.competitions?.start_date && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="h-4 w-4 mr-2" />
                        {format(new Date(registration.competitions.start_date), 'MMM d')} -{' '}
                        {format(new Date(registration.competitions.end_date), 'MMM d, yyyy')}
                      </div>
                    )}

                    {registration.team_id && registration.teams && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Users className="h-4 w-4 mr-2" />
                        {registration.teams.name}
                      </div>
                    )}
                  </div>

                  {/* Status */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-xs">
                      {status.completed > 0 && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full font-medium">
                          {status.completed} verified
                        </span>
                      )}
                      {status.pending > 0 && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full font-medium">
                          {status.pending} pending
                        </span>
                      )}
                      {!status.hasActivity && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full font-medium">
                          Not started
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-gray-500">
                      {status.total} stages
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>
    )
  }

  // Stages List View
  if (viewMode === 'stages' && selectedReg) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200 px-4 py-4">
          <div className="flex items-center">
            <button
              onClick={() => {
                setViewMode('competitions')
                setSelectedRegistration(null)
              }}
              className="mr-3 p-1 rounded-lg hover:bg-gray-100 active:bg-gray-200"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-lg font-bold text-gray-900 truncate">
                {selectedReg.competitions?.name}
              </h1>
              <p className="text-sm text-gray-600">
                {selectedReg.disciplines?.name}
              </p>
            </div>
          </div>
        </div>

        {/* Stages List */}
        <div className="p-4 space-y-3">
          {selectedStages.length === 0 ? (
            <div className="bg-white rounded-lg p-8 text-center shadow-sm border border-gray-200">
              <Target className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">No Distances Available</h3>
              <p className="text-gray-600 text-sm">
                This competition doesn't have any stages set up yet.
              </p>
            </div>
          ) : (
            selectedStages.map((stage, index) => {
              const stageStatus = getStageStatus(stage)
              const existingScore = submittedScores.find(
                s => s.registration_id === selectedRegistration &&
                     s.stage_id === stage.id &&
                     s.match_id === stage.matchId
              )

              return (
                <button
                  key={stage.id}
                  onClick={() => {
                    setSelectedStageIndex(index)
                    setScoringBackView('stages')
                    setViewMode('scoring')
                  }}
                  className="w-full bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">{stage.name}</h3>
                    <div className="flex items-center">
                      {stageStatus === 'verified' && (
                        <div className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium flex items-center">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Verified
                        </div>
                      )}
                      {stageStatus === 'pending' && (
                        <div className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          Pending
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Stage Details */}
                  <div className="text-sm text-gray-600 space-y-1">
                    {stage.matchName && (
                      <div className="text-[#1e40af] font-medium">
                        {stage.matchName}
                        {stage.matchDistance && ` • ${stage.matchDistance}`}
                      </div>
                    )}

                    <div className="flex items-center space-x-4">
                      {stage.rounds && <span>Rounds: {stage.rounds}</span>}
                      {stage.max_score && <span>Max: {stage.max_score}</span>}
                    </div>
                  </div>

                  {/* Current Score */}
                  {existingScore && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Current Score:</span>
                        <div className="text-right">
                          <span className="font-semibold text-gray-900">
                            {existingScore.is_dnf ? 'DNF' :
                             existingScore.is_dq ? 'DQ' :
                             existingScore.score}
                          </span>
                          {existingScore.v_count !== null && (
                            <span className="text-xs text-gray-600 ml-2">
                              (V: {existingScore.v_count})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </button>
              )
            })
          )}
        </div>
      </div>
    )
  }

  // Scoring View
  if (viewMode === 'scoring' && currentStage) {
    const stageStatus = getStageStatus(currentStage)
    const existingScore = submittedScores.find(
      s => s.registration_id === selectedRegistration &&
           s.stage_id === currentStage.id &&
           s.match_id === currentStage.matchId
    )

    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        {/* Header with Navigation */}
        <div className="bg-white shadow-sm border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => setViewMode(scoringBackView)}
              className="p-1 rounded-lg hover:bg-gray-100 active:bg-gray-200"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <div className="text-center">
              <div className="text-sm font-medium text-gray-900">
                Stage {selectedStageIndex + 1} of {selectedStages.length}
              </div>
            </div>

            <div className="flex space-x-1">
              <button
                onClick={prevStage}
                disabled={selectedStageIndex === 0}
                className="p-1 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={nextStage}
                disabled={selectedStageIndex === selectedStages.length - 1}
                className="p-1 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Score Entry Component */}
        <div className="p-4">
          <ShooterScoreEntry
            stage={currentStage}
            existingScore={existingScore || null}
            isVerified={stageStatus === 'verified'}
            saving={saving}
            onSubmit={handleSimpleSubmit}
          />
        </div>
      </div>
    )
  }

  return null
}
