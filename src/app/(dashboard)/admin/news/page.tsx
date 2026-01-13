'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Edit, Trash2, Eye, Save, X } from 'lucide-react'
import RichTextEditor from '@/components/forms/rich-text-editor'
import { toast } from 'sonner'
import { format } from 'date-fns'
import Link from 'next/link'
import type { Database } from '@/types/database'

type NewsPost = Database['public']['Tables']['news_posts']['Row']
type NewsPostInsert = Database['public']['Tables']['news_posts']['Insert']
type NewsPostUpdate = Database['public']['Tables']['news_posts']['Update']

const CATEGORIES = ['News', 'Results', 'Announcements', 'Technical']

export default function AdminNewsPage() {
  const [posts, setPosts] = useState<NewsPost[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const supabase = createClient()

  const [formData, setFormData] = useState<Partial<NewsPostInsert>>({
    title: '',
    slug: '',
    content: '',
    excerpt: '',
    featured_image: '',
    category: 'News',
    tags: [],
    is_featured: false,
    is_published: false,
    published_at: null,
  })

  useEffect(() => {
    fetchPosts()
    fetchUser()
  }, [])

  const fetchUser = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (authUser) {
      setUser(authUser)
    }
  }

  const fetchPosts = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('news_posts')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      toast.error('Error fetching posts')
      console.error(error)
    } else {
      setPosts(data || [])
    }
    setLoading(false)
  }

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  }

  const handleNameChange = (title: string) => {
    setFormData({
      ...formData,
      title,
      slug: formData.slug || generateSlug(title),
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title || !formData.content) {
      toast.error('Title and content are required')
      return
    }

    setSaving(true)

    try {
      const postData: NewsPostInsert | NewsPostUpdate = {
        title: formData.title!,
        slug: formData.slug || generateSlug(formData.title!),
        content: formData.content!,
        excerpt: formData.excerpt || null,
        featured_image: formData.featured_image || null,
        category: formData.category || null,
        tags: formData.tags || null,
        is_featured: formData.is_featured || false,
        is_published: formData.is_published || false,
        published_at: formData.published_at || (formData.is_published ? new Date().toISOString() : null),
        author_id: user?.id || null,
      }

      if (editingId) {
        // Update
        const { error } = await supabase
          .from('news_posts')
          .update({
            ...postData,
            updated_at: new Date().toISOString(),
          } as NewsPostUpdate)
          .eq('id', editingId)

        if (error) throw error
        toast.success('Post updated successfully')
      } else {
        // Create
        const { error } = await supabase.from('news_posts').insert(postData as NewsPostInsert)

        if (error) throw error
        toast.success('Post created successfully')
      }

      setShowForm(false)
      setEditingId(null)
      resetForm()
      fetchPosts()
    } catch (error: any) {
      console.error('Error saving post:', error)
      toast.error(error.message || 'Error saving post')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (post: NewsPost) => {
    setFormData({
      title: post.title,
      slug: post.slug,
      content: post.content,
      excerpt: post.excerpt || '',
      featured_image: post.featured_image || '',
      category: post.category || 'News',
      tags: post.tags || [],
      is_featured: post.is_featured || false,
      is_published: post.is_published || false,
      published_at: post.published_at || null,
    })
    setEditingId(post.id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return

    try {
      const { error } = await supabase.from('news_posts').delete().eq('id', id)
      if (error) throw error
      toast.success('Post deleted successfully')
      fetchPosts()
    } catch (error: any) {
      toast.error(error.message || 'Error deleting post')
      console.error(error)
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      slug: '',
      content: '',
      excerpt: '',
      featured_image: '',
      category: 'News',
      tags: [],
      is_featured: false,
      is_published: false,
      published_at: null,
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-[#1e40af] rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">News Management</h1>
          <p className="text-gray-600 mt-1">Create and manage news posts</p>
        </div>
        <button
          onClick={() => {
            setShowForm(true)
            setEditingId(null)
            resetForm()
          }}
          className="flex items-center px-4 py-2 bg-[#1e40af] text-white rounded-lg hover:bg-[#1e3a8a] transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Post
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between z-10">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingId ? 'Edit Post' : 'Add Post'}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false)
                  setEditingId(null)
                  resetForm()
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Slug
                  </label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                    placeholder="Auto-generated from title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={formData.category || 'News'}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Featured Image URL
                  </label>
                  <input
                    type="url"
                    value={formData.featured_image || ''}
                    onChange={(e) => setFormData({ ...formData, featured_image: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    value={Array.isArray(formData.tags) ? formData.tags.join(', ') : ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean),
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                    placeholder="tag1, tag2, tag3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Publish Date/Time
                  </label>
                  <input
                    type="datetime-local"
                    value={
                      formData.published_at
                        ? format(new Date(formData.published_at), "yyyy-MM-dd'T'HH:mm")
                        : ''
                    }
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        published_at: e.target.value ? new Date(e.target.value).toISOString() : null,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Excerpt
                </label>
                <textarea
                  value={formData.excerpt || ''}
                  onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
                  placeholder="Brief summary of the post..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Content *
                </label>
                <RichTextEditor
                  content={formData.content || ''}
                  onChange={(content) => setFormData({ ...formData, content })}
                  placeholder="Enter post content..."
                />
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_featured || false}
                    onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                    className="h-4 w-4 text-[#1e40af] focus:ring-[#1e40af] border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-700">Featured Post</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_published || false}
                    onChange={(e) => {
                      const isPublished = e.target.checked
                      setFormData({
                        ...formData,
                        is_published: isPublished,
                        published_at: isPublished && !formData.published_at
                          ? new Date().toISOString()
                          : formData.published_at,
                      })
                    }}
                    className="h-4 w-4 text-[#1e40af] focus:ring-[#1e40af] border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-700">Publish Immediately</span>
                </label>
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setEditingId(null)
                    resetForm()
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center px-6 py-2 bg-[#1e40af] text-white rounded-lg hover:bg-[#1e3a8a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5 mr-2" />
                      {editingId ? 'Update' : 'Create'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Views
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
              {posts.map((post) => (
                <tr key={post.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{post.title}</div>
                    {post.is_featured && (
                      <span className="text-xs text-[#eab308] font-semibold">Featured</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {post.category || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        post.is_published
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {post.is_published ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {post.views_count || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {post.published_at
                      ? format(new Date(post.published_at), 'MMM d, yyyy')
                      : format(new Date(post.created_at || ''), 'MMM d, yyyy')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/news/${post.slug}`}
                        target="_blank"
                        className="text-[#1e40af] hover:text-[#1e3a8a]"
                        title="Preview"
                      >
                        <Eye className="h-5 w-5" />
                      </Link>
                      <button
                        onClick={() => handleEdit(post)}
                        className="text-[#1e40af] hover:text-[#1e3a8a]"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(post.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
