// Stroke icon 24×24 theo design handoff "Đã xem" (object P trong da-xem.js)

const PATHS = {
  star: <path d='M12 2.8l2.85 5.78 6.37.93-4.61 4.49 1.09 6.35L12 17.35l-5.7 3 1.09-6.35-4.61-4.49 6.37-.93z' />,
  check: <path d='M5 12.5l4.5 4.5L19 7.5' />,
  x: <path d='M6 6l12 12M18 6L6 18' />,
  heart: (
    <path d='M12 20s-7-4.4-9-8.8C1.7 8 3.8 5 7 5c2 0 3.3 1.1 5 3 1.7-1.9 3-3 5-3 3.2 0 5.3 3 4 6.2-2 4.4-9 8.8-9 8.8z' />
  ),
  play: (
    <path
      d='M8 5.14v14c0 .86.84 1.4 1.58.97l11-7a1.12 1.12 0 0 0 0-1.94l-11-7A1.13 1.13 0 0 0 8 5.14z'
      fill='currentColor'
      stroke='none'
    />
  ),
  lock: (
    <>
      <rect x='5' y='11' width='14' height='10' rx='2.5' />
      <path d='M8 11V8a4 4 0 0 1 8 0v3' />
    </>
  ),
  pen: <path d='M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4' />,
  trash: <path d='M4 7h16M10 7V4h4v3M6.5 7l1 13h9l1-13' />,
  warn: <path d='M12 3l10 18H2zM12 10v5M12 18v.5' />,
  undo: <path d='M9 14L4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3' />
} as const

export type WatchedIconName = keyof typeof PATHS

type Props = {
  name: WatchedIconName
  size?: number
  strokeWidth?: number
  filled?: boolean
  className?: string
}

export default function WatchedIcon({ name, size = 16, strokeWidth = 2.4, filled = false, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox='0 0 24 24'
      fill={filled ? 'currentColor' : 'none'}
      stroke='currentColor'
      strokeWidth={strokeWidth}
      strokeLinecap='round'
      strokeLinejoin='round'
      className={className}
      aria-hidden='true'
    >
      {PATHS[name]}
    </svg>
  )
}
