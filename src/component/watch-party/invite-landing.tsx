'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/app/auth-provider'
import Loading from '@/component/status/loading'
import pekoraNotFound from '@/assets/image/pekora-not-found.jpg'
import { getInvitePreview, joinInvite, roomErrorMessage } from '@/services/watch-room-service'
import { formatPosition } from '@/lib/watch-room/chat-format'
import { isValidInviteToken } from '@/lib/watch-room/validation'
import Avatar from './avatar'
import Poster from './poster'
import XcIcon from './xc-icon'

// /moi/[token]: ai mời, phòng gì, đang xem gì → "Vào phòng ›"

function BrokenLink() {
  return (
    <div className='xc-inv st'>
      <div className='xc-pic'>
        <Image src={pekoraNotFound} alt='' fill sizes='200px' className='object-cover' />
      </div>
      <span className='c-sticker' style={{ background: 'var(--c-orange)' }}>
        LINK HỎNG
      </span>
      <h2>Link mời không dùng được</h2>
      <p>Link bị gõ sai hoặc đã được đổi mới. Nhờ người mời gửi lại link mới nha.</p>
      <Link href='/' className='dx-b dx-b-gh'>
        Về trang chủ
      </Link>
    </div>
  )
}

export default function InviteLanding({ token }: { token: string }) {
  const router = useRouter()
  const { user, loading, setUser } = useAuth()
  const valid = isValidInviteToken(token)
  const { data, isLoading, isError } = useQuery({ ...getInvitePreview(token), enabled: valid && !!user })
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Đã là thành viên → vào thẳng phòng
  useEffect(() => {
    if (data?.isMember && data.roomId) router.replace(`/phong/${data.roomId}`)
  }, [data, router])

  const join = async () => {
    setJoining(true)
    setError(null)
    try {
      const { roomId } = await joinInvite(token)
      router.push(`/phong/${roomId}`)
    } catch (err) {
      setError(roomErrorMessage(err))
      setJoining(false)
    }
  }

  // "Không phải bạn?" → đăng xuất rồi đăng nhập lại, xong quay về đúng link mời
  const switchAccount = async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined)
    setUser(null)
    window.location.href = `/login?next=${encodeURIComponent(`/moi/${token}`)}`
  }

  let body
  if (!valid || isError || (!isLoading && user && !data)) body = <BrokenLink />
  else if (!loading && !user) {
    body = (
      <Link href={`/login?next=${encodeURIComponent(`/moi/${token}`)}`} className='dx-b dx-b-pri'>
        Đăng nhập để vào phòng
      </Link>
    )
  } else if (loading || isLoading || !data) body = <Loading />
  else {
    const member = data.isMember
    body = (
      <div className='xc-inv'>
        <div className='relative mb-2.5'>
          <Avatar userId={data.inviter} name={data.inviter} size={80} />
          <span className='c-sticker pink absolute -top-2.5 left-[58px] rotate-[8deg] whitespace-nowrap'>
            RỦ XEM PHIM!
          </span>
        </div>
        <div className='text-base text-[var(--c-dim)]'>
          <b className='text-white font-extrabold'>{data.inviter}</b> mời bạn vào phòng
        </div>
        <h1>{data.name}</h1>
        <div className='flex gap-2.5 items-center mt-3.5 mb-1 text-[13px] text-[var(--c-dim)]'>
          <XcIcon name='users' size={16} />
          {data.memberCount} thành viên
        </div>
        {data.movie && (
          <div className='flex gap-3 items-center py-2.5 pl-2.5 pr-3.5 rounded-[14px] bg-[rgba(13,10,20,.5)] border border-[var(--c-line)] my-2.5 text-left max-w-full'>
            <Poster src={data.movie.poster} width={36} />
            <div className='min-w-0'>
              <div className='xc-k'>ĐANG XEM DỞ</div>
              <div className='text-sm font-extrabold mt-0.5 truncate'>{data.movie.title}</div>
              <div className='font-mono text-[11px] font-semibold text-[var(--c-dim)] mt-0.5'>
                {[data.episodeName, formatPosition(data.positionSec)].filter(Boolean).join(' · ')}
              </div>
            </div>
          </div>
        )}
        {member ? (
          <Link href={`/phong/${data.roomId}`} className='dx-b xc-b-cy w-full !h-[52px] mt-2'>
            <XcIcon name='check' size={16} strokeWidth={3} />
            Mở phòng
          </Link>
        ) : (
          <button type='button' className='dx-b dx-b-pri w-full !h-[52px] mt-2' onClick={join} disabled={joining}>
            {joining ? <span className='xc-spin' /> : null}
            {joining ? 'Đang vào phòng…' : 'Vào phòng'}
            {!joining && <XcIcon name='right' size={16} strokeWidth={3} />}
          </button>
        )}
        {error && (
          <div className='text-sm text-[var(--c-orange)] mt-2' role='alert'>
            {error}
          </div>
        )}
        {!member && !joining && (
          <Link href='/' className='dx-b dx-b-txt !text-[var(--c-dim)] !h-11 mt-1'>
            Để sau
          </Link>
        )}
        <div className='text-xs text-[var(--c-faint)] mt-3.5'>
          {member ? (
            'Bạn đã ở trong phòng này rồi.'
          ) : (
            <>
              Đang đăng nhập: <b className='text-[var(--c-dim)]'>{user?.email}</b> ·{' '}
              <button type='button' className='underline text-[var(--c-dim)]' onClick={switchAccount}>
                Không phải bạn?
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  return <div className='pt-24 pb-16 px-4 min-h-screen grid place-items-center text-white'>{body}</div>
}
