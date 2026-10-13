import { Suspense } from 'react'
import WatchedView from '@/component/watched/profile/watched-view'
import { WatchedGridSkeleton } from '@/component/watched/profile/watched-states'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ExternalWatchedPage({ params }: PageProps) {
  const { id } = await params
  return (
    <Suspense fallback={<WatchedGridSkeleton />}>
      <WatchedView userId={id} />
    </Suspense>
  )
}
