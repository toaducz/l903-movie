import { NextResponse } from 'next/server'
import { isUuid } from './validation'

// Phản hồi lỗi dùng chung cho /api/rooms/** và /api/invites/** — dạng { error } tiếng Việt như /api/watched

export const unauthorized = () => NextResponse.json({ error: 'Bạn cần đăng nhập' }, { status: 401 })
export const badRequest = (error: string) => NextResponse.json({ error }, { status: 400 })
export const notFound = (error = 'Không tìm thấy phòng') => NextResponse.json({ error }, { status: 404 })

export function serverError(context: string, error: unknown) {
  console.error(`[api/rooms] ${context}:`, error)
  return NextResponse.json({ error: 'Có lỗi xảy ra, thử lại sau' }, { status: 500 })
}

/** Lỗi RPC 'forbidden' (42501) = không phải thành viên → trả 404 để không lộ phòng tồn tại */
export const isForbiddenError = (error: { code?: string } | null) => error?.code === '42501'

/** Lấy + kiểm id phòng từ params động của Next 15 */
export async function readRoomId(params: Promise<{ id: string }>): Promise<string | null> {
  const { id } = await params
  return isUuid(id) ? id.toLowerCase() : null
}
