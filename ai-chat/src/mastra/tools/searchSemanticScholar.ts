import { createTool } from '@mastra/core/tools'
import { z } from 'zod'

const SS_URL = 'https://api.semanticscholar.org/graph/v1/paper/search'

interface SSPaper {
  paperId: string
  title: string
  abstract?: string
  year?: number
  citationCount?: number
  authors?: Array<{ name: string }>
  externalIds?: { DOI?: string; PubMed?: string }
  openAccessPdf?: { url: string }
}

interface SSResponse {
  data: SSPaper[]
  total: number
}

export const searchSemanticScholarTool = createTool({
  id: 'searchSemanticScholar',
  description: 'Semantic Scholar で医学論文を検索し、タイトル・要旨・引用数・オープンアクセスURLを返す。最新の研究動向や被引用数の多い重要論文の確認に使う。',
  inputSchema: z.object({
    query: z.string().describe('検索クエリ（英語。例: stroke thrombolysis outcomes meta-analysis）'),
    maxResults: z.number().min(1).max(10).default(5).describe('取得件数（デフォルト5）'),
  }),
  execute: async (inputData) => {
    const { query, maxResults } = inputData

    const params = new URLSearchParams({
      query,
      limit: String(maxResults),
      fields: 'title,abstract,year,authors,citationCount,externalIds,openAccessPdf',
    })

    const res = await fetch(`${SS_URL}?${params}`, {
      headers: { 'User-Agent': 'MedicalAIAssistant/1.0' },
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) throw new Error(`Semantic Scholar error: ${res.status}`)

    const data = await res.json() as SSResponse
    const papers = data.data ?? []

    if (papers.length === 0) {
      return { query, papers: [], message: `「${query}」に関する論文が見つかりませんでした` }
    }

    const results = papers.map((p) => ({
      title: p.title,
      year: p.year,
      firstAuthor: p.authors?.[0]?.name ?? '不明',
      citationCount: p.citationCount ?? 0,
      abstract: p.abstract ? p.abstract.slice(0, 300) + (p.abstract.length > 300 ? '…' : '') : null,
      pubmedId: p.externalIds?.PubMed ?? null,
      doi: p.externalIds?.DOI ?? null,
      openAccessUrl: p.openAccessPdf?.url ?? null,
      url: p.paperId ? `https://www.semanticscholar.org/paper/${p.paperId}` : null,
    }))

    return {
      query,
      total: data.total,
      papers: results,
      message: `Semantic Scholar で ${results.length} 件の論文が見つかりました（総件数: ${data.total}）`,
    }
  },
})
