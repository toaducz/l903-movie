'use client'

import { useState } from 'react'
import type { MovieDetail } from '@/types/movie'
import type { RoomEpisode, RoomMovie } from '@/types/watch-room'
import { roomEpisodeOf, sameEpisode, SOURCE_COLORS, SOURCE_LABELS } from '@/lib/watch-room/room-media'
import { episodeKeyOf } from '@/lib/watch-room/validation'
import Poster from './poster'
import XcIcon from './xc-icon'

// Dưới player: thông tin phim (+ "Đổi phim") và dải tập — bấm tập = đổi tập cho cả phòng

type Props = {
  movie: RoomMovie
  detail: MovieDetail | null
  episode: RoomEpisode | null
  onPickEpisode: (ep: RoomEpisode) => void
  onChangeMovie: () => void
}

const shortName = (name: string) => name.replace(/^tập\s*/i, '') || name

export default function RoomEpisodeStrip({ movie, detail, episode, onPickEpisode, onChangeMovie }: Props) {
  const servers = detail?.episodes ?? []
  const current = servers.find(s => s.server_name === episode?.serverName) ?? servers[0]
  const [serverName, setServerName] = useState<string | null>(null)
  const shownServer = servers.find(s => s.server_name === serverName) ?? current
  const eps = shownServer?.server_data ?? []
  const total = current?.server_data.length ?? 0

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex gap-3 items-center'>
        <Poster src={movie.poster} width={40} />
        <div className='min-w-0'>
          <h2 className='m-0 text-base lg:text-xl font-black tracking-[-0.03em] truncate'>{movie.title}</h2>
          <div className='flex gap-2 items-center mt-1 text-xs text-[var(--c-dim)]'>
            <span className='xc-src' style={{ background: SOURCE_COLORS[movie.source] ?? '#555' }}>
              {SOURCE_LABELS[movie.source] ?? movie.source}
            </span>
            {episode && (
              <span className='font-mono'>
                {episode.episodeName}
                {total > 1 && ` / ${total}`}
              </span>
            )}
          </div>
        </div>
        <span className='flex-1' />
        <button type='button' className='dx-b dx-b-gh dx-b-sm !h-10' onClick={onChangeMovie} aria-label='Đổi phim'>
          <XcIcon name='search' size={16} />
          <span className='hidden sm:inline'>Đổi phim</span>
        </button>
      </div>

      {servers.length > 1 && (
        <div className='flex gap-2 flex-wrap' role='tablist' aria-label='Server'>
          {servers.map(s => (
            <button
              key={s.server_name}
              type='button'
              role='tab'
              aria-selected={s === shownServer}
              className={`xc-chip ${s === shownServer ? 'on' : ''}`}
              onClick={() => setServerName(s.server_name)}
            >
              {s.server_name}
            </button>
          ))}
        </div>
      )}

      {eps.length > 1 && shownServer && (
        <div className='xc-eps max-h-[188px] overflow-y-auto' role='list' aria-label='Danh sách tập'>
          {eps.map(item => {
            const ep = roomEpisodeOf(shownServer.server_name, item)
            const on = sameEpisode(ep, episode)
            return (
              <button
                key={`${shownServer.server_name}-${episodeKeyOf(item)}`}
                type='button'
                role='listitem'
                className={`xc-ep ${on ? 'on' : ''}`}
                aria-current={on ? 'true' : undefined}
                aria-label={item.name}
                onClick={() => onPickEpisode(ep)}
              >
                {shortName(item.name)}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
