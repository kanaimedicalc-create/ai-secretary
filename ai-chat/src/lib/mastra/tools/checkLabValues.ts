import { createTool } from '@mastra/core/tools'
import { z } from 'zod'

const LAB_RANGES: Record<string, { min: number; max: number; unit: string }> = {
  wbc: { min: 3.3, max: 8.6, unit: '×10³/μL' },
  rbc: { min: 3.8, max: 5.8, unit: '×10⁶/μL' },
  hgb: { min: 11.5, max: 17.0, unit: 'g/dL' },
  hct: { min: 34, max: 50, unit: '%' },
  plt: { min: 130, max: 400, unit: '×10³/μL' },
  alb: { min: 3.8, max: 5.3, unit: 'g/dL' },
  alt: { min: 4, max: 45, unit: 'U/L' },
  ast: { min: 10, max: 40, unit: 'U/L' },
  cr: { min: 0.46, max: 1.04, unit: 'mg/dL' },
  bun: { min: 8, max: 20, unit: 'mg/dL' },
  glu: { min: 70, max: 109, unit: 'mg/dL' },
  hba1c: { min: 4.6, max: 6.2, unit: '%' },
  na: { min: 135, max: 147, unit: 'mEq/L' },
  k: { min: 3.5, max: 5.0, unit: 'mEq/L' },
  cl: { min: 98, max: 108, unit: 'mEq/L' },
}

export const checkLabValuesTool = createTool({
  id: 'checkLabValues',
  description: '検査値の正常範囲を確認し、異常の有無を返す',
  inputSchema: z.object({
    name: z.string().describe('検査項目名（例: wbc, hgb, cr）'),
    value: z.number().describe('検査値'),
  }),
  execute: async (inputData) => {
    const { name, value } = inputData
    const key = name.toLowerCase()
    const range = LAB_RANGES[key]

    if (!range) {
      return {
        name,
        value,
        unit: '不明',
        status: 'unknown' as const,
        message: `${name} の正常値データが見つかりません`,
      }
    }

    const status: 'low' | 'high' | 'normal' =
      value < range.min ? 'low' : value > range.max ? 'high' : 'normal'

    const statusLabel =
      status === 'normal' ? '正常' : status === 'low' ? '低値' : '高値'

    return {
      name,
      value,
      unit: range.unit,
      min: range.min,
      max: range.max,
      status,
      message: `${name.toUpperCase()}: ${value} ${range.unit} — ${statusLabel}（基準値: ${range.min}〜${range.max}）`,
    }
  },
})
