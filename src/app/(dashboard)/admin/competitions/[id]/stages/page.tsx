'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, Save, ArrowLeft, Target, Calendar, X } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { format } from 'date-fns'
import type { Database } from '@/types/database'

type Stage = Database['public']['Tables']['stages']['Row']
type StageInsert = Database['public']['Tables']['stages']['Insert']
type Competition = Database['public']['Tables']['competitions']['Row']
interface StageForm {
  id: string | null
  name: string
  stage_number: number
  distance: number | null
  rounds: number | null
  sighters: number | null
  max_score: number | null
  stage_date: string | null
}

const DISTANCES = [300, 500, 600, 900, 1000]

const DEFAULT_STAGES = [
  { name: 'Stage 1 - 300m', stage_number: 1, distance: 300, rounds: 10, sighters: 2, max_score: 5 },
  { name: 'Stage 2 - 500m', stage_number: 2, distance: 500, rounds: 10, sighters: 2, max_score: 5 },
  { name: 'Stage 3 - 600m', stage_number: 3, distance: 600, rounds: 10, sighters: 2, max_score: 5 },
  { name: 'Stage 4 - 900m', stage_number: 4, distance: 900, rounds: 10, sighters: 2, max_score: 5 },
]

export default function CompetitionStagesPage() {
  const params = useParams()
  const router = useRouter()
  const competitionId = params.id as string
  const supabase = createClient()

  const [competition, setCompetition] = useState<Competition | null>(null)
  const [stages, setStages] = useState<Stage[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingStageId, setEditingStageId] = useState<string | null>(null)
  const [formData, setFormData] = useState<StageForm>({
    id: null,
    name: '',
    stage_number: 1,
    distance: null,
    rounds: 10,
    sighters: 2,
    max_score: 5,
    stage_date: null,
  })

  useEffect(() => {
    if (competitionId) {
      fetchData()
    }
  }, [competitionId])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch competition
      const { data: comp, error: compError } = await supabase
        .from('competitions')
        .select('*')
        .eq('id', competitionId)
        .single()

      if (compError || !comp) {
        toast.error('Competition not found')
        router.push('/admin/competitions')
        return
      }

      setCompetition(comp)

      // Fetch stages
      const { data: stagesData, error: stagesError } = await supabase
        .from('stages')
        .select('*')
        .eq('competition_id', competitionId)
        .order('stage_number', { ascending: true })

      if (stagesError) {
        console.error('Error fetching stages:', stagesError)
        toast.error('Error loading stages')
      } else {
        setStages(stagesData || [])
      }
    } catch (error: any) {
      console.error('Error fetching data:', error)
      toast.error('Error loading data')
    } finally {
      setLoading(false)
    }
  }

  const handleAddDefaultStages = async () => {
    if (!competitionId) return

    setSaving(true)
    try {
      const stageInserts: StageInsert[] = DEFAULT_STAGES.map((stage) => ({
        competition_id: competitionId,
        name: stage.name,
        stage_number: stage.stage_number,
        distance: stage.distance,
        rounds: stage.rounds,
        sighters: stage.sighters,
        max_score: stage.max_score,
        stage_date: null,
      }))

      const { error } = await supabase.from('stages').insert(stageInserts)

      if (error) throw error

      toast.success('Default stages added successfully')
      fetchData()
    } catch (error: any) {
      console.error('Error adding default stages:', error)
      toast.error(error.message || 'Error adding default stages')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (stage: Stage) => {
    setFormData({
      id: stage.id,
      name: stage.name,
      stage_number: stage.stage_number,
      distance: stage.distance,
      rounds: stage.rounds,
      sighters: stage.sighters,
      max_score: stage.max_score,
      stage_date: stage.stage_date ? stage.stage_date.split('T')[0] : null,
    })
    setEditingStageId(stage.id)
    setShowForm(true)
  }

  const handleDelete = async (stageId: string) => {
    if (!confirm('Are you sure you want to delete this stage? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase.from('stages').delete().eq('id', stageId)

      if (error) throw error

      toast.success('Stage deleted successfully')
      fetchData()
    } catch (error: any) {
      console.error('Error deleting stage:', error)
      toast.error(error.message || 'Error deleting stage')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      if (!formData.name || !formData.stage_number) {
        toast.error('Stage name and number are required')
        setSaving(false)
        return
      }

      const stageData: StageInsert = {
        competition_id: competitionId,
        name: formData.name,
        stage_number: formData.stage_number,
        distance: formData.distance || null,
        rounds: formData.rounds || null,
        sighters: formData.sighters || null,
        max_score: formData.max_score || null,
        stage_date: formData.stage_date || null,
      }

      if (editingStageId) {
        // Update existing stage
        const { error } = await supabase
          .from('stages')
          .update(stageData)
          .eq('id', editingStageId)

        if (error) throw error
        toast.success('Stage updated successfully')
      } else {
        // Create new stage
        const { error } = await supabase.from('stages').insert(stageData)

        if (error) throw error
        toast.success('Stage created successfully')
      }

      resetForm()
      fetchData()
    } catch (error: any) {
      console.error('Error saving stage:', error)
      toast.error(error.message || 'Error saving stage')
    } finally {
      setSaving(false)
    }
  }

  const resetForm = () => {
    setFormData({
      id: null,
      name: '',
      stage_number: stages.length > 0 ? Math.max(...stages.map(s => s.stage_number)) + 1 : 1,
      distance: null,
      rounds: 10,
      sighters: 2,
      max_score: 5,
      stage_date: null,
    })
    setEditingStageId(null)
    setShowForm(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-[#1e40af] rounded-full animate-spin" />
      </div>
    )
  }

  if (!competition) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-800">Competition not found</p>
          <Link href="/admin/competitions" className="text-[#1e40af] hover:underline mt-2 inline-block">
            Back to Competitions
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/competitions"
          className="inline-flex items-center text-[#1e40af] hover:text-[#1e3a8a] font-semibold mb-4"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Competitions
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Manage Stages</h1>
            <p className="text-gray-600 mt-1">{competition.name}</p>
          </div>
          <div className="flex gap-2">
            {stages.length === 0 && (
              <button
                onClick={handleAddDefaultStages}
                disabled={saving}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <Target className="h-5 w-5 mr-2" />
                Add Default Stages
              </button>
            )}
            <button
              onClick={() => {
                resetForm()
                setShowForm(true)
              }}
              className="flex items-center px-4 py-2 bg-[#1e40af] text-white rounded-lg hover:bg-[#1e3a8a] transition-colors"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Stage
            </button>
          </div>
        </div>
      </div>

      {/* Stages List */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
          <Target className="h-5 w-5 mr-2 text-[#1e40af]" />
          Stages ({stages.length})
        </h2>

        {stages.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Target className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">No stages configured for this competition</p>
            <p className="text-sm text-gray-500 mb-4">
              Stages are required for shooters to enter scores. Add stages manually or use the default SA Open Championships stages.
            </p>
            <button
              onClick={handleAddDefaultStages}
              disabled={saving}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <Target className="h-5 w-5 mr-2" />
              Add Default Stages
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stage #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Distance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rounds
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sighters
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Max Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stages.map((stage) => (
                  <tr key={stage.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{stage.stage_number}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{stage.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">{stage.distance ? `${stage.distance}m` : '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">{stage.rounds || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">{stage.sighters || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">{stage.max_score || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {stage.stage_date ? format(new Date(stage.stage_date), 'MMM d, yyyy') : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleEdit(stage)}
                        className="text-[#1e40af] hover:text-[#1e3a8a] mr-4"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(stage.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-5 w-5 inline-block" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full my-8">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between z-10">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingStageId ? 'Edit Stage' : 'Add Stage'}
              </h2>
              <button
                onClick={resetForm}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stage Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                    placeholder="e.g., 300m Deliberate"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stage Number *
                  </label>
                  <input
                    type="number"
                    value={formData.stage_number}
                    onChange={(e) => setFormData({ ...formData, stage_number: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                    min="1"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Distance (meters)
                  </label>
                  <select
                    value={formData.distance || ''}
                    onChange={(e) => setFormData({ ...formData, distance: e.target.value ? parseInt(e.target.value) : null })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                  >
                    <option value="">Select Distance</option>
                    {DISTANCES.map((dist) => (
                      <option key={dist} value={dist}>
                        {dist}m
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rounds
                  </label>
                  <input
                    type="number"
                    value={formData.rounds || ''}
                    onChange={(e) => setFormData({ ...formData, rounds: e.target.value ? parseInt(e.target.value) : null })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                    min="1"
                    placeholder="e.g., 10"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sighters
                  </label>
                  <input
                    type="number"
                    value={formData.sighters || ''}
                    onChange={(e) => setFormData({ ...formData, sighters: e.target.value ? parseInt(e.target.value) : null })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                    min="0"
                    placeholder="e.g., 2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Score per Shot
                  </label>
                  <input
                    type="number"
                    value={formData.max_score || ''}
                    onChange={(e) => setFormData({ ...formData, max_score: e.target.value ? parseInt(e.target.value) : null })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                    min="0"
                    placeholder="e.g., 5"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stage Date
                  </label>
                  <input
                    type="date"
                    value={formData.stage_date || ''}
                    onChange={(e) => setFormData({ ...formData, stage_date: e.target.value || null })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center px-6 py-2 bg-[#1e40af] text-white rounded-lg hover:bg-[#1e3a8a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      {editingStageId ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5 mr-2" />
                      {editingStageId ? 'Update Stage' : 'Create Stage'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

