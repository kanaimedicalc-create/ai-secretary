import { createTool } from '@mastra/core/tools'
import { z } from 'zod'

const ESEARCH_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi'
const ESUMMARY_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi'

interface ESearchResult {
  esearchresult: { idlist: string[] }
}

interface ESummaryResult {
  result: Record<string, {
    uid: string
    title: string
    sortfirstauthor: string
    pubdate: string
    source: string
    fulljournalname: string
  }>
}

export const searchPubMedTool = createTool({
  id: 'searchPubMed',
  description: 'PubMed で医学文献を検索し、タイトル・著者・雑誌名・発行年を返す。治療根拠・ガイドラインの確認に使う。',
  inputSchema: z.object({
    query: z.string().describe('検索クエリ（英語推奨。例: hypertension treatment guidelines 2023）'),
    maxResults: z.number().min(1).max(10).default(5).describe('取得件数（デフォルト5）'),
  }),
  execute: async (inputData) => {
    const { query, maxResults } = inputData

    const searchParams = new URLSearchParams({
      db: 'pubmed',
      term: query,
      retmax: String(maxResults),
      retmode: 'json',
      sort: 'relevance',
    })

    const searchRes = await fetch(`${ESEARCH_URL}?${searchParams}`, {
      signal: AbortSignal.timeout(10000),
    })
    if (!searchRes.ok) throw new Error(`PubMed search error: ${searchRes.status}`)

    const searchData = await searchRes.json() as ESearchResult
    const ids = searchData.esearchresult?.idlist ?? []

    if (ids.length === 0) {
      return { query, articles: [], message: `「${query}」に関する文献が見つかりませんでした` }
    }

    const summaryParams = new URLSearchParams({
      db: 'pubmed',
      id: ids.join(','),
      retmode: 'json',
    })

    const summaryRes = await fetch(`${ESUMMARY_URL}?${summaryParams}`, {
      signal: AbortSignal.timeout(10000),
    })
    if (!summaryRes.ok) throw new Error(`PubMed summary error: ${summaryRes.status}`)

    const summaryData = await summaryRes.json() as ESummaryResult
    const result = summaryData.result ?? {}

    const articles = ids
      .map((id) => {
        const a = result[id]
        if (!a) return null
        return {
          pmid: id,
          title: a.title,
          firstAuthor: a.sortfirstauthor,
          journal: a.fulljournalname || a.source,
          pubDate: a.pubdate,
          url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
        }
      })
      .filter(Boolean)

    return {
      query,
      articles,
      message: `PubMed で ${articles.length} 件の文献が見つかりました`,
    }
  },
})
