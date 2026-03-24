'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Trophy, Search, Download, Printer, RefreshCw, Award } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import MobileResults from '@/components/results/mobile-results'

import type { Database } from '@/types/database'

type Competition = Database['public']['Tables']['competitions']['Row']

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
  hasUnverified: boolean
}

interface CompetitionTotal {
  userId: string
  shooterName: string
  sabuNumber: string
  club: string
  province: string
  disciplineScores: Record<string, number>
  disciplineX: Record<string, number>
  disciplineV: Record<string, number>
  grandTotal: number
  totalX: number
  totalV: number
  hasUnverified: boolean
}

interface AnnualResult {
  userId: string
  shooterName: string
  sabuNumber: string
  club: string
  province: string
  competitionScores: Record<string, number>
  competitionX: Record<string, number>
  competitionV: Record<string, number>
  grandTotal: number
  totalX: number
  totalV: number
}

export default function ResultsPage() {
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [selectedCompetition, setSelectedCompetition] = useState<string>('')
  const [results, setResults] = useState<AggregatedResult[]>([])
  const [stages, setStages] = useState<any[]>([])
  const [disciplines, setDisciplines] = useState<any[]>([])
  const [matches, setMatches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>('')
  const [selectedAgeClass, setSelectedAgeClass] = useState<string>('')
  const [selectedMatch, setSelectedMatch] = useState<string>('')
  const [viewMode, setViewMode] = useState<'match' | 'team' | 'total' | 'annual'>('match')
  const [championships, setChampionships] = useState<any[]>([])
  const [selectedChampionship, setSelectedChampionship] = useState<string>('')
  const [annualResults, setAnnualResults] = useState<AnnualResult[]>([])
  const [yearCompetitions, setYearCompetitions] = useState<Competition[]>([])
  const [teamResults, setTeamResults] = useState<any[]>([])
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const resultsRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    fetchUser()
    fetchCompetitions()
    fetchChampionships()
  }, [])

  useEffect(() => {
    if (selectedCompetition) {
      fetchResults()
      fetchStages()
      fetchMatches()
    }
  }, [selectedCompetition])

  useEffect(() => {
    if (viewMode === 'annual') {
      fetchAnnualResults()
    } else if (selectedCompetition) {
      if (viewMode === 'team') {
        fetchTeamResults()
      } else {
        fetchResults()
      }
      fetchStages()
    }
  }, [viewMode, selectedDiscipline, selectedAgeClass])

  useEffect(() => {
    if (viewMode === 'annual') fetchAnnualResults()
  }, [selectedChampionship])

  useEffect(() => {
    if (autoRefresh && selectedCompetition) {
      const interval = setInterval(() => {
        setRefreshing(true)
        if (viewMode === 'team') {
          fetchTeamResults().finally(() => { setRefreshing(false); setLastRefresh(new Date()) })
        } else {
          fetchResults().finally(() => { setRefreshing(false); setLastRefresh(new Date()) })
        }
      }, 30000)
      return () => clearInterval(interval)
    }
  }, [autoRefresh, selectedCompetition, viewMode])

  const fetchUser = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) setUser(authUser)
    } catch {
      // Not logged in or network unavailable — results still visible as public page
    }
  }

  const fetchCompetitions = async () => {
    try {
      const { data: scores } = await supabase
        .from('scores')
        .select('registrations(competition_id)')

      const competitionIds = [
        ...new Set(
          scores?.map((s: any) => s.registrations?.competition_id).filter(Boolean) || []
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
    } catch (error) {
      console.error('Error fetching competitions:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchChampionships = async () => {
    try {
      const { data } = await (supabase as any)
        .from('championships')
        .select('id, name, year')
        .order('year', { ascending: false })
      if (data) {
        setChampionships(data)
        if (data.length > 0 && !selectedChampionship) {
          setSelectedChampionship(data[0].id)
        }
      }
    } catch {
      // championships table may not exist yet
    }
  }

  const fetchStages = async () => {
    if (!selectedCompetition) return

    const { data: compDiscs } = await supabase
      .from('competition_disciplines')
      .select('discipline_id')
      .eq('competition_id', selectedCompetition)

    const disciplineIds = (compDiscs || []).map((cd: any) => cd.discipline_id).filter(Boolean)
    if (disciplineIds.length === 0) { setStages([]); return }

    let query = supabase.from('stages').select('*').in('discipline_id', disciplineIds)
    if (selectedDiscipline) query = query.eq('discipline_id', selectedDiscipline)

    const { data: compStages } = await query.order('stage_number', { ascending: true })
    if (compStages) setStages(compStages)
  }

  const fetchMatches = async () => {
    if (!selectedCompetition) return

    const { data, error } = await (supabase as any)
      .from('competition_matches')
      .select(`
        id,
        match_name,
        distance,
        match_date,
        match_stages (
          discipline_id,
          stage_id,
          stages (
            id,
            stage_number,
            name,
            distance
          )
        )
      `)
      .eq('competition_id', selectedCompetition)
      .order('match_date', { ascending: true, nullsFirst: true })

    if (!error && data) setMatches(data)
  }

  const fetchTeamResults = async () => {
    if (!selectedCompetition) return
    setLoading(true)

    try {
      let query = (supabase as any)
        .from('team_leaderboard')
        .select('*')
        .eq('competition_id', selectedCompetition)
        .order('total_score', { ascending: false })

      if (selectedDiscipline) query = query.eq('discipline_id', selectedDiscipline)

      const { data: teamLeaderboardData, error: viewError } = await query

      if (!viewError && teamLeaderboardData && teamLeaderboardData.length > 0) {
        setTeamResults(
          teamLeaderboardData.map((team: any) => ({
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
        )
        setLoading(false)
        return
      }

      await fetchTeamResultsManual()
    } catch {
      await fetchTeamResultsManual()
    }
  }

  const fetchTeamResultsManual = async () => {
    if (!selectedCompetition) return

    try {
      let scoresQuery = supabase
        .from('scores')
        .select(`
          *,
          registrations!inner (
            id, user_id, competition_id, discipline_id, team_id,
            teams (id, name, province),
            disciplines (id, name)
          )
        `)
        .eq('registrations.competition_id', selectedCompetition)
        .not('registrations.team_id', 'is', null)
        .not('verified_at', 'is', null)

      if (selectedDiscipline) {
        scoresQuery = scoresQuery.eq('registrations.discipline_id', selectedDiscipline)
      }

      const { data: scoresData } = await scoresQuery
      if (!scoresData || scoresData.length === 0) { setTeamResults([]); setLoading(false); return }

      const teamAggregates: Record<string, any> = {}

      scoresData.forEach((score: any) => {
        const reg = score.registrations
        if (!reg?.team_id) return
        const key = `${reg.team_id}-${reg.discipline_id || ''}`

        if (!teamAggregates[key]) {
          teamAggregates[key] = {
            team_id: reg.team_id,
            team_name: reg.teams?.name || 'Unknown Team',
            province: reg.teams?.province || null,
            discipline_id: reg.discipline_id || '',
            discipline_name: reg.disciplines?.name || 'Unknown',
            member_scores: [],
            member_count: 0,
          }
        }

        let memberScore = teamAggregates[key].member_scores.find((m: any) => m.user_id === reg.user_id)
        if (!memberScore) {
          memberScore = { user_id: reg.user_id, total_score: 0, total_x: 0, total_v: 0 }
          teamAggregates[key].member_scores.push(memberScore)
          teamAggregates[key].member_count++
        }

        if (!score.is_dnf && !score.is_dq) {
          memberScore.total_score += score.score || 0
          memberScore.total_x += score.x_count || 0
          memberScore.total_v += score.v_count || 0
        }
      })

      const teamResultsList = Object.values(teamAggregates).map((team: any) => {
        const sorted = [...team.member_scores].sort((a: any, b: any) =>
          b.total_score - a.total_score || b.total_x - a.total_x || b.total_v - a.total_v
        )
        const scoresToCount = team.member_count === 4 ? 3 : team.member_count
        const counted = sorted.slice(0, scoresToCount)
        return {
          team_id: team.team_id,
          team_name: team.team_name,
          province: team.province,
          discipline_id: team.discipline_id,
          discipline_name: team.discipline_name,
          total_score: counted.reduce((s: number, m: any) => s + m.total_score, 0),
          total_x_count: counted.reduce((s: number, m: any) => s + m.total_x, 0),
          total_v_count: counted.reduce((s: number, m: any) => s + m.total_v, 0),
          member_count: team.member_count,
          scores_counted: counted.length,
        }
      })

      teamResultsList.sort((a: any, b: any) =>
        b.total_score - a.total_score || b.total_x_count - a.total_x_count || b.total_v_count - a.total_v_count
      )
      setTeamResults(teamResultsList)
    } catch (error) {
      console.error('Error fetching team results:', error)
      toast.error('Failed to load team results')
      setTeamResults([])
    } finally {
      setLoading(false)
    }
  }

  const fetchAnnualResults = async () => {
    if (!selectedChampionship) { setAnnualResults([]); setYearCompetitions([]); return }
    setLoading(true)
    try {
      // 1. Get all events belonging to the selected championship
      const { data: yearComps } = await supabase
        .from('competitions')
        .select('*')
        .eq('championship_id' as any, selectedChampionship)
        .order('start_date', { ascending: true })

      if (!yearComps || yearComps.length === 0) {
        setYearCompetitions([])
        setAnnualResults([])
        setLoading(false)
        return
      }

      setYearCompetitions(yearComps)
      const compIds = yearComps.map((c: Competition) => c.id)

      // 2. Get registrations for those competitions
      let regQuery = supabase
        .from('registrations')
        .select(`
          id, user_id, competition_id, discipline_id,
          profiles!registrations_user_id_fkey (full_names, surname, sabu_number, club, province),
          disciplines (id, name)
        `)
        .in('competition_id', compIds)

      if (selectedDiscipline) regQuery = regQuery.eq('discipline_id', selectedDiscipline)

      const { data: regs } = await regQuery
      if (!regs || regs.length === 0) {
        setAnnualResults([])
        setLoading(false)
        return
      }

      // 3. Get scores for those registrations
      const regIds = regs.map((r: any) => r.id)
      const { data: scoresData } = await supabase
        .from('scores')
        .select('registration_id, score, x_count, v_count, is_dnf, is_dq')
        .in('registration_id', regIds)

      if (!scoresData) { setAnnualResults([]); setLoading(false); return }

      // Build registration lookup
      const regMap: Record<string, any> = {}
      regs.forEach((r: any) => { regMap[r.id] = r })

      // 4. Aggregate per user (one row per shooter, totals across all disciplines)
      const aggregated: Record<string, AnnualResult> = {}

      scoresData.forEach((score: any) => {
        const reg = regMap[score.registration_id]
        if (!reg) return
        if (score.is_dnf || score.is_dq) return

        const key = reg.user_id
        if (!aggregated[key]) {
          const shooter = reg.profiles
          aggregated[key] = {
            userId: reg.user_id,
            shooterName: shooter ? `${shooter.full_names} ${shooter.surname}` : 'Unknown',
            sabuNumber: shooter?.sabu_number || '',
            club: shooter?.club || '',
            province: shooter?.province || '',
            competitionScores: {},
            competitionX: {},
            competitionV: {},
            grandTotal: 0,
            totalX: 0,
            totalV: 0,
          }
        }

        const entry = aggregated[key]
        const compId = reg.competition_id
        entry.competitionScores[compId] = (entry.competitionScores[compId] || 0) + (score.score || 0)
        entry.competitionX[compId] = (entry.competitionX[compId] || 0) + (score.x_count || 0)
        entry.competitionV[compId] = (entry.competitionV[compId] || 0) + (score.v_count || 0)
        entry.grandTotal += score.score || 0
        entry.totalX += score.x_count || 0
        entry.totalV += score.v_count || 0
      })

      let resultsList = Object.values(aggregated)

      // Apply search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        resultsList = resultsList.filter(r =>
          r.shooterName.toLowerCase().includes(q) ||
          r.sabuNumber.toLowerCase().includes(q) ||
          r.club.toLowerCase().includes(q)
        )
      }

      resultsList.sort((a, b) => b.grandTotal - a.grandTotal || b.totalX - a.totalX || b.totalV - a.totalV)
      setAnnualResults(resultsList)
    } catch (error) {
      console.error('Error fetching annual results:', error)
      toast.error('Failed to load annual standings')
      setAnnualResults([])
    } finally {
      setLoading(false)
    }
  }

  const fetchResults = async () => {
    if (!selectedCompetition) return
    await fetchResultsManual()
  }

  const fetchResultsManual = async () => {
    if (!selectedCompetition) return

    const { data: scoresData } = await supabase
      .from('scores')
      .select(`
        *,
        registrations (
          id, user_id, competition_id, discipline_id, age_classification, team_id,
          profiles!registrations_user_id_fkey (full_names, surname, sabu_number, club, province),
          disciplines (id, name),
          teams (id, name)
        ),
        stages (id, stage_number, name)
      `)
      .eq('registrations.competition_id', selectedCompetition)

    if (!scoresData) { setLoading(false); return }

    const aggregated: Record<string, AggregatedResult> = {}

    scoresData.forEach((score: any) => {
      const reg = score.registrations
      if (!reg) return

      const regId = reg.id
      const shooter = reg.profiles

      if (!aggregated[regId]) {
        aggregated[regId] = {
          registrationId: regId,
          userId: reg.user_id || '',
          shooterName: shooter ? `${shooter.full_names} ${shooter.surname}` : 'Unknown',
          sabuNumber: shooter?.sabu_number || '',
          club: shooter?.club || '',
          province: shooter?.province || '',
          ageClassification: reg.age_classification || '',
          disciplineId: reg.discipline_id || '',
          disciplineName: reg.disciplines?.name || '',
          teamId: reg.team_id || null,
          teamName: reg.teams?.name || null,
          stageScores: {},
          stageXCounts: {},
          stageVCounts: {},
          totalScore: 0,
          totalX: 0,
          totalV: 0,
          hasDNF: false,
          hasDQ: false,
          hasUnverified: false,
        }
      }

      if (!score.verified_at) aggregated[regId].hasUnverified = true

      const stageId = score.stage_id
      if (score.is_dnf) {
        aggregated[regId].hasDNF = true
      } else if (score.is_dq) {
        aggregated[regId].hasDQ = true
      } else if (stageId) {
        aggregated[regId].stageScores[stageId] = score.score
        aggregated[regId].stageXCounts[stageId] = score.x_count || 0
        aggregated[regId].stageVCounts[stageId] = score.v_count || 0
        aggregated[regId].totalScore += score.score
        aggregated[regId].totalX += score.x_count || 0
        aggregated[regId].totalV += score.v_count || 0
      }
    })

    let resultsList = Object.values(aggregated)

    if (selectedDiscipline) resultsList = resultsList.filter(r => r.disciplineId === selectedDiscipline)
    if (selectedAgeClass) resultsList = resultsList.filter(r => r.ageClassification === selectedAgeClass)
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      resultsList = resultsList.filter(r =>
        r.shooterName.toLowerCase().includes(q) ||
        r.sabuNumber.toLowerCase().includes(q) ||
        r.club.toLowerCase().includes(q)
      )
    }

    resultsList.sort((a, b) => {
      if (a.hasDNF || a.hasDQ) return 1
      if (b.hasDNF || b.hasDQ) return -1
      return b.totalScore - a.totalScore || b.totalX - a.totalX || b.totalV - a.totalV
    })

    setResults(resultsList)
    setLastRefresh(new Date())

    const disciplineIds = [...new Set(resultsList.map(r => r.disciplineId).filter(Boolean))]
    if (disciplineIds.length > 0) {
      const { data: discs } = await supabase.from('disciplines').select('id, name').in('id', disciplineIds)
      if (discs) setDisciplines(discs)
    }

    setLoading(false)
    setRefreshing(false)
  }

  const handleExportCSV = () => {
    const headers = [
      'Position', 'Name', 'SABU Number', 'Club', 'Province',
      ...displayStages.map(s => stageIdToMatchLabel[s.id] || s.name || `S${s.stage_number}`),
      'Total Score', 'X Count', 'V Count',
    ]

    const rows = displayResults.map((result, index) => [
      index + 1,
      result.shooterName,
      result.sabuNumber,
      result.club,
      result.province,
      ...displayStages.map(s => result.stageScores[s.id] ?? '-'),
      result.hasDNF ? 'DNF' : result.hasDQ ? 'DQ' : result.totalScore,
      result.totalX,
      result.totalV,
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `results-${selectedCompetition}-${format(new Date(), 'yyyy-MM-dd')}.csv`
    link.click()
    toast.success('CSV exported successfully')
  }

  const handlePrint = () => window.print()

  const handleRefresh = () => {
    setRefreshing(true)
    if (viewMode === 'team') {
      fetchTeamResults().finally(() => setRefreshing(false))
    } else {
      fetchResults().finally(() => setRefreshing(false))
    }
  }

  const getMedalIcon = (position: number) => {
    if (position === 1) return <div className="flex items-center justify-center w-6 h-6 rounded-full bg-yellow-100"><Award className="h-4 w-4 text-yellow-600" /></div>
    if (position === 2) return <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100"><Award className="h-4 w-4 text-gray-500" /></div>
    if (position === 3) return <div className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-100"><Award className="h-4 w-4 text-amber-600" /></div>
    return null
  }

  // Map stageId → column label (match name + distance)
  const stageIdToMatchLabel = useMemo(() => {
    const map: Record<string, string> = {}
    matches.forEach((match: any) => {
      ;(match.match_stages || []).forEach((ms: any) => {
        if (!ms?.stage_id) return
        const dist = ms.stages?.distance || ''
        const stageName = ms.stages?.name || ''
        const suffix = dist ? ` (${dist})` : stageName ? ` (${stageName})` : ''
        map[ms.stage_id] = `${match.match_name}${suffix}`
      })
    })
    return map
  }, [matches])

  // Matches available for the match dropdown (filtered by discipline)
  const disciplineFilteredMatches = useMemo(() => {
    if (!selectedDiscipline) return matches
    return matches.filter((m: any) =>
      (m.match_stages || []).some((ms: any) => ms.discipline_id === selectedDiscipline)
    )
  }, [matches, selectedDiscipline])

  // Which stages to display as columns — limited to selected match's stage when a match is selected
  const displayStages = useMemo(() => {
    if (selectedMatch) {
      const matchObj = matches.find((m: any) => m.id === selectedMatch)
      const matchStagesList: any[] = matchObj?.match_stages || []
      // Use the match_stage for the selected discipline (not just [0])
      const ms = selectedDiscipline
        ? matchStagesList.find((s: any) => s.discipline_id === selectedDiscipline)
        : matchStagesList[0]
      if (ms?.stage_id) {
        // Prefer stage from the stages array; fall back to stage data embedded in the match
        const stage = stages.find((s: any) => s.id === ms.stage_id)
          ?? (ms.stages ? { id: ms.stage_id, ...ms.stages } : null)
        return stage ? [stage] : []
      }
      return []
    }
    return stages
  }, [selectedMatch, matches, stages, selectedDiscipline])

  // Results to display — filtered for team mode, re-sorted for selected match
  const displayResults = useMemo(() => {
    let list = viewMode === 'team' ? results.filter(r => r.teamId) : results

    if (selectedMatch) {
      const matchObj = matches.find((m: any) => m.id === selectedMatch)
      const matchStages: any[] = matchObj?.match_stages || []

      if (matchStages.length > 0) {
        // Filter to results whose discipline has a match_stage in this match
        const disciplineIds = matchStages.map((ms: any) => ms.discipline_id).filter(Boolean)
        if (disciplineIds.length > 0) {
          list = list.filter(r => disciplineIds.includes(r.disciplineId))
        }

        // Sort by the stage score for the shooter's own discipline
        list = [...list].sort((a, b) => {
          const msA = matchStages.find((ms: any) => ms.discipline_id === a.disciplineId)
          const msB = matchStages.find((ms: any) => ms.discipline_id === b.disciplineId)
          const sA = msA ? (a.stageScores[msA.stage_id] ?? -1) : -1
          const sB = msB ? (b.stageScores[msB.stage_id] ?? -1) : -1
          const xA = msA ? (a.stageXCounts[msA.stage_id] ?? 0) : 0
          const xB = msB ? (b.stageXCounts[msB.stage_id] ?? 0) : 0
          return sB - sA || xB - xA
        })
      }
    }

    return list
  }, [results, viewMode, selectedMatch, matches])

  // Event totals with per-discipline breakdown
  const competitionTotalsMap: Record<string, CompetitionTotal> = {}
  results.forEach((r) => {
    if (!competitionTotalsMap[r.userId]) {
      competitionTotalsMap[r.userId] = {
        userId: r.userId,
        shooterName: r.shooterName,
        sabuNumber: r.sabuNumber,
        club: r.club,
        province: r.province,
        disciplineScores: {},
        disciplineX: {},
        disciplineV: {},
        grandTotal: 0,
        totalX: 0,
        totalV: 0,
        hasUnverified: false,
      }
    }
    const entry = competitionTotalsMap[r.userId]
    if (!r.hasDNF && !r.hasDQ) {
      entry.disciplineScores[r.disciplineId] = (entry.disciplineScores[r.disciplineId] || 0) + r.totalScore
      entry.disciplineX[r.disciplineId] = (entry.disciplineX[r.disciplineId] || 0) + r.totalX
      entry.disciplineV[r.disciplineId] = (entry.disciplineV[r.disciplineId] || 0) + r.totalV
      entry.grandTotal += r.totalScore
      entry.totalX += r.totalX
      entry.totalV += r.totalV
    }
    if (r.hasUnverified) entry.hasUnverified = true
  })

  const competitionTotals = Object.values(competitionTotalsMap).sort((a, b) =>
    b.grandTotal - a.grandTotal || b.totalX - a.totalX || b.totalV - a.totalV
  )

  // Disciplines present in this event's results (for Event Total columns)
  const eventDisciplines = useMemo(() => {
    const seen = new Set<string>()
    const list: { id: string; name: string }[] = []
    results.forEach(r => {
      if (r.disciplineId && !seen.has(r.disciplineId)) {
        seen.add(r.disciplineId)
        const disc = disciplines.find(d => d.id === r.disciplineId)
        list.push({ id: r.disciplineId, name: disc?.name || r.disciplineName || r.disciplineId })
      }
    })
    return list
  }, [results, disciplines])

  const ageClassifications = ['Open', 'Under_19', 'Under_25', 'Veteran_60_plus', 'Veteran_70_plus']

  if (loading && competitions.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-[#1e40af] rounded-full animate-spin" />
      </div>
    )
  }

  // Mobile interface
  if (isMobile) {
    return (
      <MobileResults
        competitions={competitions}
        selectedCompetition={selectedCompetition}
        setSelectedCompetition={setSelectedCompetition}
        results={displayResults}
        teamResults={teamResults}
        competitionTotals={competitionTotals}
        stages={displayStages}
        disciplines={disciplines}
        viewMode={viewMode}
        setViewMode={(mode: string) => setViewMode(mode as any)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedDiscipline={selectedDiscipline}
        setSelectedDiscipline={setSelectedDiscipline}
        selectedAgeClass={selectedAgeClass}
        setSelectedAgeClass={setSelectedAgeClass}
        autoRefresh={autoRefresh}
        setAutoRefresh={setAutoRefresh}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        onExportCSV={handleExportCSV}
        onPrint={handlePrint}
        loading={loading}
        user={user}
      />
    )
  }

  // Desktop interface
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Event Results</h1>
          <p className="text-lg text-gray-600">Live standings — includes pending scores until verified by admin</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* Competition Selector — hidden in Annual Standings mode */}
        {viewMode !== 'annual' && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6 no-print">
            <div className="flex flex-col md:flex-row md:items-end gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Event</label>
                <select
                  value={selectedCompetition}
                  onChange={(e) => {
                    setSelectedCompetition(e.target.value)
                    setSelectedDiscipline('')
                    setSelectedAgeClass('')
                    setSelectedMatch('')
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

              <div className="flex items-center gap-3">
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className={`p-2 text-gray-600 hover:text-[#1e40af] transition-colors ${refreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title="Refresh"
                >
                  <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
                {lastRefresh && (
                  <span className="text-xs text-gray-500">
                    Updated: {format(lastRefresh, 'HH:mm:ss')}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {(selectedCompetition || viewMode === 'annual') && (
          <>
            {/* Tabs + Filters */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6 no-print">
              {/* View Mode Tabs */}
              <div className="flex flex-wrap gap-2 mb-5">
                {[
                  { id: 'match', label: 'Match Results' },
                  { id: 'total', label: 'Event Total' },
                  { id: 'team', label: 'Team Results' },
                  { id: 'annual', label: 'Annual Standings' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => { setViewMode(tab.id as any); if (tab.id !== 'match') setSelectedMatch('') }}
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
              <div className={`grid grid-cols-1 gap-4 ${viewMode === 'match' ? 'md:grid-cols-5' : viewMode === 'annual' ? 'md:grid-cols-4' : 'md:grid-cols-4'}`}>
                {/* Championship selector — Annual Standings only */}
                {viewMode === 'annual' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Championship</label>
                    <select
                      value={selectedChampionship}
                      onChange={(e) => setSelectedChampionship(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                    >
                      <option value="">Select a championship...</option>
                      {championships.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.name} ({c.year})</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Search */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Name, SABU #, Club..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Discipline */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Discipline</label>
                  <select
                    value={selectedDiscipline}
                    onChange={(e) => {
                      setSelectedDiscipline(e.target.value)
                      setSelectedMatch('')
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                  >
                    <option value="">All Disciplines</option>
                    {disciplines.map((disc) => (
                      <option key={disc.id} value={disc.id}>{disc.name}</option>
                    ))}
                  </select>
                </div>

                {/* Match — only relevant in Match Results view */}
                {viewMode === 'match' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Match</label>
                    <select
                      value={selectedMatch}
                      onChange={(e) => setSelectedMatch(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                      disabled={disciplineFilteredMatches.length === 0}
                    >
                      <option value="">All Matches</option>
                      {disciplineFilteredMatches.map((match: any) => {
                        const ms = selectedDiscipline
                          ? (match.match_stages || []).find((s: any) => s.discipline_id === selectedDiscipline)
                          : match.match_stages?.[0]
                        return (
                          <option key={match.id} value={match.id}>
                            {match.match_name}
                            {ms?.stages?.distance ? ` (${ms.stages.distance})` : ''}
                          </option>
                        )
                      })}
                    </select>
                  </div>
                )}

                {/* Age Classification — not applicable in Annual Standings */}
                {viewMode !== 'annual' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Age Class</label>
                    <select
                      value={selectedAgeClass}
                      onChange={(e) => setSelectedAgeClass(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                    >
                      <option value="">All Classifications</option>
                      {ageClassifications.map((ac) => (
                        <option key={ac} value={ac}>{ac.replace(/_/g, ' ')}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Auto-refresh — not applicable in Annual Standings */}
                {viewMode !== 'annual' && (
                  <div className="flex flex-col justify-end">
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer pb-2">
                      <input
                        type="checkbox"
                        checked={autoRefresh}
                        onChange={(e) => setAutoRefresh(e.target.checked)}
                        className="h-4 w-4 text-[#1e40af] focus:ring-[#1e40af] border-gray-300 rounded"
                      />
                      Auto-refresh (30s)
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Export Buttons */}
            <div className="flex flex-wrap gap-2 mb-6 no-print">
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

            {/* Results */}
            {viewMode === 'annual' ? (
              annualResults.length === 0 ? (
                <div className="bg-white rounded-lg shadow-md p-12 text-center">
                  <Trophy className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 text-lg">
                    {!selectedChampionship
                      ? 'Select a championship above to view annual standings'
                      : loading
                      ? 'Loading...'
                      : 'No results found for this championship'}
                  </p>
                </div>
              ) : (
                <div ref={resultsRef} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <h2 className="text-lg font-bold text-gray-900">
                      {championships.find((c: any) => c.id === selectedChampionship)?.name || 'Annual Standings'}
                      {selectedDiscipline && disciplines.find(d => d.id === selectedDiscipline)
                        ? ` · ${disciplines.find(d => d.id === selectedDiscipline)?.name}`
                        : ''}
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Cumulative totals across {yearCompetitions.length} event{yearCompetitions.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pos</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SABU #</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Club</th>
                          {yearCompetitions.map(comp => (
                            <th key={comp.id} className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                              {comp.name}
                              <div className="text-gray-400 font-normal normal-case">{format(new Date(comp.start_date), 'MMM yyyy')}</div>
                            </th>
                          ))}
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">X</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">V</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {annualResults.map((entry, index) => {
                          const position = index + 1
                          const isCurrentUser = user && entry.userId === user.id
                          return (
                            <tr key={entry.userId} className={isCurrentUser ? 'bg-blue-50 border-l-4 border-[#1e40af]' : ''}>
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  {getMedalIcon(position)}
                                  <span className={`text-sm font-semibold ${position <= 3 ? 'text-gray-900' : 'text-gray-700'}`}>{position}</span>
                                </div>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  {entry.shooterName}
                                  {isCurrentUser && <span className="ml-2 text-xs text-[#1e40af]">(You)</span>}
                                </div>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{entry.sabuNumber || '-'}</td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{entry.club || '-'}</td>
                              {yearCompetitions.map(comp => (
                                <td key={comp.id} className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-700">
                                  {entry.competitionScores[comp.id] != null ? entry.competitionScores[comp.id] : '-'}
                                </td>
                              ))}
                              <td className="px-4 py-4 whitespace-nowrap text-right">
                                <span className="text-sm font-bold text-gray-900">{entry.grandTotal}</span>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-900">{entry.totalX}</td>
                              <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-900">{entry.totalV}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            ) : viewMode === 'total' ? (
              competitionTotals.length === 0 ? (
                <div className="bg-white rounded-lg shadow-md p-12 text-center">
                  <Trophy className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 text-lg">No results found</p>
                </div>
              ) : (
                <div ref={resultsRef} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="hidden print:block p-6 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-gray-900">
                      {competitions.find(c => c.id === selectedCompetition)?.name} — Event Total
                    </h2>
                    <p className="text-gray-600 mt-1">Results - {format(new Date(), 'MMMM d, yyyy')}</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pos</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SABU #</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Club</th>
                          {eventDisciplines.map(disc => (
                            <th key={disc.id} className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {disc.name}
                            </th>
                          ))}
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Grand Total</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">X</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">V</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {competitionTotals.map((entry, index) => {
                          const position = index + 1
                          const isCurrentUser = user && entry.userId === user.id
                          return (
                            <tr key={entry.userId} className={isCurrentUser ? 'bg-blue-50 border-l-4 border-[#1e40af]' : ''}>
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  {getMedalIcon(position)}
                                  <span className={`text-sm font-semibold ${position <= 3 ? 'text-gray-900' : 'text-gray-700'}`}>{position}</span>
                                </div>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  {entry.shooterName}
                                  {isCurrentUser && <span className="ml-2 text-xs text-[#1e40af]">(You)</span>}
                                </div>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{entry.sabuNumber || '-'}</td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{entry.club || '-'}</td>
                              {eventDisciplines.map(disc => (
                                <td key={disc.id} className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-700">
                                  {entry.disciplineScores[disc.id] != null
                                    ? entry.disciplineScores[disc.id]
                                    : '-'}
                                </td>
                              ))}
                              <td className="px-4 py-4 whitespace-nowrap text-right">
                                <div className="flex flex-col items-end gap-0.5">
                                  <span className="text-sm font-bold text-gray-900">{entry.grandTotal}</span>
                                  {entry.hasUnverified && (
                                    <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700 font-medium">Provisional</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-900">{entry.totalX}</td>
                              <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-900">{entry.totalV}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            ) : viewMode === 'team' ? (
              teamResults.length === 0 ? (
                <div className="bg-white rounded-lg shadow-md p-12 text-center">
                  <Trophy className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 text-lg">No team results found</p>
                </div>
              ) : (
                <div ref={resultsRef} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="hidden print:block p-6 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-gray-900">
                      {competitions.find(c => c.id === selectedCompetition)?.name} — Team Results
                    </h2>
                    <p className="text-gray-600 mt-1">Results - {format(new Date(), 'MMMM d, yyyy')}</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pos</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team Name</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Province</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Discipline</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Members</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Score</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">X Count</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">V Count</th>
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
                                  <span className={`text-sm font-semibold ${position <= 3 ? 'text-gray-900' : 'text-gray-700'}`}>{position}</span>
                                </div>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{team.team_name}</td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{team.province || '-'}</td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{team.discipline_name}</td>
                              <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-gray-500">{team.scores_counted} / {team.member_count}</td>
                              <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-bold text-gray-900">{team.total_score}</td>
                              <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-900">{team.total_x_count}</td>
                              <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-900">{team.total_v_count}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            ) : viewMode === 'match' && !selectedDiscipline ? (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <Trophy className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-900 font-semibold text-lg mb-2">Select a Discipline</p>
                <p className="text-gray-500">Choose a discipline from the filter above to view match results.</p>
              </div>
            ) : displayResults.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <Trophy className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 text-lg">No results found</p>
              </div>
            ) : (
              // Match Results table
              <div ref={resultsRef} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="hidden print:block p-6 border-b border-gray-200">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {competitions.find(c => c.id === selectedCompetition)?.name}
                    {selectedMatch && ` — ${matches.find((m: any) => m.id === selectedMatch)?.match_name}`}
                  </h2>
                  <p className="text-gray-600 mt-1">Results - {format(new Date(), 'MMMM d, yyyy')}</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pos</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SABU #</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Club</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Province</th>
                        {displayStages.map((stage) => (
                          <th key={stage.id} className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {stageIdToMatchLabel[stage.id] || stage.name || `S${stage.stage_number}`}
                          </th>
                        ))}
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">X</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">V</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {displayResults.map((result, index) => {
                        const position = index + 1
                        const isCurrentUser = user && result.userId === user.id
                        return (
                          <tr key={result.registrationId} className={isCurrentUser ? 'bg-blue-50 border-l-4 border-[#1e40af]' : ''}>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                {getMedalIcon(position)}
                                <span className={`text-sm font-semibold ${position <= 3 ? 'text-gray-900' : 'text-gray-700'}`}>{position}</span>
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {result.shooterName}
                                {isCurrentUser && <span className="ml-2 text-xs text-[#1e40af]">(You)</span>}
                              </div>
                              {result.teamName && <div className="text-xs text-gray-500">Team: {result.teamName}</div>}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{result.sabuNumber || '-'}</td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{result.club || '-'}</td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{result.province || '-'}</td>
                            {displayStages.map((stage) => {
                              const score = result.stageScores[stage.id]
                              return (
                                <td key={stage.id} className="px-3 py-4 whitespace-nowrap text-sm text-center text-gray-900 font-medium">
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
                                <div className="flex flex-col items-end gap-0.5">
                                  <span className="text-sm font-bold text-gray-900">
                                    {displayStages.reduce((sum, s) => sum + (result.stageScores[s.id] || 0), 0)}
                                  </span>
                                  {result.hasUnverified && (
                                    <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700 font-medium">Provisional</span>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-900">{result.totalX}</td>
                            <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-900">{result.totalV}</td>
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

      <style jsx global>{`
        @media print {
          body { background: white; }
          .no-print { display: none; }
          table { border-collapse: collapse; }
          th, td { border: 1px solid #e5e7eb; padding: 8px; }
          .bg-blue-50 { background-color: #eff6ff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  )
}
