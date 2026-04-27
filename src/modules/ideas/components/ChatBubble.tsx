'use client'

import type { MessageRole } from '@/modules/ideas/types'

interface ChatBubbleProps {
  role: MessageRole
  content: string
}

export function ChatBubble({ role, content }: ChatBubbleProps) {
  const isUser = role === 'user'

  return (
    <div
      className="mb-[14px]"
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        animation: 'bubbleIn 0.35s cubic-bezier(0.34,1.56,0.64,1)',
        fontFamily: '"IBM Plex Sans", sans-serif',
      }}
    >
      {/* Coach avatar left */}
      {!isUser && (
        <div
          className="flex-shrink-0 self-end flex items-center justify-center"
          style={{
            width: 30,
            height: 30,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #2E7D52, #1A2520)',
            border: '1.5px solid rgba(58,158,106,0.3)',
            fontSize: 13,
            marginRight: 8,
          }}
        >
          🧭
        </div>
      )}

      {/* Bubble */}
      <div style={{ maxWidth: '78%' }}>
        <div
          className="text-[14px] leading-relaxed whitespace-pre-wrap"
          style={{
            padding: isUser ? '10px 14px' : '12px 16px',
            borderRadius: isUser ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
            background: isUser
              ? 'linear-gradient(135deg, #2E7D52, #1A5C3A)'
              : '#ffffff',
            color: isUser ? '#ffffff' : '#141F19',
            fontFamily: '"IBM Plex Sans", sans-serif',
            boxShadow: isUser
              ? '0 2px 12px rgba(46,125,82,0.25)'
              : '0 1px 8px rgba(0,0,0,0.06)',
            border: isUser ? 'none' : '1px solid #EAF0EC',
            lineHeight: 1.6,
          }}
        >
          {content}
        </div>
      </div>

      {/* User avatar right */}
      {isUser && (
        <div
          className="flex-shrink-0 self-end flex items-center justify-center"
          style={{
            width: 30,
            height: 30,
            borderRadius: '50%',
            background: '#EAF0EC',
            fontSize: 13,
            marginLeft: 8,
          }}
        >
          👤
        </div>
      )}
    </div>
  )
}
