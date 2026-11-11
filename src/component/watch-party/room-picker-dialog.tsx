'use client'

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { createRoom, getMyRooms, roomErrorMessage, saveRoomState } from '@/services/watch-room-service'
import { formatPosition } from '@/lib/watch-room/chat-format'
import { sameMovie } from '@/lib/watch-room/room-media'
import { parseRoomName, ROOM_NAME_MAX } from '@/lib/watch-room/validation'
import type { RoomEpisode, RoomMovie, RoomSummary } from '@/types/watch-room'
import { AvatarStack } from './avatar'
import Poster from './poster'
import XcDialog from './xc-dialog'
import XcIcon from './xc-icon'

// Popup "Mở phim này ở phòng nào?": chọn phòng có sẵn (mặc định phòng hoạt động gần nhất) hoặc tạo phòng mới

type Props = { movie: RoomMovie; episode: RoomEpisode | null; synced: boolean; onClose: () => void }

/** Cờ 1 lần cho trang phòng: báo cả phòng đổi phim / tự mở popup mời */
function setFlag(key: string) {
  try {
    sessionStorage.setItem(key, '1')
  } catch {
    // sessionStorage bị chặn → trang phòng vẫn chạy, chỉ không tự báo
  }
}

function RoomRow({ room, selected, onSelect }: { room: RoomSummary; selected: boolean; onSelect: () => void }) {
  const ep = room.state.episode?.episodeName
  return (
    <button
      type='button'
      role='radio'
      aria-checked={selected}
      tabIndex={selected ? 0 : -1}
      className={`xc-rr ${selected ? 'sel' : ''}`}
      onClick={onSelect}
    >
      <span className='xc-radio' />
      <AvatarStack size={30} people={room.members.map(m => ({ userId: m.userId, name: m.displayName }))} />
      <div className='flex-1 min-w-0'>
        <div className='text-[15px] font-extrabold tracking-[-0.01em] truncate'>{room.name}</div>
        <div className='xc-rr-s'>
          {room.members.length} người{room.state.movie && ep ? ` · dở ${ep}` : ''}
        </div>
      </div>
    </button>
  )
}

