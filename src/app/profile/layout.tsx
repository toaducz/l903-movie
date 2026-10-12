import type { ReactNode } from 'react'
import ProfileShell from '@/component/profile/profile-shell'
import '../watched-profile.css'

export default function ProfileLayout({ children }: { children: ReactNode }) {
  return <ProfileShell>{children}</ProfileShell>
}
