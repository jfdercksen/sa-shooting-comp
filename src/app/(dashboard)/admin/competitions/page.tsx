'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, Save, X, Calendar, MapPin, Settings, Pencil, Check } from 'lucide-react'
import RichTextEditor from '@/components/forms/rich-text-editor'
import { toast } from 'sonner'
import type { Database } from '@/types/database'

type Competition = Database['public']['Tables']['competitions']['Row']
type CompetitionInsert = Database['public']['Tables']['competitions']['Insert']
type CompetitionUpdate = Database['public']['Tables']['competitions']['Update']
type Discipline = Database['public']['Tables']['disciplines']['Row']
type CompetitionDisciplineInsert = Database['public']['Tables']['competition_disciplines']['Insert']
type CompetitionMatchInsert = Database['public']['Tables']['competition_matches']['Insert']
type Stage = Database['public']['Tables']['stages']['Row']

interface DisciplineFee {
  disciplineId: string
  standardFee: number
  u19Fee: number
  u25Fee: number
  maxEntries: number
}

interface DisciplineMatch {
  id: string
  stageId: string | null
  matchDate: string
  entryFee: number
}

interface StageFormData {
  name: string
  distance: string
  sighters: number
  rounds: number
  maxScore: number
}

const emptyStageForm = (): StageFormData => ({ name: '', distance: '', sighters: 0, rounds: 0, maxScore: 0 })

