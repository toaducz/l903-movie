import { NextResponse, NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase-client'
import { getUserId } from '../../../../lib/auth-helper'

export async function POST(req: NextRequest) {
  const user_id = await getUserId(req)
  const { slug } = await req.json()
  const { data, error } = await supabase
    .from('favorite')
    .select('id')
    .eq('user_id', user_id)
    .eq('slug', slug)
    .maybeSingle()

  return NextResponse.json({
    exists: !!data,
    error
  })
}
