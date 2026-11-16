import Link from 'next/link'

interface ProfilePrivateLockedProps {
  title?: string
  description?: string
  backHref?: string
}

export default function ProfilePrivateLocked({
  title = 'Nội dung riêng tư',
  description = 'Người dùng này đã cài đặt phần nội dung này ở chế độ riêng tư.',
  backHref = '/profile'
}: ProfilePrivateLockedProps) {
  return (
    <div className='flex flex-col items-center justify-center py-16 px-4 text-center'>
      <div className='w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-5 text-2xl shadow-inner'>
        🔒
      </div>
      <h3 className='text-xl sm:text-2xl font-black text-white tracking-tight mb-2'>{title}</h3>
      <p className='text-sm text-[var(--c-dim)] max-w-md mb-6 leading-relaxed'>{description}</p>
      <Link
        href={backHref}
        className='dx-b dx-b-gh cursor-pointer hover:border-[var(--c-cyan)] hover:text-[var(--c-cyan)] transition-colors duration-200'
      >
        ← Quay lại Tổng quan
      </Link>
    </div>
  )
}
