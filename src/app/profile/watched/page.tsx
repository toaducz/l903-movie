import { Suspense } from 'react'
import WatchedView from '@/component/profile/watched/watched-view'
import { WatchedGridSkeleton } from '@/component/profile/watched/watched-states'

export const metadata = { title: 'Đã xem xong! · L903 Movie' }

export default function WatchedPage() {
  return (
    <Suspense fallback={<WatchedGridSkeleton />}>
      <WatchedView />
    </Suspense>
  )
}
