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
  const { data: competitionDisciplines } = await supabase
    .from('competition_disciplines')
    .select(`
      competition_id,
      discipline_id,
      disciplines (
        id,
        name,
        color,
        slug
      )
    `)

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Competition Calendar</h1>
          <p className="text-lg text-gray-600">
            View all upcoming shooting competitions and events
          </p>
        </div>

        <EventsCalendar
          competitions={competitions || []}
          disciplines={disciplines || []}
          competitionDisciplines={competitionDisciplines || []}
        />
      </div>
    </div>
  )
}
