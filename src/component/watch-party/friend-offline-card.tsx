import type { RoomMember } from '@/types/watch-room'
import Avatar, { AvatarStack } from './avatar'
import XcIcon from './xc-icon'
import { useCopy } from './invite-dialog'

// "Bạn kia chưa vào phòng": desktop phủ lên player, mobile là thẻ ngang dưới player (không che nút play)

type Props = {
  me: RoomMember | undefined
  others: RoomMember[]
  inviteUrl: string
  variant: 'overlay' | 'strip'
  onWatchAlone: () => void
}

export default function FriendOfflineCard({ me, others, inviteUrl, variant, onWatchAlone }: Props) {
  const { copied, copy } = useCopy()
  const title = others.length === 1 ? `${others[0].displayName} chưa vào phòng` : 'Chưa ai vào phòng'
  const copyLabel = copied ? 'Đã copy' : variant === 'strip' ? 'Copy link' : 'Copy link nhắc'

  const copyBtn = (
    <button
      type='button'
      className={`dx-b dx-b-sm ${copied ? 'xc-b-cy' : 'dx-b-pri'} ${variant === 'strip' ? '!h-10 !px-3 !text-xs' : ''}`}
      style={copied ? undefined : { boxShadow: '3px 3px 0 var(--c-yel)' }}
      onClick={() => copy(inviteUrl)}
    >
      <XcIcon name={copied ? 'check' : 'copy'} size={14} />
      {copyLabel}
    </button>
  )

  if (variant === 'strip') {
    return (
      <div
        className='flex gap-2.5 items-center p-3 rounded-[14px] bg-[var(--c-card)] border border-white/15'
        style={{ boxShadow: '4px 4px 0 var(--c-yel)' }}
      >
        {others[0] ? (
          <Avatar userId={others[0].userId} name={others[0].displayName} size={36} online={false} />
        ) : (
          <XcIcon name='users' size={24} />
        )}
        <div className='flex-1 min-w-0'>
          <b className='block text-sm font-black truncate'>{title}</b>
          <div className='text-xs text-[var(--c-dim)]'>Vào sẽ nhảy tới chỗ bạn đang xem</div>
        </div>
        {copyBtn}
      </div>
    )
  }

  const people = [
    ...(me ? [{ userId: me.userId, name: me.displayName, online: true }] : []),
    ...others.map(o => ({ userId: o.userId, name: o.displayName, online: false }))
  ]
  const onlineCount = me ? 1 : 0
  return (
    <div className='xc-pov'>
      <div className='xc-pcard'>
        <div className='flex items-center gap-2.5'>
          <AvatarStack people={people} size={40} />
          <span className='font-mono text-[11px] font-bold text-[var(--c-faint)]'>
            {onlineCount}/{people.length} ONLINE
          </span>
        </div>
        <h4>{title}</h4>
        <p>
          Bạn cứ xem trước — {others.length === 1 ? others[0].displayName : 'mọi người'} vào sẽ tự nhảy tới đúng chỗ bạn
          đang xem. Nhắc một câu cho nhanh?
        </p>
        <div className={`xc-lk ${copied ? 'ok' : ''}`}>
          <XcIcon name='link' size={16} />
          <span className='u'>{inviteUrl.replace(/^https?:\/\//, '')}</span>
          {copyBtn}
        </div>
        <button type='button' className='dx-b dx-b-gh dx-b-sm self-start' onClick={onWatchAlone}>
          <XcIcon name='play' size={14} />
          Xem trước một mình
        </button>
      </div>
    </div>
  )
}
