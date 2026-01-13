'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Mail, Phone, MapPin, Clock, Facebook, Twitter, Instagram, Send, Calendar, BookOpen, HelpCircle, FileText } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

const SUBJECTS = [
  'General Inquiry',
  'Competition Information',
  'Registration Help',
  'Technical Support',
  'Membership',
]

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: 'General Inquiry',
    message: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [siteSettings, setSiteSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchSiteSettings()
  }, [])

  const fetchSiteSettings = async () => {
    const { data } = await supabase.from('site_settings').select('key, value')

    if (data) {
      const settings: Record<string, string> = {}
      data.forEach((setting) => {
        settings[setting.key] = setting.value || ''
      })
      setSiteSettings(settings)
    }
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const { error } = await supabase.from('contact_submissions').insert({
        name: formData.name,
        email: formData.email,
        phone: formData.phone || null,
        subject: formData.subject,
        message: formData.message,
        is_read: false,
      })

      if (error) throw error

      toast.success('Thank you for your message! We will get back to you soon.')
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: 'General Inquiry',
        message: '',
      })
    } catch (error: any) {
      console.error('Error submitting contact form:', error)
      toast.error(error.message || 'Error sending message. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const officeAddress = siteSettings['office_address'] || ''
  const officePhone = siteSettings['office_phone'] || ''
  const officeEmail = siteSettings['office_email'] || ''
  const officeHours = siteSettings['office_hours'] || ''
  const mapLocation = siteSettings['map_location'] || officeAddress
  const facebookUrl = siteSettings['facebook_url'] || ''
  const twitterUrl = siteSettings['twitter_url'] || ''
  const instagramUrl = siteSettings['instagram_url'] || ''

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Contact Us</h1>
          <p className="text-lg text-gray-600">Get in touch with SA Bisley Union - Gauteng Noord</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Contact Form */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Send us a Message</h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                  placeholder="082 123 4567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject *
                </label>
                <select
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                  required
                >
                  {SUBJECTS.map((subject) => (
                    <option key={subject} value={subject}>
                      {subject}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message *
                </label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                  placeholder="Enter your message..."
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center px-6 py-3 bg-[#1e40af] text-white rounded-lg hover:bg-[#1e3a8a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                {submitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5 mr-2" />
                    Send Message
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Right Column - Contact Information */}
          <div className="space-y-6">
            {/* Contact Information */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Contact Information</h2>
              <div className="space-y-4">
                {officeAddress && (
                  <div className="flex items-start">
                    <MapPin className="h-5 w-5 text-[#1e40af] mr-3 mt-1 flex-shrink-0" />
                    <div>
                      <div className="text-sm font-medium text-gray-700">Office Address</div>
                      <div className="text-gray-900">{officeAddress}</div>
                    </div>
                  </div>
                )}

                {officePhone && (
                  <div className="flex items-start">
                    <Phone className="h-5 w-5 text-[#1e40af] mr-3 mt-1 flex-shrink-0" />
                    <div>
                      <div className="text-sm font-medium text-gray-700">Phone</div>
                      <a
                        href={`tel:${officePhone}`}
                        className="text-[#1e40af] hover:text-[#1e3a8a] hover:underline"
                      >
                        {officePhone}
                      </a>
                    </div>
                  </div>
                )}

                {officeEmail && (
                  <div className="flex items-start">
                    <Mail className="h-5 w-5 text-[#1e40af] mr-3 mt-1 flex-shrink-0" />
                    <div>
                      <div className="text-sm font-medium text-gray-700">Email</div>
                      <a
                        href={`mailto:${officeEmail}`}
                        className="text-[#1e40af] hover:text-[#1e3a8a] hover:underline"
                      >
                        {officeEmail}
                      </a>
                    </div>
                  </div>
                )}

                {officeHours && (
                  <div className="flex items-start">
                    <Clock className="h-5 w-5 text-[#1e40af] mr-3 mt-1 flex-shrink-0" />
                    <div>
                      <div className="text-sm font-medium text-gray-700">Office Hours</div>
                      <div className="text-gray-900 whitespace-pre-line">{officeHours}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Links */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Links</h2>
              <div className="space-y-3">
                <Link
                  href="/events"
                  className="flex items-center text-[#1e40af] hover:text-[#1e3a8a] transition-colors"
                >
                  <Calendar className="h-5 w-5 mr-3" />
                  <span>Competition Calendar</span>
                </Link>
                <Link
                  href="/register"
                  className="flex items-center text-[#1e40af] hover:text-[#1e3a8a] transition-colors"
                >
                  <BookOpen className="h-5 w-5 mr-3" />
                  <span>Registration Guide</span>
                </Link>
                <Link
                  href="/about"
                  className="flex items-center text-[#1e40af] hover:text-[#1e3a8a] transition-colors"
                >
                  <HelpCircle className="h-5 w-5 mr-3" />
                  <span>FAQ</span>
                </Link>
                <a
                  href="#"
                  className="flex items-center text-[#1e40af] hover:text-[#1e3a8a] transition-colors"
                >
                  <FileText className="h-5 w-5 mr-3" />
                  <span>Rules & Regulations</span>
                </a>
              </div>
            </div>

            {/* Map */}
            {mapLocation && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Find Us</h2>
                <div className="aspect-video rounded-lg overflow-hidden border border-gray-200">
                  {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? (
                    <iframe
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      loading="lazy"
                      allowFullScreen
                      referrerPolicy="no-referrer-when-downgrade"
                      src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=${encodeURIComponent(mapLocation)}`}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100">
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapLocation)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#1e40af] hover:text-[#1e3a8a] underline flex items-center"
                      >
                        <MapPin className="h-5 w-5 mr-2" />
                        View on Google Maps
                      </a>
                    </div>
                  )}
                </div>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapLocation)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center text-sm text-[#1e40af] hover:text-[#1e3a8a]"
                >
                  <MapPin className="h-4 w-4 mr-1" />
                  Open in Google Maps
                </a>
              </div>
            )}

            {/* Social Media */}
            {(facebookUrl || twitterUrl || instagramUrl) && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Follow Us</h2>
                <div className="flex gap-4">
                  {facebookUrl && (
                    <a
                      href={facebookUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      aria-label="Facebook"
                    >
                      <Facebook className="h-6 w-6" />
                    </a>
                  )}
                  {twitterUrl && (
                    <a
                      href={twitterUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 bg-blue-400 text-white rounded-lg hover:bg-blue-500 transition-colors"
                      aria-label="Twitter"
                    >
                      <Twitter className="h-6 w-6" />
                    </a>
                  )}
                  {instagramUrl && (
                    <a
                      href={instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-colors"
                      aria-label="Instagram"
                    >
                      <Instagram className="h-6 w-6" />
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
