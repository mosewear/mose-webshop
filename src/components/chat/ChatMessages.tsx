'use client'

import { useEffect, useRef } from 'react'
import { Message } from './ChatWindow'

interface ChatMessagesProps {
  messages: Message[]
}

export default function ChatMessages({ messages }: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div data-chat-scroll className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 overscroll-contain">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-[85%] md:max-w-[75%] px-4 py-3 border-2 border-black shadow-sm ${
              message.role === 'user'
                ? 'bg-white text-black ml-auto rounded-2xl rounded-br-md'
                : 'bg-brand-primary text-white rounded-2xl rounded-bl-md'
            }`}
          >
            {message.isTyping ? (
              <div className="flex gap-1 py-1">
                <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            ) : (
              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                {message.content}
              </p>
            )}
            <p className={`text-[11px] mt-1 ${message.role === 'user' ? 'text-gray-600' : 'text-white/80'}`}>
              {message.timestamp.toLocaleTimeString('nl-NL', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </div>
      ))}

      <div ref={messagesEndRef} />
    </div>
  )
}