export default function AdminCompetitionsPage() {
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [disciplines, setDisciplines] = useState<Discipline[]>([])
  const [championships, setChampionships] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingCompetitionId, setEditingCompetitionId] = useState<string | null>(null)
  const [selectedDisciplines, setSelectedDisciplines] = useState<string[]>([])
  const [disciplineFees, setDisciplineFees] = useState<Record<string, DisciplineFee>>({})
  const [disciplineMatches, setDisciplineMatches] = useState<Record<string, DisciplineMatch[]>>({})
  const [disciplineStages, setDisciplineStages] = useState<Record<string, Stage[]>>({})
  const [loadingStages, setLoadingStages] = useState(false)

  // Stage editing state
  const [editingStageId, setEditingStageId] = useState<string | null>(null)
  const [stageEditForm, setStageEditForm] = useState<StageFormData>(emptyStageForm())
  const [savingStage, setSavingStage] = useState(false)

  // Add distance state
  const [addingDistanceDisciplineId, setAddingDistanceDisciplineId] = useState<string | null>(null)
  const [newDistanceForm, setNewDistanceForm] = useState<StageFormData>(emptyStageForm())

  const supabase = createClient()

  const [formData, setFormData] = useState<Partial<CompetitionInsert>>({
    name: '',
    slug: '',
    championship_id: null,
    start_date: '',
    end_date: '',
    location: '',
    venue_details: '',
    description: '',
    registration_opens: '',
    registration_closes: '',
    late_registration_date: '',
    capacity: null,
    compulsory_range_fee: null,
    late_entry_fee: null,
    import_export_permit_fee: null,
    is_featured: false,
    is_active: true,
  })

  useEffect(() => {
    fetchDisciplines()
    fetchCompetitions()
    fetchChampionships()
  }, [])

  const fetchDisciplines = async () => {
    const { data, error } = await supabase
      .from('disciplines')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (error) {
      toast.error('Error fetching disciplines')
      console.error(error)
    } else {
      setDisciplines(data || [])
    }
  }

  const fetchChampionships = async () => {
    const { data } = await (supabase as any)
      .from('championships')
      .select('id, name, year')
      .eq('is_active', true)
      .order('year', { ascending: false })
    if (data) setChampionships(data)
  }

  const fetchCompetitions = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('competitions')
      .select('*')
      .order('start_date', { ascending: false })

    if (error) {
      toast.error('Error fetching competitions')
      console.error(error)
    } else {
      setCompetitions(data || [])
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
      slug: generateSlug(name),
    })
  }

  const fetchStagesForDisciplines = async (disciplineIds: string[]) => {
    if (disciplineIds.length === 0) return
    setLoadingStages(true)
    const { data, error } = await supabase
      .from('stages')
      .select('*')
      .in('discipline_id', disciplineIds)
      .order('stage_number', { ascending: true })
    setLoadingStages(false)
    if (error) {
      console.error('Error fetching discipline stages:', error)
      return
    }
    const map: Record<string, Stage[]> = {}
    disciplineIds.forEach(id => { map[id] = [] })
    ;(data || []).forEach(stage => {
      if (!map[stage.discipline_id]) map[stage.discipline_id] = []
      map[stage.discipline_id].push(stage)
    })
    setDisciplineStages(prev => ({ ...prev, ...map }))
  }

  const handleDisciplineSelect = (disciplineId: string) => {
    if (selectedDisciplines.includes(disciplineId)) {
      setSelectedDisciplines(selectedDisciplines.filter((id) => id !== disciplineId))
      const newFees = { ...disciplineFees }
      delete newFees[disciplineId]
      setDisciplineFees(newFees)
      const newMatches = { ...disciplineMatches }
      delete newMatches[disciplineId]
      setDisciplineMatches(newMatches)
    } else {
      setSelectedDisciplines([...selectedDisciplines, disciplineId])
      setDisciplineFees({
        ...disciplineFees,
        [disciplineId]: { disciplineId, standardFee: 0, u19Fee: 0, u25Fee: 0, maxEntries: 0 },
      })
      setDisciplineMatches({
        ...disciplineMatches,
        [disciplineId]: [],
      })
      fetchStagesForDisciplines([disciplineId])
    }
  }

  const updateDisciplineFee = (disciplineId: string, field: keyof DisciplineFee, value: number) => {
    setDisciplineFees({
      ...disciplineFees,
      [disciplineId]: { ...disciplineFees[disciplineId], [field]: value },
    })
  }

  // --- Match helpers ---

  const addMatchToDiscipline = (disciplineId: string) => {
    const newMatch: DisciplineMatch = {
      id: `temp-${Date.now()}`,
      stageId: null,
      matchDate: '',
      entryFee: 0,
    }
    setDisciplineMatches({
      ...disciplineMatches,
      [disciplineId]: [...(disciplineMatches[disciplineId] || []), newMatch],
    })
  }

  const removeMatchFromDiscipline = (disciplineId: string, matchId: string) => {
    setDisciplineMatches({
      ...disciplineMatches,
      [disciplineId]: (disciplineMatches[disciplineId] || []).filter(m => m.id !== matchId),
    })
  }

  const updateDisciplineMatch = (disciplineId: string, matchId: string, field: keyof DisciplineMatch, value: any) => {
    setDisciplineMatches({
      ...disciplineMatches,
      [disciplineId]: (disciplineMatches[disciplineId] || []).map(m =>
        m.id === matchId ? { ...m, [field]: value } : m
      ),
    })
  }

  // --- Stage edit helpers ---

  const startEditStage = (stage: Stage) => {
    setEditingStageId(stage.id)
    setStageEditForm({
      name: stage.name,
      distance: stage.distance || '',
      sighters: stage.sighters ?? 0,
      rounds: stage.rounds ?? 0,
      maxScore: stage.max_score ?? 0,
    })
  }

  const cancelStageEdit = () => {
    setEditingStageId(null)
    setStageEditForm(emptyStageForm())
  }

  const saveStageEdit = async () => {
    if (!editingStageId) return
    if (!stageEditForm.name.trim()) {
      toast.error('Distance name is required')
      return
    }
    setSavingStage(true)
    const { error } = await supabase
      .from('stages')
      .update({
        name: stageEditForm.name.trim(),
        distance: stageEditForm.distance.trim() || null,
        sighters: stageEditForm.sighters || null,
        rounds: stageEditForm.rounds || null,
        max_score: stageEditForm.maxScore || null,
      })
      .eq('id', editingStageId)
    setSavingStage(false)

    if (error) {
      toast.error('Failed to update distance')
      console.error(error)
      return
    }

    // Update local state
    setDisciplineStages(prev => {
      const updated = { ...prev }
      for (const disciplineId of Object.keys(updated)) {
        updated[disciplineId] = updated[disciplineId].map(s =>
          s.id === editingStageId
            ? {
                ...s,
                name: stageEditForm.name.trim(),
                distance: stageEditForm.distance.trim() || null,
                sighters: stageEditForm.sighters || null,
                rounds: stageEditForm.rounds || null,
                max_score: stageEditForm.maxScore || null,
              }
            : s
        )
      }
      return updated
    })

    toast.success('Distance updated')
    setEditingStageId(null)
    setStageEditForm(emptyStageForm())
  }

  // --- Add distance helpers ---

  const startAddDistance = (disciplineId: string) => {
    setAddingDistanceDisciplineId(disciplineId)
    setNewDistanceForm(emptyStageForm())
    setEditingStageId(null) // close any open edit
  }

  const cancelAddDistance = () => {
    setAddingDistanceDisciplineId(null)
    setNewDistanceForm(emptyStageForm())
  }

  const saveNewDistance = async (disciplineId: string) => {
    if (!newDistanceForm.name.trim()) {
      toast.error('Distance name is required')
      return
    }
    setSavingStage(true)
    const existingStages = disciplineStages[disciplineId] || []
    const nextStageNumber = existingStages.length > 0
      ? Math.max(...existingStages.map(s => s.stage_number)) + 1
      : 1

    const { data, error } = await supabase
      .from('stages')
      .insert({
        discipline_id: disciplineId,
        name: newDistanceForm.name.trim(),
        distance: newDistanceForm.distance.trim() || null,
        sighters: newDistanceForm.sighters || null,
        rounds: newDistanceForm.rounds || null,
        max_score: newDistanceForm.maxScore || null,
        stage_number: nextStageNumber,
      })
      .select()
      .single()
    setSavingStage(false)

    if (error || !data) {
      toast.error('Failed to add distance')
      console.error(error)
      return
    }

    setDisciplineStages(prev => ({
      ...prev,
      [disciplineId]: [...(prev[disciplineId] || []), data],
    }))

    toast.success('Distance added')
    setAddingDistanceDisciplineId(null)
    setNewDistanceForm(emptyStageForm())
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      if (!formData.name || !formData.start_date || !formData.end_date || !formData.location) {
        toast.error('Please fill in all required fields')
        setSaving(false)
        return
      }

      if (selectedDisciplines.length === 0) {
        toast.error('Please select at least one discipline')
        setSaving(false)
        return
      }

      const convertToISO = (datetimeLocal: string | null | undefined): string | null => {
        if (!datetimeLocal) return null
        const date = new Date(datetimeLocal)
        return isNaN(date.getTime()) ? null : date.toISOString()
      }

      const competitionData: CompetitionInsert = {
        name: formData.name!,
        slug: formData.slug || generateSlug(formData.name!),
        championship_id: formData.championship_id || null,
        start_date: formData.start_date!,
        end_date: formData.end_date!,
        location: formData.location!,
        venue_details: formData.venue_details || null,
        description: formData.description || null,
        registration_opens: convertToISO(formData.registration_opens),
        registration_closes: convertToISO(formData.registration_closes),
        late_registration_date: convertToISO(formData.late_registration_date),
        capacity: formData.capacity || null,
        compulsory_range_fee: formData.compulsory_range_fee || null,
        late_entry_fee: formData.late_entry_fee || null,
        import_export_permit_fee: formData.import_export_permit_fee || null,
        is_featured: formData.is_featured || false,
        is_active: formData.is_active ?? true,
      }

      let competitionId: string

      if (editingCompetitionId) {
        const { data: competition, error: compError } = await supabase
          .from('competitions')
          .update(competitionData as CompetitionUpdate)
          .eq('id', editingCompetitionId)
          .select()
          .single()

        if (compError) throw compError
        if (!competition) throw new Error('Failed to update competition')
        competitionId = competition.id

        const { error: deleteDiscError } = await supabase
          .from('competition_disciplines')
          .delete()
          .eq('competition_id', competitionId)
        if (deleteDiscError) throw deleteDiscError

        const { error: deleteMatchError } = await supabase
          .from('competition_matches')
          .delete()
          .eq('competition_id', competitionId)
        if (deleteMatchError) throw deleteMatchError
      } else {
        const { data: competition, error: compError } = await supabase
          .from('competitions')
          .insert(competitionData)
          .select()
          .single()

        if (compError) throw compError
        if (!competition) throw new Error('Failed to create competition')
        competitionId = competition.id
      }

      // Insert competition disciplines
      const disciplineInserts: CompetitionDisciplineInsert[] = selectedDisciplines.map((disciplineId) => {
        const fees = disciplineFees[disciplineId]
        return {
          competition_id: competitionId,
          discipline_id: disciplineId,
          all_matches_fee: fees.standardFee || null,
          all_matches_u19_fee: fees.u19Fee || null,
          all_matches_u25_fee: fees.u25Fee || null,
          max_entries: fees.maxEntries || null,
        }
      })

      if (disciplineInserts.length > 0) {
        const { error: discError } = await supabase
          .from('competition_disciplines')
          .insert(disciplineInserts)
        if (discError) throw discError
      }

      // Insert matches per discipline
      for (const disciplineId of selectedDisciplines) {
        const matches = disciplineMatches[disciplineId] || []
        if (matches.length === 0) continue

        const matchInserts: CompetitionMatchInsert[] = matches.map((match, index) => {
          const stage = (disciplineStages[disciplineId] || []).find(s => s.id === match.stageId)
          return {
            competition_id: competitionId,
            match_name: `Match ${index + 1}`,
            distance: stage?.distance || stage?.name || null,
            match_date: match.matchDate || null,
            entry_fee: match.entryFee,
            is_optional: false,
          }
        })

        const { data: savedMatches, error: matchError } = await supabase
          .from('competition_matches')
          .insert(matchInserts)
          .select()
        if (matchError) throw matchError

        // Insert match_stages
        const matchStageInserts: { match_id: string; stage_id: string; discipline_id: string }[] = []
        savedMatches?.forEach((savedMatch, index) => {
          const stageId = matches[index].stageId
          if (stageId) {
            matchStageInserts.push({
              match_id: savedMatch.id,
              stage_id: stageId,
              discipline_id: disciplineId,
            })
          }
        })

        if (matchStageInserts.length > 0) {
          const { error: msError } = await supabase
            .from('match_stages')
            .insert(matchStageInserts)
          if (msError) throw msError
        }
      }

      toast.success(editingCompetitionId ? 'Event updated successfully!' : 'Event created successfully!')
      setShowForm(false)
      resetForm()
      fetchCompetitions()
    } catch (error: any) {
      console.error('Error creating/updating event:', error)
      let errorMessage = 'Error creating/updating event'
      if (error?.message) errorMessage = error.message
      else if (error?.details) errorMessage = error.details
      else if (error?.code) {
        switch (error.code) {
          case '23505': errorMessage = 'A competition with this name or slug already exists'; break
          case '23503': errorMessage = 'Invalid discipline or competition data'; break
          case '42501': errorMessage = 'Permission denied. Please ensure you have admin access.'; break
          default: errorMessage = `Error: ${error.code}`
        }
      }
      toast.error(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const loadCompetitionForEdit = async (competitionId: string) => {
    setLoading(true)
    try {
      const { data: competition, error: compError } = await supabase
        .from('competitions')
        .select('*')
        .eq('id', competitionId)
        .single()

      if (compError || !competition) {
        toast.error('Failed to load competition')
        return
      }

      const { data: compDisciplines } = await supabase
        .from('competition_disciplines')
        .select('*')
        .eq('competition_id', competitionId)

      const { data: compMatches } = await supabase
        .from('competition_matches')
        .select(`*, match_stages (discipline_id, stage_id)`)
        .eq('competition_id', competitionId)
        .order('match_date', { ascending: true, nullsFirst: true })

      setFormData({
        name: competition.name,
        slug: competition.slug,
        championship_id: (competition as any).championship_id || null,
        start_date: competition.start_date.split('T')[0],
        end_date: competition.end_date.split('T')[0],
        location: competition.location,
        venue_details: competition.venue_details || '',
        description: competition.description || '',
        registration_opens: competition.registration_opens
          ? competition.registration_opens.replace('Z', '').slice(0, 16)
          : '',
        registration_closes: competition.registration_closes
          ? competition.registration_closes.replace('Z', '').slice(0, 16)
          : '',
        late_registration_date: competition.late_registration_date
          ? competition.late_registration_date.replace('Z', '').slice(0, 16)
          : '',
        capacity: competition.capacity,
        compulsory_range_fee: competition.compulsory_range_fee,
        late_entry_fee: competition.late_entry_fee,
        import_export_permit_fee: competition.import_export_permit_fee,
        is_featured: competition.is_featured || false,
        is_active: competition.is_active ?? true,
      })

      const disciplineIds = compDisciplines?.map(cd => cd.discipline_id).filter((id): id is string => id !== null) || []
      setSelectedDisciplines(disciplineIds)
      if (disciplineIds.length > 0) {
        fetchStagesForDisciplines(disciplineIds)
      }

      const fees: Record<string, DisciplineFee> = {}
      compDisciplines?.forEach(cd => {
        if (cd.discipline_id) {
          fees[cd.discipline_id] = {
            disciplineId: cd.discipline_id,
            standardFee: cd.all_matches_fee || 0,
            u19Fee: cd.all_matches_u19_fee || 0,
            u25Fee: cd.all_matches_u25_fee || 0,
            maxEntries: cd.max_entries || 0,
          }
        }
      })
      setDisciplineFees(fees)

      // Group matches by discipline (from match_stages)
      const dMatches: Record<string, DisciplineMatch[]> = {}
      disciplineIds.forEach(id => { dMatches[id] = [] })
      ;(compMatches as any[] || []).forEach(cm => {
        const ms = cm.match_stages?.[0]
        if (ms?.discipline_id) {
          if (!dMatches[ms.discipline_id]) dMatches[ms.discipline_id] = []
          dMatches[ms.discipline_id].push({
            id: cm.id,
            stageId: ms.stage_id || null,
            matchDate: cm.match_date ? cm.match_date.split('T')[0] : '',
            entryFee: cm.entry_fee,
          })
        }
      })
      setDisciplineMatches(dMatches)
      setEditingCompetitionId(competitionId)
      setShowForm(true)
    } catch (error: any) {
      console.error('Error loading competition:', error)
      toast.error('Failed to load competition data')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      championship_id: null,
      start_date: '',
      end_date: '',
      location: '',
      venue_details: '',
      description: '',
      registration_opens: '',
      registration_closes: '',
      late_registration_date: '',
      capacity: null,
      compulsory_range_fee: null,
      late_entry_fee: null,
      import_export_permit_fee: null,
      is_featured: false,
      is_active: true,
    })
    setSelectedDisciplines([])
    setDisciplineFees({})
    setDisciplineMatches({})
    setDisciplineStages({})
    setEditingCompetitionId(null)
    setEditingStageId(null)
    setStageEditForm(emptyStageForm())
    setAddingDistanceDisciplineId(null)
    setNewDistanceForm(emptyStageForm())
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
          <h1 className="text-3xl font-bold text-gray-900">Events Management</h1>
          <p className="text-gray-600 mt-1">Create and manage shooting events</p>
        </div>
        <button
          onClick={() => {
            resetForm()
            setShowForm(true)
          }}
          className="flex items-center px-4 py-2 bg-[#1e40af] text-white rounded-lg hover:bg-[#1e3a8a] transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          Create Event
        </button>
      </div>

      {/* Competitions List */}
      {!showForm && (
        <div className="mt-8">
          {competitions.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No events yet</h3>
              <p className="text-gray-600 mb-6">Create your first event to get started</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dates</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {competitions.map((competition) => (
                      <tr key={competition.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {competition.is_featured && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 mr-2">
                                Featured
                              </span>
                            )}
                            <div>
                              <div className="text-sm font-medium text-gray-900">{competition.name}</div>
                              {competition.slug && (
                                <div className="text-sm text-gray-500">{competition.slug}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{new Date(competition.start_date).toLocaleDateString()}</div>
                          <div className="text-sm text-gray-500">to {new Date(competition.end_date).toLocaleDateString()}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{competition.location}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${competition.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                            {competition.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-3">
                            <a
                              href={`/events/${competition.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#1e40af] hover:text-[#1e3a8a]"
                            >
                              View
                            </a>
                            <button
                              onClick={() => loadCompetitionForEdit(competition.id)}
                              className="text-[#1e40af] hover:text-[#1e3a8a]"
                            >
                              Edit
                            </button>
                            <button
                              onClick={async () => {
                                if (confirm(`Are you sure you want to delete "${competition.name}"?`)) {
                                  const { error } = await supabase
                                    .from('competitions')
                                    .delete()
                                    .eq('id', competition.id)
                                  if (error) {
                                    toast.error('Error deleting event')
                                    console.error(error)
                                  } else {
                                    toast.success('Event deleted')
                                    fetchCompetitions()
                                  }
                                }
                              }}
                              className="text-red-600 hover:text-red-800"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full my-8">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between z-10">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingCompetitionId ? 'Edit Event' : 'Create Event'}
              </h2>
              <button
                onClick={() => { setShowForm(false); resetForm() }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-8 max-h-[calc(100vh-200px)] overflow-y-auto">

              {/* Basic Information */}
              <section>
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-[#1e40af]" />
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Championship (Series)</label>
                    <select
                      value={formData.championship_id || ''}
                      onChange={(e) => setFormData({ ...formData, championship_id: e.target.value || null })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                    >
                      <option value="">— No championship —</option>
                      {championships.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.name} ({c.year})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Date *</label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">End Date *</label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Location *</label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Venue Details</label>
                    <textarea
                      value={formData.venue_details || ''}
                      onChange={(e) => setFormData({ ...formData, venue_details: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                      placeholder="Additional venue information..."
                    />
                  </div>
                </div>
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <RichTextEditor
                    content={formData.description || ''}
                    onChange={(content) => setFormData({ ...formData, description: content })}
                    placeholder="Enter competition description..."
                  />
                </div>
              </section>

              {/* Disciplines, Fees & Matches */}
              <section>
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <MapPin className="h-5 w-5 mr-2 text-[#1e40af]" />
                  Disciplines & Fees
                </h3>

                {/* Discipline selector */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Disciplines *</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-4">
                    {disciplines.map((discipline) => (
                      <label key={discipline.id} className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedDisciplines.includes(discipline.id)}
                          onChange={() => handleDisciplineSelect(discipline.id)}
                          className="mr-2"
                        />
                        <div className="flex items-center flex-1">
                          <div className="w-3 h-3 rounded mr-2" style={{ backgroundColor: discipline.color || '#1e40af' }} />
                          <span className="text-sm text-gray-700">{discipline.name}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Per-discipline cards */}
                {selectedDisciplines.length > 0 && (
                  <div className="space-y-6">
                    {selectedDisciplines.map((disciplineId) => {
                      const discipline = disciplines.find((d) => d.id === disciplineId)
                      const fees = disciplineFees[disciplineId] || { disciplineId, standardFee: 0, u19Fee: 0, u25Fee: 0, maxEntries: 0 }
                      const stages = disciplineStages[disciplineId] || []
                      const dMatches = disciplineMatches[disciplineId] || []

                      return (
                        <div key={disciplineId} className="border border-gray-200 rounded-lg overflow-hidden">
                          {/* Card header */}
                          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center">
                            <div className="w-4 h-4 rounded mr-2" style={{ backgroundColor: discipline?.color || '#1e40af' }} />
                            <h5 className="font-semibold text-gray-900">{discipline?.name}</h5>
                          </div>

                          <div className="p-4 space-y-6">

                            {/* Fees */}
                            <div>
                              <h6 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Fees</h6>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">Standard Fee (R)</label>
                                  <input
                                    type="number"
                                    value={fees.standardFee}
                                    onChange={(e) => updateDisciplineFee(disciplineId, 'standardFee', parseFloat(e.target.value) || 0)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                                    min="0" step="0.01"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">U19 Fee (R)</label>
                                  <input
                                    type="number"
                                    value={fees.u19Fee}
                                    onChange={(e) => updateDisciplineFee(disciplineId, 'u19Fee', parseFloat(e.target.value) || 0)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                                    min="0" step="0.01"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">U25 Fee (R)</label>
                                  <input
                                    type="number"
                                    value={fees.u25Fee}
                                    onChange={(e) => updateDisciplineFee(disciplineId, 'u25Fee', parseFloat(e.target.value) || 0)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                                    min="0" step="0.01"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">Max Entries</label>
                                  <input
                                    type="number"
                                    value={fees.maxEntries}
                                    onChange={(e) => updateDisciplineFee(disciplineId, 'maxEntries', parseInt(e.target.value) || 0)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                                    min="0"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Distances */}
                            <div>
                              <div className="flex items-center justify-between mb-3">
                                <h6 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Distances</h6>
                                {addingDistanceDisciplineId !== disciplineId && (
                                  <button
                                    type="button"
                                    onClick={() => startAddDistance(disciplineId)}
                                    className="flex items-center text-xs text-[#1e40af] hover:text-[#1e3a8a] font-medium"
                                  >
                                    <Plus className="h-3.5 w-3.5 mr-1" />
                                    Add Distance
                                  </button>
                                )}
                              </div>

                              {loadingStages && stages.length === 0 ? (
                                <p className="text-xs text-gray-400">Loading distances...</p>
                              ) : stages.length === 0 && addingDistanceDisciplineId !== disciplineId ? (
                                <p className="text-xs text-amber-600">⚠ No distances defined. Add one to enable matches.</p>
                              ) : (
                                <div className="space-y-2">
                                  {stages.map(stage => (
                                    <div key={stage.id} className="border border-gray-100 rounded-lg">
                                      {editingStageId === stage.id ? (
                                        // Inline edit form
                                        <div className="p-3 space-y-3">
                                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                            <div>
                                              <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
                                              <input
                                                type="text"
                                                value={stageEditForm.name}
                                                onChange={(e) => setStageEditForm({ ...stageEditForm, name: e.target.value })}
                                                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                                                placeholder="e.g. 300m"
                                              />
                                            </div>
                                            <div>
                                              <label className="block text-xs font-medium text-gray-600 mb-1">Distance</label>
                                              <input
                                                type="text"
                                                value={stageEditForm.distance}
                                                onChange={(e) => setStageEditForm({ ...stageEditForm, distance: e.target.value })}
                                                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                                                placeholder="e.g. 300m"
                                              />
                                            </div>
                                            <div>
                                              <label className="block text-xs font-medium text-gray-600 mb-1">Sighters</label>
                                              <input
                                                type="number"
                                                value={stageEditForm.sighters}
                                                onChange={(e) => setStageEditForm({ ...stageEditForm, sighters: parseInt(e.target.value) || 0 })}
                                                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                                                min="0"
                                              />
                                            </div>
                                            <div>
                                              <label className="block text-xs font-medium text-gray-600 mb-1">Rounds</label>
                                              <input
                                                type="number"
                                                value={stageEditForm.rounds}
                                                onChange={(e) => setStageEditForm({ ...stageEditForm, rounds: parseInt(e.target.value) || 0 })}
                                                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                                                min="0"
                                              />
                                            </div>
                                            <div>
                                              <label className="block text-xs font-medium text-gray-600 mb-1">Max Score</label>
                                              <input
                                                type="number"
                                                value={stageEditForm.maxScore}
                                                onChange={(e) => setStageEditForm({ ...stageEditForm, maxScore: parseInt(e.target.value) || 0 })}
                                                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                                                min="0"
                                              />
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <button
                                              type="button"
                                              onClick={saveStageEdit}
                                              disabled={savingStage}
                                              className="flex items-center px-3 py-1.5 text-xs bg-[#1e40af] text-white rounded hover:bg-[#1e3a8a] disabled:opacity-50"
                                            >
                                              <Check className="h-3.5 w-3.5 mr-1" />
                                              {savingStage ? 'Saving...' : 'Save'}
                                            </button>
                                            <button
                                              type="button"
                                              onClick={cancelStageEdit}
                                              className="px-3 py-1.5 text-xs border border-gray-300 text-gray-600 rounded hover:bg-gray-50"
                                            >
                                              Cancel
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        // Display row
                                        <div className="px-3 py-2 flex items-center justify-between">
                                          <div className="flex items-center gap-3 text-sm">
                                            <span className="font-medium text-gray-800">{stage.name}</span>
                                            {stage.distance && <span className="text-gray-500">{stage.distance}</span>}
                                            {(stage.sighters != null || stage.rounds != null) && (
                                              <span className="text-xs text-gray-400">
                                                {stage.sighters ?? 0} sighters · {stage.rounds ?? 0} rounds
                                              </span>
                                            )}
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => startEditStage(stage)}
                                            className="text-gray-400 hover:text-[#1e40af] ml-2"
                                            title="Edit distance"
                                          >
                                            <Pencil className="h-3.5 w-3.5" />
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Add distance inline form */}
                              {addingDistanceDisciplineId === disciplineId && (
                                <div className="mt-2 border border-dashed border-[#1e40af] rounded-lg p-3 space-y-3">
                                  <p className="text-xs font-semibold text-[#1e40af]">New Distance</p>
                                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    <div>
                                      <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
                                      <input
                                        type="text"
                                        value={newDistanceForm.name}
                                        onChange={(e) => setNewDistanceForm({ ...newDistanceForm, name: e.target.value })}
                                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                                        placeholder="e.g. 300m"
                                        autoFocus
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-600 mb-1">Distance</label>
                                      <input
                                        type="text"
                                        value={newDistanceForm.distance}
                                        onChange={(e) => setNewDistanceForm({ ...newDistanceForm, distance: e.target.value })}
                                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                                        placeholder="e.g. 300m"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-600 mb-1">Sighters</label>
                                      <input
                                        type="number"
                                        value={newDistanceForm.sighters}
                                        onChange={(e) => setNewDistanceForm({ ...newDistanceForm, sighters: parseInt(e.target.value) || 0 })}
                                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                                        min="0"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-600 mb-1">Rounds</label>
                                      <input
                                        type="number"
                                        value={newDistanceForm.rounds}
                                        onChange={(e) => setNewDistanceForm({ ...newDistanceForm, rounds: parseInt(e.target.value) || 0 })}
                                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                                        min="0"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-600 mb-1">Max Score</label>
                                      <input
                                        type="number"
                                        value={newDistanceForm.maxScore}
                                        onChange={(e) => setNewDistanceForm({ ...newDistanceForm, maxScore: parseInt(e.target.value) || 0 })}
                                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                                        min="0"
                                      />
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => saveNewDistance(disciplineId)}
                                      disabled={savingStage}
                                      className="flex items-center px-3 py-1.5 text-xs bg-[#1e40af] text-white rounded hover:bg-[#1e3a8a] disabled:opacity-50"
                                    >
                                      <Plus className="h-3.5 w-3.5 mr-1" />
                                      {savingStage ? 'Saving...' : 'Add Distance'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={cancelAddDistance}
                                      className="px-3 py-1.5 text-xs border border-gray-300 text-gray-600 rounded hover:bg-gray-50"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Matches */}
                            <div>
                              <div className="flex items-center justify-between mb-3">
                                <h6 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Matches</h6>
                                <button
                                  type="button"
                                  onClick={() => addMatchToDiscipline(disciplineId)}
                                  className="flex items-center text-xs text-[#1e40af] hover:text-[#1e3a8a] font-medium"
                                >
                                  <Plus className="h-3.5 w-3.5 mr-1" />
                                  Add Match
                                </button>
                              </div>

                              {dMatches.length === 0 ? (
                                <p className="text-xs text-gray-400">No matches yet. Click "+ Add Match" to add one.</p>
                              ) : (
                                <div className="space-y-2">
                                  {dMatches.map((match, index) => (
                                    <div key={match.id} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2">
                                      <span className="text-xs font-semibold text-gray-600 w-14 flex-shrink-0">
                                        Match {index + 1}
                                      </span>
                                      <div className="flex-1 min-w-0">
                                        <select
                                          value={match.stageId || ''}
                                          onChange={(e) => updateDisciplineMatch(disciplineId, match.id, 'stageId', e.target.value || null)}
                                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-[#1e40af] focus:border-transparent bg-white"
                                        >
                                          <option value="">— select distance —</option>
                                          {stages.map(stage => (
                                            <option key={stage.id} value={stage.id}>
                                              {stage.name}{stage.distance ? ` (${stage.distance})` : ''}
                                              {stage.sighters != null && stage.rounds != null ? ` · ${stage.sighters}+${stage.rounds}` : ''}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                      <div className="flex-shrink-0">
                                        <input
                                          type="date"
                                          value={match.matchDate}
                                          onChange={(e) => updateDisciplineMatch(disciplineId, match.id, 'matchDate', e.target.value)}
                                          className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                                        />
                                      </div>
                                      <div className="flex-shrink-0 w-28">
                                        <div className="relative">
                                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">R</span>
                                          <input
                                            type="number"
                                            value={match.entryFee}
                                            onChange={(e) => updateDisciplineMatch(disciplineId, match.id, 'entryFee', parseFloat(e.target.value) || 0)}
                                            className="w-full pl-6 pr-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                                            min="0" step="0.01" placeholder="0.00"
                                          />
                                        </div>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => removeMatchFromDiscipline(disciplineId, match.id)}
                                        className="text-red-400 hover:text-red-600 flex-shrink-0"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>

              {/* Settings */}
              <section>
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <Settings className="h-5 w-5 mr-2 text-[#1e40af]" />
                  Settings
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Registration Opens</label>
                    <input
                      type="datetime-local"
                      value={formData.registration_opens || ''}
                      onChange={(e) => setFormData({ ...formData, registration_opens: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Registration Closes</label>
                    <input
                      type="datetime-local"
                      value={formData.registration_closes || ''}
                      onChange={(e) => setFormData({ ...formData, registration_closes: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Late Registration Date</label>
                    <input
                      type="datetime-local"
                      value={formData.late_registration_date || ''}
                      onChange={(e) => setFormData({ ...formData, late_registration_date: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Capacity</label>
                    <input
                      type="number"
                      value={formData.capacity || ''}
                      onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || null })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Compulsory Range Fee (R)</label>
                    <input
                      type="number"
                      value={formData.compulsory_range_fee || ''}
                      onChange={(e) => setFormData({ ...formData, compulsory_range_fee: parseFloat(e.target.value) || null })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                      min="0" step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Late Entry Fee (R)</label>
                    <input
                      type="number"
                      value={formData.late_entry_fee || ''}
                      onChange={(e) => setFormData({ ...formData, late_entry_fee: parseFloat(e.target.value) || null })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                      min="0" step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Import/Export Permit Fee (R)</label>
                    <input
                      type="number"
                      value={formData.import_export_permit_fee || ''}
                      onChange={(e) => setFormData({ ...formData, import_export_permit_fee: parseFloat(e.target.value) || null })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                      min="0" step="0.01"
                    />
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="is_featured"
                      checked={formData.is_featured ?? false}
                      onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                      className="h-4 w-4 text-[#1e40af] focus:ring-[#1e40af] border-gray-300 rounded"
                    />
                    <label htmlFor="is_featured" className="ml-2 text-sm font-medium text-gray-700">Featured Event</label>
                  </div>
                </div>
              </section>

              {/* Submit */}
              <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); resetForm() }}
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
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5 mr-2" />
                      {editingCompetitionId ? 'Update Event' : 'Create Event'}
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
