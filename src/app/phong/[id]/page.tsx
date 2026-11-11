'use client'

import { useParams } from 'next/navigation'
import RoomPage, { RoomUnavailable } from '@/component/watch-party/room-page'
import { isUuid } from '@/lib/watch-room/validation'

// /phong/[id] — phòng "Xem chung" (chỉ thành viên)
export default function PhongPage() {
  const { id } = useParams<{ id: string }>()
  if (!id || !isUuid(id)) return <RoomUnavailable />
  return <RoomPage roomId={id.toLowerCase()} />
}
