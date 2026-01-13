import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import type { Database } from '@/types/database'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, profileData } = body

    if (!userId || !profileData) {
      return NextResponse.json(
        { error: 'Missing userId or profileData' },
        { status: 400 }
      )
    }

    // Use service role key to bypass RLS
    const supabaseAdmin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Verify user exists by attempting to query auth.users via RPC or wait
    // The foreign key constraint profiles_id_fkey requires the user to exist in auth.users
    // Add a small delay to ensure user is committed
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Ensure the profile data has the correct user ID
    const profileToInsert = {
      ...profileData,
      id: userId, // Must match auth.users.id for foreign key constraint
    }

    // Use upsert to handle case where trigger already created a basic profile
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .upsert(profileToInsert, {
        onConflict: 'id',
      })
      .select()
      .single()

    if (error) {
      console.error('Profile creation error:', error)
      console.error('Error code:', error.code)
      console.error('Error details:', error.details)
      console.error('Error hint:', error.hint)
      console.error('User ID:', userId)
      
      // Provide more specific error messages
      let errorMessage = error.message || 'Failed to create profile'
      
      if (error.code === '23503') {
        // Foreign key constraint violation
        errorMessage = 'User account not found in authentication system. The user may not be fully created yet. Please try again in a moment.'
      } else if (error.code === '23505') {
        // Unique constraint violation
        errorMessage = 'Profile already exists for this user.'
      }
      
      return NextResponse.json(
        { 
          error: errorMessage,
          code: error.code,
          details: error.details,
          hint: error.hint,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ data, success: true })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

