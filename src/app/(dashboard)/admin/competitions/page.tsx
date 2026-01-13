'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, Save, X, Calendar, MapPin, DollarSign, Settings, Target, List } from 'lucide-react'
import RichTextEditor from '@/components/forms/rich-text-editor'
import { toast } from 'sonner'
import Link from 'next/link'
import type { Database } from '@/types/database'

type Competition = Database['public']['Tables']['competitions']['Row']
type CompetitionInsert = Database['public']['Tables']['competitions']['Insert']
type CompetitionUpdate = Database['public']['Tables']['competitions']['Update']
type Discipline = Database['public']['Tables']['disciplines']['Row']
type CompetitionDisciplineInsert = Database['public']['Tables']['competition_disciplines']['Insert']
type CompetitionMatchInsert = Database['public']['Tables']['competition_matches']['Insert']
type StageInsert = Database['public']['Tables']['stages']['Insert']
type Stage = Database['public']['Tables']['stages']['Row']

const MATCH_TYPES: string[] = [
  '300M',
  '600M',
  '800M',
  '900M',
]

interface DisciplineFee {
  disciplineId: string
  standardFee: number
  u19Fee: number
  u25Fee: number
  maxEntries: number
}

interface Match {
  id: string
  matchType: string
  matchName: string
  matchDate: string
  entryFee: number
  isOptional: boolean
}

interface StageForm {
  id: string
  name: string
  stageNumber: number
  distance: number | null
  rounds: number | null
  sighters: number | null
  maxScore: number | null
  stageDate: string | null
}

