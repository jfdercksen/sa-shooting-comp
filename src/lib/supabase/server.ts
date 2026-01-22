import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

export async function createClient() {
  try {
    // Add timeout for cookies() call which can sometimes hang
    const cookieStorePromise = cookies()
    const cookieTimeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Cookies timeout')), 3000)
    )
    
    const cookieStore = await Promise.race([
      cookieStorePromise,
      cookieTimeoutPromise
    ]) as Awaited<ReturnType<typeof cookies>>

    return createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value, ...options })
            } catch (e) {
              // Silently fail if cookies can't be set (e.g., in edge runtime)
              console.warn('Failed to set cookie:', name)
            }
          },
          remove(name: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value: '', ...options })
            } catch (e) {
              // Silently fail if cookies can't be removed
              console.warn('Failed to remove cookie:', name)
            }
          },
        },
      }
    )
  } catch (error) {
    console.error('[createClient] Error creating Supabase client:', error)
    // Fallback: create client without cookies (for edge runtime or when cookies fail)
    return createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get() { return undefined },
          set() {},
          remove() {},
        },
      }
    )
  }
}

