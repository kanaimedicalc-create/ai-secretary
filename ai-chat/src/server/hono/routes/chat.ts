import { Hono } from 'hono'
import { streamText } from 'hono/streaming'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { getAgent } from '@/lib/mastra'
import { prisma } from '@/lib/db'
import type { Specialty } from '@/types/chat'

const chatSchema = z.object({
  message: z.string().min(1),
  specialty: z.enum(['naika', 'shinkei', 'shonika']),
  sessionId: z.string().min(1),
})

export const chatRoute = new Hono()

chatRoute.post('/', zValidator('json', chatSchema), async (c) => {
  const { message, specialty, sessionId } = c.req.valid('json')

  let conversation = await prisma.conversation.findUnique({
    where: { sessionId },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  })

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: { sessionId, specialty },
      include: { messages: true },
    })
  }

  await prisma.message.create({
    data: { conversationId: conversation.id, role: 'user', content: message },
  })

  const agent = getAgent(specialty as Specialty)

  const history = conversation.messages.map((m) => ({
    id: m.id,
    role: m.role as 'user' | 'assistant',
    content: m.content,
    createdAt: m.createdAt,
  }))

  const allMessages = [
    ...history,
    { id: `req-${Date.now()}`, role: 'user' as const, content: message, createdAt: new Date() },
  ]

  return streamText(c, async (stream) => {
    let fullContent = ''

    try {
      const result = await agent.stream(allMessages)
      const reader = result.textStream.getReader()

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          fullContent += value
          await stream.write(value)
        }
      } finally {
        reader.releaseLock()
      }

      await prisma.message.create({
        data: { conversationId: conversation!.id, role: 'assistant', content: fullContent },
      })

      await prisma.conversation.update({
        where: { id: conversation!.id },
        data: { updatedAt: new Date() },
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[chat] stream error:', msg)
      await stream.write(`\n⚠️ エラー: ${msg}`)
    }
  })
})

chatRoute.delete('/:sessionId', async (c) => {
  const sessionId = c.req.param('sessionId')

  const conversation = await prisma.conversation.findUnique({ where: { sessionId } })
  if (!conversation) {
    return c.json({ error: '会話が見つかりません' }, 404)
  }

  await prisma.conversation.delete({ where: { id: conversation.id } })

  return c.json({ success: true })
})
