import { createClient } from '@/lib/supabase/server'

export default async function TestDBPage() {
  console.log('[TestDBPage] Starting...')
  const startTime = Date.now()
  
  try {
    const supabase = await createClient()
    console.log('[TestDBPage] Supabase client created')

    // Simple test query
    console.log('[TestDBPage] Running simple query...')
    const { data, error } = await supabase
      .from('competitions')
      .select('id, name')
      .limit(1)

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

