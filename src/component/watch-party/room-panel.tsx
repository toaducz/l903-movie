'use client'

import { formatPosition } from '@/lib/watch-room/chat-format'
import type { RoomMember } from '@/types/watch-room'
import type { PresenceInfo } from './use-room-channel'
import Avatar from './avatar'
import ChatList from './chat-list'
import ChatInput from './chat-input'
import { EmojiQuickBar } from './emoji-popover'
import type { useRoomChat } from './use-room-chat'

// Panel phải: ai trong phòng (online / đang xem phút nào) + chat + ô nhập

const MAX_CHIPS = 4

type Props = {
  members: RoomMember[]
  presence: PresenceInfo[]
  myId: string
  nameOf: (userId: string) => string
  chat: ReturnType<typeof useRoomChat>
  reconnecting: boolean
  onReaction: (emoji: string) => void
}

function MemberChip({ member, info, isMe }: { member: RoomMember; info?: PresenceInfo; isMe: boolean }) {
  const online = !!info
  const status = !online
    ? 'offline'
    : info.isPlaying
      ? `đang xem · ${formatPosition(info.positionSec)}`
      : info.positionSec > 0
        ? `tạm dừng · ${formatPosition(info.positionSec)}`
        : 'đang online'
  return (
    <div className={`xc-mem ${online ? '' : 'off'}`}>
      <Avatar userId={member.userId} name={member.displayName} size={28} online={online} />
      <div>
        <b>
          {member.displayName}
          {isMe && ' (bạn)'}
        </b>
        <small className={online ? 'on' : ''}>{status}</small>
      </div>
    </div>
  )
}

export default function RoomPanel({ members, presence, myId, nameOf, chat, reconnecting, onReaction }: Props) {
  const byUser = new Map(presence.map(p => [p.userId, p]))
  const onlineFirst = [...members].sort((a, b) => Number(byUser.has(b.userId)) - Number(byUser.has(a.userId)))
  const shown = onlineFirst.slice(0, MAX_CHIPS)
  const rest = members.length - shown.length

  return (
    <div className='xc-pn-w'>
      <section className='xc-pn' aria-label='Chat trong phòng'>
        <div className='xc-pn-h'>
          <div className='xc-pn-t'>TRONG PHÒNG · {members.length}</div>
          <div className='xc-mems'>
            {shown.map(m => (
              <MemberChip key={m.userId} member={m} info={byUser.get(m.userId)} isMe={m.userId === myId} />
            ))}
            {rest > 0 && <div className='xc-mem !px-3 font-mono text-xs font-extrabold'>+{rest}</div>}
          </div>
        </div>
        <ChatList
          messages={chat.messages}
          pending={chat.pending}
          myId={myId}
          nameOf={nameOf}
          hasMore={chat.hasMore}
          loading={chat.loading}
          loadError={chat.loadError}
          onLoadOlder={chat.loadOlder}
          onReload={chat.reload}
          onRetry={chat.retry}
        />
        <EmojiQuickBar onPick={onReaction} />
        <ChatInput disabled={reconnecting} onSend={chat.send} onReaction={onReaction} />
      </section>
    </div>
  )
}
