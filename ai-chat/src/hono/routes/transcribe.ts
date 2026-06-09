import { Hono } from 'hono'

export const transcribeRoute = new Hono()

transcribeRoute.post('/', async (c) => {
  const whisperUrl = process.env.WHISPERX_URL ?? 'http://localhost:9000'

  const formData = await c.req.formData()
  const audioFile = formData.get('audio')

  if (!audioFile || !(audioFile instanceof File)) {
    return c.json({ error: '音声ファイルが見つかりません' }, 400)
  }

  try {
    const upstream = new FormData()
    upstream.append('audio_file', audioFile)

    const res = await fetch(`${whisperUrl}/asr?task=transcribe&language=ja&output=json`, {
      method: 'POST',
      body: upstream,
      signal: AbortSignal.timeout(30000),
    })

    if (!res.ok) {
      return c.json({ error: `WhisperX エラー: ${res.status}` }, 502)
    }

    const data = await res.json() as { text?: string }
    return c.json({ text: data.text ?? '' })
  } catch (err) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      return c.json({ error: 'WhisperX がタイムアウトしました' }, 504)
    }
    return c.json({ error: 'WhisperX に接続できません。サーバーが起動しているか確認してください' }, 503)
  }
})
