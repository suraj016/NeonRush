import { MISSIONS } from './config.ts'
import type { MissionId, MissionRecord } from './types.ts'

export type NextGoal = {
  title: string
  progress: number
  target: number
}

export function nextOpenGoal(missions: Record<MissionId, MissionRecord>): NextGoal | null {
  let best: NextGoal | null = null
  let bestRatio = -1
  for (const id of Object.keys(MISSIONS) as MissionId[]) {
    const rec = missions[id]
    const def = MISSIONS[id]
    if (!rec || rec.completed) continue
    const ratio = def.target <= 0 ? 0 : rec.progress / def.target
    if (ratio > bestRatio) {
      bestRatio = ratio
      best = { title: def.title, progress: rec.progress, target: def.target }
    }
  }
  return best
}
