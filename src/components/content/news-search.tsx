'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search } from 'lucide-react'

export default function NewsSearch({ initialSearch = '' }: { initialSearch?: string }) {
  const [search, setSearch] = useState(initialSearch)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    setSearch(initialSearch)
  }, [initialSearch])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const category = searchParams.get('category') || 'All'
    const params = new URLSearchParams()
    if (category !== 'All') {
      params.set('category', category)
    }
    if (search) {
      params.set('search', search)
    }
    router.push(`/news?${params.toString()}`)
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search news articles..."
          className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-transparent"
        />
      </div>
    </form>
  )
}

