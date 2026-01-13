'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Save, Settings as SettingsIcon, Mail, Phone, MapPin, Globe, FileText, Info } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import RichTextEditor from '@/components/forms/rich-text-editor'

type SiteSetting = {
  key: string
  value: string | null
}

export default function SiteSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    setLoading(true)
    try {
      const { data, error } = await supabase.from('site_settings').select('key, value')

      if (error) throw error

      const settingsMap: Record<string, string> = {}
      data?.forEach((setting) => {
        settingsMap[setting.key] = setting.value || ''
      })

      setSettings(settingsMap)
    } catch (error: any) {
      console.error('Error loading settings:', error)
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('You must be logged in to save settings')
        return
      }

      // Update or insert each setting
      const updates = Object.entries(settings).map(([key, value]) => ({
        key,
        value: value || null,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      }))

      // Use upsert to update or insert
      for (const update of updates) {
        const { error } = await supabase.from('site_settings').upsert(update, {
          onConflict: 'key',
        })

        if (error) throw error
      }

      toast.success('Settings saved successfully')
      router.refresh()
    } catch (error: any) {
      console.error('Error saving settings:', error)
      toast.error(error.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  function updateSetting(key: string, value: string) {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1e40af] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <SettingsIcon className="h-8 w-8 text-[#1e40af]" />
            Site Settings
          </h1>
          <p className="text-gray-600 mt-2">Manage site-wide settings and content</p>
        </div>

        <div className="space-y-6">
          {/* Contact Information */}
          <SettingsSection title="Contact Information" icon={<Mail className="h-5 w-5" />}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Mail className="h-4 w-4 inline mr-2" />
                  Contact Email
                </label>
                <input
                  type="email"
                  value={settings['office_email'] || ''}
                  onChange={(e) => updateSetting('office_email', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                  placeholder="contact@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Phone className="h-4 w-4 inline mr-2" />
                  Contact Phone
                </label>
                <input
                  type="tel"
                  value={settings['office_phone'] || ''}
                  onChange={(e) => updateSetting('office_phone', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                  placeholder="+27 11 123 4567"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="h-4 w-4 inline mr-2" />
                  Office Address
                </label>
                <textarea
                  value={settings['office_address'] || ''}
                  onChange={(e) => updateSetting('office_address', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                  placeholder="123 Main Street, City, Province, Postal Code"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Info className="h-4 w-4 inline mr-2" />
                  Office Hours
                </label>
                <input
                  type="text"
                  value={settings['office_hours'] || ''}
                  onChange={(e) => updateSetting('office_hours', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                  placeholder="Monday - Friday: 9:00 AM - 5:00 PM"
                />
              </div>
            </div>
          </SettingsSection>

          {/* Social Media */}
          <SettingsSection title="Social Media Links" icon={<Globe className="h-5 w-5" />}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Facebook URL</label>
                <input
                  type="url"
                  value={settings['facebook_url'] || ''}
                  onChange={(e) => updateSetting('facebook_url', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                  placeholder="https://facebook.com/yourpage"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Twitter/X URL</label>
                <input
                  type="url"
                  value={settings['twitter_url'] || ''}
                  onChange={(e) => updateSetting('twitter_url', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                  placeholder="https://twitter.com/yourhandle"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Instagram URL</label>
                <input
                  type="url"
                  value={settings['instagram_url'] || ''}
                  onChange={(e) => updateSetting('instagram_url', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                  placeholder="https://instagram.com/yourhandle"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">LinkedIn URL</label>
                <input
                  type="url"
                  value={settings['linkedin_url'] || ''}
                  onChange={(e) => updateSetting('linkedin_url', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                  placeholder="https://linkedin.com/company/yourcompany"
                />
              </div>
            </div>
          </SettingsSection>

          {/* About Page Content */}
          <SettingsSection title="About Page Content" icon={<FileText className="h-5 w-5" />}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Hero Title</label>
                <input
                  type="text"
                  value={settings['about_hero_title'] || ''}
                  onChange={(e) => updateSetting('about_hero_title', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                  placeholder="About SA Bisley Union"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Hero Subtitle</label>
                <input
                  type="text"
                  value={settings['about_hero_subtitle'] || ''}
                  onChange={(e) => updateSetting('about_hero_subtitle', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                  placeholder="Excellence in Target Shooting Sports"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Hero Image URL</label>
                <input
                  type="url"
                  value={settings['about_hero_image'] || ''}
                  onChange={(e) => updateSetting('about_hero_image', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">History Content</label>
                <RichTextEditor
                  content={settings['about_history'] || ''}
                  onChange={(content) => updateSetting('about_history', content)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mission Statement</label>
                <RichTextEditor
                  content={settings['about_mission'] || ''}
                  onChange={(content) => updateSetting('about_mission', content)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Vision Statement</label>
                <RichTextEditor
                  content={settings['about_vision'] || ''}
                  onChange={(content) => updateSetting('about_vision', content)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Milestones (JSON)</label>
                <textarea
                  value={settings['about_milestones'] || ''}
                  onChange={(e) => updateSetting('about_milestones', e.target.value)}
                  rows={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent font-mono text-sm"
                  placeholder='[{"year": "2020", "event": "Founded"}, {"year": "2021", "event": "First competition"}]'
                />
                <p className="text-xs text-gray-500 mt-1">
                  Format: JSON array of objects with "year" and "event" properties
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Affiliations (JSON)</label>
                <textarea
                  value={settings['about_affiliations'] || ''}
                  onChange={(e) => updateSetting('about_affiliations', e.target.value)}
                  rows={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent font-mono text-sm"
                  placeholder='[{"name": "Organization", "logo_url": "https://...", "website": "https://..."}]'
                />
                <p className="text-xs text-gray-500 mt-1">
                  Format: JSON array of objects with "name", "logo_url" (optional), and "website" (optional)
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Documents (JSON)</label>
                <textarea
                  value={settings['about_documents'] || ''}
                  onChange={(e) => updateSetting('about_documents', e.target.value)}
                  rows={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent font-mono text-sm"
                  placeholder='[{"title": "Constitution", "url": "https://...", "type": "PDF"}]'
                />
                <p className="text-xs text-gray-500 mt-1">
                  Format: JSON array of objects with "title", "url", and "type" (optional)
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Additional Content</label>
                <RichTextEditor
                  content={settings['about_additional_content'] || ''}
                  onChange={(content) => updateSetting('about_additional_content', content)}
                />
              </div>
            </div>
          </SettingsSection>

          {/* Footer */}
          <SettingsSection title="Footer Content" icon={<FileText className="h-5 w-5" />}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Footer Text</label>
              <textarea
                value={settings['footer_text'] || ''}
                onChange={(e) => updateSetting('footer_text', e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                placeholder="Copyright information and footer text"
              />
            </div>
          </SettingsSection>

          {/* Map Settings */}
          <SettingsSection title="Map Settings" icon={<MapPin className="h-5 w-5" />}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Map Location</label>
              <input
                type="text"
                value={settings['map_location'] || ''}
                onChange={(e) => updateSetting('map_location', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                placeholder="Address or coordinates for map"
              />
              <p className="text-xs text-gray-500 mt-1">
                Used for Google Maps embed on contact page
              </p>
            </div>
          </SettingsSection>

          {/* Save Button */}
          <div className="flex justify-end pt-6 border-t">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-[#1e40af] text-white rounded-lg hover:bg-[#1e3a8a] transition-colors disabled:opacity-50"
            >
              <Save className="h-5 w-5" />
              {saving ? 'Saving...' : 'Save All Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function SettingsSection({
  title,
  icon,
  children,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
        {icon}
        {title}
      </h2>
      {children}
    </div>
  )
}

