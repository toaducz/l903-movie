'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/app/auth-provider'
import Loading from '@/component/status/loading'
import pekoraNotFound from '@/assets/image/pekora-not-found.jpg'
import { getMovieDetail } from '@/services/movie-service'
import { getRoom, RoomApiError, type RoomDetail } from '@/services/watch-room-service'
import { displayNameFromEmail } from '@/lib/watch-room/chat-format'
import { findEpisode, roomEpisodeOf, toRoomMovie } from '@/lib/watch-room/room-media'
import { resolveMovieSource } from '@/utils/env'
import type { MovieItem } from '@/types/movie'
import type { RoomMessage } from '@/types/watch-room'
import { useRoomSession, type RoomMe } from './use-room-session'
import { useRoomChat } from './use-room-chat'
import RoomHeader from './room-header'
import RoomPlayer, { type SyncChip } from './room-player'
import RoomEpisodeStrip from './room-episode-strip'
import RoomPanel from './room-panel'
import MovieSearch from './movie-search'
import XcDialog from './xc-dialog'
import XcIcon from './xc-icon'
import RoomEmptyState from './room-empty-state'
import ResumeCard from './resume-card'
import FriendOfflineCard from './friend-offline-card'
import InviteDialog, { inviteUrlOf } from './invite-dialog'
import { useIsMobile } from '@/component/watched/use-is-mobile'

/** Đọc + xoá cờ một lần trong sessionStorage (đặt bởi popup chọn phòng ở trang chi tiết) */
function takeFlag(key: string): boolean {
  try {
    const on = sessionStorage.getItem(key) === '1'
    sessionStorage.removeItem(key)
    return on
  } catch {
    return false
  }
}

// Trang phòng /phong/[id]: tải phòng (404 = không phải thành viên) rồi dựng player + chat

export function RoomUnavailable({ title = 'Không vào được phòng này', text }: { title?: string; text?: string }) {
  return (
    <div className='pt-24 pb-16 px-4 min-h-screen grid place-items-center text-white'>
      <div className='xc-inv st'>
        <div className='xc-pic'>
          <Image src={pekoraNotFound} alt='' fill sizes='200px' className='object-cover' />
        </div>
        <span className='c-sticker' style={{ background: 'var(--c-orange)' }}>
          LINK HỎNG
        </span>
        <h2>{title}</h2>
        <p>{text ?? 'Phòng không tồn tại hoặc bạn chưa là thành viên. Nhờ người trong phòng gửi link mời nha.'}</p>
        <Link href='/' className='dx-b dx-b-gh'>
          Về trang chủ
        </Link>
      </div>
    </div>
  )
}

export default function RoomPage({ roomId }: { roomId: string }) {
  const { user, loading } = useAuth()
  const roomQuery = useQuery({ ...getRoom(roomId), enabled: !!user })

  if (loading || (user && roomQuery.isLoading)) {
    return (
      <div className='pt-24 min-h-screen grid place-items-center'>
        <Loading />
      </div>
    )
  }
  if (!user) return <RoomUnavailable title='Bạn cần đăng nhập' text='Đăng nhập rồi mở lại link phòng nhé.' />
  if (roomQuery.error instanceof RoomApiError && roomQuery.error.status === 404) return <RoomUnavailable />
  if (!roomQuery.data) {
    return <RoomUnavailable title='Có lỗi khi tải phòng' text='Mạng đang chập chờn, tải lại trang thử nhé.' />
  }

  const me: RoomMe = { userId: user.id, displayName: displayNameFromEmail(user.email) }
  return <RoomView room={roomQuery.data} me={me} />
}

