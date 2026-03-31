'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, Clock, Send } from 'lucide-react'

interface ShooterScoreEntryProps {
  stage: any
  existingScore: any | null
  isVerified: boolean
  saving: boolean
  onSubmit: (score: number, vCount: number) => Promise<void>
}

export default function ShooterScoreEntry({
  stage,
  existingScore,
  isVerified,
  saving,
  onSubmit,
}: ShooterScoreEntryProps) {
  const maxScore = (stage.rounds || 10) * (stage.max_score || 5)
  const maxRounds = stage.rounds || 10

  const [score, setScore] = useState<string>(
    existingScore && !existingScore.is_dnf && !existingScore.is_dq
      ? String(existingScore.score)
      : ''
  )
  const [vCount, setVCount] = useState<string>(
    existingScore?.v_count != null ? String(existingScore.v_count) : ''
  )
  const [error, setError] = useState<string | null>(null)

  // Re-init if existing score changes (e.g. after update)
  useEffect(() => {
    if (existingScore && !existingScore.is_dnf && !existingScore.is_dq) {
      setScore(String(existingScore.score))
      setVCount(existingScore.v_count != null ? String(existingScore.v_count) : '0')
    }
  }, [existingScore?.id])

  const validate = (): boolean => {
    const s = parseInt(score)
    const v = parseInt(vCount)
    if (isNaN(s) || s < 0) { setError('Enter a valid score'); return false }
    if (s > maxScore) { setError(`Score cannot exceed ${maxScore}`); return false }
    if (isNaN(v) || v < 0) { setError('Enter a valid V-bull count'); return false }
    if (v > maxRounds) { setError(`V-bulls cannot exceed ${maxRounds}`); return false }
    setError(null)
    return true
  }

  const handleSubmit = async () => {
    if (!validate()) return
    await onSubmit(parseInt(score), parseInt(vCount || '0'))
  }

  const isLocked = isVerified

  return (
    <div className="space-y-4">
      {/* Match info */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="text-[#1e40af] font-semibold text-base">{stage.matchName}</div>
        <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
          <span>{stage.matchDistance || stage.name}</span>
          <span>·</span>
          <span>{stage.sighters || 0} sighters + {stage.rounds || 10} shots</span>
          <span>·</span>
          <span>Max {maxScore}</span>
        </div>
      </div>

      {/* Verified lock */}
      {isLocked && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-green-700 text-sm">
          <CheckCircle className="h-4 w-4 flex-shrink-0" />
          Score verified — contact the range officer to make changes.
        </div>
      )}

      {/* Pending notice */}
      {existingScore && !isVerified && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-amber-700 text-sm">
          <Clock className="h-4 w-4 flex-shrink-0" />
          Score submitted — pending verification. You can still update it.
        </div>
      )}

      {/* Score inputs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-5">
        {/* Total Score */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Total Score
            <span className="ml-2 text-xs font-normal text-gray-400">0 – {maxScore}</span>
          </label>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={maxScore}
            value={score}
            onChange={(e) => { setScore(e.target.value); setError(null) }}
            disabled={isLocked}
            placeholder="0"
            className="w-full text-4xl font-bold text-center text-gray-900 border-2 border-gray-200 rounded-xl py-4 focus:border-[#1e40af] focus:ring-0 focus:outline-none disabled:bg-gray-50 disabled:text-gray-400 transition-colors"
          />
        </div>

        {/* V-Bulls */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            V-Bulls
            <span className="ml-2 text-xs font-normal text-gray-400">Inner bull hits — used for tie-breaking</span>
          </label>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={maxRounds}
            value={vCount}
            onChange={(e) => { setVCount(e.target.value); setError(null) }}
            disabled={isLocked}
            placeholder="0"
            className="w-full text-4xl font-bold text-center text-gray-900 border-2 border-gray-200 rounded-xl py-4 focus:border-[#1e40af] focus:ring-0 focus:outline-none disabled:bg-gray-50 disabled:text-gray-400 transition-colors"
          />
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-red-600 text-center">{error}</p>
        )}

        {/* Submit button */}
        {!isLocked && (
          <button
            onClick={handleSubmit}
            disabled={saving || score === ''}
            className="w-full flex items-center justify-center gap-2 bg-[#1e40af] text-white font-semibold py-4 rounded-xl hover:bg-[#1e3a8a] active:bg-[#1e3a8a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-base"
          >
            {saving ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Send className="h-5 w-5" />
            )}
            {existingScore ? 'Update Score' : 'Submit Score'}
          </button>
        )}
      </div>
    </div>
  )
}
