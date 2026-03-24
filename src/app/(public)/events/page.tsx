import { createClient } from '@/lib/supabase/server'
import EventsCalendar from '@/components/content/events-calendar'

export default async function EventsPage() {
  const supabase = await createClient()

  // Fetch competitions
  const { data: competitions } = await supabase
    .from('competitions')
    .select('*')
    .eq('is_active', true)
    .order('start_date', { ascending: true })

  // Fetch disciplines
  const { data: disciplines } = await supabase
    .from('disciplines')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  // Fetch competition disciplines with discipline details
  const { data: competitionDisciplinesRaw } = await supabase
    .from('competition_disciplines')
    .select(`
      competition_id,
      discipline_id,
      disciplines (*)
    `)

  // Filter out null values and ensure required fields are present
  const competitionDisciplines = (competitionDisciplinesRaw || []).filter(
    (cd): cd is NonNullable<typeof cd> & { competition_id: string; discipline_id: string } =>
      cd !== null && cd.competition_id !== null && cd.discipline_id !== null
  )

  // Fetch championships for the series filter
  const { data: championships } = await (supabase as any)
    .from('championships')
    .select('id, name, year')
    .eq('is_active', true)
    .order('year', { ascending: false })

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Event Calendar</h1>
          <p className="text-lg text-gray-600">
            View all upcoming shooting competitions and events
          </p>
        </div>

        <EventsCalendar
          competitions={competitions || []}
          disciplines={disciplines || []}
          competitionDisciplines={competitionDisciplines}
          championships={championships || []}
        />
      </div>
    </div>
  )
}