export default function AdminCompetitionsPage() {
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [disciplines, setDisciplines] = useState<Discipline[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingCompetitionId, setEditingCompetitionId] = useState<string | null>(null)
  const [selectedDisciplines, setSelectedDisciplines] = useState<string[]>([])
  const [disciplineFees, setDisciplineFees] = useState<Record<string, DisciplineFee>>({})
  const [matches, setMatches] = useState<Match[]>([])
  const [stages, setStages] = useState<StageForm[]>([])
  const supabase = createClient()

  const [formData, setFormData] = useState<Partial<CompetitionInsert>>({
    name: '',
    slug: '',
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
      slug: formData.slug || generateSlug(name),
    })
  }

  const handleDisciplineSelect = (disciplineId: string) => {
    if (selectedDisciplines.includes(disciplineId)) {
      setSelectedDisciplines(selectedDisciplines.filter((id) => id !== disciplineId))
      const newFees = { ...disciplineFees }
      delete newFees[disciplineId]
      setDisciplineFees(newFees)
    } else {
      setSelectedDisciplines([...selectedDisciplines, disciplineId])
      setDisciplineFees({
        ...disciplineFees,
        [disciplineId]: {
          disciplineId,
          standardFee: 0,
          u19Fee: 0,
          u25Fee: 0,
          maxEntries: 0,
        },
      })
    }
  }

  const updateDisciplineFee = (disciplineId: string, field: keyof DisciplineFee, value: number) => {
    setDisciplineFees({
      ...disciplineFees,
      [disciplineId]: {
        ...disciplineFees[disciplineId],
        [field]: value,
      },
    })
  }

  const addMatch = () => {
    setMatches([
      ...matches,
      {
        id: `temp-${Date.now()}`,
        matchType: '300M',
        matchName: '',
        matchDate: '',
        entryFee: 0,
        isOptional: false,
      },
    ])
  }

  const removeMatch = (id: string) => {
    setMatches(matches.filter((m) => m.id !== id))
  }

  const updateMatch = (id: string, field: keyof Match, value: any) => {
    setMatches(
      matches.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    )
  }

  const addStage = () => {
    const nextStageNumber = stages.length > 0 
      ? Math.max(...stages.map(s => s.stageNumber)) + 1 
      : 1
    setStages([
      ...stages,
      {
        id: `temp-${Date.now()}`,
        name: `Stage ${nextStageNumber}`,
        stageNumber: nextStageNumber,
        distance: null,
        rounds: 10,
        sighters: null,
        maxScore: null,
        stageDate: null,
      },
    ])
  }

  const removeStage = (id: string) => {
    setStages(stages.filter((s) => s.id !== id))
  }

  const updateStage = (id: string, field: keyof StageForm, value: any) => {
    setStages(
      stages.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      // Validate required fields
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

      // Convert datetime-local strings to ISO format for database
      const convertToISO = (datetimeLocal: string | null | undefined): string | null => {
        if (!datetimeLocal) return null
        // datetime-local format: "2024-01-15T10:00"
        // Convert to ISO: "2024-01-15T10:00:00.000Z"
        // We'll treat it as local time and convert to ISO
        const date = new Date(datetimeLocal)
        return isNaN(date.getTime()) ? null : date.toISOString()
      }

      const competitionData: CompetitionInsert = {
        name: formData.name!,
        slug: formData.slug || generateSlug(formData.name!),
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
        // Update existing competition
        const { data: competition, error: compError } = await supabase
          .from('competitions')
          .update(competitionData as CompetitionUpdate)
          .eq('id', editingCompetitionId)
          .select()
          .single()

        if (compError) {
          console.error('Error updating competition:', compError)
          throw compError
        }
        if (!competition) throw new Error('Failed to update competition')
        competitionId = competition.id

        // Delete existing disciplines, matches, and stages
        const { error: deleteDiscError } = await supabase
          .from('competition_disciplines')
          .delete()
          .eq('competition_id', competitionId)

        if (deleteDiscError) {
          console.error('Error deleting competition disciplines:', deleteDiscError)
          throw deleteDiscError
        }

        const { error: deleteMatchError } = await supabase
          .from('competition_matches')
          .delete()
          .eq('competition_id', competitionId)

        if (deleteMatchError) {
          console.error('Error deleting competition matches:', deleteMatchError)
          throw deleteMatchError
        }

        const { error: deleteStageError } = await supabase
          .from('stages')
          .delete()
          .eq('competition_id', competitionId)

        if (deleteStageError) {
          console.error('Error deleting competition stages:', deleteStageError)
          throw deleteStageError
        }
      } else {
        // Create new competition
        const { data: competition, error: compError } = await supabase
          .from('competitions')
          .insert(competitionData)
          .select()
          .single()

        if (compError) throw compError
        if (!competition) throw new Error('Failed to create competition')
        competitionId = competition.id
      }

      // Create/update competition disciplines
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

      // Create/update competition matches
      if (matches.length > 0) {
        const matchInserts: CompetitionMatchInsert[] = matches.map((match) => {
          // If match has a real ID (starts with UUID pattern), include it for upsert
          const isExistingMatch = match.id && !match.id.startsWith('temp-')
          const insertData: CompetitionMatchInsert = {
            competition_id: competitionId,
            match_type: match.matchType as Database['public']['Enums']['match_type'],
            match_name: match.matchName || match.matchType,
            match_date: match.matchDate || null,
            entry_fee: match.entryFee,
            is_optional: match.isOptional || false,
          }
          
          // Only include id if it's an existing match (for upsert)
          if (isExistingMatch) {
            insertData.id = match.id
          }
          
          return insertData
        })

        console.log('Inserting matches:', matchInserts)

        const { error: matchError } = await supabase
          .from('competition_matches')
          .insert(matchInserts)

        if (matchError) {
          console.error('Error inserting competition matches:', matchError)
          console.error('Match inserts:', matchInserts)
          throw matchError
        }
      }

      // Create/update competition stages
      if (stages.length > 0) {
        const stageInserts: StageInsert[] = stages.map((stage) => ({
          competition_id: competitionId,
          name: stage.name,
          stage_number: stage.stageNumber,
          distance: stage.distance || null,
          rounds: stage.rounds || null,
          sighters: stage.sighters || null,
          max_score: stage.maxScore || null,
          stage_date: stage.stageDate || null,
        }))

        console.log('Inserting stages:', stageInserts)

        const { error: stageError } = await supabase
          .from('stages')
          .insert(stageInserts)

        if (stageError) {
          console.error('Error inserting competition stages:', stageError)
          console.error('Stage inserts:', stageInserts)
          throw stageError
        }
      }

      toast.success(editingCompetitionId ? 'Competition updated successfully!' : 'Competition created successfully!')
      setShowForm(false)
      resetForm()
      fetchCompetitions() // Refresh the competitions list
    } catch (error: any) {
      console.error('Error creating/updating competition:', error)
      console.error('Error type:', typeof error)
      console.error('Error keys:', Object.keys(error || {}))
      console.error('Error details:', {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
      })
      
      let errorMessage = 'Error creating/updating competition'
      
      if (error?.message) {
        errorMessage = error.message
      } else if (error?.details) {
        errorMessage = error.details
      } else if (error?.hint) {
        errorMessage = error.hint
      } else if (error?.code) {
        switch (error.code) {
          case '23505': // Unique constraint violation
            errorMessage = 'A competition with this name or slug already exists'
            break
          case '23503': // Foreign key violation
            errorMessage = 'Invalid discipline or competition data'
            break
          case '42501': // Insufficient privileges
            errorMessage = 'Permission denied. Please ensure you have admin access.'
            break
          case 'PGRST116': // Not found
            errorMessage = 'Competition not found'
            break
          default:
            errorMessage = `Error: ${error.code}`
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
      // Load competition
      const { data: competition, error: compError } = await supabase
        .from('competitions')
        .select('*')
        .eq('id', competitionId)
        .single()

      if (compError || !competition) {
        toast.error('Failed to load competition')
        return
      }

      // Load competition disciplines
      const { data: compDisciplines } = await supabase
        .from('competition_disciplines')
        .select('*')
        .eq('competition_id', competitionId)

      // Load competition matches
      const { data: compMatches } = await supabase
        .from('competition_matches')
        .select('*')
        .eq('competition_id', competitionId)
        .order('match_date', { ascending: true, nullsFirst: true })

      // Load competition stages
      const { data: compStages } = await supabase
        .from('stages')
        .select('*')
        .eq('competition_id', competitionId)
        .order('stage_number', { ascending: true })

      // Populate form data
      setFormData({
        name: competition.name,
        slug: competition.slug,
        start_date: competition.start_date.split('T')[0], // Extract date part
        end_date: competition.end_date.split('T')[0],
        location: competition.location,
        venue_details: competition.venue_details || '',
        description: competition.description || '',
        registration_opens: competition.registration_opens 
          ? competition.registration_opens.replace('Z', '').slice(0, 16) // Format for datetime-local
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

      // Populate disciplines
      const disciplineIds = compDisciplines?.map(cd => cd.discipline_id).filter((id): id is string => id !== null) || []
      setSelectedDisciplines(disciplineIds)

      // Populate discipline fees
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

      // Populate matches
      const loadedMatches: Match[] = compMatches?.map(cm => ({
        id: cm.id, // Use real ID from database
        matchType: cm.match_type || '300M', // Default to 300M if null
        matchName: cm.match_name,
        matchDate: cm.match_date ? cm.match_date.split('T')[0] : '',
        entryFee: cm.entry_fee,
        isOptional: cm.is_optional || false,
      })) || []
      setMatches(loadedMatches)

      // Populate stages
      const loadedStages: StageForm[] = compStages?.map((cs: Stage) => ({
        id: cs.id,
        name: cs.name,
        stageNumber: cs.stage_number,
        distance: cs.distance,
        rounds: cs.rounds,
        sighters: cs.sighters,
        maxScore: cs.max_score,
        stageDate: cs.stage_date ? cs.stage_date.split('T')[0] : null,
      })) || []
      setStages(loadedStages)

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
      setMatches([])
      setStages([])
      setEditingCompetitionId(null)
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
          <h1 className="text-3xl font-bold text-gray-900">Competitions Management</h1>
          <p className="text-gray-600 mt-1">Create and manage shooting competitions</p>
        </div>
        <button
          onClick={() => {
            resetForm()
            setShowForm(true)
          }}
          className="flex items-center px-4 py-2 bg-[#1e40af] text-white rounded-lg hover:bg-[#1e3a8a] transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          Create Competition
        </button>
      </div>

      {/* Competitions List */}
      {!showForm && (
        <div className="mt-8">
          {competitions.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No competitions yet</h3>
              <p className="text-gray-600 mb-6">Create your first competition to get started</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Competition
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Dates
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
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
                          <div className="text-sm text-gray-900">
                            {new Date(competition.start_date).toLocaleDateString()}
                          </div>
                          <div className="text-sm text-gray-500">
                            to {new Date(competition.end_date).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{competition.location}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              competition.is_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
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
                              title="View Competition"
                            >
                              View
                            </a>
                            <Link
                              href={`/admin/competitions/${competition.id}/stages`}
                              className="text-[#1e40af] hover:text-[#1e3a8a] flex items-center"
                              title="Manage Stages"
                            >
                              <Target className="h-4 w-4 mr-1" />
                              Stages
                            </Link>
                            <button
                              onClick={() => loadCompetitionForEdit(competition.id)}
                              className="text-[#1e40af] hover:text-[#1e3a8a]"
                              title="Edit Competition"
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
                                    toast.error('Error deleting competition')
                                    console.error(error)
                                  } else {
                                    toast.success('Competition deleted')
                                    fetchCompetitions()
                                  }
                                }
                              }}
                              className="text-red-600 hover:text-red-800"
                              title="Delete Competition"
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
                {editingCompetitionId ? 'Edit Competition' : 'Create Competition'}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false)
                  resetForm()
                }}
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
                      Start Date *
                    </label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Date *
                    </label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Location *
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Venue Details
                    </label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <RichTextEditor
                    content={formData.description || ''}
                    onChange={(content) => setFormData({ ...formData, description: content })}
                    placeholder="Enter competition description..."
                  />
                </div>
              </section>

              {/* Disciplines & Fees */}
              <section>
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <MapPin className="h-5 w-5 mr-2 text-[#1e40af]" />
                  Disciplines & Fees
                </h3>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Disciplines *
                  </label>
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
                          <div
                            className="w-3 h-3 rounded mr-2"
                            style={{ backgroundColor: discipline.color || '#1e40af' }}
                          />
                          <span className="text-sm text-gray-700">{discipline.name}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {selectedDisciplines.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900">Fee Configuration</h4>
                    {selectedDisciplines.map((disciplineId) => {
                      const discipline = disciplines.find((d) => d.id === disciplineId)
                      const fees = disciplineFees[disciplineId] || {
                        disciplineId,
                        standardFee: 0,
                        u19Fee: 0,
                        u25Fee: 0,
                        maxEntries: 0,
                      }

                      return (
                        <div key={disciplineId} className="border border-gray-200 rounded-lg p-4">
                          <h5 className="font-semibold text-gray-900 mb-3 flex items-center">
                            <div
                              className="w-4 h-4 rounded mr-2"
                              style={{ backgroundColor: discipline?.color || '#1e40af' }}
                            />
                            {discipline?.name}
                          </h5>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Standard Fee (R)
                              </label>
                              <input
                                type="number"
                                value={fees.standardFee}
                                onChange={(e) =>
                                  updateDisciplineFee(disciplineId, 'standardFee', parseFloat(e.target.value) || 0)
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                                min="0"
                                step="0.01"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                U19 Fee (R)
                              </label>
                              <input
                                type="number"
                                value={fees.u19Fee}
                                onChange={(e) =>
                                  updateDisciplineFee(disciplineId, 'u19Fee', parseFloat(e.target.value) || 0)
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                                min="0"
                                step="0.01"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                U25 Fee (R)
                              </label>
                              <input
                                type="number"
                                value={fees.u25Fee}
                                onChange={(e) =>
                                  updateDisciplineFee(disciplineId, 'u25Fee', parseFloat(e.target.value) || 0)
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                                min="0"
                                step="0.01"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Max Entries
                              </label>
                              <input
                                type="number"
                                value={fees.maxEntries}
                                onChange={(e) =>
                                  updateDisciplineFee(disciplineId, 'maxEntries', parseInt(e.target.value) || 0)
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                                min="0"
                              />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>

              {/* Matches */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-900 flex items-center">
                    <DollarSign className="h-5 w-5 mr-2 text-[#1e40af]" />
                    Matches
                  </h3>
                  <button
                    type="button"
                    onClick={addMatch}
                    className="flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Match
                  </button>
                </div>

                {matches.length === 0 ? (
                  <p className="text-gray-500 text-sm">No matches added. Click "Add Match" to add one.</p>
                ) : (
                  <div className="space-y-4">
                    {matches.map((match) => (
                      <div key={match.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-4">
                          <h4 className="font-semibold text-gray-900">Match {matches.indexOf(match) + 1}</h4>
                          <button
                            type="button"
                            onClick={() => removeMatch(match.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Match Type *
                            </label>
                            <select
                              value={match.matchType}
                              onChange={(e) =>
                                updateMatch(match.id, 'matchType', e.target.value)
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                            >
                              {MATCH_TYPES.map((type) => (
                                <option key={type} value={type}>
                                  {type}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Match Name
                            </label>
                            <input
                              type="text"
                              value={match.matchName}
                              onChange={(e) => updateMatch(match.id, 'matchName', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                              placeholder="Custom match name (optional)"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Match Date
                            </label>
                            <input
                              type="date"
                              value={match.matchDate}
                              onChange={(e) => updateMatch(match.id, 'matchDate', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Entry Fee (R) *
                            </label>
                            <input
                              type="number"
                              value={match.entryFee}
                              onChange={(e) => updateMatch(match.id, 'entryFee', parseFloat(e.target.value) || 0)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                              min="0"
                              step="0.01"
                              required
                            />
                          </div>
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              id={`optional-${match.id}`}
                              checked={match.isOptional}
                              onChange={(e) => updateMatch(match.id, 'isOptional', e.target.checked)}
                              className="h-4 w-4 text-[#1e40af] focus:ring-[#1e40af] border-gray-300 rounded"
                            />
                            <label htmlFor={`optional-${match.id}`} className="ml-2 text-sm font-medium text-gray-700">
                              Optional Match
                            </label>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Stages */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-900 flex items-center">
                    <Target className="h-5 w-5 mr-2 text-[#1e40af]" />
                    Stages
                  </h3>
                  <button
                    type="button"
                    onClick={addStage}
                    className="flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Stage
                  </button>
                </div>

                {stages.length === 0 ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-yellow-800 text-sm">
                      ⚠️ <strong>No stages added.</strong> Stages are required for shooters to enter scores. Click "Add Stage" to add stages.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {stages.map((stage) => (
                      <div key={stage.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-4">
                          <h4 className="font-semibold text-gray-900">Stage {stage.stageNumber}</h4>
                          <button
                            type="button"
                            onClick={() => removeStage(stage.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Stage Name *
                            </label>
                            <input
                              type="text"
                              value={stage.name}
                              onChange={(e) => updateStage(stage.id, 'name', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                              placeholder="e.g., Stage 1 - 300M"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Stage Number *
                            </label>
                            <input
                              type="number"
                              value={stage.stageNumber}
                              onChange={(e) => updateStage(stage.id, 'stageNumber', parseInt(e.target.value) || 1)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                              min="1"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Distance (meters)
                            </label>
                            <input
                              type="number"
                              value={stage.distance || ''}
                              onChange={(e) => updateStage(stage.id, 'distance', e.target.value ? parseInt(e.target.value) : null)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                              min="0"
                              placeholder="e.g., 300"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Rounds
                            </label>
                            <input
                              type="number"
                              value={stage.rounds || ''}
                              onChange={(e) => updateStage(stage.id, 'rounds', e.target.value ? parseInt(e.target.value) : null)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                              min="1"
                              placeholder="e.g., 10"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Sighters
                            </label>
                            <input
                              type="number"
                              value={stage.sighters || ''}
                              onChange={(e) => updateStage(stage.id, 'sighters', e.target.value ? parseInt(e.target.value) : null)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                              min="0"
                              placeholder="e.g., 2"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Max Score
                            </label>
                            <input
                              type="number"
                              value={stage.maxScore || ''}
                              onChange={(e) => updateStage(stage.id, 'maxScore', e.target.value ? parseInt(e.target.value) : null)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                              min="0"
                              placeholder="e.g., 50"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Stage Date
                            </label>
                            <input
                              type="date"
                              value={stage.stageDate || ''}
                              onChange={(e) => updateStage(stage.id, 'stageDate', e.target.value || null)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Registration Opens
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.registration_opens || ''}
                      onChange={(e) => setFormData({ ...formData, registration_opens: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Registration Closes
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.registration_closes || ''}
                      onChange={(e) => setFormData({ ...formData, registration_closes: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Late Registration Date
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.late_registration_date || ''}
                      onChange={(e) => setFormData({ ...formData, late_registration_date: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Capacity
                    </label>
                    <input
                      type="number"
                      value={formData.capacity || ''}
                      onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || null })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Compulsory Range Fee (R)
                    </label>
                    <input
                      type="number"
                      value={formData.compulsory_range_fee || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, compulsory_range_fee: parseFloat(e.target.value) || null })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Late Entry Fee (R)
                    </label>
                    <input
                      type="number"
                      value={formData.late_entry_fee || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, late_entry_fee: parseFloat(e.target.value) || null })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Import/Export Permit Fee (R)
                    </label>
                    <input
                      type="number"
                      value={formData.import_export_permit_fee || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, import_export_permit_fee: parseFloat(e.target.value) || null })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                      min="0"
                      step="0.01"
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
                    <label htmlFor="is_featured" className="ml-2 text-sm font-medium text-gray-700">
                      Featured Competition
                    </label>
                  </div>
                </div>
              </section>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    resetForm()
                  }}
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
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5 mr-2" />
                      {editingCompetitionId ? 'Update Competition' : 'Create Competition'}
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
