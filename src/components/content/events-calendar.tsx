'use client'

import { useState, useMemo, useEffect } from 'react'
import { Calendar, momentLocalizer, View } from 'react-big-calendar'
import moment from 'moment'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { Calendar as CalendarIcon, MapPin, Clock, X } from 'lucide-react'
import Link from 'next/link'
import type { Database } from '@/types/database'

const localizer = momentLocalizer(moment)

type Competition = Database['public']['Tables']['competitions']['Row']
type Discipline = Database['public']['Tables']['disciplines']['Row']

// Custom toolbar component to hide default view buttons
function CustomToolbar({ label, onNavigate, onView }: any) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => onNavigate('PREV')}
          className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
        >
          Back
        </button>
        <button
          onClick={() => onNavigate('TODAY')}
          className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
        >
          Today
        </button>
        <button
          onClick={() => onNavigate('NEXT')}
          className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
        >
          Next
        </button>
      </div>
      <div className="text-lg font-semibold text-gray-900">{label}</div>
      <div className="w-32"></div> {/* Spacer for alignment */}
    </div>
  )
}

interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  resource: {
    competition: Competition
    disciplines: Discipline[]
    primaryColor: string
  }
}

interface EventsCalendarProps {
  competitions: Competition[]
  disciplines: Discipline[]
  competitionDisciplines: Array<{
    competition_id: string
    discipline_id: string
    disciplines: Discipline | null
  }>
}

