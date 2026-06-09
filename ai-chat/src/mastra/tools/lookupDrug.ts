import { createTool } from '@mastra/core/tools'
import { z } from 'zod'

const DRUG_DB: Record<string, { category: string; commonDose: string; contraindications: string[]; sideEffects: string[] }> = {
  アムロジピン: {
    category: 'Ca拮抗薬（降圧薬）',
    commonDose: '2.5〜5mg/日（最大10mg）',
    contraindications: ['重症大動脈弁狭窄症'],
    sideEffects: ['浮腫', '頭痛', '顔面紅潮', '動悸'],
  },
  メトホルミン: {
    category: 'ビグアナイド系（糖尿病薬）',
    commonDose: '500〜750mg/日（最大2250mg）',
    contraindications: ['腎機能障害（eGFR<30）', '造影剤使用前後', '重篤な肝障害'],
    sideEffects: ['消化器症状', '乳酸アシドーシス（稀）'],
  },
  アセトアミノフェン: {
    category: '解熱鎮痛薬',
    commonDose: '成人: 1回300〜1000mg、1日最大4000mg',
    contraindications: ['重篤な肝障害'],
    sideEffects: ['肝障害（過量投与）', '皮疹'],
  },
  アモキシシリン: {
    category: 'ペニシリン系抗菌薬',
    commonDose: '250〜500mg/回、1日3回',
    contraindications: ['ペニシリンアレルギー'],
    sideEffects: ['下痢', '皮疹', 'アナフィラキシー'],
  },
}

export const lookupDrugTool = createTool({
  id: 'lookupDrug',
  description: '薬剤名から用量・禁忌・副作用を返す',
  inputSchema: z.object({
    drugName: z.string().describe('薬剤名（日本語）'),
  }),
  execute: async (inputData) => {
    const { drugName } = inputData
    const info = DRUG_DB[drugName]

    if (!info) {
      return {
        drugName,
        found: false,
        message: `${drugName} の情報が見つかりません。添付文書を直接確認してください。`,
      }
    }

    return {
      drugName,
      found: true,
      ...info,
      message: `【${drugName}】${info.category} / 常用量: ${info.commonDose}`,
    }
  },
})
