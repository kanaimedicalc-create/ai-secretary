'use client'

import { useState, useRef } from 'react'

interface Props {
  onSend: (text: string) => void
  disabled?: boolean
}

export function InputBar({ onSend, disabled }: Props) {
  const [text, setText] = useState('')
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const handleSend = () => {
    const trimmed = text.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setText('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      alert(
        'このブラウザ・接続ではマイクを使用できません。\n\n' +
        'HTTPS または localhost からアクセスしてください。\n' +
        'Chrome の場合は chrome://flags/#unsafely-treat-insecure-origin-as-secure で許可できます。'
      )
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        await transcribe(blob)
      }

      recorder.start()
      mediaRecorderRef.current = recorder
      setRecording(true)
    } catch {
      alert('マイクへのアクセスが拒否されました。ブラウザの設定でマイクを許可してください。')
    }
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    mediaRecorderRef.current = null
    setRecording(false)
    setTranscribing(true)
  }

  const transcribe = async (blob: Blob) => {
    try {
      const form = new FormData()
      form.append('audio', blob, 'recording.webm')

      const res = await fetch('/api/transcribe', { method: 'POST', body: form })
      const data = await res.json() as { text?: string; error?: string }

      if (!res.ok) {
        alert(data.error ?? '文字起こしに失敗しました')
        return
      }

      if (data.text) setText((prev) => prev + data.text)
    } finally {
      setTranscribing(false)
    }
  }

  return (
    <div className="border-t border-gray-200 bg-white px-4 py-3">
      <div className="flex items-end gap-2 max-w-4xl mx-auto">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || recording || transcribing}
          placeholder={
            transcribing
              ? '文字起こし中...'
              : recording
              ? '録音中... もう一度押すと停止'
              : '症状や検査値を入力（Shift+Enterで改行）'
          }
          rows={1}
          className="flex-1 resize-none rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent disabled:bg-gray-50 min-h-[44px] max-h-36"
          style={{ height: 'auto' }}
          onInput={(e) => {
            const el = e.currentTarget
            el.style.height = 'auto'
            el.style.height = `${Math.min(el.scrollHeight, 144)}px`
          }}
        />

        {/* マイクボタン */}
        <button
          onClick={recording ? stopRecording : startRecording}
          disabled={disabled || transcribing}
          className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors flex-shrink-0 ${
            recording
              ? 'bg-red-500 text-white animate-pulse'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          title={recording ? '録音停止' : '音声入力'}
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M7 4a3 3 0 016 0v6a3 3 0 11-6 0V4z" />
            <path d="M5.5 9.643a.75.75 0 00-1.5 0V10c0 3.06 2.29 5.585 5.25 5.954V17.5h-1.5a.75.75 0 000 1.5h4.5a.75.75 0 000-1.5H10.75v-1.546A6.001 6.001 0 0016 10v-.357a.75.75 0 00-1.5 0V10a4.5 4.5 0 01-9 0v-.357z" />
          </svg>
        </button>

        {/* 送信ボタン */}
        <button
          onClick={handleSend}
          disabled={!text.trim() || disabled || recording || transcribing}
          className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
          title="送信"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>
    </div>
  )
}
