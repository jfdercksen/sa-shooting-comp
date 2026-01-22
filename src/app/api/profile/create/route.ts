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

    // Ensure the profile data has the correct user ID
    // Note: The foreign key constraint profiles_id_fkey requires the user to exist in auth.users
    // Supabase handles this automatically - no delay needed
    const profileToInsert = {
      ...profileData,
      id: userId, // Must match auth.users.id for foreign key constraint
    }

    // Retry logic for profile creation (in case user isn't fully committed yet)
    let retries = 0
    const maxRetries = 3
    let data, error
    
    while (retries < maxRetries) {
      // Use upsert to handle case where trigger already created a basic profile
      const result = await supabaseAdmin
        .from('profiles')
        .upsert(profileToInsert, {
          onConflict: 'id',
        })
        .select()
        .single()
      
      data = result.data
      error = result.error
      
      // If foreign key constraint error, wait and retry
      if (error?.code === '23503' && retries < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (retries + 1)))
        retries++
        continue
      }
      
      // For other errors or success, break
      break
    }

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
        errorMessage = 'User account is still being created. Please wait a moment and refresh the page. Your account should be ready shortly.'
      } else if (error.code === '23505') {
        // Unique constraint violation (e.g., duplicate sabu_number)
        errorMessage = error.details?.includes('sabu_number') 
          ? 'SABU Number already exists. Please use a different number.'
          : 'Profile already exists for this user.'
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

