'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, XCircle, Edit, Eye, Download, Filter, X, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import type { Database } from '@/types/database'

type Score = Database['public']['Tables']['scores']['Row']

export default function AdminVerifyScoresPage() {
  const [scores, setScores] = useState<any[]>([])
  const [competitions, setCompetitions] = useState<any[]>([])
  const [disciplines, setDisciplines] = useState<any[]>([])
  const [stages, setStages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedScores, setSelectedScores] = useState<Set<string>>(new Set())
  const [editingScore, setEditingScore] = useState<string | null>(null)
  const [rejectingScore, setRejectingScore] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [viewingScore, setViewingScore] = useState<string | null>(null)
  const supabase = createClient()

  const [filters, setFilters] = useState({
    competitionId: '',
    disciplineId: '',
    stageId: '',
    status: 'pending', // Default to pending (unverified) scores
  })

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    fetchScores()
  }, [filters])

  const fetchData = async () => {
    // Fetch competitions
    const { data: comps } = await supabase
      .from('competitions')
      .select('id, name')
      .eq('is_active', true)
      .order('start_date', { ascending: false })

    if (comps) setCompetitions(comps)

    // Fetch disciplines
    const { data: discs } = await supabase
      .from('disciplines')
      .select('id, name')
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (discs) setDisciplines(discs)

    setLoading(false)
  }

  const fetchScores = async () => {
    setLoading(true)

    // Build query to fetch scores with all related data
    let query = supabase
      .from('scores')
      .select(`
        *,
        stages (
          id,
          name,
          stage_number,
          competition_id
        ),
        registrations!inner (
          id,
          entry_number,
          user_id,
          competition_id,
          discipline_id,
          profiles!registrations_user_id_fkey (
            full_names,
            surname,
            sabu_number
          ),
          competitions!inner (
            id,
            name
          ),
          disciplines (
            id,
            name
          )
        ),
        submitted_by_profile:profiles!scores_submitted_by_fkey (
          full_names,
          surname
        ),
        verified_by_profile:profiles!scores_verified_by_fkey (
          full_names,
          surname
        )
      `)
      .order('submitted_at', { ascending: false })

    // Apply status filter - default to unverified (pending)
    if (filters.status === 'pending') {
      query = query.is('verified_at', null)
    } else if (filters.status === 'verified') {
      query = query.not('verified_at', 'is', null)
    }
    // If 'all', don't filter by verification status

    const { data, error } = await query

    if (error) {
      console.error('Error fetching scores:', error)
      toast.error('Error fetching scores')
    } else {
      let filtered = data || []

      // Filter by competition
      if (filters.competitionId) {
        filtered = filtered.filter(
          (score: any) => score.registrations?.competition_id === filters.competitionId
        )
      }

      // Filter by discipline
      if (filters.disciplineId) {
        filtered = filtered.filter(
          (score: any) => score.registrations?.discipline_id === filters.disciplineId
        )
      }

      // Filter by stage
      if (filters.stageId) {
        filtered = filtered.filter((score: any) => score.stage_id === filters.stageId)
      }

      setScores(filtered)

      // Update stages based on selected competition
      if (filters.competitionId) {
        const { data: compStages } = await supabase
          .from('stages')
          .select('id, name, stage_number')
          .eq('competition_id', filters.competitionId)
          .order('stage_number', { ascending: true })

        if (compStages) setStages(compStages)
      } else {
        setStages([])
      }
    }

    setLoading(false)
  }

  const handleVerify = async (scoreId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error('Not authenticated')
      return
    }

    try {
      const now = new Date().toISOString()
      const { error } = await supabase
        .from('scores')
        .update({
          verified_at: now,
          verified_by: user.id,
        })
        .eq('id', scoreId)

      if (error) {
        console.error('Error verifying score:', error)
        throw error
      }

      toast.success('Score verified successfully')
      fetchScores()
      setSelectedScores(new Set())
    } catch (error: any) {
      console.error('Error verifying score:', error)
      let errorMessage = 'Error verifying score'
      if (error.message) {
        errorMessage = error.message
      } else if (error.code) {
        switch (error.code) {
          case '42501':
            errorMessage = 'Permission denied. Please ensure you have admin access.'
            break
          case '23503':
            errorMessage = 'Invalid score or user reference.'
            break
          default:
            errorMessage = `Error: ${error.code}`
        }
      }
      toast.error(errorMessage)
    }
  }

  const handleBulkVerify = async () => {
    if (selectedScores.size === 0) {
      toast.error('Please select scores to verify')
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error('Not authenticated')
      return
    }

    try {
      const { error } = await supabase
        .from('scores')
        .update({
          verified_at: new Date().toISOString(),
          verified_by: user.id,
        })
        .in('id', Array.from(selectedScores))

      if (error) throw error

      toast.success(`${selectedScores.size} score(s) verified successfully`)
      fetchScores()
      setSelectedScores(new Set())
    } catch (error: any) {
      console.error('Error bulk verifying scores:', error)
      toast.error(error.message || 'Error verifying scores')
    }
  }

  const handleReject = async () => {
    if (!rejectingScore || !rejectReason.trim()) {
      toast.error('Please provide a rejection reason')
      return
    }

    try {
      const score = scores.find((s: any) => s.id === rejectingScore)
      if (!score) {
        toast.error('Score not found')
        return
      }

      // For rejection, update notes with rejection reason and clear verification
      const existingNotes = score.notes || ''
      const rejectionNote = `REJECTED: ${rejectReason}${existingNotes ? ` | Previous notes: ${existingNotes}` : ''}`

      const { error } = await supabase
        .from('scores')
        .update({
          verified_at: null,
          verified_by: null,
          notes: rejectionNote,
        })
        .eq('id', rejectingScore)

      if (error) {
        console.error('Error rejecting score:', error)
        throw error
      }

      toast.success('Score rejected. The shooter can resubmit after making corrections.')
      setRejectingScore(null)
      setRejectReason('')
      fetchScores()
    } catch (error: any) {
      console.error('Error rejecting score:', error)
      toast.error(error.message || 'Error rejecting score')
    }
  }

  const handleEditScore = async (scoreId: string, newScore: number, newX: number, newV: number) => {
    try {
      const { error } = await supabase
        .from('scores')
        .update({
          score: newScore,
          x_count: newX,
          v_count: newV,
        })
        .eq('id', scoreId)

      if (error) throw error

      toast.success('Score updated successfully')
      setEditingScore(null)
      fetchScores()
    } catch (error: any) {
      console.error('Error updating score:', error)
      toast.error(error.message || 'Error updating score')
    }
  }

  const handleExport = () => {
    const scoresToExport = selectedScores.size > 0
      ? scores.filter((s: any) => selectedScores.has(s.id))
      : scores

    const csvData = scoresToExport.map((score: any) => {
      const shooter = score.registrations?.profiles
      const shooterName = shooter ? `${shooter.full_names} ${shooter.surname}` : 'Unknown'
      const sabuNumber = shooter?.sabu_number || ''

      return {
        'Entry Number': score.registrations?.entry_number || '',
        'Shooter Name': shooterName,
        'SABU Number': sabuNumber,
        'Competition': score.registrations?.competitions?.name || '',
        'Discipline': score.registrations?.disciplines?.name || '',
        'Stage': score.stages?.name || '',
        'Score': score.is_dnf ? 'DNF' : score.is_dq ? 'DQ' : score.score,
        'X Count': score.x_count || 0,
        'V Count': score.v_count || 0,
        'Status': score.verified_at ? 'Verified' : 'Pending',
        'Submitted At': score.submitted_at
          ? format(new Date(score.submitted_at), 'yyyy-MM-dd HH:mm')
          : '',
        'Verified At': score.verified_at
          ? format(new Date(score.verified_at), 'yyyy-MM-dd HH:mm')
          : '',
        'Notes': score.notes || '',
      }
    })

    // Convert to CSV
    const headers = Object.keys(csvData[0] || {})
    const csvRows = [
      headers.join(','),
      ...csvData.map((row) =>
        headers.map((header) => `"${String(row[header as keyof typeof row] || '').replace(/"/g, '""')}"`).join(',')
      ),
    ]

    const csvContent = csvRows.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `scores-export-${format(new Date(), 'yyyy-MM-dd')}.csv`
    link.click()

    toast.success(`Exported ${scoresToExport.length} score(s)`)
  }

  const toggleSelectScore = (scoreId: string) => {
    const newSelected = new Set(selectedScores)
    if (newSelected.has(scoreId)) {
      newSelected.delete(scoreId)
    } else {
      newSelected.add(scoreId)
    }
    setSelectedScores(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedScores.size === scores.length) {
      setSelectedScores(new Set())
    } else {
      setSelectedScores(new Set(scores.map((s: any) => s.id)))
    }
  }

  if (loading && scores.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-[#1e40af] rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Score Verification</h1>
        <p className="text-gray-600">Verify and manage submitted scores</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Verification</p>
              <p className="text-2xl font-bold text-yellow-600">
                {scores.filter((s: any) => !s.verified_at).length}
              </p>
            </div>
            <Clock className="h-8 w-8 text-yellow-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Verified</p>
              <p className="text-2xl font-bold text-green-600">
                {scores.filter((s: any) => s.verified_at).length}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Scores</p>
              <p className="text-2xl font-bold text-gray-900">{scores.length}</p>
            </div>
            <Eye className="h-8 w-8 text-gray-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center mb-4">
          <Filter className="h-5 w-5 mr-2 text-[#1e40af]" />
          <h2 className="text-lg font-bold text-gray-900">Filters</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Competition</label>
            <select
              value={filters.competitionId}
              onChange={(e) => {
                setFilters({ ...filters, competitionId: e.target.value, stageId: '' })
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
            >
              <option value="">All Competitions</option>
              {competitions.map((comp) => (
                <option key={comp.id} value={comp.id}>
                  {comp.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Discipline</label>
            <select
              value={filters.disciplineId}
              onChange={(e) => setFilters({ ...filters, disciplineId: e.target.value })}
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Stage</label>
            <select
              value={filters.stageId}
              onChange={(e) => setFilters({ ...filters, stageId: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
              disabled={!filters.competitionId}
            >
              <option value="">All Stages</option>
              {stages.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="verified">Verified</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedScores.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <span className="text-blue-800 font-semibold">
            {selectedScores.size} score(s) selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={handleBulkVerify}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Verify Selected
            </button>
            <button
              onClick={handleExport}
              className="flex items-center px-4 py-2 bg-[#1e40af] text-white rounded-lg hover:bg-[#1e3a8a] transition-colors"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Selected
            </button>
          </div>
        </div>
      )}

      {/* Scores Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedScores.size === scores.length && scores.length > 0}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 text-[#1e40af] focus:ring-[#1e40af] border-gray-300 rounded"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Shooter
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Competition / Discipline
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Score Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Submitted
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {scores.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    {filters.status === 'pending' 
                      ? 'No pending scores to verify.' 
                      : 'No scores found matching the filters.'}
                  </td>
                </tr>
              ) : (
                scores.map((score: any) => {
                  // Extract shooter info from nested structure
                  const shooter = score.registrations?.profiles || score.registrations?.profiles
                  const shooterName = shooter 
                    ? `${shooter.full_names || ''} ${shooter.surname || ''}`.trim() 
                    : 'Unknown'
                  const sabuNumber = shooter?.sabu_number || ''
                  const isVerified = !!score.verified_at
                  const isSelected = selectedScores.has(score.id)
                  const competitionName = score.registrations?.competitions?.name || '-'
                  const stageName = score.stages?.name || `Stage ${score.stages?.stage_number || ''}`

                  return (
                    <tr key={score.id} className={isSelected ? 'bg-blue-50' : isVerified ? '' : 'bg-yellow-50/30'}>
                      <td className="px-6 py-4">
                        {!isVerified && (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectScore(score.id)}
                            className="h-4 w-4 text-[#1e40af] focus:ring-[#1e40af] border-gray-300 rounded"
                          />
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{shooterName}</div>
                        <div className="text-sm text-gray-500">SABU: {sabuNumber || 'N/A'}</div>
                        {score.registrations?.entry_number && (
                          <div className="text-xs text-gray-400">
                            Entry: {score.registrations.entry_number}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {competitionName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {score.registrations?.disciplines?.name || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {stageName}
                      </td>
                      <td className="px-6 py-4">
                        {score.is_dnf ? (
                          <span className="text-red-600 font-semibold">DNF</span>
                        ) : score.is_dq ? (
                          <span className="text-red-600 font-semibold">DQ</span>
                        ) : (
                          <div className="text-sm">
                            <div className="font-semibold text-gray-900">Score: {score.score}</div>
                            <div className="text-gray-600">
                              X: {score.x_count || 0} | V: {score.v_count || 0}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="text-xs">
                          {score.submitted_at
                            ? format(new Date(score.submitted_at), 'MMM d, yyyy HH:mm')
                            : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isVerified ? (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 flex items-center w-fit">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Verified
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 flex items-center w-fit">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          {!isVerified && (
                            <>
                              <button
                                onClick={() => handleVerify(score.id)}
                                className="text-green-600 hover:text-green-800 p-1 rounded hover:bg-green-50"
                                title="Quick Verify"
                              >
                                <CheckCircle className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => setEditingScore(score.id)}
                                className="text-[#1e40af] hover:text-[#1e3a8a] p-1 rounded hover:bg-blue-50"
                                title="Edit Score"
                              >
                                <Edit className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => setRejectingScore(score.id)}
                                className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
                                title="Reject Score"
                              >
                                <XCircle className="h-5 w-5" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => setViewingScore(score.id)}
                            className="text-gray-600 hover:text-gray-800 p-1 rounded hover:bg-gray-50"
                            title="View Details"
                          >
                            <Eye className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Export All Button */}
      {scores.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={handleExport}
            className="flex items-center px-4 py-2 bg-[#1e40af] text-white rounded-lg hover:bg-[#1e3a8a] transition-colors"
          >
            <Download className="h-4 w-4 mr-2" />
            Export All ({scores.length})
          </button>
        </div>
      )}

      {/* Edit Score Modal */}
      {editingScore && (
        <EditScoreModal
          score={scores.find((s: any) => s.id === editingScore)}
          onSave={handleEditScore}
          onClose={() => setEditingScore(null)}
        />
      )}

      {/* Reject Score Modal */}
      {rejectingScore && (
        <RejectScoreModal
          onReject={handleReject}
          onClose={() => {
            setRejectingScore(null)
            setRejectReason('')
          }}
          reason={rejectReason}
          onReasonChange={setRejectReason}
        />
      )}

      {/* View Details Modal */}
      {viewingScore && (
        <ViewScoreModal
          score={scores.find((s: any) => s.id === viewingScore)}
          onClose={() => setViewingScore(null)}
        />
      )}
    </div>
  )
}

// Edit Score Modal Component
function EditScoreModal({
  score,
  onSave,
  onClose,
}: {
  score: any
  onSave: (scoreId: string, newScore: number, newX: number, newV: number) => void
  onClose: () => void
}) {
  const [newScore, setNewScore] = useState(score?.score || 0)
  const [newX, setNewX] = useState(score?.x_count || 0)
  const [newV, setNewV] = useState(score?.v_count || 0)

  if (!score) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Edit Score</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Total Score</label>
              <input
                type="number"
                value={newScore}
                onChange={(e) => setNewScore(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">X Count</label>
              <input
                type="number"
                value={newX}
                onChange={(e) => setNewX(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">V Count</label>
              <input
                type="number"
                value={newV}
                onChange={(e) => setNewV(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                min="0"
              />
            </div>
          </div>
          <div className="flex justify-end gap-4 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => onSave(score.id, newScore, newX, newV)}
              className="px-4 py-2 bg-[#1e40af] text-white rounded-lg hover:bg-[#1e3a8a] transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Reject Score Modal Component
function RejectScoreModal({
  onReject,
  onClose,
  reason,
  onReasonChange,
}: {
  onReject: () => void
  onClose: () => void
  reason: string
  onReasonChange: (reason: string) => void
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Reject Score</h3>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rejection Reason *
            </label>
            <textarea
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
              placeholder="Enter reason for rejection..."
              required
            />
          </div>
          <div className="flex justify-end gap-4">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onReject}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Reject Score
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// View Score Details Modal Component
function ViewScoreModal({ score, onClose }: { score: any; onClose: () => void }) {
  if (!score) return null

  const shooter = score.registrations?.profiles
  const shooterName = shooter ? `${shooter.full_names} ${shooter.surname}` : 'Unknown'
  const sabuNumber = shooter?.sabu_number || ''

  // Try to parse round-by-round data from notes
  let roundData = null
  try {
    if (score.notes) {
      const parsed = JSON.parse(score.notes)
      if (parsed.rounds) {
        roundData = parsed.rounds
      }
    }
  } catch (e) {
    // Notes is not JSON, ignore
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">Score Details</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-600">Shooter</div>
                <div className="font-semibold text-gray-900">{shooterName}</div>
                <div className="text-sm text-gray-500">SABU: {sabuNumber || 'N/A'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Entry Number</div>
                <div className="font-semibold text-gray-900">
                  {score.registrations?.entry_number || '-'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-600">Competition</div>
                <div className="font-semibold text-gray-900">
                  {score.registrations?.competitions?.name || '-'}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Discipline</div>
                <div className="font-semibold text-gray-900">
                  {score.registrations?.disciplines?.name || '-'}
                </div>
              </div>
            </div>

            <div>
              <div className="text-sm text-gray-600">Stage</div>
              <div className="font-semibold text-gray-900">
                {score.stages?.name || `Stage ${score.stages?.stage_number || ''}`}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg">
              <div>
                <div className="text-sm text-gray-600">Total Score</div>
                <div className="text-2xl font-bold text-gray-900">
                  {score.is_dnf ? 'DNF' : score.is_dq ? 'DQ' : score.score}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">X Count</div>
                <div className="text-2xl font-bold text-gray-900">{score.x_count || 0}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">V Count</div>
                <div className="text-2xl font-bold text-gray-900">{score.v_count || 0}</div>
              </div>
            </div>

            {roundData && (
              <div>
                <div className="text-sm font-semibold text-gray-900 mb-2">Round-by-Round Scores</div>
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-300 px-3 py-2 text-left text-xs font-semibold">
                          Round
                        </th>
                        <th className="border border-gray-300 px-3 py-2 text-left text-xs font-semibold">
                          Score
                        </th>
                        <th className="border border-gray-300 px-3 py-2 text-center text-xs font-semibold">
                          X
                        </th>
                        <th className="border border-gray-300 px-3 py-2 text-center text-xs font-semibold">
                          V
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {roundData.map((round: any, index: number) => (
                        <tr key={index}>
                          <td className="border border-gray-300 px-3 py-2 text-sm">{round.round}</td>
                          <td className="border border-gray-300 px-3 py-2 text-sm">{round.score}</td>
                          <td className="border border-gray-300 px-3 py-2 text-center">
                            {round.isX ? '✓' : '-'}
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-center">
                            {round.isV ? '✓' : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-600">Submitted By</div>
                <div className="font-semibold text-gray-900">
                  {score.submitted_by_profile
                    ? `${score.submitted_by_profile.full_names} ${score.submitted_by_profile.surname}`
                    : 'Unknown'}
                </div>
                <div className="text-sm text-gray-500">
                  {score.submitted_at ? format(new Date(score.submitted_at), 'MMM d, yyyy HH:mm') : '-'}
                </div>
              </div>
              {score.verified_at && (
                <div>
                  <div className="text-sm text-gray-600">Verified By</div>
                  <div className="font-semibold text-gray-900">
                    {score.verified_by_profile
                      ? `${score.verified_by_profile.full_names} ${score.verified_by_profile.surname}`
                      : 'Unknown'}
                  </div>
                  <div className="text-sm text-gray-500">
                    {format(new Date(score.verified_at), 'MMM d, yyyy HH:mm')}
                  </div>
                </div>
              )}
            </div>

            {score.notes && (
              <div>
                <div className="text-sm font-semibold text-gray-900 mb-2">Notes</div>
                <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                  {score.notes}
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#1e40af] text-white rounded-lg hover:bg-[#1e3a8a] transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
