'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/providers/auth-provider'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import Loading from '@/component/status/loading'
import LoginAnimation from '@/component/login/login-animation'

type Credentials = {
  email: string
  password: string
}

export default function LoginPage() {
  const [isHigh, setIsHigh] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const router = useRouter()
  const { user, loading } = useAuth()

  const handleToggle = useCallback(() => {
    setIsHigh(prev => !prev)
  }, [])

  useEffect(() => {
    if (user) router.replace('/')
  }, [user, router])

  const loginMutation = useMutation({
    mutationFn: async (credentials: Credentials) => {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      })
      if (!res.ok) throw new Error('Email hoặc mật khẩu không chính xác')
      return res.json()
    },
    onSuccess: () => {
      window.location.href = '/'
    }
  })

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    loginMutation.mutate({ email, password })
  }

  const theme = {
    pageBg: isHigh ? 'bg-[#0d1a12]' : 'bg-[#0a121e]',
    glow: isHigh ? 'bg-[#80B772]/10' : 'bg-[#A7E0FF]/10',
    button: isHigh
      ? 'bg-[#80B772] hover:bg-[#6e9e62] shadow-[#80B772]/20'
      : 'bg-[#3b82f6] hover:bg-[#2563eb] shadow-blue-500/20',
    focus: isHigh ? 'focus:ring-[#80B772]/40 border-[#80B772]/20' : 'focus:ring-[#A7E0FF]/40 border-[#A7E0FF]/20',
    accentText: isHigh ? 'text-[#80B772]' : 'text-[#A7E0FF]'
  }

  if (loading)
    return (
      <div className='flex min-h-screen items-center justify-center bg-[#0a121e]'>
        <Loading />
      </div>
    )

  return (
    <div
      className={`relative flex min-h-screen items-center justify-center overflow-hidden p-4 transition-colors duration-1000 ${theme.pageBg}`}
    >
      <div
        className={`absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[130px] transition-all duration-1000 ${theme.glow}`}
      />
      <div
        className={`absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full blur-[130px] transition-all duration-1000 ${theme.glow}`}
      />

      {/* Main Card */}
      <div className='relative z-10 w-full max-w-4xl flex flex-col md:flex-row bg-white/[0.02] backdrop-blur-3xl border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden'>
        <div className='w-full md:w-[42%] relative border-b md:border-b-0 md:border-r border-white/5'>
          <LoginAnimation isHigh={isHigh} onToggle={handleToggle} />
        </div>

        <div className='flex-1 p-10 sm:p-14 lg:p-16 flex flex-col justify-center'>
          <div className='mb-10'>
            <h2 className='text-3xl font-bold text-white tracking-tight'>Đăng nhập</h2>
            <p className='text-slate-400 mt-2'>Chào mừng bạn trở lại</p>
          </div>

          <form onSubmit={handleLogin} className='space-y-5'>
            <input
              type='email'
              placeholder='Email'
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className={`w-full bg-white/[0.03] border text-white px-5 py-4 rounded-2xl outline-none transition-all placeholder:text-slate-600 focus:ring-2 ${theme.focus}`}
            />

            <input
              type='password'
              placeholder='Mật khẩu'
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className={`w-full bg-white/[0.03] border text-white px-5 py-4 rounded-2xl outline-none transition-all placeholder:text-slate-600 focus:ring-2 ${theme.focus}`}
            />

            <button
              type='submit'
              disabled={loginMutation.isPending}
              className={`w-full text-white py-4 rounded-2xl font-bold text-lg shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 mt-4 cursor-pointer duration-500 ${theme.button}`}
            >
              {loginMutation.isPending ? 'Đang xác thực...' : 'Xác nhận'}
            </button>

            {loginMutation.isError && (
              <p className='text-red-400 text-sm font-medium'>{(loginMutation.error as Error).message}</p>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
