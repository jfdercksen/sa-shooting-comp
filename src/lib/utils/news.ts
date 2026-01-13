import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export async function incrementViews(
  supabase: SupabaseClient<Database>,
  postId: string
) {
  // Get current views count
  const { data: post } = await supabase
    .from('news_posts')
    .select('views_count')
    .eq('id', postId)
    .single()

  const currentViews = post?.views_count || 0

  // Increment views
  await supabase
    .from('news_posts')
    .update({ views_count: currentViews + 1 })
    .eq('id', postId)
}

