'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, Save, X, Trophy, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import type { Database } from '@/types/database'

type Championship = Database['public']['Tables']['championships']['Row']
type ChampionshipInsert = Database['public']['Tables']['championships']['Insert']

const emptyForm = () => ({
  name: '',
  slug: '',
  year: new Date().getFullYear(),
  description: '',
  registration_fee: '' as string | number,
  registration_opens: '',
  registration_closes: '',
  is_active: true,
})

export default function AdminChampionshipsPage() {
  const [championships, setChampionships] = useState<Championship[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [eventCounts, setEventCounts] = useState<Record<string, number>>({})
  const [regCounts, setRegCounts] = useState<Record<string, number>>({})
  const [form, setForm] = useState(emptyForm())

  const supabase = createClient()

  useEffect(() => {
    fetchChampionships()
  }, [])

  const fetchChampionships = async () => {
    setLoading(true)
    const { data } = await (supabase as any)
      .from('championships')
      .select('*')
      .order('year', { ascending: false })
    if (data) {
      setChampionships(data)
      fetchCounts(data)
    }
    setLoading(false)
  }

  const fetchCounts = async (champs: Championship[]) => {
    const ids = champs.map(c => c.id)
    if (ids.length === 0) return

    const { data: events } = await supabase
      .from('competitions')
      .select('championship_id')
      .in('championship_id', ids)

    const { data: regs } = await (supabase as any)
      .from('championship_registrations')
      .select('championship_id')
      .in('championship_id', ids)

    const ec: Record<string, number> = {}
    const rc: Record<string, number> = {}
    ;(events || []).forEach((e: any) => {
      if (e.championship_id) ec[e.championship_id] = (ec[e.championship_id] || 0) + 1
    })
    ;(regs || []).forEach((r: any) => {
      if (r.championship_id) rc[r.championship_id] = (rc[r.championship_id] || 0) + 1
    })
    setEventCounts(ec)
    setRegCounts(rc)
  }

  const handleNameChange = (name: string) => {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    setForm(f => ({ ...f, name, slug }))
  }

  const openCreate = () => {
    setForm(emptyForm())
    setEditingId(null)
    setShowForm(true)
  }

  const openEdit = (c: Championship) => {
    setForm({
      name: c.name,
      slug: c.slug,
      year: c.year,
      description: c.description || '',
      registration_fee: c.registration_fee ?? '',
      registration_opens: c.registration_opens ? c.registration_opens.slice(0, 16) : '',
      registration_closes: c.registration_closes ? c.registration_closes.slice(0, 16) : '',
      is_active: c.is_active ?? true,
    })
    setEditingId(c.id)
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.year) {
      toast.error('Name and year are required')
      return
    }
    setSaving(true)
    try {
      const payload: ChampionshipInsert = {
        name: form.name,
        slug: form.slug || form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        year: Number(form.year),
        description: form.description || null,
        registration_fee: form.registration_fee !== '' ? Number(form.registration_fee) : null,
        registration_opens: form.registration_opens || null,
        registration_closes: form.registration_closes || null,
        is_active: form.is_active,
      }

      if (editingId) {
        const { error } = await (supabase as any)
          .from('championships')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', editingId)
        if (error) throw error
        toast.success('Championship updated')
      } else {
        const { data: { user } } = await supabase.auth.getUser()
        const { error } = await (supabase as any)
          .from('championships')
          .insert({ ...payload, created_by: user?.id })
        if (error) throw error
        toast.success('Championship created')
      }

      setShowForm(false)
      fetchChampionships()
    } catch (err: any) {
      toast.error(err.message || 'Failed to save championship')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if ((eventCounts[id] || 0) > 0) {
      toast.error('Cannot delete — events are linked to this championship. Unlink them first.')
      return
    }
    if (!confirm('Delete this championship? This cannot be undone.')) return
    const { error } = await (supabase as any).from('championships').delete().eq('id', id)
    if (error) { toast.error(error.message); return }
    toast.success('Championship deleted')
    fetchChampionships()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-[#1e40af] rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Championships</h1>
          <p className="text-gray-500 mt-1">Manage yearly competition series</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center px-4 py-2 bg-[#1e40af] text-white rounded-lg hover:bg-[#1e3a8a] transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Championship
        </button>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto py-8 px-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {editingId ? 'Edit Championship' : 'New Championship'}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => handleNameChange(e.target.value)}
                  placeholder="e.g. SA National Championships 2026"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year *</label>
                  <input
                    type="number"
                    value={form.year}
                    onChange={e => setForm(f => ({ ...f, year: Number(e.target.value) }))}
                    min={2020}
                    max={2099}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Series Entry Fee (R)</label>
                  <input
                    type="number"
                    value={form.registration_fee}
                    onChange={e => setForm(f => ({ ...f, registration_fee: e.target.value }))}
                    min={0}
                    step={0.01}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Registration Opens</label>
                  <input
                    type="datetime-local"
                    value={form.registration_opens}
                    onChange={e => setForm(f => ({ ...f, registration_opens: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Registration Closes</label>
                  <input
                    type="datetime-local"
                    value={form.registration_closes}
                    onChange={e => setForm(f => ({ ...f, registration_closes: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={form.is_active}
                  onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                  className="h-4 w-4 text-[#1e40af] border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-gray-700">Active</label>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center px-4 py-2 bg-[#1e40af] text-white rounded-lg hover:bg-[#1e3a8a] disabled:opacity-50"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {championships.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <Trophy className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No championships yet</p>
          <p className="text-gray-400 text-sm mt-1">Create a yearly championship to group your events under</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Year</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Series Fee</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Events</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Registrations</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {championships.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-semibold text-gray-900">{c.name}</div>
                    {c.description && (
                      <div className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">{c.description}</div>
                    )}
                    {c.registration_closes && new Date(c.registration_closes) > new Date() && (
                      <div className="text-xs text-blue-600 mt-0.5">
                        Reg closes: {format(new Date(c.registration_closes), 'd MMM yyyy')}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center text-sm text-gray-700">{c.year}</td>
                  <td className="px-6 py-4 text-right text-sm text-gray-700">
                    {c.registration_fee != null ? `R${Number(c.registration_fee).toFixed(2)}` : '-'}
                  </td>
                  <td className="px-6 py-4 text-center text-sm text-gray-700">{eventCounts[c.id] || 0}</td>
                  <td className="px-6 py-4 text-center text-sm text-gray-700">{regCounts[c.id] || 0}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      c.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {c.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(c)}
                        className="p-2 text-gray-400 hover:text-[#1e40af] hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
