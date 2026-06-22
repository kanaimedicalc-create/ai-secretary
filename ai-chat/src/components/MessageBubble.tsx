import type { Message } from '@/types/chat'

interface Props {
  message: Message
}

export function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold mr-2 flex-shrink-0 mt-1">
          AI
        </div>
      )}
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'bg-blue-600 text-white rounded-br-sm'
            : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm shadow-sm'
        }`}
      >
        {message.images && message.images.length > 0 && (
          <div className="flex gap-2 mb-2 flex-wrap">
            {message.images.map((img, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={`data:${img.mimeType};base64,${img.data}`}
                alt={`添付画像 ${i + 1}`}
                className="max-w-[200px] max-h-[200px] object-contain rounded-lg"
              />
            ))}
          </div>
        )}
        {message.content}
        {!isUser && (
          <p className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-100">
            ※ AIによるアシストです。最終判断は必ず担当医師が行ってください。
          </p>
        )}
      </div>
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-bold ml-2 flex-shrink-0 mt-1">
          医師
        </div>
      )}
    </div>
  )
}
