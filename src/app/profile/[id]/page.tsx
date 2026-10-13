import ProfilePage from '@/app/profile/page'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ExternalProfileOverviewPage({ params }: PageProps) {
  const { id } = await params
  return <ProfilePage userId={id} />
}
