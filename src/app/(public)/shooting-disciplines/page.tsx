import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Target, ArrowRight } from 'lucide-react'
import type { Database } from '@/types/database'

type Discipline = Database['public']['Tables']['disciplines']['Row']

export default async function ShootingDisciplinesPage() {
  const supabase = await createClient()

  const { data: disciplines, error } = await supabase
    .from('disciplines')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true, nullsFirst: false })

  if (error) {
    console.error('Error fetching disciplines:', error)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Shooting Disciplines</h1>
          <p className="text-xl text-gray-600">
            Explore the different shooting disciplines offered at our competitions
          </p>
        </div>
      </div>

      {/* Disciplines Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {disciplines && disciplines.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {disciplines.map((discipline) => (
              <DisciplineCard key={discipline.id} discipline={discipline} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Target className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">No disciplines available at this time.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function DisciplineCard({ discipline }: { discipline: Discipline }) {
  const bgColor = discipline.color || '#1e40af'
  
  // Strip HTML tags for truncation (server-side safe)
  const stripHtml = (html: string) => {
    return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
  }
  
  const description = discipline.description || ''
  const plainTextDescription = stripHtml(description)
  const truncatedDescription = plainTextDescription.length > 150 
    ? plainTextDescription.substring(0, 150) + '...' 
    : plainTextDescription

  return (
    <Link
      href={`/shooting-disciplines/${discipline.slug}`}
      className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all hover:scale-105 group"
    >
      {/* Color Bar */}
      <div
        className="h-2 w-full"
        style={{ backgroundColor: bgColor }}
      />

      {/* Content */}
      <div className="p-6">
        {/* Image */}
        {discipline.image_url ? (
          <div className="mb-4 rounded-lg overflow-hidden">
            <img
              src={discipline.image_url}
              alt={discipline.name}
              className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-300"
            />
          </div>
        ) : (
          <div
            className="mb-4 h-48 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: bgColor + '20' }}
          >
            <Target className="h-16 w-16 text-white opacity-50" style={{ color: bgColor }} />
          </div>
        )}

        {/* Name */}
        <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-[#1e40af] transition-colors">
          {discipline.name}
        </h3>

        {/* Description */}
        {truncatedDescription && (
          <p className="text-gray-600 mb-4 line-clamp-3">{truncatedDescription}</p>
        )}

        {/* Equipment Requirements */}
        {discipline.equipment_requirements && (
          <div className="mb-4">
            <p className="text-sm font-semibold text-gray-700 mb-1">Equipment:</p>
            <div
              className="text-sm text-gray-600 line-clamp-2 prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: discipline.equipment_requirements }}
            />
          </div>
        )}

        {/* Learn More Button */}
        <div className="flex items-center text-[#1e40af] font-semibold group-hover:text-[#1e3a8a] transition-colors">
          Learn More
          <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </Link>
  )
}
