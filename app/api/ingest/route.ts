import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Initialize Supabase client with service role key if needed for bypassing RLS, 
// or anon key if the table allows public inserts (safer to use service role if logic is server-side).
// But for now we use the environment variables from the project.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { full_name, phone, city, notes } = body

    if (!full_name || !phone) {
      return NextResponse.json({ error: 'Missing required fields: full_name, phone' }, { status: 400 })
    }

    // Security check: simple API Key to prevent spam
    const authHeader = request.headers.get('x-api-key')
    const secretKey = process.env.API_INGEST_KEY || 'ADMATENU_CRM_2026'
    
    if (authHeader !== secretKey) {
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
          agent_notes: notes ? `[המערכת]: ${notes}\nליד חדש הגיע מהפייסבוק` : 'ליד חדש הגיע מהפייסבוק'
        }
      ])
      .select()

    if (error) {
      console.error('Supabase Ingest Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, lead: data[0] }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
