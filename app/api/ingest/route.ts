import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Initialize Supabase client with service role key if needed for bypassing RLS, 
// or anon key if the table allows public inserts (safer to use service role if logic is server-side).
// But for now we use the environment variables from the project.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { full_name, phone, city, notes } = body

    if (!full_name || !phone) {
      return NextResponse.json({ error: 'Missing required fields: full_name, phone' }, { status: 400 })
    }

    // Security check: robust API Key from environment
    const authHeader = request.headers.get('x-api-key')
    const secretKey = process.env.API_INGEST_KEY
    
    if (!secretKey || authHeader !== secretKey) {
       return NextResponse.json({ error: 'Unauthorized: Invalid API Key' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('leads')
      .insert([
        { 
          full_name, 
          phone, 
          city: city || '', 
          status: 'NEW_LEAD',
          summary_sentence: notes ? `[פייסבוק]: ${notes}` : '[פייסבוק]: ליד חדש הגיע מהפייסבוק',
          agent_notes: ''
        }
      ])
      .select()

    if (error) {
      console.error('Supabase Ingest Error:', error.message)
      return NextResponse.json({ error: 'Failed to ingest lead due to server error' }, { status: 500 })
    }

    return NextResponse.json({ success: true, lead: data[0] }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
