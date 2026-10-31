import type { MapId } from './maps.ts'
import type { AchievementId, AchievementRecord } from './types.ts'

export type AchievementDef = {
  id: AchievementId
  title: string
  description: string
  reward: number
}

export const ACHIEVEMENTS: Record<AchievementId, AchievementDef> = {
  first_run: {
    id: 'first_run',
    title: 'First Run',
    description: 'Complete your first escape.',
    reward: 20,
  },
  distance_1000: {
    id: 'distance_1000',
    title: 'Distance Runner',
    description: 'Reach 1,000 metres in a single run.',
    reward: 40,
  },
  distance_5000: {
    id: 'distance_5000',
    title: 'Long Distance',
    description: 'Reach 5,000 metres in a single run.',
    reward: 80,
  },
  energy_100: {
    id: 'energy_100',
    title: 'Energy Collector',
    description: 'Collect 100 energy coins across all runs.',
    reward: 30,
  },
  energy_1000: {
    id: 'energy_1000',
    title: 'Coin Master',
    description: 'Collect 1,000 energy coins across all runs.',
    reward: 90,
  },
  survivor_50: {
    id: 'survivor_50',
    title: 'Survivor',
    description: 'Avoid 50 obstacles across all runs.',
    reward: 40,
  },
  map_explorer: {
    id: 'map_explorer',
    title: 'Map Explorer',
    description: 'Play all three worlds.',
    reward: 50,
  },
  mission_master: {
    id: 'mission_master',
    title: 'Mission Master',
    description: 'Complete 10 missions.',
    reward: 70,
  },
  personal_best: {
    id: 'personal_best',
    title: 'Personal Best',
    description: 'Beat your previous distance record.',
    reward: 25,
  },
}

export const ACHIEVEMENT_ORDER = Object.keys(ACHIEVEMENTS) as AchievementId[]

export function emptyAchievements(): Record<AchievementId, AchievementRecord> {
  const records = {} as Record<AchievementId, AchievementRecord>
  for (const id of ACHIEVEMENT_ORDER) {
    records[id] = { unlocked: false, claimed: false }
  }
  return records
}

export type AchievementContext = {
  totalRuns: number
  bestDistance: number
  orbsLifetime: number
  hazardsAvoidedLifetime: number
  mapsPlayed: MapId[]
  missionsCompleted: number
  isBestDistance: boolean
  previousBestDistance: number
}

function meets(id: AchievementId, ctx: AchievementContext): boolean {
  switch (id) {
    case 'first_run':
      return ctx.totalRuns >= 1
    case 'distance_1000':
      return ctx.bestDistance >= 1000
    case 'distance_5000':
      return ctx.bestDistance >= 5000
    case 'energy_100':
      return ctx.orbsLifetime >= 100
    case 'energy_1000':
      return ctx.orbsLifetime >= 1000
    case 'survivor_50':
      return ctx.hazardsAvoidedLifetime >= 50
    case 'map_explorer':
      return ctx.mapsPlayed.includes('emerald') && ctx.mapsPlayed.includes('desert') && ctx.mapsPlayed.includes('frozen')
    case 'mission_master':
      return ctx.missionsCompleted >= 10
    case 'personal_best':
      return ctx.isBestDistance && ctx.previousBestDistance > 0
    default:
      return false
  }
}

export function applyAchievements(
  current: Record<AchievementId, AchievementRecord>,
  ctx: AchievementContext,
): { next: Record<AchievementId, AchievementRecord>; unlocked: AchievementId[]; reward: number } {
  const next = { ...current }
  const unlocked: AchievementId[] = []
  let reward = 0

  for (const id of ACHIEVEMENT_ORDER) {
    const prev = current[id] ?? { unlocked: false, claimed: false }
    if (prev.unlocked) {
      next[id] = prev
      continue
    }
    if (!meets(id, ctx)) {
      next[id] = prev
      continue
    }
    next[id] = { unlocked: true, claimed: true }
    unlocked.push(id)
    reward += ACHIEVEMENTS[id].reward
  }

  return { next, unlocked, reward }
}
