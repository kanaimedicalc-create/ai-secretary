import { naikaAgent } from './agents/naika'
import { shinkeiAgent } from './agents/shinkei'
import { shonikaAgent } from './agents/shonika'
import type { Specialty } from '@/types/chat'

const agents = {
  naika: naikaAgent,
  shinkei: shinkeiAgent,
  shonika: shonikaAgent,
} as const

export function getAgent(specialty: Specialty): (typeof agents)[Specialty] {
  return agents[specialty]
}
