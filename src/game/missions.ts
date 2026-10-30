import { MISSIONS } from './config.ts'
import type { MissionId, MissionRecord, RunStats } from './types.ts'

export function emptyMissions(): Record<MissionId, MissionRecord> {
  const records = {} as Record<MissionId, MissionRecord>
  for (const id of Object.keys(MISSIONS) as MissionId[]) {
    records[id] = { progress: 0, completed: false, claimed: false }
  }
  return records
}

export function runStatValue(
  missionId: MissionId,
  run: RunStats,
  lifetimeOrbs: number,
): number {
  const def = MISSIONS[missionId]
  switch (def.stat) {
    case 'orbs':
      return run.orbs
    case 'duration':
      return run.duration
    case 'distance':
      return run.distance
    case 'powerups':
      return run.powerupsUsed
    case 'score':
      return run.score
    case 'orbsLifetime':
      return lifetimeOrbs
    default:
      return 0
  }
}

export function applyMissionProgress(
  current: Record<MissionId, MissionRecord>,
  run: RunStats,
  lifetimeOrbs: number,
): { next: Record<MissionId, MissionRecord>; completed: MissionId[]; reward: number } {
  const next = { ...current }
  const completed: MissionId[] = []
  let reward = 0

  for (const id of Object.keys(MISSIONS) as MissionId[]) {
    const def = MISSIONS[id]
    const prev = current[id] ?? { progress: 0, completed: false, claimed: false }
    const value = runStatValue(id, run, lifetimeOrbs)
    const progress = def.scope === 'lifetime' ? value : Math.max(prev.progress, value)
    const justCompleted = !prev.completed && progress >= def.target
    next[id] = {
      progress: prev.completed ? Math.max(prev.progress, progress) : progress,
      completed: prev.completed || progress >= def.target,
      claimed: prev.claimed || justCompleted,
    }
    if (justCompleted) {
      completed.push(id)
      reward += def.reward
    }
  }

  return { next, completed, reward }
}
