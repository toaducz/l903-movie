import { Suspense } from 'react'
import WatchedView from '@/component/watched/profile/watched-view'
import { WatchedGridSkeleton } from '@/component/watched/profile/watched-states'

export const metadata = { title: 'Đã xem xong! · L903 Movie' }

export default function WatchedPage() {
  return (
    <Suspense fallback={<WatchedGridSkeleton />}>
      <WatchedView />
    </Suspense>
  )
}