export default function RoomPickerDialog({ movie, episode, synced, onClose }: Props) {
  const router = useRouter()
  const { data: rooms, isLoading, isError } = useQuery(getMyRooms())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const list = useMemo(() => rooms ?? [], [rooms])
  const firstTime = !isLoading && !isError && list.length === 0
  const createMode = creating || firstTime

  // Mặc định chọn phòng hoạt động gần nhất (API đã sắp)
  useEffect(() => {
    if (selectedId === null && list.length) setSelectedId(list[0].id)
  }, [list, selectedId])

  const selected = createMode ? null : (list.find(r => r.id === selectedId) ?? null)
  const otherMovie = selected?.state.movie && !sameMovie(selected.state.movie, movie) ? selected.state : null

  const onRadioKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const idx = list.findIndex(r => r.id === selectedId)
    const next = list[(idx + (e.key === 'ArrowDown' ? 1 : list.length - 1)) % list.length]
    if (!next) return
    setCreating(false)
    setSelectedId(next.id)
    listRef.current?.querySelector<HTMLElement>(`[data-room="${next.id}"] button`)?.focus()
  }

  const submit = async () => {
    if (busy) return
    setError(null)
    let roomId = selected?.id ?? null
    let isNew = false
    setBusy(true)
    try {
      if (createMode) {
        const parsed = parseRoomName(name)
        if (!parsed.ok) {
          setError(parsed.error)
          setBusy(false)
          return
        }
        roomId = (await createRoom(parsed.value)).id
        isNew = true
      }
      if (!roomId) return setBusy(false)
      // Phòng đang mở đúng phim này → vào thẳng, không reset vị trí của cả phòng
      if (isNew || !sameMovie(selected?.state.movie ?? null, movie)) {
        await saveRoomState(roomId, { movie, episode, positionSec: 0, isPlaying: false })
        setFlag(`xc-open:${roomId}`)
      }
      if (isNew) setFlag(`xc-new:${roomId}`)
      router.push(`/phong/${roomId}`)
    } catch (err) {
      setError(roomErrorMessage(err))
      setBusy(false)
    }
  }

  const nameInput = (
    <div className='xc-rr-x'>
      <label htmlFor='xc-new-room' className='flex justify-between text-[13px] font-bold'>
        Tên phòng <span className='text-[var(--c-faint)] font-medium'>tối đa {ROOM_NAME_MAX} ký tự</span>
      </label>
      <div className='relative'>
        <input
          id='xc-new-room'
          className='xc-inp pr-16'
          value={name}
          maxLength={ROOM_NAME_MAX}
          placeholder='VD: Tui với Hùng'
          aria-label='Tên phòng mới'
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && void submit()}
          data-autofocus={createMode ? true : undefined}
          autoFocus={creating}
        />
        <span className='xc-cnt'>
          {name.length}/{ROOM_NAME_MAX}
        </span>
      </div>
      <div className='text-xs text-[var(--c-faint)]'>Tạo xong sẽ có link mời để gửi cho bạn.</div>
    </div>
  )

  const cta = busy ? 'Đang mở…' : createMode ? 'Tạo & mở phim' : 'Mở trong phòng'
  return (
    <XcDialog label='Xem chung' onClose={onClose}>
      <div className='flex gap-4 items-center sm:pr-11'>
        <Poster
          src={movie.poster}
          width={60}
          radius={10}
          style={{ transform: 'rotate(-3deg)', boxShadow: '4px 4px 0 var(--c-yel)' }}
        />
        <div className='min-w-0'>
          <span className='c-sticker'>XEM CHUNG</span>
          <h3 className='mt-2 mb-0.5 text-[22px] font-black tracking-[-0.03em] leading-[1.15]'>
            {firstTime ? 'Tạo phòng xem chung đầu tiên' : 'Mở phim này ở phòng nào?'}
          </h3>
          <div className='text-xs text-[var(--c-dim)] truncate'>
            {movie.title}
            {episode ? ` · ${episode.episodeName}` : ''}
          </div>
          <div
            className='inline-flex gap-1.5 items-center text-xs font-bold mt-1.5'
            style={{ color: synced ? 'var(--c-cyan)' : 'var(--c-yel)' }}
          >
            <XcIcon name={synced ? 'sync' : 'info'} size={13} strokeWidth={2.6} />
            {synced ? 'Nguồn KKPHIM · tự đồng bộ cho cả phòng' : 'Nguồn nhúng · đổi tập đồng bộ, play/tua thì không'}
          </div>
        </div>
      </div>

      {isLoading && <div className='text-sm text-[var(--c-dim)]'>Đang tải phòng của bạn…</div>}
      {isError && <div className='text-sm text-[var(--c-orange)]'>Không tải được danh sách phòng.</div>}
      {firstTime && (
        <>
          <p className='m-0 text-sm text-[var(--c-dim)] leading-[1.55]'>
            Phòng là chỗ cố định để xem cùng bạn bè từ xa: chung phim, chung tua, chung chat. Đặt tên rồi gửi link là
            xong.
          </p>
          {nameInput}
        </>
      )}
      {!firstTime && list.length > 0 && (
        <div
          ref={listRef}
          className='flex flex-col gap-2.5'
          role='radiogroup'
          aria-label='Chọn phòng'
          onKeyDown={onRadioKey}
        >
          {list.map(r => (
            <div key={r.id} data-room={r.id} className='flex flex-col gap-2.5'>
              <RoomRow
                room={r}
                selected={!createMode && r.id === selectedId}
                onSelect={() => {
                  setCreating(false)
                  setSelectedId(r.id)
                }}
              />
              {!createMode && r.id === selectedId && otherMovie?.movie && (
                <div className='xc-warnl'>
                  <XcIcon name='warn' size={16} strokeWidth={2.2} />
                  <div>
                    Phòng đang dở{' '}
                    <b>
                      {[otherMovie.movie.title, otherMovie.episode?.episodeName, formatPosition(otherMovie.positionSec)]
                        .filter(Boolean)
                        .join(' · ')}
                    </b>
                    . Mở phim mới sẽ thay chỗ cho cả phòng.
                  </div>
                </div>
              )}
            </div>
          ))}
          {creating ? (
            nameInput
          ) : (
            <button type='button' className='xc-rr new' onClick={() => setCreating(true)}>
              <span className='w-9 h-9 rounded-full border-2 border-dashed border-[var(--c-yel)] grid place-items-center'>
                <XcIcon name='plus' size={18} strokeWidth={2.6} />
              </span>
              <div>
                <div className='text-[15px] font-extrabold'>Tạo phòng mới</div>
                <div className='xc-rr-s' style={{ color: 'rgba(251,191,36,.7)' }}>
                  Đặt tên, mở phim này, rồi gửi link rủ bạn
                </div>
              </div>
            </button>
          )}
        </div>
      )}

      {error && (
        <div className='text-sm text-[var(--c-orange)]' role='alert'>
          {error}
        </div>
      )}

      <div className='flex flex-col-reverse gap-2.5 sm:flex-row sm:items-center sm:gap-3.5'>
        <span className='hidden sm:block text-xs text-[var(--c-faint)] flex-1'>
          {createMode ? '' : 'Mọi người trong phòng sẽ chuyển sang phim này.'}
        </span>
        <button type='button' className='dx-b dx-b-gh w-full sm:w-auto' onClick={onClose} disabled={busy}>
          Huỷ
        </button>
        <button
          type='button'
          className='dx-b dx-b-pri w-full sm:w-auto'
          onClick={() => void submit()}
          disabled={busy || isLoading || (!createMode && !selected)}
        >
          {busy && <span className='xc-spin' />}
          {cta}
        </button>
      </div>
    </XcDialog>
  )
}
