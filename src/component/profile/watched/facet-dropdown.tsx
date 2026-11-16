'use client'

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import WatchedIcon from '@/component/watched/watched-icon'
import type { WatchedFacet } from '@/types/watched'

interface FacetDropdownProps {
  label: string
  facets: WatchedFacet[]
  value: string | null
  onChange: (slug: string | null) => void
}

/** Dropdown "Thể loại: Tất cả ▾" (desktop) — chỉ liệt kê thể loại / quốc gia có trong danh sách Đã xem */
export default function FacetDropdown({ label, facets, value, onChange }: FacetDropdownProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const listId = useId()
  const selected = facets.find(f => f.slug === value)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    rootRef.current?.querySelector<HTMLElement>('[role="option"][aria-selected="true"]')?.focus()
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const pick = (slug: string | null) => {
    onChange(slug)
    setOpen(false)
    rootRef.current?.querySelector<HTMLElement>('button')?.focus()
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape' && open) {
      e.preventDefault()
      setOpen(false)
      rootRef.current?.querySelector<HTMLElement>('button')?.focus()
      return
    }
    if (!open || (e.key !== 'ArrowDown' && e.key !== 'ArrowUp')) return
    e.preventDefault()
    const options = Array.from(rootRef.current?.querySelectorAll<HTMLElement>('[role="option"]') ?? [])
    const i = options.indexOf(document.activeElement as HTMLElement)
    const next = e.key === 'ArrowDown' ? Math.min(options.length - 1, i + 1) : Math.max(0, i - 1)
    options[next]?.focus()
  }

  return (
    <div ref={rootRef} className='relative' onKeyDown={handleKeyDown}>
      <button
        type='button'
        className={`dx-dd cursor-pointer ${selected ? 'act' : ''}`}
        aria-haspopup='listbox'
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => setOpen(o => !o)}
      >
        <span className='dx-k'>{label}:</span> {selected?.name ?? 'Tất cả'}
        <WatchedIcon name='chev' size={14} />
      </button>
      {open && (
        <div id={listId} className='dx-pop' role='listbox' aria-label={label}>
          <FacetOption name='Tất cả' selected={!value} onPick={() => pick(null)} />
          {facets.map(f => (
            <FacetOption
              key={f.slug}
              name={f.name}
              count={f.count}
              selected={f.slug === value}
              onPick={() => pick(f.slug)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function FacetOption({
  name,
  count,
  selected,
  onPick
}: {
  name: string
  count?: number
  selected: boolean
  onPick: () => void
}) {
  return (
    <button
      type='button'
      role='option'
      aria-selected={selected}
      className={`dx-opt cursor-pointer ${selected ? 'on' : ''}`}
      onClick={onPick}
    >
      <span>{name}</span>
      {count !== undefined && <span className='dx-c'>{count}</span>}
    </button>
  )
}
