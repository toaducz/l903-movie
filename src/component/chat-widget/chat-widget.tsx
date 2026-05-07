'use client'

import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

// Import động Deep Chat, tắt chế độ SSR
const DeepChat = dynamic(() => import('deep-chat-react').then(mod => mod.DeepChat), { ssr: false })

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [hidden, setHidden] = useState(false)
  const pathname = usePathname()

  if (pathname == '/login' || pathname == '/home') return null

  // Đã ẩn thì không render gì hết
  if (hidden) return null

  // Hàm xử lý logic khi user gõ tin nhắn và bấm gửi
  //   const handleChatRequest = async (body: any, signals: any) => {
  //     const userMessage = body.messages[0].text
  //     signals.onResponse({ text: 'Đang xử lý...', overwrite: true })
  //     try {
  //       await new Promise(resolve => setTimeout(resolve, 1500))
  //       signals.onResponse({
  //         text: `Tôi đã nhận được yêu cầu: "${userMessage}". API của bạn sẽ gắn vào đây!`,
  //         overwrite: true
  //       })
  //     } catch (error) {
  //       signals.onResponse({ error: 'Có lỗi xảy ra khi gọi API!' })
  //     }
  //   }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end'
      }}
    >
      {/* Khung chat */}
      {isOpen && (
        <div
          style={{
            marginBottom: '12px',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,.5)'
          }}
        >
          <DeepChat
            demo={true}
            style={{ width: '350px', height: '500px', borderRadius: '12px' }}
            messageStyles={{
              default: {
                user: { bubble: { backgroundColor: '#2563eb', color: 'white' } },
                ai: { bubble: { backgroundColor: '#f3f4f6', color: 'black' } }
              }
            }}
            // request={{ handler: handleChatRequest }}
            textInput={{ placeholder: { text: 'Hỏi phim gì đi...' } }}
            // initialMessages={[{ role: 'ai', text: 'Chào bạn! Mình là AI Agent tìm phim. Mình có thể giúp gì?' }]}
          />
        </div>
      )}

      {/* Hàng nút: [Chat AI] [Ẩn] */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
            height: '38px',
            padding: '0 20px',
            background: isOpen ? 'rgba(30,30,50,.95)' : 'var(--c-yel, #ffd23c)',
            color: isOpen ? 'rgba(255,255,255,.75)' : '#1a1a2e',
            border: isOpen ? '1px solid rgba(255,255,255,.15)' : 'none',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(0,0,0,.35)',
            transition: 'background .2s, color .2s',
            letterSpacing: '.02em',
            whiteSpace: 'nowrap'
          }}
        >
          {isOpen ? 'Đóng' : 'Chat AI'}
        </button>

        {/* Nút ẩn widget — thiết kế tinh tế dạng nút close nhỏ */}
        {!isOpen && (
          <button
            onClick={() => setHidden(true)}
            title='Ẩn Chat AI'
            style={{
              width: '26px',
              height: '26px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(30,30,50,.6)',
              color: 'rgba(255,255,255,.4)',
              border: '1px solid rgba(255,255,255,.08)',
              borderRadius: '50%',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all .2s ease',
              padding: 0
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = 'rgba(255,255,255,.9)'
              e.currentTarget.style.background = 'rgba(50,50,70,.8)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,.2)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = 'rgba(255,255,255,.4)'
              e.currentTarget.style.background = 'rgba(30,30,50,.6)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,.08)'
            }}
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}
