'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

type Profile = Database['public']['Tables']['profiles']['Row']

export default function DebugPage() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [errors, setErrors] = useState<string[]>([])
  const supabase = createClient()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError) {
        setErrors(prev => [...prev, `Auth error: ${authError.message}`])
      }
      
      if (user) {
        setUser(user)
        
        // Get profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        
        if (profileError) {
          setErrors(prev => [...prev, `Profile error: ${profileError.message}`])
        } else if (profileData) {
          setProfile(profileData)
        }
      }
    } catch (err: any) {
      setErrors(prev => [...prev, `General error: ${err?.message || String(err)}`])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-8">
        <h1 className="text-2xl font-bold mb-4">Debug Information</h1>
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-8 space-y-6">
      <h1 className="text-2xl font-bold">Debug Information</h1>
      
      {/* Authentication Status */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span className={user ? "text-green-500" : "text-red-500"}>●</span>
          Authentication Status
        </h2>
        <div className="space-y-2">
          <p><strong>Authenticated:</strong> {user ? 'Yes' : 'No'}</p>
          <p><strong>Email:</strong> {user?.email || 'N/A'}</p>
          <p><strong>User ID:</strong> {user?.id || 'N/A'}</p>
        </div>
      </div>

      {/* Profile Status */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span className={profile ? "text-green-500" : "text-red-500"}>●</span>
          Profile & Role
        </h2>
        {!user ? (
          <p className="text-yellow-600">No user logged in</p>
        ) : !profile ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
            <p className="text-yellow-800 font-semibold">⚠️ No profile found!</p>
            <p className="text-sm mt-2">Run this SQL in Supabase to create your admin profile:</p>
            <pre className="bg-gray-100 p-2 rounded mt-2 text-xs overflow-x-auto">
{`INSERT INTO profiles (id, full_names, surname, email, sabu_number, role) 
VALUES ('${user.id}', 'Johan', 'Dercksen', '${user.email}', 'ADMIN001', 'super_admin');`}
            </pre>
          </div>
        ) : (
          <div className="space-y-2">
            <p><strong>Name:</strong> {profile.full_names} {profile.surname}</p>
            <p><strong>Email:</strong> {profile.email}</p>
            <p><strong>SABU Number:</strong> {profile.sabu_number || 'Not set'}</p>
            <p><strong>Role:</strong> <span className="font-bold text-blue-600">{profile.role}</span></p>
          </div>
        )}
      </div>

      {/* Menu Items Visibility */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Menu Items Visibility</h2>
        <div className="space-y-2">
          <p className="flex items-center gap-2">
            <span className="text-green-500">✓</span> Public Pages (always visible)
          </p>
          <p className="flex items-center gap-2">
            <span className={user ? "text-green-500" : "text-gray-400"}>
              {user ? '✓' : '○'}
            </span> 
            Dashboard (requires login)
          </p>
          <p className="flex items-center gap-2">
            <span className={profile?.role === 'super_admin' || profile?.role === 'admin' ? "text-green-500" : "text-gray-400"}>
              {profile?.role === 'super_admin' || profile?.role === 'admin' ? '✓' : '○'}
            </span> 
            Admin Panel (requires admin role)
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      {user && !profile && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Quick Fix</h2>
          <p className="mb-4">You're logged in but have no profile. Copy and run the SQL above in Supabase.</p>
          <a 
            href="https://supabase.com/dashboard/project/_/sql/new" 
            target="_blank" 
            rel="noopener noreferrer"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Open Supabase SQL Editor →
          </a>
        </div>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 text-red-700">Errors</h2>
          <ul className="space-y-1">
            {errors.map((error, index) => (
              <li key={index} className="text-red-600 text-sm">{error}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
