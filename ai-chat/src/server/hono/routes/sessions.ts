import { Hono } from 'hono'
import { prisma } from '@/lib/db'

export const sessionsRoute = new Hono()

sessionsRoute.get('/:sessionId', async (c) => {
  const sessionId = c.req.param('sessionId')

  const conversation = await prisma.conversation.findUnique({
    where: { sessionId },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  })

  if (!conversation) {
    return c.json({ error: 'セッションが見つかりません' }, 404)
  }

  return c.json(conversation)
})

sessionsRoute.get('/', async (c) => {
  const limit = Number(c.req.query('limit') ?? 20)

  const conversations = await prisma.conversation.findMany({
    orderBy: { updatedAt: 'desc' },
    take: Math.min(limit, 100),
    select: {
      id: true,
      sessionId: true,
      specialty: true,
      createdAt: true,
      updatedAt: true,
      messages: { orderBy: { createdAt: 'desc' }, take: 1, select: { content: true, role: true } },
    },
  })

  return c.json(conversations)
})
