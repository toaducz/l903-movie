import HistoryPage from '@/app/profile/history/page'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ExternalHistoryPage({ params }: PageProps) {
  const { id } = await params
  return <HistoryPage userId={id} />
}
