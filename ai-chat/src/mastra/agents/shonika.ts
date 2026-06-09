import { Agent } from '@mastra/core/agent'
import { readFileSync } from 'fs'
import { join } from 'path'
import { checkLabValuesTool } from '../tools/checkLabValues'
import { lookupDrugTool } from '../tools/lookupDrug'
import { searchPubMedTool } from '../tools/searchPubMed'
import { searchSemanticScholarTool } from '../tools/searchSemanticScholar'
import { gensparkSearchTool, gensparkCrawlerTool } from '../tools/searchGenspark'

const basePrompt = readFileSync(join(process.cwd(), 'prompts/base.txt'), 'utf-8')
const specialtyPrompt = readFileSync(join(process.cwd(), 'prompts/shonika.txt'), 'utf-8')

export const shonikaAgent = new Agent({
  id: 'shonika-agent',
  name: '小児科アシスタント',
  instructions: `${basePrompt}\n\n${specialtyPrompt}`,
  model: 'anthropic/claude-sonnet-4-6',
  tools: {
    checkLabValues: checkLabValuesTool,
    lookupDrug: lookupDrugTool,
    searchPubMed: searchPubMedTool,
    searchSemanticScholar: searchSemanticScholarTool,
    gensparkSearch: gensparkSearchTool,
    gensparkCrawler: gensparkCrawlerTool,
  },
})
