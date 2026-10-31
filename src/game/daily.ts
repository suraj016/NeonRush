import type { Profile, RunStats } from './types.ts'

export type DailyStat = 'distance' | 'orbs' | 'duration' | 'hazardsAvoided'

export type DailyDef = {
  id: string
  title: string
  description: string
  stat: DailyStat
  target: number
  reward: number
  xp: number
}

export const DAILY_POOL: DailyDef[] = [
  {
    id: 'distance',
    title: "Today's Distance",
    description: 'Run 800 metres in a single escape.',
    stat: 'distance',
    target: 800,
    reward: 40,
    xp: 40,
  },
  {
    id: 'coins',
    title: "Today's Harvest",
    description: 'Collect 40 energy coins in one run.',
    stat: 'orbs',
    target: 40,
    reward: 35,
    xp: 35,
  },
  {
    id: 'survive',
    title: "Today's Survival",
    description: 'Stay online for 45 seconds.',
    stat: 'duration',
    target: 45,
    reward: 35,
    xp: 35,
  },
  {
    id: 'avoid',
    title: "Today's Dodge",
    description: 'Avoid 25 obstacles in one run.',
    stat: 'hazardsAvoided',
    target: 25,
    reward: 40,
    xp: 40,
  },
]

export function localDateKey(now = new Date()): string {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function hashDate(date: string): number {
  let hash = 2166136261
  for (let i = 0; i < date.length; i += 1) {
    hash = Math.imul(hash ^ date.charCodeAt(i), 16777619)
  }
  return hash >>> 0
}

export function dailyForDate(date: string): DailyDef {
  return DAILY_POOL[hashDate(date) % DAILY_POOL.length]
}

export function yesterdayKey(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  const stamp = new Date(year, month - 1, day)
  stamp.setDate(stamp.getDate() - 1)
  return localDateKey(stamp)
}

export function updateStreak(
  lastPlayDate: string,
  streak: number,
  today: string,
): { streak: number; lastPlayDate: string; incremented: boolean } {
  const safe = Math.max(0, streak)
  if (lastPlayDate === today) {
    return { streak: Math.max(1, safe), lastPlayDate, incremented: false }
  }
  if (lastPlayDate === yesterdayKey(today)) {
    return { streak: Math.max(1, safe) + 1, lastPlayDate: today, incremented: true }
  }
  if (!lastPlayDate) {
    return { streak: 1, lastPlayDate: today, incremented: true }
  }
  return { streak: Math.max(1, safe), lastPlayDate: today, incremented: false }
}

export function dailyStat(def: DailyDef, run: RunStats): number {
  switch (def.stat) {
    case 'distance':
      return run.distance
    case 'orbs':
      return run.orbs
    case 'duration':
      return run.duration
    case 'hazardsAvoided':
      return run.hazardsAvoided
    default:
      return 0
  }
}

export function streakReward(streak: number, incremented: boolean): number {
  if (!incremented) return 0
  if (streak > 0 && streak % 3 === 0) return 25
  return 8
}

export function syncDaily(profile: Profile, today: string): Profile {
  if (profile.dailyDate === today) return profile
  return {
    ...profile,
    dailyDate: today,
    dailyProgress: 0,
    dailyClaimed: false,
  }
}
