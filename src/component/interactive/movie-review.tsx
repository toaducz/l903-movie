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
  replies?: Review[]
  reply_to_username?: string
}

export default function MovieReview({ slug, name, image }: MovieReviewProps) {
  const { user } = useAuth()
  const [reviews, setReviews] = useState<Review[]>([])
  const [totalCount, setTotalCount] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  const [score, setScore] = useState<number>(10)
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
  const [editScore, setEditScore] = useState<number>(10)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editError, setEditError] = useState('')

  const fetchReviews = async () => {
    try {
      const res = await fetch(`/api/review?slug=${slug}`)
      const data = await res.json()
      if (data.data) {
        setReviews(data.data)
        setTotalCount(data.count || 0)
        // Check nếu user đã viết bài đánh giá gốc
        if (user) {
          const myReview = data.data.find((r: Review) => r.user_email === user.email && !r.parent_id)
          setHasReviewed(!!myReview)
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
      setHasReviewed(!!myReview)
    }
  }, [user, reviews])

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    if (!reviewText.trim()) {
      setErrorMsg('Vui lòng nhập nội dung đánh giá.')
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
          score,
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
          score: 0, 
          review_text: replyText,
          user_email: user.email,
          parent_id: parentId
        })
      })
      const result = await res.json()
      if (result.error) {
        setReplyError(result.error)
      } else {
        await fetchReviews()
        setReplyingTo(null)
        setReplyText('')
      }
    } catch (err) {
      console.error(err)
      setReplyError('Đã có lỗi xảy ra.')
    } finally {
      setReplySubmitting(false)
    }
  }

  const handleEditSubmit = async (e: React.FormEvent, reviewId: string, isReply: boolean) => {
    e.preventDefault()
    if (!user) return
    if (!editText.trim()) {
      setEditError('Vui lòng nhập nội dung đánh giá.')
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
          score: isReply ? undefined : editScore,
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
    
    return (
      <div key={review.id} className={`bg-gray-800/40 p-5 rounded-xl border border-gray-700 ${isReply ? 'mt-4 ml-4 lg:ml-12 border-l-4 border-l-blue-600 shadow-md' : 'shadow-sm'}`}>
        <div className='flex justify-between items-start mb-3 border-b border-gray-700/50 pb-3'>
          <div>
            {review.user_id ? (
              <Link
                href={`/profile/${review.user_id}`}
                className='font-semibold text-blue-400 mr-2 hover:underline hover:text-[var(--c-cyan)] transition-colors duration-200 cursor-pointer inline-flex items-center gap-1'
                title='Xem hồ sơ thành viên'
              >
                <span>@{username}</span>
              </Link>
            ) : (
              <span className='font-semibold text-blue-400 mr-2'>@{username}</span>
            )}
            {isReply && review.reply_to_username && (
               <span className='text-gray-400 text-sm mr-2'>
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
          {!isReply && (
            <div className='bg-gray-800 rounded-lg px-3 py-1 flex items-center gap-1 shadow-inner border border-gray-700'>
              <span className='text-yellow-500 font-bold'>★</span>
              <span className='font-semibold'>{review.score}</span>
              <span className='text-gray-500 text-xs'>/10</span>
            </div>
          )}
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
                  if (!isReply) setEditScore(review.score)
                  setEditError('')
                  setReplyingTo(null)
                }}
                className={`text-sm flex items-center gap-1 transition-colors ${editingId === review.id ? 'text-yellow-400' : 'text-gray-400 hover:text-yellow-400'}`}
              >
                Chỉnh sửa
              </button>
              <button 
                type='button'
                onClick={() => handleDelete(review.id)}
                className='text-sm flex items-center gap-1 transition-colors text-gray-400 hover:text-red-400'
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
            className={`text-sm flex items-center gap-1 transition-colors ${replyingTo === review.id ? 'text-blue-400' : 'text-gray-400 hover:text-blue-400'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} className="w-4 h-4 stroke-current">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
            </svg>
            Phản hồi
          </button>
        </div>

        {/* Khung Chỉnh sửa */}
        {editingId === review.id && (
          <div className='mt-4 bg-gray-900/60 p-4 rounded-xl border border-yellow-700/50 shadow-inner'>
            <form onSubmit={(e) => handleEditSubmit(e, review.id, isReply)}>
              {editError && <p className='text-red-400 mb-2 text-sm'>{editError}</p>}
              
              {!isReply && (
                <div className='mb-3 flex items-center gap-2'>
                  <label className='text-sm text-gray-400'>Sửa điểm:</label>
                  <div className='flex gap-1'>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                      <button
                        key={num}
                        type='button'
                        onClick={() => setEditScore(num)}
                        className={`w-6 h-6 flex items-center justify-center rounded-full text-xs transition-all cursor-pointer ${editScore === num ? 'bg-yellow-500 text-black font-bold' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <textarea
                className='w-full bg-gray-800 border border-gray-700 rounded-lg p-3 min-h-[80px] focus:ring-2 focus:ring-yellow-500 outline-none resize-y text-sm mb-3 text-gray-200'
                placeholder='Nội dung đánh giá...'
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                autoFocus
              />
              <div className='flex justify-end gap-2'>
                <button
                  type='button'
                  onClick={() => setEditingId(null)}
                  className='px-4 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors cursor-pointer shadow-sm hover:shadow'
                >
                  Hủy
                </button>
                <button
                  type='submit'
                  disabled={editSubmitting}
                  className='px-4 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white font-medium rounded-lg text-sm transition-colors disabled:opacity-50 cursor-pointer shadow-sm hover:shadow flex items-center gap-2'
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
              <form onSubmit={(e) => handleReplySubmit(e, review.id)}>
                {replyError && <p className='text-red-400 mb-2 text-sm'>{replyError}</p>}
                <textarea
                  className='w-full bg-gray-800 border border-gray-700 rounded-lg p-3 min-h-[80px] focus:ring-2 focus:ring-blue-500 outline-none resize-y text-sm mb-3 text-gray-200'
                  placeholder={`Viết phản hồi cho ${username}...`}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  autoFocus
                />
                <div className='flex justify-end gap-2'>
                  <button
                    type='button'
                    onClick={() => setReplyingTo(null)}
                    className='px-4 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors cursor-pointer shadow-sm hover:shadow'
                  >
                    Hủy
                  </button>
                  <button
                    type='submit'
                    disabled={replySubmitting}
                    className='px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors disabled:opacity-50 cursor-pointer shadow-sm hover:shadow flex items-center gap-2'
                  >
                    {replySubmitting ? 'Đang gửi...' : 'Gửi'}
                  </button>
                </div>
              </form>
            ) : (
               <p className='text-sm text-gray-400'>Vui lòng <span className="text-blue-400 cursor-pointer font-medium">đăng nhập</span> để có thể trả lời bình luận này.</p>
            )}
          </div>
        )}

        {/* Render Replies */}
        {review.replies && review.replies.length > 0 && (
          <div className='mt-2 space-y-2'>
            {review.replies.map(reply => renderReview(reply, true))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className='bg-gray-800/30 backdrop-blur-sm rounded-xl p-6 shadow-lg mt-6'>
      <h2 className='text-2xl font-bold mb-6 border-l-4 border-blue-500 pl-4'>Đánh giá phim</h2>

      {/* Form đánh giá mới (Hoặc báo là đã đánh giá) */}
      {user ? (
        hasReviewed ? (
          <div className='mb-10 bg-gray-900/50 p-6 rounded-xl text-center border border-gray-700/50'>
            <h3 className='text-lg font-semibold text-green-400 mb-2'>Bạn đã đánh giá phim này rồi!</h3>
            <p className='text-gray-400 text-sm'>
              Bạn có thể tìm thấy đánh giá của mình bên dưới để chỉnh sửa hoặc xóa nếu muốn.
            </p>
          </div>
        ) : (
          <form onSubmit={handleReviewSubmit} className='mb-10 bg-gray-900/50 p-5 rounded-xl text-gray-200'>
            <h3 className='font-semibold mb-3'>Gốc bình luận của bạn</h3>

            {errorMsg && <p className='text-red-400 mb-3 text-sm'>{errorMsg}</p>}

            <div className='mb-4 flex flex-col sm:flex-row items-baseline sm:items-center gap-4'>
              <label className='font-medium text-gray-300'>Điểm số:</label>
              <div className='flex flex-wrap gap-1'>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                  <button
                    key={num}
                    type='button'
                    onClick={() => setScore(num)}
                    title={`${num} / 10`}
                    className={`w-10 h-10 flex items-center justify-center rounded-full font-bold transition-all text-sm cursor-pointer
                      ${
                        score === num
                          ? 'bg-yellow-500 text-black scale-110 shadow-lg shadow-yellow-500/30'
                          : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                      }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
              <span className='ml-auto font-bold text-xl text-yellow-500'>{score}/10</span>
            </div>

            <div className='mb-4'>
              <textarea
                className='w-full bg-gray-800 border border-gray-700 rounded-xl p-4 min-h-[120px] focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-y'
                placeholder='Bạn nghĩ sao về bộ phim này?...'
                value={reviewText}
                onChange={e => setReviewText(e.target.value)}
              />
            </div>

            <div className='flex justify-end'>
              <button
                type='submit'
                disabled={submitting}
                className='px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-blue-500/50 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2'
              >
                {submitting ? 'Đang gửi...' : 'Gửi đánh giá'}
              </button>
            </div>
          </form>
        )
      ) : (
        <div className='mb-10 bg-gray-900/50 p-6 rounded-xl flex flex-col items-center justify-center'>
          <p className='text-gray-400 mb-3'>Bạn cần đăng nhập để có thể tham gia đánh giá.</p>
          <button disabled className='px-6 py-2 bg-gray-600 text-white rounded-lg opacity-50 cursor-not-allowed'>
            Đăng nhập để đánh giá
          </button>
        </div>
      )}

      {/* Danh sách các review */}
      <div>
        <h3 className='font-semibold text-xl mb-4 text-gray-200'>Anh em nói gì về phim này? ({totalCount})</h3>
        {loading ? (
          <Loading />
        ) : reviews.length === 0 ? (
          <div className='text-center py-8 text-gray-500 bg-gray-800/20 rounded-xl border border-gray-700 border-dashed'>
            Chưa có đánh giá nào cho phim này. Hãy là người đầu tiên!
          </div>
        ) : (
          <div className='space-y-4'>
            {reviews.map(review => renderReview(review, false))}
          </div>
        )}
      </div>
    </div>
  )
}
