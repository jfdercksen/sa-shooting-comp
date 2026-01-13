'use client'

import { Share2 } from 'lucide-react'

export default function ShareButtons({ title }: { title: string }) {
  const shareUrl = typeof window !== 'undefined' ? window.location.href : ''

  const shareLinks = {
    twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(title)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
    email: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(shareUrl)}`,
  }

  return (
    <div className="flex items-center gap-2">
      <a
        href={shareLinks.twitter}
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 bg-blue-400 text-white rounded-lg hover:bg-blue-500 transition-colors"
        aria-label="Share on Twitter"
      >
        <Share2 className="h-4 w-4" />
      </a>
      <a
        href={shareLinks.facebook}
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        aria-label="Share on Facebook"
      >
        <Share2 className="h-4 w-4" />
      </a>
      <a
        href={shareLinks.linkedin}
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors"
        aria-label="Share on LinkedIn"
      >
        <Share2 className="h-4 w-4" />
      </a>
      <a
        href={shareLinks.email}
        className="p-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        aria-label="Share via Email"
      >
        <Share2 className="h-4 w-4" />
      </a>
    </div>
  )
}

