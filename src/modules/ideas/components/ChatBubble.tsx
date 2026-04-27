'use client'

import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'
import type { MessageRole } from '@/modules/ideas/types'

interface ChatBubbleProps {
  role: MessageRole
  content: string
}

export function ChatBubble({ role, content }: ChatBubbleProps) {
  const isUser = role === 'user'

  const mdComponents: Components = {
    p: ({ children, ...props }) => (
      <p {...props} className="m-0" style={{ color: 'inherit', fontSize: 'inherit', lineHeight: 'inherit' }}>
        {children}
      </p>
    ),
    strong: ({ children, ...props }) => (
      <strong {...props} style={{ color: isUser ? '#ffffff' : '#2E7D52', fontWeight: 700 }}>
        {children}
      </strong>
    ),
    ul: ({ children, ...props }) => (
      <ul {...props} className="m-0" style={{ paddingLeft: 20, marginTop: 4, marginBottom: 4 }}>
        {children}
      </ul>
    ),
    ol: ({ children, ...props }) => (
      <ol {...props} className="m-0" style={{ paddingLeft: 20, marginTop: 4, marginBottom: 4 }}>
        {children}
      </ol>
    ),
    li: ({ children, ...props }) => (
      <li {...props} style={{ marginBottom: 2, fontSize: 14, lineHeight: 1.6 }}>{children}</li>
    ),
    code: ({ children, ...props }) => (
      <code
        {...props}
        style={{
          background: isUser ? 'rgba(255,255,255,0.12)' : '#F2F7F4',
          borderRadius: 4,
          padding: '1px 5px',
          fontSize: 13,
          fontFamily: '"IBM Plex Mono", monospace',
          color: isUser ? '#e0f0e6' : '#2E7D52',
        }}
      >
        {children}
      </code>
    ),
    pre: ({ children, ...props }) => (
      <pre
        {...props}
        className="overflow-x-auto"
        style={{
          background: isUser ? 'rgba(0,0,0,0.2)' : '#F2F7F4',
          borderRadius: 8,
          padding: '10px 14px',
          fontSize: 13,
          fontFamily: '"IBM Plex Mono", monospace',
          lineHeight: 1.5,
          margin: '6px 0',
        }}
      >
        {children}
      </pre>
    ),
    em: ({ children, ...props }) => (
      <em {...props} style={{ fontStyle: 'italic', opacity: 0.85 }}>{children}</em>
    ),
  }

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
          className="text-[14px] leading-relaxed"
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
            overflowWrap: 'break-word',
            wordBreak: 'break-word',
          }}
        >
          <ReactMarkdown components={mdComponents}>
            {content}
          </ReactMarkdown>
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
