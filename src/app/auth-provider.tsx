'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

type AuthContextType = {
  user: User | null
  setUser: (u: User | null) => void
  logout: () => Promise<void>
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = () => {
      fetch('/api/auth/me')
        .then(res => res.json())
        .then(data => setUser(data.user || null))
        .finally(() => setLoading(false))
    }

    checkAuth()

    // Refresh khi quay lại tab (focus)
    window.addEventListener('focus', checkAuth)
    return () => window.removeEventListener('focus', checkAuth)
  }, [])

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null) // reset state toàn site
    router.replace('/')
    router.refresh()
  }

  return <AuthContext.Provider value={{ user, setUser, logout, loading }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
