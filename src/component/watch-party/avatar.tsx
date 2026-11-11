import { avatarTone, type AvatarTone } from '@/lib/watch-room/chat-format'

// Avatar chữ cái: màu ổn định theo userId, chấm presence góc dưới phải

const NAME_COLORS: Record<AvatarTone, string> = {
  pink: '#f472b6',
  yel: '#fbbf24',
  cyan: '#22d3ee',
  orange: '#fb923c'
}

/** Màu tên trong chat — cùng tông với avatar */
export const nameColor = (userId: string) => NAME_COLORS[avatarTone(userId)]

type AvatarProps = {
  userId: string
  name: string
  size?: number
  /** undefined = không hiện chấm presence */
  online?: boolean
  className?: string
}

export default function Avatar({ userId, name, size = 32, online, className = '' }: AvatarProps) {
  const dim = online === false
  return (
    <span
      className={`xc-ava a-${avatarTone(userId)} ${dim ? 'off' : ''} ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.45) }}
      role='img'
      aria-label={name}
    >
      {(name.trim()[0] ?? '?').toUpperCase()}
      {online !== undefined && <i className={`xc-dot ${online ? 'on' : 'off'}`} />}
    </span>
  )
}

export type StackPerson = { userId: string; name: string; online?: boolean }

/** Avatar chồng nhau; quá `max` người thì thêm "+N" */
export function AvatarStack({ people, size = 28, max = 4 }: { people: StackPerson[]; size?: number; max?: number }) {
  const shown = people.slice(0, max)
  const rest = people.length - shown.length
  return (
    <span className='xc-stack'>
      {shown.map(p => (
        <Avatar key={p.userId} userId={p.userId} name={p.name} size={size} online={p.online} />
      ))}
      {rest > 0 && (
        <span className='xc-ava xc-more' style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}>
          +{rest}
        </span>
      )}
    </span>
  )
}
