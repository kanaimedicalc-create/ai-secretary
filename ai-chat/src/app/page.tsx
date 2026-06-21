'use client'

import { useState, useCallback, useEffect } from 'react'
import { ChatWindow } from '@/components/ChatWindow'
import { InputBar } from '@/components/InputBar'
import { SpecialtySelector } from '@/components/SpecialtySelector'
import { SPECIALTY_LABELS, type Message, type Specialty } from '@/types/chat'

function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function getSessionId(specialty: Specialty): string {
  const key = `ai-chat-session-${specialty}`
  let id = localStorage.getItem(key)
  if (!id) {
    id = generateSessionId()
    localStorage.setItem(key, id)
  }
  return id
}

export default function ChatPage() {
  const [specialty, setSpecialty] = useState<Specialty>('naika')
  const [messages, setMessages] = useState<Message[]>([])
  const [streamingContent, setStreamingContent] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)

  // ページロード時にサーバーから会話履歴を復元
  useEffect(() => {
    const sessionId = localStorage.getItem(`ai-chat-session-${specialty}`)
    if (!sessionId) return

    fetch(`/api/sessions/${sessionId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { messages?: Array<{ id: string; role: string; content: string; createdAt: string }> } | null) => {
        if (data?.messages && data.messages.length > 0) {
          setMessages(
            data.messages.map((m) => ({
              id: m.id,
              role: m.role as 'user' | 'assistant',
              content: m.content,
              createdAt: m.createdAt,
            }))
          )
        }
      })
      .catch(() => { /* ネットワーク障害時はサイレントに無視 */ })
  }, [specialty])

  const handleSpecialtyChange = useCallback((next: Specialty) => {
    if (next === specialty) return
    const confirmed =
      messages.length === 0 ||
      confirm(
        `専門科を「${SPECIALTY_LABELS[next]}」に変更します。\n現在の会話をリセットしますか？\n（サーバーの履歴は保持されます）`
      )
    if (!confirmed) return
    setSpecialty(next)
    setMessages([])
    setStreamingContent('')
  }, [specialty, messages.length])

  const handleSend = useCallback(async (text: string) => {
    if (isStreaming) return

    const sessionId = getSessionId(specialty)
    const userMessage: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMessage])
    setIsStreaming(true)
    setStreamingContent('')

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, specialty, sessionId }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(err.error ?? `エラー: ${res.status}`)
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error('ストリームを取得できませんでした')

      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        accumulated += chunk
        setStreamingContent(accumulated)
      }

      const assistantMessage: Message = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: accumulated,
        createdAt: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, assistantMessage])
      setStreamingContent('')
    } catch (err) {
      const msg = err instanceof Error ? err.message : '不明なエラーが発生しました'
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: 'assistant',
          content: `⚠️ ${msg}`,
          createdAt: new Date().toISOString(),
        },
      ])
      setStreamingContent('')
    } finally {
      setIsStreaming(false)
    }
  }, [isStreaming, specialty])

  const handleClear = async () => {
    if (!confirm('この専門科の会話履歴をすべて削除しますか？')) return
    const sessionId = getSessionId(specialty)
    await fetch(`/api/chat/${sessionId}`, { method: 'DELETE' })
    localStorage.removeItem(`ai-chat-session-${specialty}`)
    setMessages([])
    setStreamingContent('')
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h1 className="text-base font-semibold text-gray-800">医療AIアシスタント</h1>
          </div>
          <button
            onClick={handleClear}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors"
          >
            履歴をクリア
          </button>
        </div>
        <div className="max-w-4xl mx-auto mt-3">
          <SpecialtySelector value={specialty} onChange={handleSpecialtyChange} disabled={isStreaming} />
        </div>
      </header>

      <div className="flex-1 overflow-hidden flex flex-col max-w-4xl w-full mx-auto">
        <ChatWindow messages={messages} streamingContent={streamingContent} />
        <InputBar onSend={handleSend} disabled={isStreaming} />
      </div>
    </div>
  )
}
