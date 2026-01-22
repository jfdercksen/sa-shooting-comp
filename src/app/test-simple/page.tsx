// Simple test page without database - to verify Vercel is working
export default function TestSimplePage() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Simple Test - No Database</h1>
      <p className="mb-2">✅ If you see this, Vercel is working</p>
      <p className="mb-2">Time: {new Date().toISOString()}</p>
      <p className="mb-4">This page has no database calls.</p>
    </div>
  )
}

