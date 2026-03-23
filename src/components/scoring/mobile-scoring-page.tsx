'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Trophy, 
  Target, 
  ChevronLeft, 
  ChevronRight, 
  Calendar,
  Users,
  CheckCircle,
  Clock,
  ArrowLeft
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import MobileScoreEntry from './mobile-score-entry'

interface MobileScoringPageProps {
  // Props from parent page
  registrations: any[]
  scoringStages: Record<string, any[]>
  submittedScores: any[]
  stageScores: Record<string, any>
  setStageScores: (scores: Record<string, any>) => void
  onScoreUpdate: (stageId: string, roundIndex: number, field: 'score' | 'isV', value: number | boolean) => void
  onSighterModeUpdate: (stageId: string, mode: string) => void
  onSubmitScore: (stageId: string) => Promise<void>
  onFlagUpdate?: (stageId: string, field: 'isDNF' | 'isDQ', value: boolean) => void
  saving: boolean
}

type ViewMode = 'competitions' | 'stages' | 'scoring'

export default function MobileScoringPage({
  registrations,
  scoringStages,
  submittedScores,
  stageScores,
  setStageScores,
  onScoreUpdate,
  onSighterModeUpdate,
  onSubmitScore,
  onFlagUpdate,
  saving
}: MobileScoringPageProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('competitions')
  const [selectedRegistration, setSelectedRegistration] = useState<string | null>(null)
  const [selectedStageIndex, setSelectedStageIndex] = useState(0)

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

  const handleStageComplete = async (stageId: string) => {
    try {
      await onSubmitScore(stageId)
      // Move to next stage if available
      if (selectedStageIndex < selectedStages.length - 1) {
        setSelectedStageIndex(selectedStageIndex + 1)
      } else {
        // All stages complete, go back to stages view
        setViewMode('stages')
      }
    } catch (error) {
      // Error handling is done in parent
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

  // Competitions List View
  if (viewMode === 'competitions') {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200 px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900">Select Event</h1>
          <p className="text-sm text-gray-600 mt-1">Choose a competition to enter scores</p>
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
              onClick={() => setViewMode('stages')}
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
          <MobileScoreEntry
            stage={currentStage}
            stageScore={stageScores[currentStage.id] || {
              stageId: currentStage.id,
              rounds: Array.from({ length: (currentStage.rounds || 10) + (currentStage.sighters || 2) }, (_, i) => ({
                round: i + 1,
                score: 0,
                isV: false
              })),
              totalScore: 0,
              vCount: 0,
              isDNF: false,
              isDQ: false,
              notes: '',
              sighterMode: 'count_none'
            }}
            onScoreUpdate={onScoreUpdate}
            onSighterModeUpdate={onSighterModeUpdate}
            onStageComplete={handleStageComplete}
            onFlagUpdate={onFlagUpdate}
            isVerified={stageStatus === 'verified'}
            isPending={stageStatus === 'pending'}
            saving={saving}
          />
        </div>
      </div>
    )
  }

  return null
}