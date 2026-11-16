// Stroke icon 24×24 theo design handoff "Xem chung" (object P trong xc-a.js)

const PATHS = {
  users: (
    <>
      <circle cx='9' cy='8' r='3.5' />
      <path d='M2.5 20c.5-3.5 3.2-5.5 6.5-5.5s6 2 6.5 5.5M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c2 .7 3.2 2.5 3.5 5.2' />
    </>
  ),
  link: (
    <path d='M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1' />
  ),
  copy: (
    <>
      <rect x='9' y='9' width='11' height='11' rx='2.5' />
      <path d='M5 15V6a2 2 0 0 1 2-2h8' />
    </>
  ),
  mic: (
    <>
      <rect x='9' y='3' width='6' height='11' rx='3' />
      <path d='M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21' />
    </>
  ),
  send: <path d='M21 3L10 14M21 3l-7 18-4-7-7-4z' />,
  smile: (
    <>
      <circle cx='12' cy='12' r='9' />
      <path d='M8.5 14.5a4.5 4.5 0 0 0 7 0M9 9.5v.5M15 9.5v.5' />
    </>
  ),
  sync: <path d='M20 12a8 8 0 0 1-14 5.3M4 12a8 8 0 0 1 14-5.3M18 3v4h-4M6 21v-4h4' />,
  share: <path d='M12 3v13M7 8l5-5 5 5M5 14v6h14v-6' />,
  info: (
    <>
      <circle cx='12' cy='12' r='9' />
      <path d='M12 11v6M12 7.5v.5' />
    </>
  ),
  check: <path d='M5 12.5l4.5 4.5L19 7.5' />,
  x: <path d='M6 6l12 12M18 6L6 18' />,
  play: (
    <path
      d='M8 5.14v14c0 .86.84 1.4 1.58.97l11-7a1.12 1.12 0 0 0 0-1.94l-11-7A1.13 1.13 0 0 0 8 5.14z'
      fill='currentColor'
      stroke='none'
    />
  ),
  pause: <path d='M8 5v14M16 5v14' />,
  next: <path d='M6 5l10 7-10 7zM18 5v14' />,
  lock: (
    <>
      <rect x='5' y='11' width='14' height='10' rx='2.5' />
      <path d='M8 11V8a4 4 0 0 1 8 0v3' />
    </>
  ),
  left: <path d='M15 6l-6 6 6 6' />,
  right: <path d='M9 6l6 6-6 6' />,
  warn: <path d='M12 3l10 18H2zM12 10v5M12 18v.5' />,
  search: (
    <>
      <circle cx='11' cy='11' r='7' />
      <path d='M20 20l-4-4' />
    </>
  ),
  plus: <path d='M12 5v14M5 12h14' />
} as const

export type XcIconName = keyof typeof PATHS

type Props = { name: XcIconName; size?: number; strokeWidth?: number; className?: string }

export default function XcIcon({ name, size = 16, strokeWidth = 2.4, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth={strokeWidth}
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden='true'
      className={className}
    >
      {PATHS[name]}
    </svg>
  )
}