function RoomView({ room, me }: { room: RoomDetail; me: RoomMe }) {
  const queryClient = useQueryClient()
  const chat = useRoomChat(room.id)
  const { addMessages } = chat
  const onMessage = useCallback(
    (m: RoomMessage) => {
      addMessages([m])
      // Có người mới vào → tải lại danh sách thành viên (tên hiển thị)
      if (m.kind === 'event' && m.event?.type === 'join') {
        void queryClient.invalidateQueries({ queryKey: getRoom(room.id).queryKey })
      }
    },
    [addMessages, queryClient, room.id]
  )
  const s = useRoomSession(room, me, onMessage)
  const status = s.channel.status
  const { catchUp } = chat
  const prevStatus = useRef(status)
  useEffect(() => {
    if (prevStatus.current === 'reconnecting' && status === 'live') void catchUp()
    prevStatus.current = status
  }, [status, catchUp])
  const isMobile = useIsMobile()
  const [searchOpen, setSearchOpen] = useState(false)
  const [picking, setPicking] = useState<string | null>(null)
  const [invite, setInvite] = useState<'closed' | 'open' | 'new'>('closed')
  // Vừa tạo phòng ở trang chi tiết → tự mở popup mời (biến thể "PHÒNG MỚI!")
  useEffect(() => {
    if (takeFlag(`xc-new:${room.id}`)) setInvite('new')
  }, [room.id])
  const [offlineDismissed, setOfflineDismissed] = useState(false)

  const presence = s.channel.presence
  const onlineIds = useMemo(() => new Set(presence.map(p => p.userId)), [presence])
  const othersOnline = presence.some(p => p.userId !== me.userId)
  const peerPlaying = presence.some(p => p.userId !== me.userId && p.isPlaying)
  const movie = s.playback.movie
  const inviteUrl = inviteUrlOf(room.inviteToken)

  const chip: SyncChip | null =
    s.channel.status === 'reconnecting'
      ? 'lost'
      : s.channel.status === 'connecting'
        ? 'connecting'
        : movie && !s.isSynced && !s.detailLoading
          ? 'ifr'
          : !othersOnline
            ? 'solo'
            : 'ok'

  /** Chọn phim từ ô tìm → lấy tập đầu → đổi phim cho cả phòng */
  const pickMovie = useCallback(
    async (item: MovieItem) => {
      const source = resolveMovieSource(item.source)
      setPicking(item.slug)
      try {
        const detail = await queryClient.fetchQuery(getMovieDetail({ slug: item.slug, source }))
        const first = findEpisode(detail.episodes ?? [], null)
        const roomMovie = toRoomMovie({ ...item, poster_url: detail.movie.poster_url || item.poster_url }, source)
        s.changeMovie(roomMovie, first ? roomEpisodeOf(first.serverName, first.item) : null)
        setSearchOpen(false)
      } catch {
        s.feedback.showToast({ userId: me.userId, name: 'Lỗi', text: 'không mở được phim này', tone: 'org' })
      } finally {
        setPicking(null)
      }
    },
    [queryClient, s, me.userId]
  )

  // Lớp phủ player theo thứ tự ưu tiên (README §06)
  const waiting = !!movie && s.settled && !s.joined && !peerPlaying
  const others = room.members.filter(m => m.userId !== me.userId)
  const resumePos = room.state.positionSec
  const showResume = waiting && resumePos >= 5
  const showOffline = !!movie && !othersOnline && !offlineDismissed && s.settled
  const watchAlone = () => {
    setOfflineDismissed(true)
    if (s.isSynced) s.startPlayback(0)
    else s.setJoined(true)
  }

  let overlay: ReactNode = null
  if (!movie) overlay = <RoomEmptyState onPick={pickMovie} busySlug={picking} />
  else if (s.autoplayBlocked) {
    overlay = (
      <div className='xc-pov'>
        <button type='button' className='dx-b dx-b-pri' onClick={s.resumeBlocked}>
          <XcIcon name='play' size={15} />
          Bấm để vào cùng
        </button>
      </div>
    )
  } else if (showResume) {
    overlay = (
      <ResumeCard
        movie={movie}
        episodeName={s.playback.episode?.episodeName ?? null}
        positionSec={resumePos}
        lastByName={room.state.updatedBy ? s.nameOf(room.state.updatedBy) : null}
        updatedAt={room.state.updatedAt}
        canSeek={s.isSynced}
        onResume={() => (s.isSynced ? s.startPlayback(resumePos) : s.setJoined(true))}
        onPickOther={() => setSearchOpen(true)}
      />
    )
  } else if (waiting && showOffline && !isMobile) {
    overlay = (
      <FriendOfflineCard
        me={room.members.find(m => m.userId === me.userId)}
        others={others}
        inviteUrl={inviteUrl}
        variant='overlay'
        onWatchAlone={watchAlone}
      />
    )
  }

  return (
    <div className='pt-16 min-h-screen text-white'>
      <div className='max-w-[1600px] mx-auto'>
        <RoomHeader name={room.name} members={room.members} onlineIds={onlineIds} onInvite={() => setInvite('open')} />
        <div className='xc-rm'>
          <div className='xc-rm-l'>
            <RoomPlayer
              item={s.resolved?.item ?? null}
              poster={movie?.poster}
              isSynced={s.isSynced}
              guard={s.seekGuard}
              onPlayer={s.setPlayer}
              chip={chip}
              toast={s.feedback.toast}
              flying={s.feedback.flying}
              chat={chat}
              nameOf={s.nameOf}
              empty={!movie}
              loading={!!movie && s.detailLoading}
              error={!!movie && s.detailError}
              overlay={overlay}
            />
            {isMobile && showOffline && (
              <FriendOfflineCard
                me={undefined}
                others={others}
                inviteUrl={inviteUrl}
                variant='strip'
                onWatchAlone={watchAlone}
              />
            )}
            {movie && !s.isSynced && !s.detailLoading && (
              <div className='xc-inote'>
                <XcIcon name='info' size={18} strokeWidth={2.2} />
                <div>
                  <b>{movie.source.toUpperCase()} phát qua trình nhúng nên không tự đồng bộ được.</b> Dừng/tua sẽ không
                  truyền sang máy kia — đổi tập / đổi phim vẫn đồng bộ.
                </div>
              </div>
            )}
            {movie && (
              <RoomEpisodeStrip
                movie={movie}
                detail={s.detail}
                episode={s.playback.episode}
                onPickEpisode={s.changeEpisode}
                onChangeMovie={() => setSearchOpen(true)}
              />
            )}
          </div>
          <RoomPanel
            members={room.members}
            presence={presence}
            myId={me.userId}
            nameOf={s.nameOf}
            chat={chat}
            reconnecting={s.channel.status === 'reconnecting'}
            onReaction={s.sendReaction}
          />
        </div>
      </div>

      {invite !== 'closed' && (
        <InviteDialog
          roomName={room.name}
          inviteToken={room.inviteToken}
          members={room.members}
          isNew={invite === 'new'}
          onClose={() => setInvite('closed')}
        />
      )}
      {searchOpen && (
        <XcDialog label='Đổi phim cho cả phòng' onClose={() => setSearchOpen(false)} tone='yel'>
          <div>
            <span className='c-sticker'>ĐỔI PHIM</span>
            <h3 className='mt-2 mb-0.5 text-[22px] font-black tracking-[-0.03em]'>Xem phim gì tiếp?</h3>
            <div className='text-xs text-[var(--c-dim)]'>Mọi người trong phòng sẽ chuyển sang phim bạn chọn.</div>
          </div>
          <MovieSearch onPick={pickMovie} busySlug={picking} autoFocus />
        </XcDialog>
      )}
    </div>
  )
}
