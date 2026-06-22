export type Specialty = 'naika' | 'shinkei' | 'shonika'

export const SPECIALTY_LABELS: Record<Specialty, string> = {
  naika: '内科',
  shinkei: '神経内科',
  shonika: '小児科',
}

export interface ImageAttachment {
  data: string    // base64 string (without data URL prefix)
  mimeType: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  images?: ImageAttachment[]
  createdAt: string
}

export interface Conversation {
  id: string
  sessionId: string
  specialty: Specialty
  messages: Message[]
  createdAt: string
  updatedAt: string
}

export interface ChatRequest {
  message: string
  specialty: Specialty
  sessionId: string
  images?: ImageAttachment[]
}

export interface TranscribeRequest {
  audio: Blob
}

export interface TranscribeResponse {
  text: string
}
