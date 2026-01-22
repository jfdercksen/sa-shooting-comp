// Edge runtime version - faster, no cookies
export const runtime = 'edge'
export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'

export default async function TestDBEdgePage() {
  const startTime = Date.now()
  
  try {
    // Direct Supabase client without SSR cookies
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Simple test query with explicit timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000) // 8 second timeout

    const { data, error } = await supabase
      .from('competitions')
      .select('id, name')
      .limit(1)
      .abortSignal(controller.signal)

    clearTimeout(timeoutId)
    const loadTime = Date.now() - startTime

    if (error) {
      return (
        <div className="container mx-auto p-8">
          <h1 className="text-2xl font-bold mb-4">Database Test (Edge) - Error</h1>
          <pre className="bg-red-50 p-4 rounded text-sm">{JSON.stringify(error, null, 2)}</pre>
          <p className="mt-4">Load time: {loadTime}ms</p>
        </div>
      )
    }

    return (
      <div className="container mx-auto p-8">
        <h1 className="text-2xl font-bold mb-4">Database Test (Edge) - Success</h1>
        <p className="mb-2">✅ Database connection working</p>
        <p className="mb-2">Load time: {loadTime}ms</p>
        <p className="mb-4">Data: {data ? `${data.length} rows` : 'No data'}</p>
        <pre className="bg-gray-50 p-4 rounded text-sm overflow-auto">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    )
  } catch (error: any) {
    const loadTime = Date.now() - startTime
    return (
      <div className="container mx-auto p-8">
        <h1 className="text-2xl font-bold mb-4">Database Test (Edge) - Error</h1>
        <pre className="bg-red-50 p-4 rounded text-sm">{error.message || String(error)}</pre>
        <p className="mt-4">Load time: {loadTime}ms</p>
        <p className="mt-2 text-sm text-gray-600">
          This uses edge runtime and direct Supabase client (no cookies).
        </p>
      </div>
    )
  }
}

