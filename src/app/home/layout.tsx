import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'L903',
  description: ''
}

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
