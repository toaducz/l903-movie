type Props = {
  source?: string
  className?: string
}

const SOURCE_STYLES: Record<string, { label: string; background: string }> = {
  vsmov: { label: 'VSMOV', background: '#7c3aed' },
  ophim: { label: 'VSMOV', background: '#7c3aed' }, // OPhim đã chuyển thành VSMOV
  kkphim: { label: 'KKPHIM', background: '#1890ff' },
  nguonc: { label: 'Nguồn C', background: '#52c41a' }
}

export default function SourceBadge({ source, className = 'absolute bottom-2 right-2' }: Props) {
  if (!source) return null
  const style = SOURCE_STYLES[source] ?? { label: source, background: '#1890ff' }

  return (
    <span
      className={`${className} z-10 text-[8px] font-black px-1.5 py-0.5 rounded-sm tracking-tighter uppercase opacity-80`}
      style={{ background: style.background, color: '#fff' }}
    >
      {style.label}
    </span>
  )
}
