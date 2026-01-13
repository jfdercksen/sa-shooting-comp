import { createClient } from '@/lib/supabase/server'
import { Target, Award, Users, FileText, Calendar } from 'lucide-react'
import type { Database } from '@/types/database'

type Profile = Database['public']['Tables']['profiles']['Row']

export default async function AboutPage() {
  const supabase = await createClient()

  // Fetch site settings
  const { data: settingsData } = await supabase.from('site_settings').select('key, value')

  const settings: Record<string, string> = {}
  settingsData?.forEach((setting) => {
    settings[setting.key] = setting.value || ''
  })

  // Fetch executive committee members
  const { data: committeeMembers } = await supabase
    .from('profiles')
    .select('*')
    .in('role', ['admin', 'super_admin'])
    .order('full_names', { ascending: true })

  // Parse milestones from settings (stored as JSON string)
  let milestones: Array<{ year: string; event: string }> = []
  try {
    if (settings['about_milestones']) {
      milestones = JSON.parse(settings['about_milestones'])
    }
  } catch (e) {
    // If not JSON, try parsing as simple format
    milestones = []
  }

  // Parse affiliations from settings
  let affiliations: Array<{ name: string; logo_url?: string; website?: string }> = []
  try {
    if (settings['about_affiliations']) {
      affiliations = JSON.parse(settings['about_affiliations'])
    }
  } catch (e) {
    affiliations = []
  }

  // Parse documents from settings
  let documents: Array<{ title: string; url: string; type?: string }> = []
  try {
    if (settings['about_documents']) {
      documents = JSON.parse(settings['about_documents'])
    }
  } catch (e) {
    documents = []
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative h-96 flex items-center justify-center bg-gradient-to-r from-[#1e40af] to-[#1e3a8a] overflow-hidden">
        {settings['about_hero_image'] && (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-20"
            style={{ backgroundImage: `url(${settings['about_hero_image']})` }}
          ></div>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-black/70"></div>
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <Target className="h-20 w-20 mx-auto mb-4 text-white opacity-80" />
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
            {settings['about_hero_title'] || 'About SA Bisley Union'}
          </h1>
          {settings['about_hero_subtitle'] && (
            <p className="text-xl md:text-2xl text-gray-200">{settings['about_hero_subtitle']}</p>
          )}
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* History Section */}
        {(settings['about_history'] || milestones.length > 0) && (
          <section className="mb-12">
            <div className="bg-white rounded-lg shadow-md p-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                <Calendar className="h-8 w-8 mr-3 text-[#1e40af]" />
                Our History
              </h2>
              {settings['about_history'] && (
                <div
                  className="prose prose-lg max-w-none text-gray-700 mb-8"
                  dangerouslySetInnerHTML={{ __html: settings['about_history'] }}
                />
              )}

              {milestones.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">Key Milestones</h3>
                  <div className="relative">
                    <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-[#1e40af]"></div>
                    <div className="space-y-8">
                      {milestones.map((milestone, index) => (
                        <div key={index} className="relative pl-20">
                          <div className="absolute left-6 top-2 w-4 h-4 bg-[#1e40af] rounded-full border-4 border-white shadow-md"></div>
                          <div className="bg-gray-50 rounded-lg p-6">
                            <div className="text-lg font-bold text-[#1e40af] mb-2">{milestone.year}</div>
                            <div className="text-gray-700">{milestone.event}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Mission & Vision */}
        {(settings['about_mission'] || settings['about_vision']) && (
          <section className="mb-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {settings['about_mission'] && (
                <div className="bg-white rounded-lg shadow-md p-8">
                  <div className="flex items-center mb-4">
                    <Target className="h-8 w-8 mr-3 text-[#1e40af]" />
                    <h2 className="text-2xl font-bold text-gray-900">Our Mission</h2>
                  </div>
                  <div
                    className="prose prose-lg max-w-none text-gray-700"
                    dangerouslySetInnerHTML={{ __html: settings['about_mission'] }}
                  />
                </div>
              )}

              {settings['about_vision'] && (
                <div className="bg-white rounded-lg shadow-md p-8">
                  <div className="flex items-center mb-4">
                    <Award className="h-8 w-8 mr-3 text-[#1e40af]" />
                    <h2 className="text-2xl font-bold text-gray-900">Our Vision</h2>
                  </div>
                  <div
                    className="prose prose-lg max-w-none text-gray-700"
                    dangerouslySetInnerHTML={{ __html: settings['about_vision'] }}
                  />
                </div>
              )}
            </div>
          </section>
        )}

        {/* Executive Committee */}
        {committeeMembers && committeeMembers.length > 0 && (
          <section className="mb-12">
            <div className="bg-white rounded-lg shadow-md p-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                <Users className="h-8 w-8 mr-3 text-[#1e40af]" />
                Executive Committee
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {committeeMembers.map((member) => (
                  <CommitteeMemberCard key={member.id} member={member} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Affiliations */}
        {affiliations.length > 0 && (
          <section className="mb-12">
            <div className="bg-white rounded-lg shadow-md p-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Affiliations</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {affiliations.map((affiliation, index) => (
                  <a
                    key={index}
                    href={affiliation.website || '#'}
                    target={affiliation.website ? '_blank' : undefined}
                    rel={affiliation.website ? 'noopener noreferrer' : undefined}
                    className="flex items-center justify-center p-6 border-2 border-gray-200 rounded-lg hover:border-[#1e40af] transition-colors"
                  >
                    {affiliation.logo_url ? (
                      <img
                        src={affiliation.logo_url}
                        alt={affiliation.name}
                        className="max-h-20 max-w-full object-contain"
                      />
                    ) : (
                      <span className="text-gray-700 font-semibold text-center">{affiliation.name}</span>
                    )}
                  </a>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Documents */}
        {documents.length > 0 && (
          <section className="mb-12">
            <div className="bg-white rounded-lg shadow-md p-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                <FileText className="h-8 w-8 mr-3 text-[#1e40af]" />
                Important Documents
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {documents.map((doc, index) => (
                  <a
                    key={index}
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-[#1e40af] hover:bg-blue-50 transition-colors group"
                  >
                    <FileText className="h-6 w-6 mr-4 text-[#1e40af] group-hover:scale-110 transition-transform" />
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 group-hover:text-[#1e40af] transition-colors">
                        {doc.title}
                      </div>
                      {doc.type && (
                        <div className="text-sm text-gray-500">{doc.type}</div>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Additional Content */}
        {settings['about_additional_content'] && (
          <section className="mb-12">
            <div className="bg-white rounded-lg shadow-md p-8">
              <div
                className="prose prose-lg max-w-none text-gray-700"
                dangerouslySetInnerHTML={{ __html: settings['about_additional_content'] }}
              />
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

function CommitteeMemberCard({ member }: { member: Profile }) {
  const fullName = `${member.full_names} ${member.surname}`
  const position = member.role === 'super_admin' ? 'Super Admin' : 'Admin'

  return (
    <div className="text-center p-6 border border-gray-200 rounded-lg hover:shadow-lg transition-shadow">
      {member.profile_image ? (
        <div className="mb-4">
          <img
            src={member.profile_image}
            alt={fullName}
            className="w-32 h-32 rounded-full mx-auto object-cover border-4 border-[#1e40af]"
          />
        </div>
      ) : (
        <div className="w-32 h-32 rounded-full mx-auto mb-4 bg-gradient-to-br from-[#1e40af] to-[#1e3a8a] flex items-center justify-center">
          <Users className="h-16 w-16 text-white opacity-50" />
        </div>
      )}
      <h3 className="text-lg font-bold text-gray-900 mb-1">{fullName}</h3>
      <p className="text-sm text-[#1e40af] font-semibold mb-2">{position}</p>
      {member.bio && (
        <p className="text-sm text-gray-600 line-clamp-3">{member.bio}</p>
      )}
    </div>
  )
}
