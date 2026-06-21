'use client'

import { useEffect, useRef } from 'react'
import { MessageBubble } from './MessageBubble'
import type { Message } from '@/types/chat'

interface Props {
  messages: Message[]
  streamingContent?: string
}

export function ChatWindow({ messages, streamingContent }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      {messages.length === 0 && !streamingContent && (
        <div className="flex flex-col items-center justify-center h-full text-gray-400">
          <p className="text-lg mb-2">医療AIアシスタント</p>
          <p className="text-sm">症状・検査値・治療方針について質問してください</p>
          <p className="text-xs mt-4 text-gray-300">患者の個人情報（氏名・生年月日等）は入力しないでください</p>
        </div>
      )}
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
      {streamingContent && (
        <div className="flex justify-start mb-4">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold mr-2 flex-shrink-0 mt-1">
            AI
          </div>
          <div className="max-w-[75%] rounded-2xl rounded-bl-sm px-4 py-3 text-sm leading-relaxed bg-white text-gray-800 border border-gray-200 shadow-sm whitespace-pre-wrap">
            {streamingContent}
            <span className="inline-block w-1 h-4 bg-blue-500 ml-0.5 animate-pulse" />
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  )
}
