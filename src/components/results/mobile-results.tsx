'use client'

import { useState, useEffect } from 'react'
import { 
  Trophy, 
  Medal, 
  Award, 
  Target,
  Users,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  RefreshCw,
  Download,
  Printer
} from 'lucide-react'
import { format } from 'date-fns'

interface MobileResultsProps {
  competitions: any[]
  selectedCompetition: string
  setSelectedCompetition: (id: string) => void
  results: any[]
  teamResults: any[]
  competitionTotals: any[]
  stages: any[]
  disciplines: any[]
  viewMode: string
  setViewMode: (mode: string) => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  selectedDiscipline: string
  setSelectedDiscipline: (id: string) => void
  selectedAgeClass: string
  setSelectedAgeClass: (ageClass: string) => void
  autoRefresh: boolean
  setAutoRefresh: (enabled: boolean) => void
  refreshing: boolean
  onRefresh: () => void
  onExportCSV: () => void
  onPrint: () => void
  loading: boolean
  user?: any
}

export default function MobileResults({
  competitions,
  selectedCompetition,
  setSelectedCompetition,
  results,
  teamResults,
  competitionTotals,
  stages,
  disciplines,
  viewMode,
  setViewMode,
  searchQuery,
  setSearchQuery,
  selectedDiscipline,
  setSelectedDiscipline,
  selectedAgeClass,
  setSelectedAgeClass,
  autoRefresh,
  setAutoRefresh,
  refreshing,
  onRefresh,
  onExportCSV,
  onPrint,
  loading,
  user
}: MobileResultsProps) {
  const [showFilters, setShowFilters] = useState(false)
  const [expandedResult, setExpandedResult] = useState<string | null>(null)

  const getMedalIcon = (position: number) => {
    if (position === 1) {
      return <Award className="h-5 w-5 text-yellow-600" />
    }
    if (position === 2) {
      return <Award className="h-5 w-5 text-gray-500" />
    }
    if (position === 3) {
      return <Award className="h-5 w-5 text-amber-600" />
    }
    return null
  }

  const getPositionStyle = (position: number) => {
    if (position === 1) return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    if (position === 2) return 'bg-gray-100 text-gray-700 border-gray-300'  
    if (position === 3) return 'bg-amber-100 text-amber-800 border-amber-300'
    return 'bg-white text-gray-900 border-gray-200'
  }

  const currentResults = viewMode === 'team' ? teamResults : 
                          viewMode === 'total' ? competitionTotals : results

  const ageClassifications = ['Open', 'Under_19', 'Under_25', 'Veteran_60_plus', 'Veteran_70_plus']

  if (loading && competitions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pb-20">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-gray-300 border-t-[#1e40af] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading results...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-4 py-4">
        <h1 className="text-xl font-bold text-gray-900">Competition Results</h1>
        <p className="text-sm text-gray-600 mt-1">Live standings with provisional scores</p>
      </div>

      {/* Competition Selector */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Competition
        </label>
        <select
          value={selectedCompetition}
          onChange={(e) => {
            setSelectedCompetition(e.target.value)
            setSelectedDiscipline('')
            setSelectedAgeClass('')
            setSearchQuery('')
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
        >
          <option value="">Select a competition...</option>
          {competitions.map((comp) => (
            <option key={comp.id} value={comp.id}>
              {comp.name} ({format(new Date(comp.start_date), 'MMM yyyy')})
            </option>
          ))}
        </select>
      </div>

      {selectedCompetition && (
        <>
          {/* View Mode Tabs */}
          <div className="bg-white border-b border-gray-200 px-4 py-3">
            <div className="flex space-x-1 overflow-x-auto">
              {[
                { id: 'individual', label: 'Individual', icon: Target },
                { id: 'total', label: 'Total', icon: Trophy },
                { id: 'team', label: 'Teams', icon: Users },
              ].map((tab) => {
                const IconComponent = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setViewMode(tab.id)}
                    className={`flex items-center px-3 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
                      viewMode === tab.id
                        ? 'bg-[#1e40af] text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <IconComponent className="h-4 w-4 mr-1.5" />
                    {tab.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Search & Filters */}
          <div className="bg-white border-b border-gray-200 px-4 py-3">
            {/* Search Bar */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, SABU, club..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
              />
            </div>

            {/* Filter Toggle */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {showFilters ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
              </button>

              <div className="flex items-center space-x-2">
                <button
                  onClick={onRefresh}
                  disabled={refreshing}
                  className="p-2 text-gray-600 hover:text-[#1e40af] disabled:opacity-50"
                  title="Refresh"
                >
                  <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={onExportCSV}
                  className="p-2 text-gray-600 hover:text-green-600"
                  title="Export CSV"
                >
                  <Download className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Expandable Filters */}
            {showFilters && (
              <div className="mt-3 space-y-3 pt-3 border-t border-gray-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Discipline
                  </label>
                  <select
                    value={selectedDiscipline}
                    onChange={(e) => setSelectedDiscipline(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Age Classification
                  </label>
                  <select
                    value={selectedAgeClass}
                    onChange={(e) => setSelectedAgeClass(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                  >
                    <option value="">All Classifications</option>
                    {ageClassifications.map((ageClass) => (
                      <option key={ageClass} value={ageClass}>
                        {ageClass.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={autoRefresh}
                      onChange={(e) => setAutoRefresh(e.target.checked)}
                      className="mr-2"
                    />
                    Auto-refresh (30s)
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Results */}
          <div className="p-4 space-y-3">
            {loading ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-2 border-gray-300 border-t-[#1e40af] rounded-full animate-spin mx-auto mb-3" />
                <p className="text-gray-600">Loading results...</p>
              </div>
            ) : currentResults.length === 0 ? (
              <div className="bg-white rounded-lg p-8 text-center shadow-sm border border-gray-200">
                <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2">No Results Found</h3>
                <p className="text-gray-600 text-sm">No results match your current filters.</p>
              </div>
            ) : (
              <>
                {/* Results Cards */}
                {currentResults.map((result, index) => {
                  const position = index + 1
                  const isCurrentUser = user && (result.userId === user.id || result.user_id === user.id)
                  const resultId = result.registrationId || result.userId || result.user_id || result.team_id
                  const isExpanded = expandedResult === resultId

                  if (viewMode === 'team') {
                    return (
                      <div
                        key={`${result.team_id}-${result.discipline_id}`}
                        className={`bg-white rounded-lg shadow-sm border-2 p-4 ${getPositionStyle(position)}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                              position <= 3 ? 'bg-white shadow-sm' : 'bg-gray-100'
                            }`}>
                              {position <= 3 ? getMedalIcon(position) : position}
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">{result.team_name}</h3>
                              <p className="text-sm text-gray-600">{result.discipline_name}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-gray-900">{result.total_score}</div>
                            <div className="text-xs text-gray-600">
                              {result.scores_counted}/{result.member_count} members
                            </div>
                          </div>
                        </div>
                        {result.province && (
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">Province:</span> {result.province}
                          </div>
                        )}
                        <div className="mt-2 flex justify-between text-sm">
                          <span className="text-gray-600">X: {result.total_x_count}</span>
                          <span className="text-gray-600">V: {result.total_v_count}</span>
                        </div>
                      </div>
                    )
                  } else if (viewMode === 'total') {
                    return (
                      <div
                        key={result.userId}
                        className={`bg-white rounded-lg shadow-sm border-2 p-4 ${
                          isCurrentUser ? 'border-[#1e40af] bg-blue-50' : getPositionStyle(position)
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                              position <= 3 ? 'bg-white shadow-sm' : 'bg-gray-100'
                            }`}>
                              {position <= 3 ? getMedalIcon(position) : position}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-gray-900 truncate">
                                {result.shooterName}
                                {isCurrentUser && <span className="ml-2 text-xs text-[#1e40af]">(You)</span>}
                              </h3>
                              <p className="text-sm text-gray-600 truncate">{result.club || 'No club'}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-gray-900">{result.grandTotal}</div>
                            <div className="text-xs text-gray-600">
                              {result.disciplines.join(', ') || 'Multiple'}
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">SABU:</span> {result.sabuNumber || '-'}
                          </div>
                          <div>
                            <span className="text-gray-600">X:</span> {result.totalX}
                          </div>
                          <div>
                            <span className="text-gray-600">V:</span> {result.totalV}
                          </div>
                        </div>
                        {result.hasUnverified && (
                          <div className="mt-2">
                            <span className="inline-flex px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                              Provisional
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  } else {
                    // Individual results
                    return (
                      <div
                        key={result.registrationId}
                        className={`bg-white rounded-lg shadow-sm border-2 ${
                          isCurrentUser ? 'border-[#1e40af] bg-blue-50' : getPositionStyle(position)
                        }`}
                      >
                        <div
                          onClick={() => setExpandedResult(isExpanded ? null : resultId)}
                          className="p-4 cursor-pointer"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-3">
                              <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                                position <= 3 ? 'bg-white shadow-sm' : 'bg-gray-100'
                              }`}>
                                {position <= 3 ? getMedalIcon(position) : position}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-gray-900 truncate">
                                  {result.shooterName}
                                  {isCurrentUser && <span className="ml-2 text-xs text-[#1e40af]">(You)</span>}
                                </h3>
                                <p className="text-sm text-gray-600 truncate">
                                  {result.club || 'No club'}
                                  {result.teamName && ` • Team: ${result.teamName}`}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              {result.hasDNF ? (
                                <span className="text-lg font-semibold text-red-600">DNF</span>
                              ) : result.hasDQ ? (
                                <span className="text-lg font-semibold text-red-600">DQ</span>
                              ) : (
                                <div className="text-lg font-bold text-gray-900">{result.totalScore}</div>
                              )}
                              <div className="text-xs text-gray-600">
                                X: {result.totalX} • V: {result.totalV}
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">SABU:</span> {result.sabuNumber || '-'}
                            </div>
                            <div>
                              <span className="font-medium">Province:</span> {result.province || '-'}
                            </div>
                          </div>

                          {result.hasUnverified && (
                            <div className="mt-2">
                              <span className="inline-flex px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                                Provisional
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Expandable Stage Scores */}
                        {isExpanded && stages.length > 0 && (
                          <div className="border-t border-gray-200 p-4">
                            <h4 className="text-sm font-medium text-gray-900 mb-3">Distance Breakdown</h4>
                            <div className="grid grid-cols-3 gap-2">
                              {stages.map((stage) => {
                                const stageKey = `S${stage.stage_number}`
                                const score = result.stageScores[stageKey]
                                return (
                                  <div key={stage.id} className="text-center p-2 bg-gray-50 rounded">
                                    <div className="text-xs text-gray-600">S{stage.stage_number}</div>
                                    <div className="text-sm font-semibold text-gray-900">
                                      {score !== undefined ? score : '-'}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  }
                })}
              </>
            )}
          </div>
        </>
      )}

      {!selectedCompetition && competitions.length === 0 && (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No competition results available</p>
          </div>
        </div>
      )}
    </div>
  )
}