export default function EventsCalendar({ competitions, disciplines, competitionDisciplines }: EventsCalendarProps) {
  const [view, setView] = useState<View | null>(null)
  const [date, setDate] = useState(new Date())
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [selectedDisciplines, setSelectedDisciplines] = useState<string[]>([])
  const [selectedProvince, setSelectedProvince] = useState<string>('')

  // Create a map of competition_id to disciplines
  const competitionDisciplineMap = useMemo(() => {
    const map = new Map<string, Discipline[]>()
    competitionDisciplines.forEach((cd) => {
      if (cd.disciplines && cd.competition_id) {
        const existing = map.get(cd.competition_id) || []
        map.set(cd.competition_id, [...existing, cd.disciplines])
      }
    })
    return map
  }, [competitionDisciplines])

  // Get unique provinces
  const provinces = useMemo(() => {
    const unique = new Set<string>()
    competitions.forEach((comp) => {
      if (comp.location) {
        // Extract province from location if possible, or use location as-is
        unique.add(comp.location)
      }
    })
    return Array.from(unique).sort()
  }, [competitions])

  // Create calendar events
  const events: CalendarEvent[] = useMemo(() => {
    return competitions
      .filter((comp) => {
        // Filter by discipline
        if (selectedDisciplines.length > 0) {
          const compDisciplines = competitionDisciplineMap.get(comp.id) || []
          const hasSelectedDiscipline = compDisciplines.some((d) => selectedDisciplines.includes(d.id))
          if (!hasSelectedDiscipline) return false
        }

        // Filter by province
        if (selectedProvince && comp.location !== selectedProvince) {
          return false
        }

        return comp.is_active
      })
      .map((comp) => {
        const compDisciplines = competitionDisciplineMap.get(comp.id) || []
        const primaryColor = compDisciplines[0]?.color || '#1e40af'
        const title = `${comp.name} - ${comp.location}`

        return {
          id: comp.id,
          title,
          start: new Date(comp.start_date),
          end: new Date(comp.end_date),
          resource: {
            competition: comp,
            disciplines: compDisciplines,
            primaryColor,
          },
        }
      })
  }, [competitions, competitionDisciplineMap, selectedDisciplines, selectedProvince])

  // Get upcoming events (next 5)
  const upcomingEvents = useMemo(() => {
    const now = new Date()
    return events
      .filter((event) => event.start >= now)
      .sort((a, b) => a.start.getTime() - b.start.getTime())
      .slice(0, 5)
  }, [events])

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedEvent(event)
  }

  const getRegistrationStatus = (competition: Competition) => {
    const now = new Date()
    const opens = competition.registration_opens ? new Date(competition.registration_opens) : null
    const closes = competition.registration_closes ? new Date(competition.registration_closes) : null

    if (opens && now < opens) return { status: 'upcoming', text: 'Registration Opens Soon', color: 'bg-blue-100 text-blue-800' }
    if (closes && now > closes) return { status: 'closed', text: 'Registration Closed', color: 'bg-gray-100 text-gray-800' }
    if (opens && closes && now >= opens && now <= closes) return { status: 'open', text: 'Registration Open', color: 'bg-green-100 text-green-800' }
    return { status: 'open', text: 'Registration Open', color: 'bg-green-100 text-green-800' }
  }

  const exportToICS = () => {
    const icsEvents = events.map((event) => {
      const comp = event.resource.competition
      const start = moment(event.start).utc().format('YYYYMMDD[T]HHmmss[Z]')
      const end = moment(event.end).utc().format('YYYYMMDD[T]HHmmss[Z]')
      const now = moment().utc().format('YYYYMMDD[T]HHmmss[Z]')

      return [
        'BEGIN:VEVENT',
        `UID:${comp.id}@sa-bisley-union.co.za`,
        `DTSTAMP:${now}`,
        `DTSTART:${start}`,
        `DTEND:${end}`,
        `SUMMARY:${comp.name}`,
        `DESCRIPTION:${comp.description || ''}\\n\\nLocation: ${comp.location}`,
        `LOCATION:${comp.location}`,
        'END:VEVENT',
      ].join('\r\n')
    })

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//SA Bisley Union//Competition Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      ...icsEvents,
      'END:VCALENDAR',
    ].join('\r\n')

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'sa-bisley-union-calendar.ics'
    link.click()
  }

  const eventStyleGetter = (event: CalendarEvent) => {
    return {
      style: {
        backgroundColor: event.resource.primaryColor,
        borderColor: event.resource.primaryColor,
        color: '#ffffff',
        borderRadius: '4px',
        border: 'none',
        padding: '2px 4px',
      },
    }
  }

  // Set default view based on screen size
  const getDefaultView = (): View => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return 'agenda'
    }
    return 'month'
  }

  const [initialView] = useState<View>(getDefaultView)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
      if (window.innerWidth < 768 && !view) {
        setView('agenda')
      }
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [view])

  // Use view if set by user, otherwise use initialView
  const currentView = view || initialView

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Sidebar */}
      <div className="lg:w-80 space-y-6">
        {/* Upcoming Events */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Upcoming Events</h3>
          <div className="space-y-3">
            {upcomingEvents.length > 0 ? (
              upcomingEvents.map((event) => (
                <div
                  key={event.id}
                  className="p-3 border border-gray-200 rounded-lg hover:border-[#1e40af] cursor-pointer transition-colors"
                  onClick={() => setSelectedEvent(event)}
                >
                  <h4 className="font-semibold text-gray-900 text-sm mb-1">{event.resource.competition.name}</h4>
                  <div className="flex items-center text-xs text-gray-600 mb-1">
                    <CalendarIcon className="h-3 w-3 mr-1" />
                    {moment(event.start).format('MMM D')} - {moment(event.end).format('MMM D, YYYY')}
                  </div>
                  <div className="flex items-center text-xs text-gray-600">
                    <MapPin className="h-3 w-3 mr-1" />
                    {event.resource.competition.location}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No upcoming events</p>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Filters</h3>

          {/* Discipline Filter */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Discipline</label>
            <div className="max-h-48 overflow-y-auto space-y-2">
              {disciplines.map((discipline) => (
                <label key={discipline.id} className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedDisciplines.includes(discipline.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedDisciplines([...selectedDisciplines, discipline.id])
                      } else {
                        setSelectedDisciplines(selectedDisciplines.filter((id) => id !== discipline.id))
                      }
                    }}
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

          {/* Province Filter */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Province/Location</label>
            <select
              value={selectedProvince}
              onChange={(e) => setSelectedProvince(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
            >
              <option value="">All Locations</option>
              {provinces.map((province) => (
                <option key={province} value={province}>
                  {province}
                </option>
              ))}
            </select>
          </div>

          {/* Export Button */}
          <button
            onClick={exportToICS}
            className="w-full px-4 py-2 bg-[#1e40af] text-white rounded-lg hover:bg-[#1e3a8a] transition-colors"
          >
            Export to ICS
          </button>
        </div>
      </div>

      {/* Calendar */}
      <div className="flex-1 bg-white rounded-lg shadow-md p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-2xl font-bold text-gray-900">Competition Calendar</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setView('month')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                currentView === 'month' ? 'bg-[#1e40af] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setView('week')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                currentView === 'week' ? 'bg-[#1e40af] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setView('agenda')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                currentView === 'agenda' ? 'bg-[#1e40af] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              List View
            </button>
          </div>
        </div>

        {currentView === 'agenda' ? (
          // Custom List View - shows all events
          <div>
            <div className="mb-4 text-sm text-gray-600">
              Showing {events.length} {events.length === 1 ? 'event' : 'events'}
            </div>
            <div className="space-y-4" style={{ maxHeight: '600px', overflowY: 'auto' }}>
              {events.length === 0 ? (
              <div className="text-center py-12">
                <CalendarIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 text-lg">No events found</p>
                <p className="text-gray-500 text-sm mt-2">Try adjusting your filters</p>
              </div>
            ) : (
              events
                .sort((a, b) => a.start.getTime() - b.start.getTime())
                .map((event) => {
                  const regStatus = getRegistrationStatus(event.resource.competition)
                  return (
                    <div
                      key={event.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-[#1e40af] hover:shadow-md transition-all cursor-pointer"
                      onClick={() => setSelectedEvent(event)}
                    >
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        {/* Left side - Event info */}
                        <div className="flex-1">
                          <div className="flex items-start gap-3 mb-2">
                            <div
                              className="w-1 h-full rounded"
                              style={{ backgroundColor: event.resource.primaryColor, minHeight: '40px' }}
                            />
                            <div className="flex-1">
                              <h3 className="text-xl font-bold text-gray-900 mb-2">{event.resource.competition.name}</h3>
                              <div className="space-y-1 text-sm text-gray-600">
                                <div className="flex items-center">
                                  <CalendarIcon className="h-4 w-4 mr-2" />
                                  <span>
                                    {moment(event.start).format('MMMM D')} - {moment(event.end).format('MMMM D, YYYY')}
                                  </span>
                                </div>
                                <div className="flex items-center">
                                  <MapPin className="h-4 w-4 mr-2" />
                                  <span>{event.resource.competition.location}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Disciplines */}
                          {event.resource.disciplines.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {event.resource.disciplines.map((discipline) => (
                                <span
                                  key={discipline.id}
                                  className="px-3 py-1 rounded-full text-xs font-medium text-white"
                                  style={{ backgroundColor: discipline.color || '#1e40af' }}
                                >
                                  {discipline.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Right side - Registration status */}
                        <div className="flex flex-col items-end gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${regStatus.color}`}>
                            {regStatus.text}
                          </span>
                          {event.resource.competition.registration_opens && (
                            <div className="text-xs text-gray-500 text-right">
                              <div>Opens: {moment(event.resource.competition.registration_opens).format('MMM D, YYYY')}</div>
                              {event.resource.competition.registration_closes && (
                                <div>Closes: {moment(event.resource.competition.registration_closes).format('MMM D, YYYY')}</div>
                              )}
                            </div>
                          )}
                          <Link
                            href={`/events/${event.resource.competition.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-sm text-[#1e40af] hover:text-[#1e3a8a] font-semibold"
                          >
                            View Details →
                          </Link>
                        </div>
                      </div>
                    </div>
                  )
                })
            )}
            </div>
          </div>
        ) : (
          // Calendar views (Month/Week)
          <div style={{ height: '600px' }}>
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              view={currentView}
              onView={setView}
              date={date}
              onNavigate={setDate}
              onSelectEvent={handleSelectEvent}
              eventPropGetter={eventStyleGetter}
              defaultView={initialView}
              popup
              components={{
                toolbar: CustomToolbar,
              }}
            />
          </div>
        )}
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h3 className="text-2xl font-bold text-gray-900">{selectedEvent.resource.competition.name}</h3>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Dates */}
              <div className="flex items-center text-gray-600">
                <CalendarIcon className="h-5 w-5 mr-2" />
                <span>
                  {moment(selectedEvent.start).format('MMMM D')} - {moment(selectedEvent.end).format('MMMM D, YYYY')}
                </span>
              </div>

              {/* Location */}
              <div className="flex items-center text-gray-600">
                <MapPin className="h-5 w-5 mr-2" />
                <span>{selectedEvent.resource.competition.location}</span>
              </div>

              {/* Disciplines */}
              {selectedEvent.resource.disciplines.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Disciplines:</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedEvent.resource.disciplines.map((discipline) => (
                      <span
                        key={discipline.id}
                        className="px-3 py-1 rounded-full text-sm text-white"
                        style={{ backgroundColor: discipline.color || '#1e40af' }}
                      >
                        {discipline.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              {selectedEvent.resource.competition.description && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Description:</h4>
                  <div
                    className="prose prose-sm max-w-none text-gray-700"
                    dangerouslySetInnerHTML={{ __html: selectedEvent.resource.competition.description }}
                  />
                </div>
              )}

              {/* Registration Status */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Registration:</h4>
                {(() => {
                  const regStatus = getRegistrationStatus(selectedEvent.resource.competition)
                  return (
                    <div className="flex items-center gap-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${regStatus.color}`}>
                        {regStatus.text}
                      </span>
                      {selectedEvent.resource.competition.registration_opens && (
                        <span className="text-sm text-gray-600">
                          Opens: {moment(selectedEvent.resource.competition.registration_opens).format('MMM D, YYYY')}
                        </span>
                      )}
                      {selectedEvent.resource.competition.registration_closes && (
                        <span className="text-sm text-gray-600">
                          Closes: {moment(selectedEvent.resource.competition.registration_closes).format('MMM D, YYYY')}
                        </span>
                      )}
                    </div>
                  )
                })()}
              </div>

              {/* Venue Details */}
              {selectedEvent.resource.competition.venue_details && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Venue Details:</h4>
                  <p className="text-gray-700">{selectedEvent.resource.competition.venue_details}</p>
                </div>
              )}

              {/* View Details Button */}
              <div className="pt-4 border-t border-gray-200">
                <Link
                  href={`/events/${selectedEvent.resource.competition.id}`}
                  className="inline-flex items-center px-6 py-2 bg-[#1e40af] text-white rounded-lg hover:bg-[#1e3a8a] transition-colors"
                >
                  View Full Details
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

