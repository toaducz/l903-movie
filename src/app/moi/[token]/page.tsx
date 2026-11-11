'use client'

import { useParams } from 'next/navigation'
import InviteLanding from '@/component/watch-party/invite-landing'

// /moi/[token] — nhận lời mời vào phòng "Xem chung"
export default function MoiPage() {
  const { token } = useParams<{ token: string }>()
  return <InviteLanding token={token ?? ''} />
}
