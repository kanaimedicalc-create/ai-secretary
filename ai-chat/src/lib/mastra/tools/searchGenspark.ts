import { createTool } from '@mastra/core/tools'
import { z } from 'zod'

const BASE_URL = 'https://www.genspark.ai/api/tool'

async function callGenspark(toolName: string, params: Record<string, unknown>) {
  const apiKey = process.env.GENSPARK_API_KEY
  if (!apiKey) throw new Error('GENSPARK_API_KEY が設定されていません')

  const res = await fetch(`${BASE_URL}/${toolName}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
    signal: AbortSignal.timeout(15000),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Genspark API error ${res.status}: ${body.slice(0, 200)}`)
  }

  return res.json()
}

// Web検索ツール
export const gensparkSearchTool = createTool({
  id: 'gensparkSearch',
  description: 'Genspark で最新の医療情報・ガイドライン・ニュースを Web 検索する。PubMed にない最新情報や日本語の医療情報の検索に使う。',
  inputSchema: z.object({
    query: z.string().describe('検索クエリ（日本語・英語どちらでも可）'),
  }),
  execute: async (inputData) => {
    const data = await callGenspark('web_search', { q: inputData.query }) as {
      results?: Array<{ title: string; url: string; snippet: string }>
    }

    const results = (data.results ?? []).slice(0, 5).map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.snippet,
    }))

    return {
      query: inputData.query,
      results,
      message: `Genspark で ${results.length} 件の検索結果が見つかりました`,
    }
  },
})

// ページクロールツール
export const gensparkCrawlerTool = createTool({
  id: 'gensparkCrawler',
  description: 'URL を指定して医療ガイドライン・学会サイト・医療論文ページの本文を取得する。URLが分かっている場合に使う。',
  inputSchema: z.object({
    url: z.string().url().describe('取得するページの URL'),
  }),
  execute: async (inputData) => {
    const data = await callGenspark('crawler', { url: inputData.url }) as {
      content?: string
      title?: string
    }

    const content = data.content ?? ''
    return {
      url: inputData.url,
      title: data.title ?? '',
      content: content.slice(0, 2000) + (content.length > 2000 ? '\n…（以下省略）' : ''),
      message: `ページを取得しました（${content.length} 文字）`,
    }
  },
})
