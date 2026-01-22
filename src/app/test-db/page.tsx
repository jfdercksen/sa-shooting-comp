import { createClient } from '@/lib/supabase/server'

// Use edge runtime for faster execution
export const runtime = 'edge'
export const dynamic = 'force-dynamic'

export default async function TestDBPage() {
  console.log('[TestDBPage] Starting...')
  const startTime = Date.now()
  
  try {
    // Add timeout wrapper
    const clientPromise = createClient()
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Client creation timeout after 5s')), 5000)
    )
    
    const supabase = await Promise.race([clientPromise, timeoutPromise]) as Awaited<ReturnType<typeof createClient>>
    console.log('[TestDBPage] Supabase client created')

    // Simple test query with timeout
    console.log('[TestDBPage] Running simple query...')
    const queryPromise = supabase
      .from('competitions')
      .select('id, name')
      .limit(1)
    
    const queryTimeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Query timeout after 10s')), 10000)
    )
    
    const { data, error } = await Promise.race([
      queryPromise.then(result => result),
      queryTimeoutPromise
    ]) as { data: any, error: any }

    const loadTime = Date.now() - startTime
    console.log(`[TestDBPage] Query completed in ${loadTime}ms`)

    if (error) {
      console.error('[TestDBPage] Error:', error)
      return (
        <div className="container mx-auto p-8">
          <h1 className="text-2xl font-bold mb-4">Database Test - Error</h1>
          <pre className="bg-red-50 p-4 rounded">{JSON.stringify(error, null, 2)}</pre>
          <p className="mt-4">Load time: {loadTime}ms</p>
        </div>
      )
    }

    return (
      <div className="container mx-auto p-8">
        <h1 className="text-2xl font-bold mb-4">Database Test - Success</h1>
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
    console.error(`[TestDBPage] Fatal error after ${loadTime}ms:`, error)
    return (
      <div className="container mx-auto p-8">
        <h1 className="text-2xl font-bold mb-4">Database Test - Fatal Error</h1>
        <pre className="bg-red-50 p-4 rounded">{error.message}</pre>
        <p className="mt-4">Load time: {loadTime}ms</p>
      </div>
    )
  }
}

