import { Agent } from '@mastra/core/agent'
import { naikaAgent } from './agents/naika'
import { shinkeiAgent } from './agents/shinkei'
import { shonikaAgent } from './agents/shonika'
import type { Specialty } from '@/types/chat'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const agents: Record<Specialty, Agent<any, any>> = {
  naika: naikaAgent,
  shinkei: shinkeiAgent,
  shonika: shonikaAgent,
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getAgent(specialty: Specialty): Agent<any, any> {
  return agents[specialty]
}
