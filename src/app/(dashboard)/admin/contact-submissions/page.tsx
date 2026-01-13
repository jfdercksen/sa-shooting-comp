'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Mail, Eye, EyeOff, Trash2, Reply, X, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import type { Database } from '@/types/database'

type ContactSubmission = Database['public']['Tables']['contact_submissions']['Row']

export default function ContactSubmissionsPage() {
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSubmission, setSelectedSubmission] = useState<ContactSubmission | null>(null)
  const [filter, setFilter] = useState<'all' | 'read' | 'unread'>('all')
  const supabase = createClient()

  useEffect(() => {
    loadSubmissions()
  }, [filter])

  async function loadSubmissions() {
    setLoading(true)
    try {
      let query = supabase.from('contact_submissions').select('*').order('created_at', { ascending: false })

      if (filter === 'read') {
        query = query.eq('is_read', true)
      } else if (filter === 'unread') {
        query = query.eq('is_read', false)
      }

      const { data, error } = await query

      if (error) throw error
      setSubmissions(data || [])
    } catch (error: any) {
      console.error('Error loading submissions:', error)
      toast.error('Failed to load submissions')
    } finally {
      setLoading(false)
    }
  }

  async function toggleReadStatus(submission: ContactSubmission) {
    try {
      const { error } = await supabase
        .from('contact_submissions')
        .update({ is_read: !submission.is_read })
        .eq('id', submission.id)

      if (error) throw error

      toast.success(submission.is_read ? 'Marked as unread' : 'Marked as read')
      loadSubmissions()
    } catch (error: any) {
      console.error('Error updating status:', error)
      toast.error('Failed to update status')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this submission?')) return

    try {
      const { error } = await supabase.from('contact_submissions').delete().eq('id', id)

      if (error) throw error

      toast.success('Submission deleted')
      if (selectedSubmission?.id === id) {
        setSelectedSubmission(null)
      }
      loadSubmissions()
    } catch (error: any) {
      console.error('Error deleting submission:', error)
      toast.error('Failed to delete submission')
    }
  }

  function handleReply(submission: ContactSubmission) {
    const subject = encodeURIComponent(`Re: ${submission.subject || 'Contact Form Submission'}`)
    const body = encodeURIComponent(
      `\n\n--- Original Message ---\nFrom: ${submission.name} (${submission.email})\nDate: ${format(new Date(submission.created_at || ''), 'PPpp')}\n\n${submission.message}`
    )
    window.location.href = `mailto:${submission.email}?subject=${subject}&body=${body}`
  }

  const unreadCount = submissions.filter(s => !s.is_read).length

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Contact Submissions</h1>
            <p className="text-gray-600 mt-2">Manage contact form submissions</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'all' ? 'bg-[#1e40af] text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              All ({submissions.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'unread'
                  ? 'bg-[#1e40af] text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Unread ({unreadCount})
            </button>
            <button
              onClick={() => setFilter('read')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'read' ? 'bg-[#1e40af] text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Read ({submissions.length - unreadCount})
            </button>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1e40af] mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading submissions...</p>
          </div>
        ) : submissions.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <Mail className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Submissions</h2>
            <p className="text-gray-600">No contact submissions found</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Subject
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {submissions.map((submission) => (
                    <tr
                      key={submission.id}
                      className={`hover:bg-gray-50 cursor-pointer ${
                        !submission.is_read ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => setSelectedSubmission(submission)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        {submission.is_read ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{submission.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{submission.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{submission.subject || 'No subject'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">
                          {format(new Date(submission.created_at || ''), 'PPp')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => toggleReadStatus(submission)}
                            className="text-blue-600 hover:text-blue-900"
                            title={submission.is_read ? 'Mark as unread' : 'Mark as read'}
                          >
                            {submission.is_read ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                          <button
                            onClick={() => handleReply(submission)}
                            className="text-green-600 hover:text-green-900"
                            title="Reply via email"
                          >
                            <Reply className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(submission.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
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

      {/* View Submission Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">Submission Details</h2>
              <button onClick={() => setSelectedSubmission(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Name</label>
                  <p className="text-gray-900 mt-1">{selectedSubmission.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p className="text-gray-900 mt-1">
                    <a href={`mailto:${selectedSubmission.email}`} className="text-blue-600 hover:underline">
                      {selectedSubmission.email}
                    </a>
                  </p>
                </div>
                {selectedSubmission.phone && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Phone</label>
                    <p className="text-gray-900 mt-1">
                      <a href={`tel:${selectedSubmission.phone}`} className="text-blue-600 hover:underline">
                        {selectedSubmission.phone}
                      </a>
                    </p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-gray-500">Date</label>
                  <p className="text-gray-900 mt-1">
                    {format(new Date(selectedSubmission.created_at || ''), 'PPpp')}
                  </p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-500">Subject</label>
                  <p className="text-gray-900 mt-1">{selectedSubmission.subject || 'No subject'}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Message</label>
                <div className="mt-2 p-4 bg-gray-50 rounded-lg text-gray-900 whitespace-pre-wrap">
                  {selectedSubmission.message}
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={() => {
                    toggleReadStatus(selectedSubmission)
                    setSelectedSubmission({ ...selectedSubmission, is_read: !selectedSubmission.is_read })
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {selectedSubmission.is_read ? (
                    <>
                      <EyeOff className="h-4 w-4" />
                      Mark as Unread
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4" />
                      Mark as Read
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleReply(selectedSubmission)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Reply className="h-4 w-4" />
                  Reply via Email
                </button>
                <button
                  onClick={() => {
                    handleDelete(selectedSubmission.id)
                    setSelectedSubmission(null)
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
