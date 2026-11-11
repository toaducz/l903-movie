import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/** GET /api/time — đồng hồ server (ms) để client ước lượng lệch giờ khi đồng bộ "Xem chung" */
export function GET() {
  return NextResponse.json({ now: Date.now() }, { headers: { 'Cache-Control': 'no-store' } })
}
