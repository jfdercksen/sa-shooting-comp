import { createClient } from '@/lib/supabase/server'
import { Search, Calendar, User, Eye } from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'
import NewsSearch from '@/components/content/news-search'
import type { Database } from '@/types/database'

type NewsPost = Database['public']['Tables']['news_posts']['Row']

const POSTS_PER_PAGE = 12
const CATEGORIES = ['All', 'News', 'Results', 'Announcements', 'Technical']

export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; category?: string; search?: string }>
}) {
  const params = await searchParams
  const currentPage = parseInt(params.page || '1')
  const selectedCategory = params.category || 'All'
  const searchQuery = params.search || ''

  const supabase = await createClient()

  let query = supabase
    .from('news_posts')
    .select('*, profiles(full_names, surname)', { count: 'exact' })
    .eq('is_published', true)
    .order('published_at', { ascending: false })

  // Filter by category
  if (selectedCategory !== 'All') {
    query = query.eq('category', selectedCategory)
  }

  // Search filter
  if (searchQuery) {
    query = query.or(`title.ilike.%${searchQuery}%,excerpt.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`)
  }

  // Pagination
  const from = (currentPage - 1) * POSTS_PER_PAGE
  const to = from + POSTS_PER_PAGE - 1

  const { data: posts, error, count } = await query.range(from, to)

  if (error) {
    console.error('Error fetching news:', error)
  }

  const totalPages = count ? Math.ceil(count / POSTS_PER_PAGE) : 1

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Latest News & Updates</h1>
          <p className="text-lg text-gray-600">Stay informed about shooting competitions and updates</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Search Bar */}
        <NewsSearch initialSearch={searchQuery} />

        {/* Category Filter */}
        <div className="mb-8 flex flex-wrap gap-2">
          {CATEGORIES.map((category) => (
            <Link
              key={category}
              href={`/news?category=${category === 'All' ? '' : category}${searchQuery ? `&search=${searchQuery}` : ''}`}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                selectedCategory === category
                  ? 'bg-[#1e40af] text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              {category}
            </Link>
          ))}
        </div>

        {/* News Grid */}
        {posts && posts.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {posts.map((post: any) => {
                const author = post.profiles
                const authorName = author
                  ? `${author.full_names} ${author.surname}`
                  : 'Unknown Author'

                return (
                  <Link
                    key={post.id}
                    href={`/news/${post.slug}`}
                    className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow group"
                  >
                    {/* Featured Image */}
                    {post.featured_image ? (
                      <div className="h-48 bg-gray-200 relative overflow-hidden">
                        <img
                          src={post.featured_image}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      </div>
                    ) : (
                      <div className="h-48 bg-gradient-to-br from-[#1e40af] to-[#1e3a8a] flex items-center justify-center">
                        <span className="text-white text-4xl font-bold opacity-50">News</span>
                      </div>
                    )}

                    {/* Content */}
                    <div className="p-6">
                      {/* Category Badge */}
                      {post.category && (
                        <span className="inline-block px-2 py-1 text-xs font-semibold text-[#1e40af] bg-blue-100 rounded mb-3">
                          {post.category}
                        </span>
                      )}

                      {/* Title */}
                      <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-[#1e40af] transition-colors line-clamp-2">
                        {post.title}
                      </h3>

                      {/* Excerpt */}
                      {post.excerpt && (
                        <p className="text-gray-600 mb-4 line-clamp-3">{post.excerpt}</p>
                      )}

                      {/* Meta Info */}
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {post.published_at
                              ? format(new Date(post.published_at), 'MMM d, yyyy')
                              : format(new Date(post.created_at || ''), 'MMM d, yyyy')}
                          </div>
                          <div className="flex items-center">
                            <User className="h-4 w-4 mr-1" />
                            {authorName}
                          </div>
                        </div>
                        {post.views_count !== null && (
                          <div className="flex items-center">
                            <Eye className="h-4 w-4 mr-1" />
                            {post.views_count}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                {currentPage > 1 && (
                  <Link
                    href={`/news?page=${currentPage - 1}${selectedCategory !== 'All' ? `&category=${selectedCategory}` : ''}${searchQuery ? `&search=${searchQuery}` : ''}`}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Previous
                  </Link>
                )}

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 2 && page <= currentPage + 2)
                  ) {
                    return (
                      <Link
                        key={page}
                        href={`/news?page=${page}${selectedCategory !== 'All' ? `&category=${selectedCategory}` : ''}${searchQuery ? `&search=${searchQuery}` : ''}`}
                        className={`px-4 py-2 rounded-lg transition-colors ${
                          page === currentPage
                            ? 'bg-[#1e40af] text-white'
                            : 'border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </Link>
                    )
                  } else if (page === currentPage - 3 || page === currentPage + 3) {
                    return <span key={page} className="px-2">...</span>
                  }
                  return null
                })}

                {currentPage < totalPages && (
                  <Link
                    href={`/news?page=${currentPage + 1}${selectedCategory !== 'All' ? `&category=${selectedCategory}` : ''}${searchQuery ? `&search=${searchQuery}` : ''}`}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Next
                  </Link>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">No news posts found.</p>
          </div>
        )}
      </div>
    </div>
  )
}
