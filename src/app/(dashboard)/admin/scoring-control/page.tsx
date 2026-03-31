'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

interface MatchStageRow {
  id: string
  is_open: boolean
  discipline_id: string
  discipline_name: string
  stage_name: string
  stage_distance: string | null
  scores_count: number
}

interface Match {
  id: string
  match_name: string
  match_date: string | null
  is_warmup: boolean
  stages: MatchStageRow[]
}

interface Competition {
  id: string
  name: string
  start_date: string
  end_date: string
}

export default function ScoringControlPage() {
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [selectedCompetition, setSelectedCompetition] = useState<string>('')
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchCompetitions()
  }, [])

  useEffect(() => {
    if (selectedCompetition) fetchMatches()
  }, [selectedCompetition])

  const fetchCompetitions = async () => {
    const { data } = await supabase
      .from('competitions')
      .select('id, name, start_date, end_date')
      .eq('is_active', true)
      .order('start_date', { ascending: false })

    if (data) {
      setCompetitions(data)
      if (data.length > 0) setSelectedCompetition(data[0].id)
    }
    setLoading(false)
  }

  const fetchMatches = async () => {
    setLoading(true)

    const { data: matchData, error } = await (supabase as any)
      .from('competition_matches')
      .select(`
        id,
        match_name,
        match_date,
        is_warmup,
        match_stages (
          id,
          is_open,
          discipline_id,
          disciplines (name),
          stages (name, distance)
        )
      `)
      .eq('competition_id', selectedCompetition)
      .order('match_date', { ascending: true, nullsFirst: true })

    if (error) {
      toast.error('Failed to load matches')
      setLoading(false)
      return
    }

    // For each match_stage, count submitted scores
    const allMatchStageIds: string[] = []
    ;(matchData || []).forEach((m: any) => {
      ;(m.match_stages || []).forEach((ms: any) => allMatchStageIds.push(ms.id))
    })

    const scoreCounts: Record<string, number> = {}
    if (allMatchStageIds.length > 0) {
      const { data: scoreData } = await (supabase as any)
        .from('scores')
        .select('match_id, stage_id')
        .in('match_id', (matchData || []).map((m: any) => m.id))

      ;(scoreData || []).forEach((s: any) => {
        const key = `${s.match_id}_${s.stage_id}`
        scoreCounts[key] = (scoreCounts[key] || 0) + 1
      })
    }

    const formatted: Match[] = (matchData || []).map((m: any) => ({
      id: m.id,
      match_name: m.match_name,
      match_date: m.match_date,
      is_warmup: m.is_warmup || false,
      stages: (m.match_stages || []).map((ms: any) => ({
        id: ms.id,
        is_open: ms.is_open || false,
        discipline_id: ms.discipline_id,
        discipline_name: ms.disciplines?.name || '',
        stage_name: ms.stages?.name || '',
        stage_distance: ms.stages?.distance || null,
        scores_count: scoreCounts[`${m.id}_${ms.stages?.id}`] || 0,
      })),
    }))

    setMatches(formatted)
    setLoading(false)
  }

  const toggleStage = async (matchStageId: string, currentlyOpen: boolean) => {
    setToggling(matchStageId)

    const { error } = await (supabase as any)
      .from('match_stages')
      .update({ is_open: !currentlyOpen })
      .eq('id', matchStageId)

    if (error) {
      toast.error('Failed to update stage')
    } else {
      toast.success(currentlyOpen ? 'Scoring closed' : 'Scoring opened')
      await fetchMatches()
    }

    setToggling(null)
  }

  const openAllInMatch = async (match: Match) => {
    const closedIds = match.stages.filter(s => !s.is_open).map(s => s.id)
    if (closedIds.length === 0) return

    const { error } = await (supabase as any)
      .from('match_stages')
      .update({ is_open: true })
      .in('id', closedIds)

    if (error) {
      toast.error('Failed to open all stages')
    } else {
      toast.success(`Opened ${closedIds.length} stage${closedIds.length > 1 ? 's' : ''}`)
      await fetchMatches()
    }
  }

  const closeAllInMatch = async (match: Match) => {
    const openIds = match.stages.filter(s => s.is_open).map(s => s.id)
    if (openIds.length === 0) return

    const { error } = await (supabase as any)
      .from('match_stages')
      .update({ is_open: false })
      .in('id', openIds)

    if (error) {
      toast.error('Failed to close all stages')
    } else {
      toast.success(`Closed ${openIds.length} stage${openIds.length > 1 ? 's' : ''}`)
      await fetchMatches()
    }
  }

  if (loading && !selectedCompetition) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1e40af]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Scoring Control</h1>
            <p className="text-sm text-gray-500 mt-1">Open and close distances for shooter score entry</p>
          </div>
          <button
            onClick={fetchMatches}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {/* Competition selector */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Competition</label>
          <select
            value={selectedCompetition}
            onChange={(e) => setSelectedCompetition(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
          >
            {competitions.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e40af]" />
          </div>
        ) : matches.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-gray-500">
            No matches found for this competition.
          </div>
        ) : (
          <div className="space-y-4">
            {matches.map(match => {
              const openCount = match.stages.filter(s => s.is_open).length
              return (
                <div
                  key={match.id}
                  className={`bg-white rounded-lg shadow-sm border ${match.is_warmup ? 'border-amber-200' : 'border-gray-200'}`}
                >
                  {/* Match header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-gray-900">{match.match_name}</span>
                      {match.is_warmup && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Warm-up</span>
                      )}
                      {match.match_date && (
                        <span className="text-xs text-gray-400">
                          {new Date(match.match_date).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </span>
                      )}
                      {openCount > 0 && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                          {openCount} open
                        </span>
                      )}
                    </div>
                    {match.stages.length > 1 && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => openAllInMatch(match)}
                          className="text-xs text-green-600 hover:text-green-800 font-medium"
                        >
                          Open all
                        </button>
                        <span className="text-gray-300">|</span>
                        <button
                          onClick={() => closeAllInMatch(match)}
                          className="text-xs text-red-500 hover:text-red-700 font-medium"
                        >
                          Close all
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Stages */}
                  {match.stages.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-gray-400">No distances configured.</p>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {match.stages.map(stage => (
                        <div key={stage.id} className="flex items-center justify-between px-4 py-3">
                          <div>
                            <span className="text-sm font-medium text-gray-800">
                              {stage.stage_distance || stage.stage_name}
                            </span>
                            <span className="text-xs text-gray-400 ml-2">{stage.discipline_name}</span>
                            {stage.scores_count > 0 && (
                              <span className="text-xs text-blue-500 ml-2">
                                {stage.scores_count} score{stage.scores_count > 1 ? 's' : ''} entered
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => toggleStage(stage.id, stage.is_open)}
                            disabled={toggling === stage.id}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                              stage.is_open
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            } disabled:opacity-50`}
                          >
                            {toggling === stage.id ? (
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            ) : stage.is_open ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <XCircle className="h-4 w-4" />
                            )}
                            {stage.is_open ? 'Open' : 'Closed'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
