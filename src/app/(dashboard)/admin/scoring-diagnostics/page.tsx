'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, XCircle, AlertCircle, RefreshCw, Database as DatabaseIcon, Users, Target, Trophy } from 'lucide-react'
import { toast } from 'sonner'
import type { Database } from '@/types/database'

type Competition = Database['public']['Tables']['competitions']['Row']
type Registration = Database['public']['Tables']['registrations']['Row']
type Stage = Database['public']['Tables']['stages']['Row']
type Score = Database['public']['Tables']['scores']['Row']

interface DiagnosticResult {
  table: string
  exists: boolean
  recordCount: number
  error?: string
}

interface CompetitionStageInfo {
  id: string
  name: string
  stageCount: number
  stages: Array<{ id: string; name: string; stage_number: number | null }>
}

interface UserRegistrationInfo {
  userId: string
  email: string
  registrationCount: number
  registrations: Array<{
    id: string
    competitionName: string
    disciplineName: string
    status: string
  }>
}

export default function ScoringDiagnosticsPage() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [tableStatus, setTableStatus] = useState<DiagnosticResult[]>([])
  const [competitionStages, setCompetitionStages] = useState<CompetitionStageInfo[]>([])
  const [userRegistrations, setUserRegistrations] = useState<UserRegistrationInfo[]>([])
  const supabase = createClient()

  useEffect(() => {
    runDiagnostics()
  }, [])

  const runDiagnostics = async () => {
    setLoading(true)
    setRefreshing(true)

    try {
      // 1. Check database tables
      const tables: DiagnosticResult[] = []

      // Check registrations
      const { count: regCount, error: regError } = await supabase
        .from('registrations')
        .select('*', { count: 'exact', head: true })

      tables.push({
        table: 'registrations',
        exists: !regError,
        recordCount: regCount || 0,
        error: regError?.message,
      })

      // Check stages
      const { count: stageCount, error: stageError } = await supabase
        .from('stages')
        .select('*', { count: 'exact', head: true })

      tables.push({
        table: 'stages',
        exists: !stageError,
        recordCount: stageCount || 0,
        error: stageError?.message,
      })

      // Check scores
      const { count: scoreCount, error: scoreError } = await supabase
        .from('scores')
        .select('*', { count: 'exact', head: true })

      tables.push({
        table: 'scores',
        exists: !scoreError,
        recordCount: scoreCount || 0,
        error: scoreError?.message,
      })

      setTableStatus(tables)

      // 2. Check stages for competitions
      const { data: competitions, error: compError } = await supabase
        .from('competitions')
        .select(`
          id,
          name,
          start_date,
          stages (
            id,
            name,
            stage_number
          )
        `)
        .eq('is_active', true)
        .order('start_date', { ascending: true })

      if (!compError && competitions) {
        const compStages: CompetitionStageInfo[] = competitions.map((comp: any) => ({
          id: comp.id,
          name: comp.name,
          stageCount: comp.stages?.length || 0,
          stages: comp.stages || [],
        }))
        setCompetitionStages(compStages)
      }

      // 3. Check user registrations
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: registrations, error: regFetchError } = await supabase
          .from('registrations')
          .select(`
            id,
            registration_status,
            competitions (
              name
            ),
            disciplines (
              name
            )
          `)
          .eq('user_id', user.id)

        if (!regFetchError && registrations) {
          const userRegs: UserRegistrationInfo[] = [
            {
              userId: user.id,
              email: user.email || 'Unknown',
              registrationCount: registrations.length,
              registrations: registrations.map((reg: any) => ({
                id: reg.id,
                competitionName: reg.competitions?.name || 'Unknown',
                disciplineName: reg.disciplines?.name || 'Unknown',
                status: reg.registration_status || 'pending',
              })),
            },
          ]
          setUserRegistrations(userRegs)
        }
      }

      toast.success('Diagnostics completed')
    } catch (error: any) {
      console.error('Diagnostics error:', error)
      toast.error('Error running diagnostics: ' + error.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Scoring System Diagnostics</h1>
          <p className="text-gray-600 mt-1">Check if all required components are in place</p>
        </div>
        <button
          onClick={runDiagnostics}
          disabled={refreshing}
          className="flex items-center px-4 py-2 bg-[#1e40af] text-white rounded-lg hover:bg-[#1e3a8a] transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-5 w-5 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-[#1e40af] rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* 1. Database Tables Check */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <DatabaseIcon className="h-6 w-6 mr-2 text-[#1e40af]" />
              1. Database Tables
            </h2>
            <div className="space-y-3">
              {tableStatus.map((table) => (
                <div
                  key={table.table}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center">
                    {table.exists ? (
                      <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500 mr-3" />
                    )}
                    <div>
                      <span className="font-semibold text-gray-900">{table.table}</span>
                      {table.error && (
                        <p className="text-sm text-red-600 mt-1">{table.error}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">Records</div>
                    <div className="text-lg font-bold text-gray-900">{table.recordCount}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Competition Stages Check */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <Trophy className="h-6 w-6 mr-2 text-[#1e40af]" />
              2. Competition Stages
            </h2>
            {competitionStages.length === 0 ? (
              <p className="text-gray-600">No active competitions found</p>
            ) : (
              <div className="space-y-4">
                {competitionStages.map((comp) => (
                  <div
                    key={comp.id}
                    className={`p-4 border-2 rounded-lg ${
                      comp.stageCount > 0 ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          {comp.stageCount > 0 ? (
                            <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-yellow-500 mr-2" />
                          )}
                          <h3 className="font-semibold text-gray-900">{comp.name}</h3>
                        </div>
                        {comp.stageCount > 0 ? (
                          <div className="ml-7 space-y-1">
                            {comp.stages.map((stage) => (
                              <div key={stage.id} className="text-sm text-gray-700">
                                • {stage.name || `Stage ${stage.stage_number || ''}`}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="ml-7 text-sm text-yellow-800">
                            ⚠️ No stages configured. Scores cannot be entered for this competition.
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-600">Stages</div>
                        <div
                          className={`text-lg font-bold ${
                            comp.stageCount > 0 ? 'text-green-600' : 'text-yellow-600'
                          }`}
                        >
                          {comp.stageCount}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. User Registrations Check */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <Users className="h-6 w-6 mr-2 text-[#1e40af]" />
              3. Your Registrations
            </h2>
            {userRegistrations.length === 0 ? (
              <p className="text-gray-600">No registrations found for your account</p>
            ) : (
              <div className="space-y-4">
                {userRegistrations.map((userReg) => (
                  <div key={userReg.userId} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">{userReg.email}</h3>
                        <p className="text-sm text-gray-600">User ID: {userReg.userId}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-600">Registrations</div>
                        <div className="text-lg font-bold text-gray-900">{userReg.registrationCount}</div>
                      </div>
                    </div>
                    {userReg.registrations.length > 0 ? (
                      <div className="space-y-2 mt-3">
                        {userReg.registrations.map((reg) => (
                          <div
                            key={reg.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                          >
                            <div>
                              <div className="font-medium text-gray-900">{reg.competitionName}</div>
                              <div className="text-sm text-gray-600">
                                {reg.disciplineName} • Status: {reg.status}
                              </div>
                            </div>
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-600 mt-2">No registrations found</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h2 className="text-lg font-bold text-blue-900 mb-3">Summary</h2>
            <div className="space-y-2 text-sm text-blue-800">
              <p>
                ✅ <strong>All tables exist:</strong>{' '}
                {tableStatus.every((t) => t.exists) ? 'Yes' : 'No'}
              </p>
              <p>
                ✅ <strong>Competitions with stages:</strong>{' '}
                {competitionStages.filter((c) => c.stageCount > 0).length} / {competitionStages.length}
              </p>
              <p>
                ⚠️ <strong>Competitions missing stages:</strong>{' '}
                {competitionStages.filter((c) => c.stageCount === 0).length}
              </p>
              {competitionStages.filter((c) => c.stageCount === 0).length > 0 && (
                <div className="mt-3 p-3 bg-yellow-100 rounded border border-yellow-300">
                  <p className="font-semibold text-yellow-900 mb-1">Action Required:</p>
                  <p className="text-yellow-800">
                    Some competitions don't have stages configured. Go to{' '}
                    <a href="/admin/competitions" className="underline font-semibold">
                      Competition Management
                    </a>{' '}
                    to add stages before scores can be entered.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

