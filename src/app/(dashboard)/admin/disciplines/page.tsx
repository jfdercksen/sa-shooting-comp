'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Edit, Trash2, GripVertical, Save, X } from 'lucide-react'
import RichTextEditor from '@/components/forms/rich-text-editor'
import type { Database } from '@/types/database'
import { toast } from 'sonner'

type Discipline = Database['public']['Tables']['disciplines']['Row']
type DisciplineInsert = Database['public']['Tables']['disciplines']['Insert']
type DisciplineUpdate = Database['public']['Tables']['disciplines']['Update']

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
        toast.success('Discipline updated successfully')
      } else {
        // Create
        const { error } = await supabase
          .from('disciplines')
          .insert({
            ...formData,
            slug: formData.slug || generateSlug(formData.name!),
          } as DisciplineInsert)

        if (error) throw error
        toast.success('Discipline created successfully')
      }

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
          }}
          className="flex items-center px-4 py-2 bg-[#1e40af] text-white rounded-lg hover:bg-[#1e3a8a] transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Discipline
        </button>
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
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="h-10 w-20 border border-gray-300 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.color}
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
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
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
                  value={formData.equipment_requirements}
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
                  value={formData.rules_summary}
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
    </div>
  )
}
