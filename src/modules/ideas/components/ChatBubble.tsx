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
      className="flex items-start gap-3 mb-3"
      style={{
        flexDirection: isUser ? 'row-reverse' : 'row',
        animation: 'bubbleIn 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {/* Avatar (solo coach) */}
      {!isUser && (
        <div
          className="flex-shrink-0 flex items-center justify-center"
          style={{
            width: 30,
            height: 30,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #2E7D52, #1A2520)',
            border: '1.5px solid rgba(58,158,106,0.2)',
            fontSize: 14,
          }}
        >
          🧭
        </div>
      )}

      {/* Bubble */}
      <div
        className="inline-block max-w-[85%] text-[14px] leading-relaxed whitespace-pre-wrap"
        style={{
          background: isUser
            ? 'linear-gradient(135deg, #2E7D52, #1A5C3A)'
            : '#ffffff',
          color: isUser ? '#ffffff' : '#141F19',
          borderRadius: isUser
            ? '18px 18px 4px 18px'
            : '4px 18px 18px 18px',
          padding: '12px 16px',
          border: isUser ? 'none' : '1.5px solid #EAF0EC',
          lineHeight: 1.55,
          fontFamily: 'var(--font-sans)',
        }}
      >
        {content}
      </div>
    </div>
  )
}
