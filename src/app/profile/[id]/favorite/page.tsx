import FavoritePage from '@/app/profile/favorite/page'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ExternalFavoritePage({ params }: PageProps) {
  const { id } = await params
  return <FavoritePage userId={id} />
}
