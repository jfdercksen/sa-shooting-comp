import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Calendar, User, Eye, ArrowLeft } from 'lucide-react'
import { format } from 'date-fns'
import { incrementViews } from '@/lib/utils/news'
import ShareButtons from '@/components/content/share-buttons'
import type { Database } from '@/types/database'

type NewsPost = Database['public']['Tables']['news_posts']['Row']

export default async function NewsDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()

  // Fetch post
  const { data: post, error } = await supabase
    .from('news_posts')
    .select('*, profiles(full_names, surname)')
    .eq('slug', slug)
    .eq('is_published', true)
    .single()

  if (error || !post) {
    notFound()
  }

  // Increment view count
  await incrementViews(supabase, post.id)

  // Fetch related articles (same category, excluding current)
  const { data: relatedPosts } = await supabase
    .from('news_posts')
    .select('*, profiles(full_names, surname)')
    .eq('is_published', true)
    .eq('category', post.category || '')
    .neq('id', post.id)
    .order('published_at', { ascending: false })
    .limit(3)

  const author = (post as any).profiles
  const authorName = author ? `${author.full_names} ${author.surname}` : 'Unknown Author'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Back Button */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            href="/news"
            className="inline-flex items-center text-[#1e40af] hover:text-[#1e3a8a] font-semibold"
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
            Back to News
          </Link>
        </div>
      </div>

      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Featured Image */}
        {post.featured_image && (
          <div className="mb-8 rounded-lg overflow-hidden">
            <img
              src={post.featured_image}
              alt={post.title}
              className="w-full h-96 object-cover"
            />
          </div>
        )}

        {/* Article Header */}
        <header className="mb-8">
          {/* Category */}
          {post.category && (
            <span className="inline-block px-3 py-1 text-sm font-semibold text-[#1e40af] bg-blue-100 rounded-full mb-4">
              {post.category}
            </span>
          )}

          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">{post.title}</h1>

          {/* Meta Info */}
          <div className="flex flex-wrap items-center gap-6 text-gray-600 mb-6">
            <div className="flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              <span>
                {post.published_at
                  ? format(new Date(post.published_at), 'MMMM d, yyyy')
                  : format(new Date(post.created_at || ''), 'MMMM d, yyyy')}
              </span>
            </div>
            <div className="flex items-center">
              <User className="h-5 w-5 mr-2" />
              <span>{authorName}</span>
            </div>
            {post.views_count !== null && (
              <div className="flex items-center">
                <Eye className="h-5 w-5 mr-2" />
                <span>{post.views_count} views</span>
              </div>
            )}
          </div>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {post.tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Share Buttons */}
          <div className="flex items-center gap-4">
            <span className="text-gray-600 font-medium">Share:</span>
            <ShareButtons title={post.title} />
          </div>
        </header>

        {/* Article Content */}
        <div
          className="prose prose-lg max-w-none mb-12"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* Related Articles */}
        {relatedPosts && relatedPosts.length > 0 && (
          <div className="mt-12 pt-12 border-t border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Related Articles</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedPosts.map((relatedPost: any) => {
                const relatedAuthor = relatedPost.profiles
                const relatedAuthorName = relatedAuthor
                  ? `${relatedAuthor.full_names} ${relatedAuthor.surname}`
                  : 'Unknown Author'

                return (
                  <Link
                    key={relatedPost.id}
                    href={`/news/${relatedPost.slug}`}
                    className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow group"
                  >
                    {relatedPost.featured_image && (
                      <div className="h-40 bg-gray-200 relative overflow-hidden">
                        <img
                          src={relatedPost.featured_image}
                          alt={relatedPost.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      </div>
                    )}
                    <div className="p-4">
                      {relatedPost.category && (
                        <span className="inline-block px-2 py-1 text-xs font-semibold text-[#1e40af] bg-blue-100 rounded mb-2">
                          {relatedPost.category}
                        </span>
                      )}
                      <h3 className="font-bold text-gray-900 mb-2 group-hover:text-[#1e40af] transition-colors line-clamp-2">
                        {relatedPost.title}
                      </h3>
                      <div className="text-xs text-gray-500">
                        {relatedPost.published_at
                          ? format(new Date(relatedPost.published_at), 'MMM d, yyyy')
                          : format(new Date(relatedPost.created_at || ''), 'MMM d, yyyy')}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </article>
    </div>
  )
}
