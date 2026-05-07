import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Service Unavailable',
  description: ''
}

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
