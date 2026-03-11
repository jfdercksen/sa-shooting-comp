'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Edit, Trash2, GripVertical, Save, X, Target } from 'lucide-react'
import RichTextEditor from '@/components/forms/rich-text-editor'
import type { Database } from '@/types/database'
import { toast } from 'sonner'

type Discipline = Database['public']['Tables']['disciplines']['Row']
type DisciplineInsert = Database['public']['Tables']['disciplines']['Insert']
type DisciplineUpdate = Database['public']['Tables']['disciplines']['Update']
type Stage = Database['public']['Tables']['stages']['Row']

export default function AdminDisciplinesPage() {
  const [disciplines, setDisciplines] = useState<Discipline[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<Partial<DisciplineInsert>>({
    name: '',
    code: '',
    slug: '',
    description: '',
    equipment_requirements: '',
    rules_summary: '',
    color: '#1e40af',
    display_order: 0,
    is_active: true,
  })
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  // Stages modal (separate from discipline edit form)
  const [showStagesModal, setShowStagesModal] = useState(false)
  const [stagesDiscipline, setStagesDiscipline] = useState<Discipline | null>(null)
  const [modalStages, setModalStages] = useState<Partial<Stage>[]>([])
  const [savingStages, setSavingStages] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    fetchDisciplines()
  }, [])

  const fetchDisciplines = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('disciplines')
      .select('*')
      .order('display_order', { ascending: true, nullsFirst: false })

    if (error) {
      toast.error('Error fetching disciplines')
      console.error(error)
    } else {
      setDisciplines(data || [])
    }
    setLoading(false)
  }

  const handleManageStages = async (discipline: Discipline) => {
    setStagesDiscipline(discipline)
    setShowStagesModal(true)
    setModalStages([])
    const { data, error } = await supabase
      .from('stages')
      .select('*')
      .eq('discipline_id', discipline.id)
      .order('stage_number', { ascending: true })
    if (error) {
      toast.error('Error fetching stages')
    } else {
      setModalStages(data || [])
    }
  }

  const handleSaveStages = async () => {
    if (!stagesDiscipline) return
    setSavingStages(true)
    try {
      await supabase.from('stages').delete().eq('discipline_id', stagesDiscipline.id)
      if (modalStages.length > 0) {
        const inserts = modalStages.map((s, i) => ({
          discipline_id: stagesDiscipline.id,
          name: s.name || `Stage ${i + 1}`,
          stage_number: s.stage_number || i + 1,
          distance: s.distance ? String(s.distance) : null,
          rounds: s.rounds ?? null,
          sighters: s.sighters ?? null,
          max_score: s.max_score ?? null,
        }))
        const { error } = await supabase.from('stages').insert(inserts)
        if (error) throw error
      }
      toast.success('Stages saved')
      setShowStagesModal(false)
      setStagesDiscipline(null)
      setModalStages([])
    } catch (error: any) {
      toast.error(error.message || 'Error saving stages')
    } finally {
      setSavingStages(false)
    }
  }

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  }

  const handleNameChange = (name: string) => {
    setFormData({
      ...formData,
      name,
      slug: formData.slug || generateSlug(name),
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.code) {
      toast.error('Name and Code are required')
      return
    }

    try {
      let disciplineId = editingId

      if (editingId) {
        // Update
        const { error } = await supabase
          .from('disciplines')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          } as DisciplineUpdate)
          .eq('id', editingId)

        if (error) throw error
      } else {
        // Create
        const { data, error } = await supabase
          .from('disciplines')
          .insert({
            ...formData,
            slug: formData.slug || generateSlug(formData.name!),
          } as DisciplineInsert)
          .select()
          .single()

        if (error) throw error
        disciplineId = data.id
      }

      toast.success(editingId ? 'Discipline updated successfully' : 'Discipline created successfully')
      setShowForm(false)
      setEditingId(null)
      setFormData({
        name: '',
        code: '',
        slug: '',
        description: '',
        equipment_requirements: '',
        rules_summary: '',
        color: '#1e40af',
        display_order: disciplines.length,
        is_active: true,
      })
      fetchDisciplines()
    } catch (error: any) {
      toast.error(error.message || 'Error saving discipline')
      console.error(error)
    }
  }

  const handleEdit = (discipline: Discipline) => {
    setFormData({
      name: discipline.name,
      code: discipline.code,
      slug: discipline.slug,
      description: discipline.description || '',
      equipment_requirements: discipline.equipment_requirements || '',
      rules_summary: discipline.rules_summary || '',
      color: discipline.color || '#1e40af',
      display_order: discipline.display_order || 0,
      is_active: discipline.is_active ?? true,
    })
    setEditingId(discipline.id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this discipline?')) return

    try {
      const { error } = await supabase.from('disciplines').delete().eq('id', id)
      if (error) throw error
      toast.success('Discipline deleted successfully')
      fetchDisciplines()
    } catch (error: any) {
      toast.error(error.message || 'Error deleting discipline')
      console.error(error)
    }
  }

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null) return

    const newDisciplines = [...disciplines]
    const draggedItem = newDisciplines[draggedIndex]
    newDisciplines.splice(draggedIndex, 1)
    newDisciplines.splice(index, 0, draggedItem)
    setDisciplines(newDisciplines)
    setDraggedIndex(index)
  }

  const handleDragEnd = async () => {
    if (draggedIndex === null) return

    // Update display_order for all disciplines
    const updates = disciplines.map((discipline, index) => ({
      id: discipline.id,
      display_order: index,
    }))

    try {
      for (const update of updates) {
        await supabase
          .from('disciplines')
          .update({ display_order: update.display_order })
          .eq('id', update.id)
      }
      toast.success('Order updated successfully')
    } catch (error: any) {
      toast.error('Error updating order')
      console.error(error)
      fetchDisciplines() // Revert on error
    }

    setDraggedIndex(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-[#1e40af] rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Disciplines Management</h1>
          <p className="text-gray-600 mt-1">Manage shooting disciplines</p>
        </div>
        <button
          onClick={() => {
            setShowForm(true)
            setEditingId(null)
            setFormData({
              name: '',
              code: '',
              slug: '',
              description: '',
              equipment_requirements: '',
              rules_summary: '',
              color: '#1e40af',
              display_order: disciplines.length,
              is_active: true,
            })
            setDisciplineStages([])
          }}
          className="flex items-center px-4 py-2 bg-[#1e40af] text-white rounded-lg hover:bg-[#1e3a8a] transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Discipline
        </button>
      </div>

      {/* Helper for stage management */}
      <div className="hidden">
        {/* Placeholder for future expansion */}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingId ? 'Edit Discipline' : 'Add Discipline'}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false)
                  setEditingId(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Code *
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Slug
                  </label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                    placeholder="Auto-generated from name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formData.color || '#000000'}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="h-10 w-20 border border-gray-300 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.color || '#000000'}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                      placeholder="#1e40af"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Display Order
                  </label>
                  <input
                    type="number"
                    value={formData.display_order ?? 0}
                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active ?? false}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="h-4 w-4 text-[#1e40af] focus:ring-[#1e40af] border-gray-300 rounded"
                  />
                  <label htmlFor="is_active" className="ml-2 text-sm font-medium text-gray-700">
                    Active
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <RichTextEditor
                  content={formData.description || ''}
                  onChange={(content) => setFormData({ ...formData, description: content })}
                  placeholder="Enter discipline description..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Equipment Requirements
                </label>
                <textarea
                  value={formData.equipment_requirements || ''}
                  onChange={(e) => setFormData({ ...formData, equipment_requirements: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                  placeholder="List equipment requirements..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rules Summary
                </label>
                <textarea
                  value={formData.rules_summary || ''}
                  onChange={(e) => setFormData({ ...formData, rules_summary: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                  placeholder="Enter rules summary..."
                />
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setEditingId(null)
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center px-6 py-2 bg-[#1e40af] text-white rounded-lg hover:bg-[#1e3a8a] transition-colors"
                >
                  <Save className="h-5 w-5 mr-2" />
                  {editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                  Order
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stages
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {disciplines.map((discipline, index) => (
                <tr
                  key={discipline.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className="hover:bg-gray-50 cursor-move"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <GripVertical className="h-5 w-5 text-gray-400" />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div
                        className="w-4 h-4 rounded mr-3"
                        style={{ backgroundColor: discipline.color || '#1e40af' }}
                      />
                      <div className="text-sm font-medium text-gray-900">{discipline.name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {discipline.code}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        discipline.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {discipline.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {discipline.display_order ?? index}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleManageStages(discipline)}
                      className="flex items-center text-[#1e40af] hover:text-[#1e3a8a] bg-blue-50 px-2 py-1 rounded border border-blue-200"
                    >
                      <Target className="h-4 w-4 mr-1" />
                      Manage Stages
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(discipline)}
                        className="text-[#1e40af] hover:text-[#1e3a8a]"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(discipline.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stages Modal */}
      {showStagesModal && stagesDiscipline && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Stages</h2>
                <p className="text-sm text-gray-500 mt-1">{stagesDiscipline.name}</p>
              </div>
              <button
                onClick={() => { setShowStagesModal(false); setStagesDiscipline(null); setModalStages([]) }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {modalStages.length === 0 && (
                <p className="text-sm text-gray-500 italic">No stages yet. Click "Add Stage" to create one.</p>
              )}
              {modalStages.map((stage, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-700">Stage {index + 1}</h4>
                    <button
                      type="button"
                      onClick={() => {
                        const s = [...modalStages]
                        s.splice(index, 1)
                        setModalStages(s)
                      }}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Stage Name *</label>
                      <input
                        type="text"
                        value={stage.name || ''}
                        onChange={(e) => { const s = [...modalStages]; s[index] = { ...s[index], name: e.target.value }; setModalStages(s) }}
                        placeholder="e.g. 300m Deliberate"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Stage Number</label>
                      <input
                        type="number"
                        value={stage.stage_number || index + 1}
                        onChange={(e) => { const s = [...modalStages]; s[index] = { ...s[index], stage_number: parseInt(e.target.value) || index + 1 }; setModalStages(s) }}
                        min="1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Distance</label>
                      <input
                        type="text"
                        value={stage.distance != null ? String(stage.distance) : ''}
                        onChange={(e) => { const s = [...modalStages]; (s[index] as any).distance = e.target.value; setModalStages(s) }}
                        placeholder="e.g. 300m, Long Range"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Rounds (counting shots)</label>
                      <input
                        type="number"
                        value={stage.rounds ?? ''}
                        onChange={(e) => { const s = [...modalStages]; s[index] = { ...s[index], rounds: e.target.value ? parseInt(e.target.value) : null }; setModalStages(s) }}
                        min="1"
                        placeholder="e.g. 10"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Sighters (practice shots)</label>
                      <input
                        type="number"
                        value={stage.sighters ?? ''}
                        onChange={(e) => { const s = [...modalStages]; s[index] = { ...s[index], sighters: e.target.value ? parseInt(e.target.value) : null }; setModalStages(s) }}
                        min="0"
                        placeholder="e.g. 2"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Max Score per Shot</label>
                      <input
                        type="number"
                        value={stage.max_score ?? ''}
                        onChange={(e) => { const s = [...modalStages]; s[index] = { ...s[index], max_score: e.target.value ? parseInt(e.target.value) : null }; setModalStages(s) }}
                        min="1"
                        placeholder="e.g. 5"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() => setModalStages([...modalStages, { name: '', stage_number: modalStages.length + 1, distance: null, rounds: 10, sighters: 0, max_score: 5 }])}
                className="flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Stage
              </button>
            </div>

            <div className="border-t border-gray-200 p-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setShowStagesModal(false); setStagesDiscipline(null); setModalStages([]) }}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveStages}
                disabled={savingStages}
                className="flex items-center px-6 py-2 bg-[#1e40af] text-white rounded-lg hover:bg-[#1e3a8a] transition-colors disabled:opacity-50"
              >
                <Save className="h-4 w-4 mr-2" />
                {savingStages ? 'Saving...' : 'Save Stages'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
