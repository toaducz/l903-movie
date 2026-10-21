'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/app/auth-provider'
import Loading from '@/component/status/loading'

interface MovieReviewProps {
  slug: string
  name: string
  image: string
}

interface Review {
  id: string
  user_id?: string
  user_email: string
  score: number
  review_text: string
  updated_at: string
  parent_id?: string | null
  is_private?: boolean
  watched_movie_id?: string | null
  replies?: Review[]
  reply_to_username?: string
  watched_score?: number | null
}

export default function MovieReview({ slug, name, image }: MovieReviewProps) {
  const { user } = useAuth()
  const [reviews, setReviews] = useState<Review[]>([])
  const [totalCount, setTotalCount] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  const [reviewText, setReviewText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [hasReviewed, setHasReviewed] = useState(false)

  // State cho phần Reply
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [replySubmitting, setReplySubmitting] = useState(false)
  const [replyError, setReplyError] = useState('')

  // State cho phần Edit
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editError, setEditError] = useState('')

  const fetchReviews = async () => {
    try {
      const res = await fetch(`/api/review?slug=${slug}`)
      const data = await res.json()
      if (data.data) {
        setReviews(data.data)
        setTotalCount(data.count || 0)
        // Check nếu user đã viết bài bình luận gốc
        if (user) {
          const myReview = data.data.find((r: Review) => r.user_email === user.email && !r.parent_id)
          setHasReviewed(Boolean(myReview))
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (slug) fetchReviews()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  // Cập nhật lại state hasReviewed nếu user load sau
  useEffect(() => {
    if (user && reviews.length > 0) {
      const myReview = reviews.find((r: Review) => r.user_email === user.email && !r.parent_id)
      setHasReviewed(Boolean(myReview))
    }
  }, [user, reviews])

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    if (!reviewText.trim()) {
      setErrorMsg('Vui lòng nhập nội dung bình luận.')
      return
    }

    setSubmitting(true)
    setErrorMsg('')
    try {
      const res = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          name,
          image,
          review_text: reviewText,
          user_email: user.email
        })
      })
      const result = await res.json()
      if (result.error) {
        setErrorMsg(result.error)
      } else {
        setReviewText('')
        await fetchReviews()
      }
    } catch (err) {
      console.error(err)
      setErrorMsg('Đã có lỗi xảy ra.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReplySubmit = async (e: React.FormEvent, parentId: string) => {
    e.preventDefault()
    if (!user) return
    if (!replyText.trim()) {
      setReplyError('Vui lòng nhập nội dung trả lời.')
      return
    }

    setReplySubmitting(true)
    setReplyError('')
    try {
      const res = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          name,
          image,
          parent_id: parentId,
          review_text: replyText,
          user_email: user.email
        })
      })
      const result = await res.json()
      if (result.error) {
        setReplyError(result.error)
      } else {
        setReplyText('')
        setReplyingTo(null)
        await fetchReviews()
      }
    } catch (err) {
      console.error(err)
      setReplyError('Đã có lỗi xảy ra.')
    } finally {
      setReplySubmitting(false)
    }
  }

  const handleEditSubmit = async (e: React.FormEvent, reviewId: string) => {
    e.preventDefault()
    if (!user) return
    if (!editText.trim()) {
      setEditError('Vui lòng nhập nội dung bình luận.')
      return
    }

    setEditSubmitting(true)
    setEditError('')
    try {
      const res = await fetch('/api/review', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: reviewId,
          review_text: editText
        })
      })
      const result = await res.json()
      if (result.error) {
        setEditError(result.error)
      } else {
        await fetchReviews()
        setEditingId(null)
      }
    } catch (err) {
      console.error(err)
      setEditError('Đã có lỗi xảy ra.')
    } finally {
      setEditSubmitting(false)
    }
  }

  const handleDelete = async (reviewId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bình luận này không?')) return
    try {
      const res = await fetch(`/api/review?id=${reviewId}`, {
        method: 'DELETE'
      })
      const result = await res.json()
      if (!result.error) {
        await fetchReviews()
      } else {
        alert('Có lỗi khi xóa: ' + result.error)
      }
    } catch (err) {
      console.error(err)
      alert('Có lỗi khi xóa bình luận.')
    }
  }

  const renderReview = (review: Review, isReply = false) => {
    const username = review.user_email.split('@')[0]
    const isOwner = user?.email === review.user_email

    // [NEW] Nếu review riêng tư và không phải owner → hiển thị mosaic
    if (review.is_private && !isOwner) {
      return (
        <div
          key={review.id}
          className={`relative bg-gray-800/40 p-5 rounded-xl border border-gray-700 ${
            isReply ? 'mt-4 ml-4 lg:ml-12 border-l-4 border-l-blue-600' : ''
          }`}
        >
          {/* Content bị blur */}
          <div className='filter blur-md opacity-30 select-none pointer-events-none'>
            <div className='h-6 bg-gray-600 rounded w-1/3 mb-3'></div>
            <div className='h-4 bg-gray-700 rounded w-full mb-2'></div>
            <div className='h-4 bg-gray-700 rounded w-5/6'></div>
          </div>

          {/* Overlay thông báo riêng tư */}
          <div className='absolute inset-0 flex items-center justify-center rounded-xl bg-black/60 backdrop-blur-sm'>
            <div className='text-center text-white px-4'>
              <svg
                xmlns='http://www.w3.org/2000/svg'
                fill='none'
                viewBox='0 0 24 24'
                strokeWidth={1.5}
                stroke='currentColor'
                className='w-8 h-8 mx-auto mb-2 text-gray-400'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  d='M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z'
                />
              </svg>
              <p className='text-sm font-medium text-gray-300'>Bình luận riêng tư</p>
              <p className='mt-1 text-xs text-gray-400'>Chỉ tác giả xem được</p>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div
        key={review.id}
        className={`bg-gray-800/40 p-5 rounded-xl border border-gray-700 ${
          isReply ? 'mt-4 ml-4 lg:ml-12 border-l-4 border-l-blue-600 shadow-md' : 'shadow-sm'
        }`}
      >
        <div className='flex justify-between items-start mb-3 border-b border-gray-700/50 pb-3 gap-2'>
          <div className='flex flex-wrap items-center gap-2'>
            {review.user_id ? (
              <Link
                href={`/profile/${review.user_id}`}
                className='font-semibold text-blue-400 hover:underline hover:text-[var(--c-cyan)] transition-colors duration-200 cursor-pointer inline-flex items-center gap-1'
                title='Xem hồ sơ thành viên'
              >
                <span>@{username}</span>
              </Link>
            ) : (
              <span className='font-semibold text-blue-400'>@{username}</span>
            )}

            {/* Huy hiệu Người xem uy tín (Verified Watcher) nếu đã đánh giá trong watched_movies */}
            {review.watched_score ? (
              <span
                className='inline-flex items-center gap-1 bg-amber-500/15 text-amber-400 border border-amber-500/30 text-xs px-2.5 py-0.5 rounded-full font-medium'
                title={`Thành viên đã xem và đánh giá ${review.watched_score} sao`}
              >
                <span className='font-bold'>★ {review.watched_score}</span>
                <span className='opacity-80'>· Đã xem</span>
              </span>
            ) : null}

            {/* [NEW] Badge: Từ danh sách Đã xem */}
            {review.watched_movie_id && (
              <span
                className='inline-flex items-center gap-1 bg-green-500/15 text-green-400 border border-green-500/30 text-xs px-2.5 py-0.5 rounded-full font-medium'
                title='Bình luận được đồng bộ từ danh sách Đã xem'
              >
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  fill='none'
                  viewBox='0 0 24 24'
                  strokeWidth={2}
                  stroke='currentColor'
                  className='w-3 h-3'
                >
                  <path strokeLinecap='round' strokeLinejoin='round' d='M4.5 12.75l6 6 9-13.5' />
                </svg>
                <span>Từ Đã xem</span>
              </span>
            )}

            {isReply && review.reply_to_username && (
              <span className='text-gray-400 text-sm'>
                Trả lời <span className='text-blue-300'>@{review.reply_to_username}</span>
              </span>
            )}

            <span className='text-xs text-gray-500'>
              {new Date(review.updated_at).toLocaleDateString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
        </div>

        <p className='text-gray-300 whitespace-pre-wrap leading-relaxed'>{review.review_text}</p>

        {/* Nút thao tác: Phản hồi, (Sửa, Xóa nếu là chủ sở hữu) */}
        <div className='mt-3 flex justify-end gap-4'>
          {isOwner && (
            <>
              <button
                type='button'
                onClick={() => {
                  setEditingId(editingId === review.id ? null : review.id)
                  setEditText(review.review_text)
                  setEditError('')
                  setReplyingTo(null)
                }}
                className={`text-sm flex items-center gap-1 transition-colors duration-200 cursor-pointer ${
                  editingId === review.id ? 'text-yellow-400' : 'text-gray-400 hover:text-yellow-400'
                }`}
              >
                Chỉnh sửa
              </button>
              <button
                type='button'
                onClick={() => handleDelete(review.id)}
                className='text-sm flex items-center gap-1 transition-colors duration-200 text-gray-400 hover:text-red-400 cursor-pointer'
              >
                Xóa
              </button>
            </>
          )}

          <button
            type='button'
            onClick={() => {
              setReplyingTo(replyingTo === review.id ? null : review.id)
              setReplyText('')
              setReplyError('')
              setEditingId(null)
            }}
            className={`text-sm flex items-center gap-1 transition-colors duration-200 cursor-pointer ${
              replyingTo === review.id ? 'text-blue-400' : 'text-gray-400 hover:text-blue-400'
            }`}
          >
            <svg
              xmlns='http://www.w3.org/2000/svg'
              fill='none'
              viewBox='0 0 24 24'
              strokeWidth={1.5}
              className='w-4 h-4 stroke-current'
            >
              <path strokeLinecap='round' strokeLinejoin='round' d='M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3' />
            </svg>
            Phản hồi
          </button>
        </div>

        {/* Khung Chỉnh sửa */}
        {editingId === review.id && (
          <div className='mt-4 bg-gray-900/60 p-4 rounded-xl border border-yellow-700/50 shadow-inner'>
            <form onSubmit={e => handleEditSubmit(e, review.id)}>
              {editError && <p className='text-red-400 mb-2 text-sm'>{editError}</p>}

              <textarea
                className='w-full bg-gray-800 border border-gray-700 rounded-lg p-3 min-h-[80px] focus:ring-2 focus:ring-yellow-500 outline-none resize-y text-sm mb-3 text-gray-200'
                placeholder='Nội dung bình luận...'
                value={editText}
                onChange={e => setEditText(e.target.value)}
                autoFocus
              />
              <div className='flex justify-end gap-2'>
                <button
                  type='button'
                  onClick={() => setEditingId(null)}
                  className='px-4 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors duration-200 cursor-pointer shadow-sm hover:shadow'
                >
                  Hủy
                </button>
                <button
                  type='submit'
                  disabled={editSubmitting}
                  className='px-4 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white font-medium rounded-lg text-sm transition-colors duration-200 disabled:opacity-50 cursor-pointer shadow-sm hover:shadow flex items-center gap-2'
                >
                  {editSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Khung nhập Phản hồi */}
        {replyingTo === review.id && (
          <div className='mt-4 bg-gray-900/60 p-4 rounded-xl border border-gray-700 shadow-inner'>
            {user ? (
              <form onSubmit={e => handleReplySubmit(e, review.id)}>
                {replyError && <p className='text-red-400 mb-2 text-sm'>{replyError}</p>}
                <textarea
                  className='w-full bg-gray-800 border border-gray-700 rounded-lg p-3 min-h-[80px] focus:ring-2 focus:ring-blue-500 outline-none resize-y text-sm mb-3 text-gray-200'
                  placeholder={`Viết phản hồi cho ${username}...`}
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  autoFocus
                />
                <div className='flex justify-end gap-2'>
                  <button
                    type='button'
                    onClick={() => setReplyingTo(null)}
                    className='px-4 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors duration-200 cursor-pointer shadow-sm hover:shadow'
                  >
                    Hủy
                  </button>
                  <button
                    type='submit'
                    disabled={replySubmitting}
                    className='px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors duration-200 disabled:opacity-50 cursor-pointer shadow-sm hover:shadow flex items-center gap-2'
                  >
                    {replySubmitting ? 'Đang gửi...' : 'Gửi'}
                  </button>
                </div>
              </form>
            ) : (
              <p className='text-sm text-gray-400'>Vui lòng đăng nhập để có thể trả lời bình luận này.</p>
            )}
          </div>
        )}

        {/* Render Replies */}
        {review.replies && review.replies.length > 0 && (
          <div className='mt-2 space-y-2'>{review.replies.map(reply => renderReview(reply, true))}</div>
        )}
      </div>
    )
  }

  return (
    <div className='bg-gray-800/30 backdrop-blur-sm rounded-xl p-6 shadow-lg mt-6'>
      <h2 className='text-2xl font-bold mb-6 border-l-4 border-blue-500 pl-4'>Bình luận phim</h2>

      {/* Form bình luận mới (Hoặc báo là đã có bài bình luận gốc) */}
      {user ? (
        hasReviewed ? (
          <div className='mb-10 bg-gray-900/50 p-6 rounded-xl text-center border border-gray-700/50'>
            <h3 className='text-lg font-semibold text-green-400 mb-2'>Bạn đã để lại bình luận cho phim này!</h3>
            <p className='text-gray-400 text-sm'>
              Bạn có thể tìm thấy bình luận của mình bên dưới để chỉnh sửa hoặc trả lời các trao đổi của người khác.
            </p>
          </div>
        ) : (
          <form onSubmit={handleReviewSubmit} className='mb-10 bg-gray-900/50 p-5 rounded-xl text-gray-200'>
            <h3 className='font-semibold mb-3'>Gửi bình luận của bạn</h3>

            {errorMsg && <p className='text-red-400 mb-3 text-sm'>{errorMsg}</p>}

            <div className='mb-4'>
              <textarea
                className='w-full bg-gray-800 border border-gray-700 rounded-xl p-4 min-h-[110px] focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 resize-y text-sm text-gray-200'
                placeholder='Bạn nghĩ gì về bộ phim này?...'
                value={reviewText}
                onChange={e => setReviewText(e.target.value)}
              />
            </div>

            <div className='flex justify-end'>
              <button
                type='submit'
                disabled={submitting}
                className='px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-blue-500/50 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2'
              >
                {submitting ? 'Đang gửi...' : 'Gửi bình luận'}
              </button>
            </div>
          </form>
        )
      ) : (
        <div className='mb-10 bg-gray-900/50 p-6 rounded-xl flex flex-col items-center justify-center'>
          <p className='text-gray-400 mb-3'>Bạn cần đăng nhập để có thể tham gia bình luận.</p>
          <button disabled className='px-6 py-2 bg-gray-600 text-white rounded-lg opacity-50 cursor-not-allowed'>
            Đăng nhập để bình luận
          </button>
        </div>
      )}

      {/* Danh sách các bình luận */}
      <div>
        <h3 className='font-semibold text-xl mb-4 text-gray-200'>Anh em nói gì về phim này? ({totalCount})</h3>
        {loading ? (
          <Loading />
        ) : reviews.length === 0 ? (
          <div className='text-center py-8 text-gray-500 bg-gray-800/20 rounded-xl border border-gray-700 border-dashed'>
            Chưa có bình luận nào cho phim này. Hãy là người đầu tiên để lại cảm nghĩ!
          </div>
        ) : (
          <div className='space-y-4'>{reviews.map(review => renderReview(review, false))}</div>
        )}
      </div>
    </div>
  )
}
