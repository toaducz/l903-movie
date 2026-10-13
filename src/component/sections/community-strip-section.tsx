import Link from 'next/link'

interface StaticAvatar {
  label: string
  bg: string
}

const STATIC_AVATARS: readonly StaticAvatar[] = [
  { label: 'A', bg: 'linear-gradient(135deg, var(--c-pink), var(--c-orange))' },
  { label: 'L', bg: 'linear-gradient(135deg, var(--c-cyan), #3b82f6)' },
  { label: 'M', bg: 'linear-gradient(135deg, var(--c-yel), var(--c-orange))' },
  { label: 'K', bg: 'linear-gradient(135deg, #a855f7, var(--c-pink))' }
]

export default function CommunityStripSection() {
  return (
    <section className='px-5 sm:px-10 py-3'>
      <div className='max-w-[1400px] mx-auto'>
        <Link
          href='/users'
          className='group block cursor-pointer rounded-2xl border border-white/10 bg-[var(--c-card)] p-4 sm:p-5 hover:border-[var(--c-cyan)]/50 hover:bg-white/[0.04] transition-colors duration-200 shadow-sm'
        >
          <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
            {/* Cụm thông tin & Avatar stack tĩnh */}
            <div className='flex items-start sm:items-center gap-3.5 sm:gap-4'>
              {/* Avatar stack */}
              <div className='flex items-center -space-x-2.5 shrink-0 pt-0.5 sm:pt-0'>
                {STATIC_AVATARS.map((avatar, i) => (
                  <div
                    key={i}
                    className='w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 border-[var(--c-bg)] overflow-hidden shrink-0 flex items-center justify-center text-xs font-black text-white uppercase select-none shadow-sm'
                    style={{ background: avatar.bg }}
                  >
                    {avatar.label}
                  </div>
                ))}

                {/* Bubble đếm thêm */}
                <div className='w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 border-[var(--c-bg)] bg-white/10 flex items-center justify-center text-[10px] sm:text-[11px] font-mono font-bold text-white/80 shrink-0 select-none'>
                  +99
                </div>
              </div>

              {/* Wording L903 mọt phim */}
              <div className='min-w-0'>
                <p className='text-sm sm:text-[15px] font-bold text-white tracking-tight group-hover:text-[var(--c-cyan)] transition-colors duration-200'>
                  Cày phim một mình hơi chán?{' '}
                  <span className='text-white/70 font-normal group-hover:text-white/90 transition-colors duration-200'>
                    Nghía qua tủ phim của hội bạn xem ai cùng gu với mình nè!
                  </span>
                </p>
                <p className='text-xs text-white/40 hidden sm:block mt-0.5'>
                  Khám phá danh sách yêu thích, lịch sử cày phim và những bài đánh giá chân thật từ cộng đồng.
                </p>
              </div>
            </div>

            {/* Nút hành động dẫn sang /users */}
            <div className='shrink-0 flex sm:justify-end'>
              <span className='inline-flex items-center justify-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-white/5 group-hover:bg-[var(--c-cyan)] group-hover:text-[var(--c-bg)] border border-white/10 group-hover:border-[var(--c-cyan)] transition-colors duration-200'>
                <span>Khám phá cộng đồng</span>
                <span className='text-[var(--c-cyan)] group-hover:text-[var(--c-bg)] transition-colors duration-200'>
                  ›
                </span>
              </span>
            </div>
          </div>
        </Link>
      </div>
    </section>
  )
}
