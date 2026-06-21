import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { chatRoute } from './routes/chat'
import { sessionsRoute } from './routes/sessions'
import { transcribeRoute } from './routes/transcribe'

export const app = new Hono().basePath('/api')

app.use(logger())

app.get('/health', (c) => c.json({ status: 'ok' }))
app.route('/chat', chatRoute)
app.route('/sessions', sessionsRoute)
app.route('/transcribe', transcribeRoute)
