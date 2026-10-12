import { redirect } from 'next/navigation'
import { getMovieDetailHref } from '@/utils/movie-link'

// NguonC đã dùng chung trang chi tiết với các nguồn khác (đổi nguồn qua lại được).
// Giữ route này để link / lịch sử cũ trỏ tới /nguonc/detail-movie/<slug> vẫn mở được.
export default async function NguoncDetailRedirect({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  redirect(getMovieDetailHref(slug, 'nguonc'))
}
