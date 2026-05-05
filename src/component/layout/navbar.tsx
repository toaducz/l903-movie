'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import menu from '@/assets/menu.png'
import { useQuery } from '@tanstack/react-query'
import { getCategorySlug } from '@/api/kkphim/filter/get-category-slug'
import { getCountrySlug } from '@/api/kkphim/filter/get-country-slug'
import userIcon from '@/assets/user-icons.png'
import { useAuth } from '@/app/auth-provider'
import { getSearchByName } from '@/api/kkphim/search/get-search'
import NotificationBell from '@/component/layout/notification-bell'

type DropdownItem = { _id: string; slug: string; name: string }

export default function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [openMenu, setOpenMenu] = useState<'category' | 'country' | 'year' | 'notification' | null>(null)
  const MAX_SEARCH_LENGTH = 100
  const suggestionRef = useRef<HTMLDivElement>(null)
  const { data: categoryData, isLoading: categoryLoading } = useQuery(getCategorySlug())
  const { data: countryData, isLoading: countryLoading } = useQuery(getCountrySlug())

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 250)
    return () => clearTimeout(timer)
  }, [search])

  const { data: suggestionData } = useQuery({
    ...getSearchByName({ keyword: debouncedSearch, page: 1, limit: 6 }),
    enabled: debouncedSearch.length >= 2,
  })
  const suggestions = suggestionData?.data?.items?.slice(0, 6) ?? []

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionRef.current && !suggestionRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  const years = Array.from({ length: new Date().getFullYear() - 1970 + 1 }, (_, i) => ({
    _id: String(1970 + i),
    slug: String(1970 + i),
    name: String(1970 + i)
  })).reverse()

  const { user } = useAuth()

  const getItems = (): DropdownItem[] => {
    if (openMenu === 'category') {
      if (categoryLoading) return [{ _id: 'loading', slug: 'loading', name: 'Đang tải...' }]
      return categoryData ?? []
    }
    if (openMenu === 'country') {
      if (countryLoading) return [{ _id: 'loading', slug: 'loading', name: 'Đang tải...' }]
      return countryData ?? []
    }
    if (openMenu === 'year') return years
    return []
  }

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setOpenMenu(null)
        setIsVisible(false)
      } else {
        setIsVisible(true)
      }
      setLastScrollY(currentScrollY)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (search.length > MAX_SEARCH_LENGTH) {
      alert(`Từ khóa quá dài (tối đa ${MAX_SEARCH_LENGTH} ký tự), phá hả mạy?!`)
      return
    }

    if (search.trim()) {
      const encoded = encodeURIComponent(search.trim())
      router.push(`/search?q=${encoded}&page=1`)
      setSearch('')
      setShowSuggestions(false)
      setIsMenuOpen(false)
    }
  }

  const toggleMenu = () => {
    setIsMenuOpen(prev => !prev)
  }

  const navLinks = [
    { href: { pathname: '/list-movie', query: { typelist: 'phim-vietsub', page: 1 } }, label: 'Vietsub' },
    { href: { pathname: '/list-movie', query: { typelist: 'phim-long-tieng', page: 1 } }, label: 'Lồng tiếng' },
    {
      href: { pathname: '/list-movie', query: { typelist: 'hoat-hinh', country: 'nhat-ban', page: 1 } },
      label: 'Anime',
      tooltip: 'Tất nhiên là phải có Anime rồi!'
    },
    { href: { pathname: '/list-movie/category', query: { category: 'hanh-dong', page: 1 } }, label: 'Thể loại' },
    { href: { pathname: '/list-movie/country', query: { country: 'han-quoc', page: 1 } }, label: 'Quốc Gia' },
    { href: { pathname: '/list-movie/year', query: { year: '2025', page: 1 } }, label: 'Năm' },
    {
      href: { pathname: '/nguonc/home', query: { page: 1 } },
      label: 'Nguonc.com',
      tooltip: 'Ở đây cũng nhiều phim chất lắm, mỗi tội có quảng cáo :v'
    }
  ]

  if (pathname === '/login') return null

  return (
    <nav
      className={`w-full inset-x-0 fixed top-0 z-[9999] transition-transform duration-300 border-b ${isVisible ? 'translate-y-0' : '-translate-y-full'
        }`}
      style={{
        backdropFilter: 'blur(20px)',
        background: 'rgba(13,10,20,.75)',
        borderColor: 'var(--c-line)',
        zIndex: 9999
      }}
    >
      <div className='max-w-[1400px] mx-auto px-5 sm:px-10 py-4 flex items-center justify-between gap-6'>
        <Link
          href='/'
          className='text-[20px] font-black tracking-tight text-white hover:opacity-90 transition-opacity shrink-0'
        >
          L903<span className='text-[var(--c-yel)] mx-0.5 text-sm align-[2px]'>★</span>movie
        </Link>

        {/* Navigation Items - Desktop */}
        <div className='hidden lg:flex items-center gap-6 text-sm font-medium relative'>
          {navLinks.map((link, i) => {
            const isDropdown = ['Thể loại', 'Quốc Gia', 'Năm'].includes(link.label)

            if (isDropdown) {
              const menuKey = link.label === 'Thể loại' ? 'category' : link.label === 'Quốc Gia' ? 'country' : 'year'

              return (
                <div key={i} className='relative group'>
                  <button
                    onClick={() => setOpenMenu(openMenu === menuKey ? null : menuKey)}
                    className='flex items-center gap-1 text-white/60 hover:text-white transition-colors duration-150 cursor-pointer'
                  >
                    {link.label}
                    <span className='text-[9px] leading-none transition-transform duration-200'>▼</span>
                  </button>

                  {openMenu === menuKey && (
                    <div
                      className='absolute left-0 top-full mt-2 w-48 max-h-72 overflow-y-auto rounded-xl shadow-xl z-[9999] border'
                      style={{ background: 'var(--c-card)', borderColor: 'var(--c-line)' }}
                    >
                      {getItems().map(item => {
                        const href = `/list-movie/${menuKey}?${menuKey}=${item.slug}&page=1`
                        return (
                          <Link
                            key={item.slug}
                            href={item.slug === 'loading' ? '#' : href}
                            onClick={() => setOpenMenu(null)}
                            className={`block w-full text-left px-3.5 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors ${item.slug === 'loading' ? 'opacity-50 pointer-events-none' : ''
                              }`}
                          >
                            {item.name}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            }

            return (
              <Link
                key={i}
                href={link.href}
                className='text-white/60 hover:text-white transition-colors duration-150'
              >
                {link.label}
              </Link>
            )
          })}
        </div>

        {/* Search — Desktop */}
        <div ref={suggestionRef} className='hidden sm:flex items-center gap-2 relative'>
          <form onSubmit={handleSearch} className='flex items-center gap-2'>
            <div className='flex items-center gap-2 rounded-xl px-3 py-2 min-w-[220px] cursor-text text-sm border'
              style={{ background: 'rgba(255,255,255,.05)', borderColor: 'var(--c-line)' }}
            >
              <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='text-white/40 shrink-0'>
                <circle cx='11' cy='11' r='7' /><path d='M21 21l-4.3-4.3' strokeLinecap='round' />
              </svg>
              <input
                type='text'
                placeholder='Tìm phim đi mại dô…'
                className='bg-transparent text-white text-sm focus:outline-none placeholder-white/30 flex-1 min-w-0'
                value={search}
                onChange={e => setSearch(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                autoComplete='off'
              />
              <span className='font-mono text-[10px] text-white/25 border border-white/15 rounded px-1.5 py-0.5 shrink-0'>⌘K</span>
            </div>
            <button
              type='submit'
              className='sr-only'
              disabled={!search.trim()}
            />
          </form>
          {showSuggestions && suggestions.length > 0 && (
            <div
              className='absolute top-full left-0 mt-2 w-80 rounded-xl shadow-xl z-[9999] overflow-hidden border'
              style={{ background: 'var(--c-card)', borderColor: 'var(--c-line)' }}
            >
              {suggestions.map(movie => (
                <button
                  key={movie.slug}
                  className='flex items-center gap-3 w-full px-3 py-2.5 hover:bg-white/5 transition-colors text-left'
                  onMouseDown={() => {
                    router.push(`/detail-movie/${movie.slug}`)
                    setSearch('')
                    setShowSuggestions(false)
                  }}
                >
                  <img
                    src={`https://wsrv.nl/?url=${encodeURIComponent(movie.thumb_url?.startsWith('http') ? movie.thumb_url : `https://phimimg.com/${movie.thumb_url?.replace(/^\/+/, '')}`)}&w=80&h=112&fit=cover`}
                    alt={movie.name}
                    className='w-9 h-12 object-cover rounded-lg flex-shrink-0 border border-white/10'
                  />
                  <div className='min-w-0'>
                    <p className='text-white text-[13px] font-semibold truncate'>{movie.name}</p>
                    <p className='text-white/40 text-xs truncate'>{movie.origin_name}</p>
                    <p className='text-white/30 text-xs font-mono'>{movie.year} · {movie.episode_current}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Hamburger — Mobile */}
        <button className='lg:hidden focus:outline-none' onClick={toggleMenu} aria-label='Toggle menu'>
          {isMenuOpen ? (
            <span className='block w-6 h-6 relative'>
              <span className='absolute left-0 top-1/2 w-6 h-0.5 bg-white rotate-45'></span>
              <span className='absolute left-0 top-1/2 w-6 h-0.5 bg-white -rotate-45'></span>
            </span>
          ) : (
            <Image src={menu} alt='Menu' width={24} height={24} />
          )}
        </button>

        {/* Notification Bell + User avatar */}
        <div className='flex items-center gap-2'>
          <NotificationBell
          // isOpen={openMenu === 'notification'}
          // onToggle={() => setOpenMenu(openMenu === 'notification' ? null : 'notification')}
          />
          <Link
            key={'user-icon'}
            href={user?.id !== undefined || null ? '/profile' : '/login'}
            className='rounded-full p-1.5 transition-all duration-200 hover:opacity-80'
            style={{ background: 'rgba(255,255,255,.08)' }}
          >
            <Image src={userIcon} alt='user' width={32} height={32} className='rounded-full' />
          </Link>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div
          className='lg:hidden px-5 py-5 flex flex-col gap-4 text-sm font-medium border-t'
          style={{ background: 'var(--c-bg-2)', borderColor: 'var(--c-line)' }}
        >
          {/* Search — Mobile */}
          <div className='relative'>
            <form onSubmit={handleSearch} className='flex items-center gap-2'>
              <input
                type='text'
                placeholder='Tìm theo tên phim'
                className='flex-1 px-4 py-2.5 rounded-xl text-white text-sm focus:outline-none border'
                style={{
                  background: 'rgba(255,255,255,.06)',
                  borderColor: 'var(--c-line)',
                }}
                value={search}
                onChange={e => setSearch(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                autoComplete='off'
              />
              <button
                type='submit'
                className='px-4 py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-40 text-white'
                style={{ background: 'var(--c-pink)' }}
                disabled={!search.trim()}
              >
                Tìm
              </button>
            </form>
            {showSuggestions && suggestions.length > 0 && (
              <div
                className='absolute top-full left-0 mt-2 w-full rounded-xl shadow-xl z-[9999] overflow-hidden border'
                style={{ background: 'var(--c-card)', borderColor: 'var(--c-line)' }}
              >
                {suggestions.map(movie => (
                  <button
                    key={movie.slug}
                    className='flex items-center gap-3 w-full px-3 py-2.5 hover:bg-white/5 transition-colors text-left'
                    onMouseDown={() => {
                      router.push(`/detail-movie/${movie.slug}`)
                      setSearch('')
                      setShowSuggestions(false)
                      setIsMenuOpen(false)
                    }}
                  >
                    <img
                      src={`https://wsrv.nl/?url=${encodeURIComponent(movie.thumb_url?.startsWith('http') ? movie.thumb_url : `https://phimimg.com/${movie.thumb_url?.replace(/^\/+/, '')}`)}&w=80&h=112&fit=cover`}
                      alt={movie.name}
                      className='w-9 h-12 object-cover rounded-lg flex-shrink-0'
                    />
                    <div className='min-w-0'>
                      <p className='text-white text-[13px] font-semibold truncate'>{movie.name}</p>
                      <p className='text-white/40 text-xs truncate'>{movie.origin_name}</p>
                      <p className='text-white/30 text-xs font-mono'>{movie.year} · {movie.episode_current}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Nav links — Mobile */}
          {navLinks.map((link, i) => (
            <Link
              key={i}
              href={link.href}
              className='text-white/60 hover:text-white transition-colors duration-150'
              onClick={() => setIsMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  )
}
