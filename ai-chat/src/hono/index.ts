import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { chatRoute } from './routes/chat'
import { transcribeRoute } from './routes/transcribe'

const app = new Hono().basePath('/api')

app.use(logger())

app.route('/chat', chatRoute)
app.route('/transcribe', transcribeRoute)

app.get('/health', (c) => c.json({ status: 'ok' }))

export { app }
