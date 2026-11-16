'use client'

import React, { createContext, useContext, useState, useEffect, Suspense, type ReactNode } from 'react'
import { useSearchParams, usePathname } from 'next/navigation'

interface SearchContextType {
  search: string
  setSearch: React.Dispatch<React.SetStateAction<string>>
  clearSearch: () => void
}

const SearchContext = createContext<SearchContextType | undefined>(undefined)

function SearchQuerySync({ onSync }: { onSync: (query: string) => void }) {
  const searchParams = useSearchParams()
  const pathname = usePathname()

  useEffect(() => {
    const q = searchParams.get('q')
    // Đồng bộ từ khóa tìm kiếm khi ở trang tìm kiếm (/search hoặc /nguonc/search)
    if (q !== null && (pathname === '/search' || pathname === '/nguonc/search')) {
      onSync(q)
    }
  }, [searchParams, pathname, onSync])

  return null
}

interface SearchProviderProps {
  children: ReactNode
}

export function SearchProvider({ children }: SearchProviderProps) {
  const [search, setSearch] = useState('')

  const clearSearch = () => setSearch('')

  return (
    <SearchContext.Provider value={{ search, setSearch, clearSearch }}>
      <Suspense fallback={null}>
        <SearchQuerySync onSync={setSearch} />
      </Suspense>
      {children}
    </SearchContext.Provider>
  )
}

export function useSearch(): SearchContextType {
  const context = useContext(SearchContext)
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider')
  }
  return context
}

