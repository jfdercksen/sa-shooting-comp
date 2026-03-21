'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Target, Trophy, Save, CheckCircle, Plus, Minus } from 'lucide-react'
import { format } from 'date-fns'

interface MobileScoreEntryProps {
  stage: any
  stageScore: any
  onScoreUpdate: (stageId: string, roundIndex: number, field: 'score' | 'isV', value: number | boolean) => void
  onSighterModeUpdate: (stageId: string, mode: string) => void
  onStageComplete: (stageId: string) => void
  onFlagUpdate?: (stageId: string, field: 'isDNF' | 'isDQ', value: boolean) => void
  isVerified: boolean
  isPending: boolean
  saving: boolean
}

export default function MobileScoreEntry({
  stage,
  stageScore,
  onScoreUpdate,
  onSighterModeUpdate,
  onStageComplete,
  onFlagUpdate,
  isVerified,
  isPending,
  saving
}: MobileScoreEntryProps) {
  const [currentRound, setCurrentRound] = useState(0)
  const [showSighterOptions, setShowSighterOptions] = useState(false)

  const scoringRounds = stage.rounds || 10
  const totalShots = (stage.rounds || 10) + (stage.sighters || 2)
  const maxScore = stage.max_score || 5

  // Calculate scoring window
  const getScoringWindow = () => {
    const preferredStart = 
      stageScore.sighterMode === 'count_sighter_1' ? 1 : 
      stageScore.sighterMode === 'count_sighter_2' ? 2 : 3
    const maxStart = Math.max(1, totalShots - scoringRounds + 1)
    const start = Math.min(preferredStart, maxStart)
    const end = Math.min(totalShots, start + scoringRounds - 1)
    return { start, end }
  }

  const scoringWindow = getScoringWindow()
  const currentRoundData = stageScore.rounds[currentRound]
  const isCurrentRoundScoring = currentRoundData && 
    currentRoundData.round >= scoringWindow.start && 
    currentRoundData.round <= scoringWindow.end

  const getRoundType = (roundNumber: number) => {
    if (roundNumber <= 2) {
      return isCurrentRoundScoring ? 'sighter-scoring' : 'sighter'
    }
    return isCurrentRoundScoring ? 'scoring' : 'excluded'
  }

  const getRoundTypeLabel = (type: string) => {
    switch (type) {
      case 'sighter': return { label: 'Sighter', color: 'bg-yellow-100 text-yellow-800' }
      case 'sighter-scoring': return { label: 'Sighter + Scoring', color: 'bg-purple-100 text-purple-800' }
      case 'scoring': return { label: 'Scoring', color: 'bg-green-100 text-green-800' }
      case 'excluded': return { label: 'Excluded', color: 'bg-gray-100 text-gray-700' }
      default: return { label: 'Unknown', color: 'bg-gray-100 text-gray-700' }
    }
  }

  const nextRound = () => {
    if (currentRound < stageScore.rounds.length - 1) {
      setCurrentRound(currentRound + 1)
    }
  }

  const prevRound = () => {
    if (currentRound > 0) {
      setCurrentRound(currentRound - 1)
    }
  }

  const updateScore = (score: number) => {
    onScoreUpdate(stage.id, currentRound, 'score', score)
  }

  const toggleVScore = () => {
    onScoreUpdate(stage.id, currentRound, 'isV', !currentRoundData?.isV)
  }

  const roundType = getRoundType(currentRoundData?.round || 0)
  const typeInfo = getRoundTypeLabel(roundType)

  // Calculate completion percentage
  const scoringRounds = stageScore.rounds.filter((r: any) => 
    r.round >= scoringWindow.start && r.round <= scoringWindow.end
  )
  const completedRounds = scoringRounds.filter((r: any) => r.score > 0).length
  const completionPercentage = scoringRounds.length > 0 ? (completedRounds / scoringRounds.length) * 100 : 0

  if (isVerified) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-green-900 mb-2">Score Verified</h3>
        <p className="text-green-700 mb-4">
          This score has been verified and cannot be edited.
        </p>
        <div className="bg-white rounded-lg p-4 border border-green-200">
          <div className="text-2xl font-bold text-green-900">{stageScore.totalScore}</div>
          <div className="text-sm text-green-700">V Count: {stageScore.vCount}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Stage Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">{stage.name}</h3>
            <div className="text-xs text-gray-600 mt-1">
              {stage.matchName && (
                <span className="text-[#1e40af] font-medium">
                  {stage.matchName}
                  {stage.matchDistance && ` • ${stage.matchDistance}`}
                </span>
              )}
            </div>
          </div>
          {isPending && (
            <div className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
              Pending
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mt-3">
          <div className="flex justify-between items-center text-xs text-gray-600 mb-1">
            <span>Progress</span>
            <span>{completedRounds} / {scoringRounds.length} shots</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-[#1e40af] h-2 rounded-full transition-all duration-300"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* DNF/DQ Options */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex gap-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={stageScore.isDNF}
              onChange={(e) => {
                onFlagUpdate?.(stage.id, 'isDNF', e.target.checked)
              }}
              className="mr-2 h-4 w-4"
            />
            <span className="text-sm text-gray-700">DNF</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={stageScore.isDQ}
              onChange={(e) => {
                onFlagUpdate?.(stage.id, 'isDQ', e.target.checked)
              }}
              className="mr-2 h-4 w-4"
            />
            <span className="text-sm text-gray-700">DQ</span>
          </label>
        </div>
      </div>

      {!stageScore.isDNF && !stageScore.isDQ && (
        <>
          {/* Sighter Mode Selection */}
          <div className="px-4 py-3 border-b border-gray-200">
            <button
              onClick={() => setShowSighterOptions(!showSighterOptions)}
              className="w-full flex items-center justify-between text-left"
            >
              <div>
                <div className="text-sm font-medium text-gray-900">Sighter Count</div>
                <div className="text-xs text-gray-600">
                  {stageScore.sighterMode === 'count_sighter_1' && 'Count Sighter 1 (shots 1-10)'}
                  {stageScore.sighterMode === 'count_sighter_2' && 'Count Sighter 2 (shots 2-11)'}
                  {stageScore.sighterMode === 'count_none' && 'Count No Sighters (shots 3-12)'}
                </div>
              </div>
              <ChevronRight className={`h-5 w-5 text-gray-400 transform transition-transform ${showSighterOptions ? 'rotate-90' : ''}`} />
            </button>
            
            {showSighterOptions && (
              <div className="mt-3 space-y-2">
                {[
                  { value: 'count_sighter_1', label: 'Count Sighter 1', desc: 'shots 1-10' },
                  { value: 'count_sighter_2', label: 'Count Sighter 2', desc: 'shots 2-11' },
                  { value: 'count_none', label: 'Count No Sighters', desc: 'shots 3-12' }
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      onSighterModeUpdate(stage.id, option.value)
                      setShowSighterOptions(false)
                    }}
                    className={`w-full p-3 rounded-lg border text-left transition-colors ${
                      stageScore.sighterMode === option.value
                        ? 'border-[#1e40af] bg-blue-50 text-[#1e40af]'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium">{option.label}</div>
                    <div className="text-xs text-gray-600">({option.desc})</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Round Navigation */}
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <button
                onClick={prevRound}
                disabled={currentRound === 0}
                className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              
              <div className="text-center">
                <div className="text-lg font-bold text-gray-900">
                  Round {currentRoundData?.round || 1}
                </div>
                <div className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${typeInfo.color}`}>
                  {typeInfo.label}
                </div>
              </div>
              
              <button
                onClick={nextRound}
                disabled={currentRound === stageScore.rounds.length - 1}
                className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Score Entry */}
          {isCurrentRoundScoring ? (
            <div className="px-4 py-4">
              {/* Current Score Display */}
              <div className="text-center mb-4">
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {currentRoundData?.score || 0}
                </div>
                <div className="text-sm text-gray-600">Current Score</div>
              </div>

              {/* Score Buttons Grid */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                {Array.from({ length: maxScore + 1 }, (_, i) => i).map((score) => (
                  <button
                    key={score}
                    onClick={() => updateScore(score)}
                    className={`h-14 rounded-lg font-semibold text-lg transition-all active:scale-95 ${
                      currentRoundData?.score === score
                        ? 'bg-[#1e40af] text-white shadow-lg'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {score}
                  </button>
                ))}
              </div>

              {/* V-Score Toggle */}
              <div className="flex items-center justify-center">
                <button
                  onClick={toggleVScore}
                  className={`flex items-center px-6 py-3 rounded-lg font-semibold transition-all active:scale-95 ${
                    currentRoundData?.isV
                      ? 'bg-green-500 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Target className="h-5 w-5 mr-2" />
                  V-Bull
                  {currentRoundData?.isV && <CheckCircle className="h-5 w-5 ml-2" />}
                </button>
              </div>
            </div>
          ) : (
            <div className="px-4 py-8 text-center text-gray-500">
              <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">This shot is not counted for scoring</p>
            </div>
          )}

          {/* Current Totals */}
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-xl font-bold text-gray-900">{stageScore.totalScore}</div>
                <div className="text-xs text-gray-600">Total Score</div>
              </div>
              <div>
                <div className="text-xl font-bold text-gray-900">{stageScore.vCount}</div>
                <div className="text-xs text-gray-600">V Count</div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="px-4 py-3 border-t border-gray-200">
            <button
              onClick={() => onStageComplete(stage.id)}
              disabled={saving}
              className="w-full flex items-center justify-center px-4 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 active:scale-95"
            >
              {saving ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5 mr-2" />
                  {isPending ? 'Update Score' : 'Save Score'}
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  )
}