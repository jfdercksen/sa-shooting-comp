'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RefreshCw, Save } from 'lucide-react'
import { toast } from 'sonner'

interface CompetitionMatch {
  id: string
  match_name: string
  match_date: string | null
  match_type: string
  discipline_id: string
  discipline_name: string
}

interface AggregateState {
  // aggregate match id → set of selected source match ids
  [aggregateId: string]: Set<string>
}

export default function AggregatesPage() {
  const [competitions, setCompetitions] = useState<any[]>([])
  const [selectedCompetition, setSelectedCompetition] = useState('')
  const [matches, setMatches] = useState<CompetitionMatch[]>([])
  const [aggregateState, setAggregateState] = useState<AggregateState>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
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
      .select('id, name, start_date')
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

    // Load all matches with their discipline (via match_stages)
    const { data: matchData } = await (supabase as any)
      .from('competition_matches')
      .select(`
        id, match_name, match_date, match_type,
        match_stages ( discipline_id, disciplines (name) )
      `)
      .eq('competition_id', selectedCompetition)
      .order('match_date', { ascending: true, nullsFirst: true })

    // Flatten — use first match_stage's discipline
    const flat: CompetitionMatch[] = (matchData || []).map((m: any) => {
      const ms = m.match_stages?.[0]
      return {
        id: m.id,
        match_name: m.match_name,
        match_date: m.match_date,
        match_type: m.match_type || 'individual',
        discipline_id: ms?.discipline_id || '',
        discipline_name: ms?.disciplines?.name || '—',
      }
    })
    setMatches(flat)

    // Load existing aggregate sources
    const aggregateIds = flat.filter(m => m.match_type === 'aggregate').map(m => m.id)
    const newState: AggregateState = {}
    aggregateIds.forEach(id => { newState[id] = new Set() })

    if (aggregateIds.length > 0) {
      const { data: sources } = await (supabase as any)
        .from('aggregate_match_sources')
        .select('aggregate_match_id, source_match_id')
        .in('aggregate_match_id', aggregateIds)

      ;(sources || []).forEach((s: any) => {
        if (newState[s.aggregate_match_id]) {
          newState[s.aggregate_match_id].add(s.source_match_id)
        }
      })
    }

    setAggregateState(newState)
    setLoading(false)
  }

  const toggleSource = (aggregateId: string, sourceId: string) => {
    setAggregateState(prev => {
      const current = new Set(prev[aggregateId] || [])
      if (current.has(sourceId)) current.delete(sourceId)
      else current.add(sourceId)
      return { ...prev, [aggregateId]: current }
    })
  }

  const saveSources = async (aggregateId: string) => {
    setSaving(aggregateId)
    try {
      // Delete existing sources for this aggregate
      await (supabase as any)
        .from('aggregate_match_sources')
        .delete()
        .eq('aggregate_match_id', aggregateId)

      const sourceIds = Array.from(aggregateState[aggregateId] || [])
      if (sourceIds.length > 0) {
        const { error } = await (supabase as any)
          .from('aggregate_match_sources')
          .insert(sourceIds.map(sid => ({
            aggregate_match_id: aggregateId,
            source_match_id: sid,
          })))
        if (error) throw error
      }
      toast.success('Aggregate sources saved')
    } catch (err: any) {
      toast.error(err.message || 'Failed to save')
    } finally {
      setSaving(null)
    }
  }

  const aggregateMatches = matches.filter(m => m.match_type === 'aggregate')

  // Group non-aggregate matches by discipline
  const sourceMatchesByDiscipline = (disciplineId: string) =>
    matches.filter(m => m.match_type !== 'aggregate' && m.discipline_id === disciplineId)

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
            <h1 className="text-2xl font-bold text-gray-900">Aggregate Definitions</h1>
            <p className="text-sm text-gray-500 mt-1">
              Define which matches feed into each aggregate result
            </p>
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
            onChange={e => setSelectedCompetition(e.target.value)}
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
        ) : aggregateMatches.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-gray-500">
            <p className="mb-2 font-medium">No aggregate matches found.</p>
            <p className="text-sm">
              Go to <strong>Events Management</strong> and set a match's type to{' '}
              <span className="font-mono bg-gray-100 px-1 rounded">Aggregate</span> first.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {aggregateMatches.map(agg => {
              const sourceCandidates = sourceMatchesByDiscipline(agg.discipline_id)
              const selected = aggregateState[agg.id] || new Set()
              return (
                <div key={agg.id} className="bg-white rounded-lg shadow-sm border border-gray-200">
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <div>
                      <span className="font-semibold text-gray-900">{agg.match_name}</span>
                      <span className="ml-2 text-sm text-gray-500">{agg.discipline_name}</span>
                      {selected.size > 0 && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                          {selected.size} source{selected.size !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => saveSources(agg.id)}
                      disabled={saving === agg.id}
                      className="flex items-center gap-2 px-3 py-1.5 bg-[#1e40af] text-white text-sm rounded-lg hover:bg-[#1e3a8a] disabled:opacity-50"
                    >
                      {saving === agg.id ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Save
                    </button>
                  </div>

                  {/* Source match checkboxes */}
                  {sourceCandidates.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-gray-400">
                      No non-aggregate matches found for {agg.discipline_name}.
                    </p>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {sourceCandidates.map(src => (
                        <label
                          key={src.id}
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selected.has(src.id)}
                            onChange={() => toggleSource(agg.id, src.id)}
                            className="rounded border-gray-300 text-[#1e40af] focus:ring-[#1e40af]"
                          />
                          <span className="text-sm text-gray-800">{src.match_name}</span>
                          {src.match_date && (
                            <span className="text-xs text-gray-400 ml-auto">
                              {new Date(src.match_date).toLocaleDateString('en-ZA', {
                                weekday: 'short', day: 'numeric', month: 'short',
                              })}
                            </span>
                          )}
                        </label>
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
