import Link from 'next/link'
import type { RoomMember } from '@/types/watch-room'
import { AvatarStack } from './avatar'
import XcIcon from './xc-icon'

// Thanh phòng: ‹ · tên phòng · avatar thành viên (mobile: "n/m online") · Mời

type Props = { name: string; members: RoomMember[]; onlineIds: Set<string>; onInvite: () => void }

export default function RoomHeader({ name, members, onlineIds, onInvite }: Props) {
  const onlineCount = members.filter(m => onlineIds.has(m.userId)).length
  return (
    <div className='xc-rh'>
      <Link href='/' className='xc-ib' aria-label='Về trang chủ'>
        <XcIcon name='left' size={18} strokeWidth={2.6} />
      </Link>
      <div className='min-w-0 flex-1 lg:flex-none'>
        <h1 className='text-base lg:text-[22px] font-black tracking-[-0.035em] truncate m-0'>{name}</h1>
        <div
          className='lg:hidden font-mono text-[10px] font-semibold'
          style={{ color: onlineCount > 1 ? 'var(--c-cyan)' : 'var(--c-faint)' }}
        >
          {onlineCount}/{members.length} online
        </div>
      </div>
      <span className='hidden lg:inline-flex'>
        <AvatarStack
          size={26}
          people={members.map(m => ({ userId: m.userId, name: m.displayName, online: onlineIds.has(m.userId) }))}
        />
      </span>
      <span className='hidden lg:block flex-1' />
      <button type='button' className='dx-b dx-b-gh dx-b-sm !h-10' onClick={onInvite} aria-label='Mời'>
        <XcIcon name='link' size={16} />
        <span className='hidden sm:inline'>Mời</span>
      </button>
    </div>
  )
}
