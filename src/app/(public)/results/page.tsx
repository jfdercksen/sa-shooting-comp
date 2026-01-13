'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Trophy, Search, Download, Printer, RefreshCw, Medal, Award } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import type { Database } from '@/types/database'

type Competition = Database['public']['Tables']['competitions']['Row']
type Score = Database['public']['Tables']['scores']['Row']

interface AggregatedResult {
  registrationId: string
  userId: string
  shooterName: string
  sabuNumber: string
  club: string
  province: string
  ageClassification: string
  disciplineId: string
  disciplineName: string
  teamId: string | null
  teamName: string | null
  stageScores: Record<string, number>
  stageXCounts: Record<string, number>
  stageVCounts: Record<string, number>
  totalScore: number
  totalX: number
  totalV: number
  hasDNF: boolean
  hasDQ: boolean
}

export default function ResultsPage() {
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [selectedCompetition, setSelectedCompetition] = useState<string>('')
  const [results, setResults] = useState<AggregatedResult[]>([])
  const [stages, setStages] = useState<any[]>([])
  const [disciplines, setDisciplines] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>('')
  const [selectedAgeClass, setSelectedAgeClass] = useState<string>('')
  const [viewMode, setViewMode] = useState<'individual' | 'team' | 'discipline' | 'age'>('individual')
  const [teamResults, setTeamResults] = useState<any[]>([])
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const resultsRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchUser()
    fetchCompetitions()
  }, [])

  useEffect(() => {
    if (selectedCompetition) {
      fetchResults()
      fetchStages()
    }
  }, [selectedCompetition])

  useEffect(() => {
    if (selectedCompetition) {
      if (viewMode === 'team') {
        fetchTeamResults()
      } else {
        fetchResults()
      }
    }
  }, [viewMode, selectedDiscipline, selectedAgeClass])

  useEffect(() => {
    if (autoRefresh && selectedCompetition) {
      const interval = setInterval(() => {
        setRefreshing(true)
        if (viewMode === 'team') {
          fetchTeamResults().finally(() => {
            setRefreshing(false)
            setLastRefresh(new Date())
          })
        } else {
          fetchResults().finally(() => {
            setRefreshing(false)
            setLastRefresh(new Date())
          })
        }
      }, 30000) // 30 seconds

      return () => clearInterval(interval)
    }
  }, [autoRefresh, selectedCompetition, viewMode])

  const fetchUser = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (authUser) {
      setUser(authUser)
    }
  }

  const fetchCompetitions = async () => {
    // Fetch competitions that have verified scores
    const { data: scores } = await supabase
      .from('scores')
      .select('registrations(competition_id)')
      .not('verified_at', 'is', null)

    const competitionIds = [
      ...new Set(
        scores
          ?.map((s: any) => s.registrations?.competition_id)
          .filter(Boolean) || []
      ),
    ]

    if (competitionIds.length > 0) {
      const { data: comps } = await supabase
        .from('competitions')
        .select('*')
        .in('id', competitionIds)
        .order('start_date', { ascending: false })

      if (comps) {
        setCompetitions(comps)
        if (comps.length > 0 && !selectedCompetition) {
          setSelectedCompetition(comps[0].id)
        }
      }
    }
    setLoading(false)
  }

  const fetchStages = async () => {
    if (!selectedCompetition) return

    const { data: compStages } = await supabase
      .from('stages')
      .select('*')
      .eq('competition_id', selectedCompetition)
      .order('stage_number', { ascending: true })

    if (compStages) {
      setStages(compStages)
    }
  }

  const fetchTeamResults = async () => {
    if (!selectedCompetition) return

    setLoading(true)

    try {
      // Try to use team_leaderboard view first
      let query = supabase
        .from('team_leaderboard')
        .select('*')
        .eq('competition_id', selectedCompetition)
        .order('total_score', { ascending: false })

      // Apply discipline filter if selected
      if (selectedDiscipline) {
        query = query.eq('discipline_id', selectedDiscipline)
      }

      const { data: teamLeaderboardData, error: viewError } = await query

      if (!viewError && teamLeaderboardData && teamLeaderboardData.length > 0) {
        // Transform team leaderboard view data
        const transformed = teamLeaderboardData.map((team: any) => ({
          team_id: team.team_id,
          team_name: team.team_name,
          province: team.province,
          discipline_id: team.discipline_id,
          discipline_name: team.discipline_name,
          total_score: team.total_score || 0,
          total_x_count: team.total_x_count || 0,
          total_v_count: team.total_v_count || 0,
          member_count: team.member_count || 0,
          scores_counted: team.scores_counted || 0,
        }))

        setTeamResults(transformed)
        setLoading(false)
        return
      }

      // Fallback to manual aggregation if view doesn't exist or returns no data
      console.warn('team_leaderboard view not found or empty, using manual aggregation')
      await fetchTeamResultsManual()
    } catch (error) {
      console.error('Error fetching team leaderboard:', error)
      // Fallback to manual aggregation
      await fetchTeamResultsManual()
    }
  }

  const fetchTeamResultsManual = async () => {
    if (!selectedCompetition) return

    try {
      // Fetch all verified scores for team registrations
      let scoresQuery = supabase
        .from('scores')
        .select(`
          *,
          registrations!inner (
            id,
            user_id,
            competition_id,
            discipline_id,
            team_id,
            teams (
              id,
              name,
              province
            ),
            disciplines (
              id,
              name
            )
          )
        `)
        .eq('registrations.competition_id', selectedCompetition)
        .not('registrations.team_id', 'is', null)
        .not('verified_at', 'is', null)

      // Apply discipline filter if selected
      if (selectedDiscipline) {
        scoresQuery = scoresQuery.eq('registrations.discipline_id', selectedDiscipline)
      }

      const { data: scoresData } = await scoresQuery

      if (!scoresData || scoresData.length === 0) {
        setTeamResults([])
        setLoading(false)
        return
      }

      // Aggregate scores by team and discipline
      const teamAggregates: Record<string, {
        team_id: string
        team_name: string
        province: string | null
        discipline_id: string
        discipline_name: string
        member_scores: Array<{ user_id: string; total_score: number; total_x: number; total_v: number }>
        member_count: number
      }> = {}

      scoresData.forEach((score: any) => {
        const reg = score.registrations
        if (!reg || !reg.team_id) return

        const teamId = reg.team_id
        const disciplineId = reg.discipline_id || ''
        const key = `${teamId}-${disciplineId}`

        if (!teamAggregates[key]) {
          teamAggregates[key] = {
            team_id: teamId,
            team_name: reg.teams?.name || 'Unknown Team',
            province: reg.teams?.province || null,
            discipline_id: disciplineId,
            discipline_name: reg.disciplines?.name || 'Unknown',
            member_scores: [],
            member_count: 0,
          }
        }

        // Find or create member score entry
        let memberScore = teamAggregates[key].member_scores.find((m) => m.user_id === reg.user_id)
        if (!memberScore) {
          memberScore = {
            user_id: reg.user_id,
            total_score: 0,
            total_x: 0,
            total_v: 0,
          }
          teamAggregates[key].member_scores.push(memberScore)
          teamAggregates[key].member_count++
        }

        // Add score if not DNF/DQ
        if (!score.is_dnf && !score.is_dq) {
          memberScore.total_score += score.score || 0
          memberScore.total_x += score.x_count || 0
          memberScore.total_v += score.v_count || 0
        }
      })

      // Calculate team totals (best 3 scores for teams with 4 members)
      const teamResults = Object.values(teamAggregates).map((team) => {
        // Sort member scores by total (descending)
        const sortedScores = [...team.member_scores].sort((a, b) => {
          if (b.total_score !== a.total_score) return b.total_score - a.total_score
          if (b.total_x !== a.total_x) return b.total_x - a.total_x
          return b.total_v - a.total_v
        })

        // For teams with 4 members, take best 3 scores
        // Otherwise, take all scores
        const scoresToCount = team.member_count === 4 ? 3 : team.member_count
        const countedScores = sortedScores.slice(0, scoresToCount)

        const total_score = countedScores.reduce((sum, s) => sum + s.total_score, 0)
        const total_x_count = countedScores.reduce((sum, s) => sum + s.total_x, 0)
        const total_v_count = countedScores.reduce((sum, s) => sum + s.total_v, 0)

        return {
          team_id: team.team_id,
          team_name: team.team_name,
          province: team.province,
          discipline_id: team.discipline_id,
          discipline_name: team.discipline_name,
          total_score,
          total_x_count,
          total_v_count,
          member_count: team.member_count,
          scores_counted: countedScores.length,
        }
      })

      // Sort by total score descending
      teamResults.sort((a, b) => {
        if (b.total_score !== a.total_score) return b.total_score - a.total_score
        if (b.total_x_count !== a.total_x_count) return b.total_x_count - a.total_x_count
        return b.total_v_count - a.total_v_count
      })

      setTeamResults(teamResults)
    } catch (error) {
      console.error('Error fetching team results manually:', error)
      toast.error('Failed to load team results')
      setTeamResults([])
    } finally {
      setLoading(false)
    }
  }

  const fetchResults = async () => {
    if (!selectedCompetition) return

    setLoading(true)

    try {
      // Try to use competition_leaderboard view first
      const { data: leaderboardData, error: viewError } = await supabase
        .from('competition_leaderboard')
        .select('*')
        .eq('competition_id', selectedCompetition)
        .order('total_score', { ascending: false })

      if (!viewError && leaderboardData && leaderboardData.length > 0) {
        // Transform leaderboard view data to AggregatedResult format
        const resultsList: AggregatedResult[] = leaderboardData.map((entry: any) => {
          // Parse stage scores if they're stored as JSON or separate columns
          const stageScores: Record<string, number> = {}
          const stageXCounts: Record<string, number> = {}
          const stageVCounts: Record<string, number> = {}

          // If stages are in the view, map them
          if (entry.stage_scores) {
            try {
              const parsed = typeof entry.stage_scores === 'string' 
                ? JSON.parse(entry.stage_scores) 
                : entry.stage_scores
              Object.assign(stageScores, parsed)
            } catch {
              // Ignore parse errors
            }
          }

          return {
            registrationId: entry.registration_id || '',
            userId: entry.user_id || '',
            shooterName: `${entry.full_names || ''} ${entry.surname || ''}`.trim() || 'Unknown',
            sabuNumber: entry.sabu_number || '',
            club: entry.club || '',
            province: entry.province || '',
            ageClassification: entry.age_classification || '',
            disciplineId: entry.discipline_id || '',
            disciplineName: entry.discipline_name || '',
            teamId: entry.team_id || null,
            teamName: entry.team_name || null,
            stageScores,
            stageXCounts,
            stageVCounts,
            totalScore: entry.total_score || 0,
            totalX: entry.total_x_count || entry.x_count || 0,
            totalV: entry.total_v_count || entry.v_count || 0,
            hasDNF: entry.has_dnf || false,
            hasDQ: entry.has_dq || false,
          }
        })

        // Apply filters
        let filteredResults = resultsList

        if (selectedDiscipline) {
          filteredResults = filteredResults.filter((r) => r.disciplineId === selectedDiscipline)
        }

        if (selectedAgeClass) {
          filteredResults = filteredResults.filter((r) => r.ageClassification === selectedAgeClass)
        }

        if (searchQuery) {
          const query = searchQuery.toLowerCase()
          filteredResults = filteredResults.filter(
            (r) =>
              r.shooterName.toLowerCase().includes(query) ||
              r.sabuNumber.toLowerCase().includes(query) ||
              r.club.toLowerCase().includes(query)
          )
        }

        setResults(filteredResults)

        // Fetch disciplines for filter
        const disciplineIds = [...new Set(filteredResults.map((r) => r.disciplineId).filter(Boolean))]
        if (disciplineIds.length > 0) {
          const { data: discs } = await supabase
            .from('disciplines')
            .select('id, name')
            .in('id', disciplineIds)

          if (discs) setDisciplines(discs)
        }

        setLoading(false)
        return
      }

      // Fallback to manual aggregation if view doesn't exist
      console.warn('competition_leaderboard view not found, using manual aggregation')
      await fetchResultsManual()
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
      // Fallback to manual aggregation
      await fetchResultsManual()
    }
  }

  const fetchResultsManual = async () => {
    if (!selectedCompetition) return

    // Fetch all verified scores for the competition
    const { data: scoresData } = await supabase
      .from('scores')
      .select(`
        *,
        registrations (
          id,
          user_id,
          competition_id,
          discipline_id,
          age_classification,
          team_id,
          profiles!registrations_user_id_fkey (
            full_names,
            surname,
            sabu_number,
            club,
            province
          ),
          disciplines (
            id,
            name
          ),
          teams (
            id,
            name
          )
        ),
        stages (
          id,
          stage_number,
          name
        )
      `)
      .eq('registrations.competition_id', selectedCompetition)
      .not('verified_at', 'is', null)

    if (!scoresData) {
      setLoading(false)
      return
    }

    // Aggregate scores by registration
    const aggregated: Record<string, AggregatedResult> = {}

    scoresData.forEach((score: any) => {
      const reg = score.registrations
      if (!reg) return

      const regId = reg.id
      const shooter = reg.profiles
      const shooterName = shooter ? `${shooter.full_names} ${shooter.surname}` : 'Unknown'
      const sabuNumber = shooter?.sabu_number || ''
      const club = shooter?.club || ''
      const province = shooter?.province || ''
      const disciplineName = reg.disciplines?.name || ''
      const teamName = reg.teams?.name || null

      if (!aggregated[regId]) {
        aggregated[regId] = {
          registrationId: regId,
          userId: reg.user_id || '',
          shooterName,
          sabuNumber,
          club,
          province,
          ageClassification: reg.age_classification || '',
          disciplineId: reg.discipline_id || '',
          disciplineName,
          teamId: reg.team_id || null,
          teamName,
          stageScores: {},
          stageXCounts: {},
          stageVCounts: {},
          totalScore: 0,
          totalX: 0,
          totalV: 0,
          hasDNF: false,
          hasDQ: false,
        }
      }

      const stageNum = score.stages?.stage_number || 0
      const stageKey = `S${stageNum}`

      if (score.is_dnf) {
        aggregated[regId].hasDNF = true
      } else if (score.is_dq) {
        aggregated[regId].hasDQ = true
      } else {
        aggregated[regId].stageScores[stageKey] = score.score
        aggregated[regId].stageXCounts[stageKey] = score.x_count || 0
        aggregated[regId].stageVCounts[stageKey] = score.v_count || 0
        aggregated[regId].totalScore += score.score
        aggregated[regId].totalX += score.x_count || 0
        aggregated[regId].totalV += score.v_count || 0
      }
    })

    let resultsList = Object.values(aggregated)

    // Apply filters
    if (selectedDiscipline) {
      resultsList = resultsList.filter((r) => r.disciplineId === selectedDiscipline)
    }

    if (selectedAgeClass) {
      resultsList = resultsList.filter((r) => r.ageClassification === selectedAgeClass)
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      resultsList = resultsList.filter(
        (r) =>
          r.shooterName.toLowerCase().includes(query) ||
          r.sabuNumber.toLowerCase().includes(query) ||
          r.club.toLowerCase().includes(query)
      )
    }

    // Sort by total score (descending), then X count, then V count
    resultsList.sort((a, b) => {
      if (a.hasDNF || a.hasDQ) return 1
      if (b.hasDNF || b.hasDQ) return -1
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore
      if (b.totalX !== a.totalX) return b.totalX - a.totalX
      return b.totalV - a.totalV
    })

    setResults(resultsList)
    setLastRefresh(new Date())

    // Fetch disciplines for filter
    const disciplineIds = [...new Set(resultsList.map((r) => r.disciplineId).filter(Boolean))]
    if (disciplineIds.length > 0) {
      const { data: discs } = await supabase
        .from('disciplines')
        .select('id, name')
        .in('id', disciplineIds)

      if (discs) setDisciplines(discs)
    }

    setLoading(false)
    setRefreshing(false)
  }

  const handleExportPDF = async () => {
    if (!resultsRef.current) return

    toast.info('Generating PDF...')
    const canvas = await html2canvas(resultsRef.current)
    const imgData = canvas.toDataURL('image/png')

    const pdf = new jsPDF('landscape', 'mm', 'a4')
    const imgWidth = 297 // A4 width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight)
    pdf.save(`results-${selectedCompetition}-${format(new Date(), 'yyyy-MM-dd')}.pdf`)

    toast.success('PDF exported successfully')
  }

  const handleExportCSV = () => {
    const headers = [
      'Position',
      'Name',
      'SABU Number',
      'Club',
      'Province',
      ...stages.map((s) => `Stage ${s.stage_number}`),
      'Total Score',
      'X Count',
      'V Count',
    ]

    const rows = results.map((result, index) => [
      index + 1,
      result.shooterName,
      result.sabuNumber,
      result.club,
      result.province,
      ...stages.map((s) => {
        const stageKey = `S${s.stage_number}`
        return result.stageScores[stageKey] || '-'
      }),
      result.hasDNF ? 'DNF' : result.hasDQ ? 'DQ' : result.totalScore,
      result.totalX,
      result.totalV,
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `results-${selectedCompetition}-${format(new Date(), 'yyyy-MM-dd')}.csv`
    link.click()

    toast.success('CSV exported successfully')
  }

  const handlePrint = () => {
    window.print()
  }

  const getMedalIcon = (position: number) => {
    if (position === 1) {
      return (
        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-yellow-100">
          <Award className="h-4 w-4 text-yellow-600" />
        </div>
      )
    }
    if (position === 2) {
      return (
        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100">
          <Award className="h-4 w-4 text-gray-500" />
        </div>
      )
    }
    if (position === 3) {
      return (
        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-100">
          <Award className="h-4 w-4 text-amber-600" />
        </div>
      )
    }
    return null
  }

  const filteredResults = results.filter((result) => {
    if (viewMode === 'team' && !result.teamId) return false
    if (viewMode === 'discipline' && selectedDiscipline && result.disciplineId !== selectedDiscipline)
      return false
    if (viewMode === 'age' && selectedAgeClass && result.ageClassification !== selectedAgeClass)
      return false
    return true
  })

  const ageClassifications = ['Open', 'Under_19', 'Under_25', 'Veteran_60_plus', 'Veteran_70_plus']

  if (loading && competitions.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-[#1e40af] rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Competition Results</h1>
          <p className="text-lg text-gray-600">View verified competition results</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Competition Selector */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6 no-print">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Competition</label>
              <select
                value={selectedCompetition}
                onChange={(e) => {
                  setSelectedCompetition(e.target.value)
                  setSelectedDiscipline('')
                  setSelectedAgeClass('')
                  setSearchQuery('')
                }}
                className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
              >
                <option value="">Select a competition...</option>
                {competitions.map((comp) => (
                  <option key={comp.id} value={comp.id}>
                    {comp.name} ({format(new Date(comp.start_date), 'MMM yyyy')})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="flex items-center text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="mr-2"
                />
                Auto-refresh (30s)
              </label>
              <button
                onClick={() => {
                  setRefreshing(true)
                  if (viewMode === 'team') {
                    fetchTeamResults().finally(() => setRefreshing(false))
                  } else {
                    fetchResults().finally(() => setRefreshing(false))
                  }
                }}
                disabled={refreshing}
                className={`p-2 text-gray-600 hover:text-[#1e40af] transition-colors ${refreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
                title="Refresh"
              >
                <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              {lastRefresh && (
                <span className="text-xs text-gray-500">
                  Last updated: {format(lastRefresh, 'HH:mm:ss')}
                </span>
              )}
            </div>
          </div>
        </div>

        {selectedCompetition && (
          <>
            {/* View Options Tabs */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6 no-print">
              <div className="flex flex-wrap gap-2 mb-4">
                {[
                  { id: 'individual', label: 'Individual Results' },
                  { id: 'team', label: 'Team Results' },
                  { id: 'discipline', label: 'By Discipline' },
                  { id: 'age', label: 'By Age Classification' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setViewMode(tab.id as any)}
                    className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                      viewMode === tab.id
                        ? 'bg-[#1e40af] text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Name, SABU Number, Club..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Discipline</label>
                  <select
                    value={selectedDiscipline}
                    onChange={(e) => setSelectedDiscipline(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                  >
                    <option value="">All Disciplines</option>
                    {disciplines.map((disc) => (
                      <option key={disc.id} value={disc.id}>
                        {disc.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Age Classification
                  </label>
                  <select
                    value={selectedAgeClass}
                    onChange={(e) => setSelectedAgeClass(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                  >
                    <option value="">All Classifications</option>
                    {ageClassifications.map((ageClass) => (
                      <option key={ageClass} value={ageClass}>
                        {ageClass.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <div className="flex items-center gap-2 w-full">
                    <label className="flex items-center text-sm text-gray-700 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={autoRefresh}
                        onChange={(e) => setAutoRefresh(e.target.checked)}
                        className="mr-2"
                      />
                      Auto-refresh
                    </label>
                    {autoRefresh && (
                      <span className="text-xs text-gray-500">(30s)</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Export Buttons */}
            <div className="flex flex-wrap gap-2 mb-6 no-print">
              <button
                onClick={handleExportPDF}
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </button>
              <button
                onClick={handleExportCSV}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print
              </button>
            </div>

            {/* Results Table */}
            {viewMode === 'team' ? (
              // Team Results Table
              teamResults.length === 0 ? (
                <div className="bg-white rounded-lg shadow-md p-12 text-center">
                  <Trophy className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 text-lg">No team results found</p>
                </div>
              ) : (
                <div ref={resultsRef} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="hidden print:block p-6 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-gray-900">
                      {competitions.find((c) => c.id === selectedCompetition)?.name} - Team Results
                    </h2>
                    <p className="text-gray-600 mt-1">
                      Results - {format(new Date(), 'MMMM d, yyyy')}
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Pos
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Team Name
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Province
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Discipline
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Members
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total Score
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            X Count
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            V Count
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {teamResults.map((team, index) => {
                          const position = index + 1
                          return (
                            <tr key={`${team.team_id}-${team.discipline_id}`}>
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  {getMedalIcon(position)}
                                  <span className={`text-sm font-semibold ${
                                    position <= 3 ? 'text-gray-900' : 'text-gray-700'
                                  }`}>
                                    {position}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  {team.team_name}
                                </div>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                {team.province || '-'}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                {team.discipline_name}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                                {team.scores_counted} / {team.member_count}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-right">
                                <span className="text-sm font-bold text-gray-900">
                                  {team.total_score}
                                </span>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                                {team.total_x_count}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                                {team.total_v_count}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            ) : filteredResults.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <Trophy className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 text-lg">No results found</p>
              </div>
            ) : (
              <div ref={resultsRef} className="bg-white rounded-lg shadow-md overflow-hidden">
                {/* Print Header */}
                <div className="hidden print:block p-6 border-b border-gray-200">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {competitions.find((c) => c.id === selectedCompetition)?.name}
                  </h2>
                  <p className="text-gray-600 mt-1">
                    Results - {format(new Date(), 'MMMM d, yyyy')}
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Pos
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          SABU #
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Club
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Province
                        </th>
                        {stages.map((stage) => (
                          <th
                            key={stage.id}
                            className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            S{stage.stage_number}
                          </th>
                        ))}
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          X
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          V
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredResults.map((result, index) => {
                        const position = index + 1
                        const isCurrentUser = user && result.userId === user.id

                        return (
                          <tr
                            key={result.registrationId}
                            className={isCurrentUser ? 'bg-blue-50 border-l-4 border-[#1e40af]' : ''}
                          >
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                {getMedalIcon(position)}
                                <span className={`text-sm font-semibold ${
                                  position <= 3 ? 'text-gray-900' : 'text-gray-700'
                                }`}>
                                  {position}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {result.shooterName}
                                {isCurrentUser && (
                                  <span className="ml-2 text-xs text-[#1e40af]">(You)</span>
                                )}
                              </div>
                              {result.teamName && (
                                <div className="text-xs text-gray-500">Team: {result.teamName}</div>
                              )}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                              {result.sabuNumber || '-'}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                              {result.club || '-'}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                              {result.province || '-'}
                            </td>
                            {stages.map((stage) => {
                              const stageKey = `S${stage.stage_number}`
                              const score = result.stageScores[stageKey]
                              return (
                                <td
                                  key={stage.id}
                                  className="px-3 py-4 whitespace-nowrap text-sm text-center text-gray-900 font-medium"
                                >
                                  {score !== undefined ? score : '-'}
                                </td>
                              )
                            })}
                            <td className="px-4 py-4 whitespace-nowrap text-right">
                              {result.hasDNF ? (
                                <span className="text-sm font-semibold text-red-600">DNF</span>
                              ) : result.hasDQ ? (
                                <span className="text-sm font-semibold text-red-600">DQ</span>
                              ) : (
                                <span className="text-sm font-bold text-gray-900">
                                  {result.totalScore}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                              {result.totalX}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                              {result.totalV}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {!selectedCompetition && competitions.length === 0 && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <Trophy className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">No competition results available</p>
          </div>
        )}
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body {
            background: white;
          }
          .no-print {
            display: none;
          }
          table {
            border-collapse: collapse;
          }
          th, td {
            border: 1px solid #e5e7eb;
            padding: 8px;
          }
          .bg-blue-50 {
            background-color: #eff6ff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  )
}
