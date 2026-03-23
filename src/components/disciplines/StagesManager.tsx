'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Settings, Plus, Trash2, Pencil, X, Save, Check } from 'lucide-react'
import { toast } from 'sonner'
import type { Database } from '@/types/database'

type Stage = Database['public']['Tables']['stages']['Row']

interface StagesManagerProps {
  disciplineId: string
  disciplineName: string
  initialStages: Stage[]
}

const emptyStage = (disciplineId: string, order: number): Partial<Stage> => ({
  discipline_id: disciplineId,
  name: '',
  stage_number: order,
  distance: null,
  rounds: null,
  sighters: 0,
  max_score: null,
})

export default function StagesManager({ disciplineId, disciplineName, initialStages }: StagesManagerProps) {
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [stages, setStages] = useState<Stage[]>(initialStages)
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)
  const [draft, setDraft] = useState<Partial<Stage>>({})
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const startNew = () => {
    setDraft(emptyStage(disciplineId, stages.length + 1))
    setEditingId('new')
  }

  const startEdit = (stage: Stage) => {
    setDraft({ ...stage })
    setEditingId(stage.id)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setDraft({})
  }

  const handleSave = async () => {
    if (!draft.name?.trim()) {
      toast.error('Distance name is required')
      return
    }
    setSaving(true)
    try {
      if (editingId === 'new') {
        const { data, error } = await supabase
          .from('stages')
          .insert({
            discipline_id: disciplineId,
            name: draft.name.trim(),
            stage_number: draft.stage_number ?? stages.length + 1,
            distance: draft.distance || null,
            rounds: draft.rounds ?? null,
            sighters: draft.sighters ?? 0,
            max_score: draft.max_score ?? null,
          })
          .select()
          .single()
        if (error) throw error
        setStages([...stages, data])
        toast.success('Distance added')
      } else {
        const { data, error } = await supabase
          .from('stages')
          .update({
            name: draft.name.trim(),
            stage_number: draft.stage_number ?? 1,
            distance: draft.distance || null,
            rounds: draft.rounds ?? null,
            sighters: draft.sighters ?? 0,
            max_score: draft.max_score ?? null,
          })
          .eq('id', editingId!)
          .select()
          .single()
        if (error) throw error
        setStages(stages.map(s => s.id === editingId ? data : s))
        toast.success('Distance updated')
      }
      setEditingId(null)
      setDraft({})
    } catch (err: any) {
      toast.error(err.message || 'Error saving stage')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      const { error } = await supabase.from('stages').delete().eq('id', id)
      if (error) throw error
      setStages(stages.filter(s => s.id !== id))
      toast.success('Distance deleted')
    } catch (err: any) {
      toast.error(err.message || 'Error deleting stage')
    } finally {
      setDeletingId(null)
    }
  }

  const field = (label: string, node: React.ReactNode) => (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {node}
    </div>
  )

  const input = (
    key: keyof Stage,
    type: 'text' | 'number' = 'text',
    placeholder = '',
    min?: number
  ) => (
    <input
      type={type}
      value={(draft[key] as string | number) ?? ''}
      onChange={e => setDraft({ ...draft, [key]: type === 'number' ? (e.target.value === '' ? null : Number(e.target.value)) : e.target.value })}
      placeholder={placeholder}
      min={min}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
    />
  )

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center px-3 py-1.5 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
      >
        <Settings className="h-4 w-4 mr-1.5" />
        Manage Distances
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Manage Distances</h2>
                <p className="text-sm text-gray-500 mt-0.5">{disciplineName}</p>
              </div>
              <button
                onClick={() => { setOpen(false); cancelEdit() }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Stage list */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {stages.length === 0 && editingId !== 'new' && (
                <p className="text-sm text-gray-500 italic text-center py-4">
                  No distances yet. Click "Add Distance" to create one.
                </p>
              )}

              {stages.map(stage => (
                <div key={stage.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  {editingId === stage.id ? (
                    /* Edit form */
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        {field('Distance Name *', input('name', 'text', 'e.g. 300m Deliberate'))}
                        {field('Distance Number', input('stage_number', 'number', '', 1))}
                        {field('Distance', input('distance', 'text', 'e.g. 300m'))}
                        {field('Rounds (scoring shots)', input('rounds', 'number', 'e.g. 10', 1))}
                        {field('Sighters (practice shots)', input('sighters', 'number', 'e.g. 0', 0))}
                        {field('Max Score per Shot', input('max_score', 'number', 'e.g. 5', 1))}
                      </div>
                      <div className="flex gap-2 justify-end pt-2">
                        <button onClick={cancelEdit} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                          Cancel
                        </button>
                        <button onClick={handleSave} disabled={saving} className="flex items-center px-3 py-1.5 text-sm bg-[#1e40af] text-white rounded-lg hover:bg-[#1e3a8a] disabled:opacity-50">
                          <Save className="h-4 w-4 mr-1" />
                          {saving ? 'Saving…' : 'Save'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Read view */
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-gray-400">#{stage.stage_number}</span>
                          <span className="font-semibold text-gray-900">{stage.name}</span>
                        </div>
                        <div className="flex gap-4 mt-1 text-xs text-gray-500">
                          {stage.distance && <span>📍 {stage.distance}</span>}
                          {stage.rounds != null && <span>🎯 {stage.rounds} rounds</span>}
                          <span>👁 {stage.sighters ?? 0} sighters</span>
                          {stage.max_score != null && <span>⭐ Max {stage.max_score}/shot</span>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEdit(stage)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(stage.id)}
                          disabled={deletingId === stage.id}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded disabled:opacity-40"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* New stage form */}
              {editingId === 'new' && (
                <div className="border-2 border-blue-300 border-dashed rounded-lg p-4 bg-blue-50">
                  <p className="text-xs font-semibold text-blue-700 mb-3">New Distance</p>
                  <div className="grid grid-cols-2 gap-3">
                    {field('Distance Name *', input('name', 'text', 'e.g. 300m Deliberate'))}
                    {field('Distance Number', input('stage_number', 'number', '', 1))}
                    {field('Distance', input('distance', 'text', 'e.g. 300m'))}
                    {field('Rounds (scoring shots)', input('rounds', 'number', 'e.g. 10', 1))}
                    {field('Sighters (practice shots)', input('sighters', 'number', 'e.g. 0', 0))}
                    {field('Max Score per Shot', input('max_score', 'number', 'e.g. 5', 1))}
                  </div>
                  <div className="flex gap-2 justify-end pt-3">
                    <button onClick={cancelEdit} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                      Cancel
                    </button>
                    <button onClick={handleSave} disabled={saving} className="flex items-center px-3 py-1.5 text-sm bg-[#1e40af] text-white rounded-lg hover:bg-[#1e3a8a] disabled:opacity-50">
                      <Save className="h-4 w-4 mr-1" />
                      {saving ? 'Saving…' : 'Add Distance'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 flex justify-between items-center">
              <button
                onClick={startNew}
                disabled={editingId !== null}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-40 text-sm"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Add Distance
              </button>
              <button
                onClick={() => { setOpen(false); cancelEdit() }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
