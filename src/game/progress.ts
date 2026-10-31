import type { RunStats } from './types.ts'

export function xpToNext(level: number): number {
  return 80 + Math.max(1, level) * 40
}

export function applyXp(
  xp: number,
  level: number,
  amount: number,
): { xp: number; level: number; leveled: number } {
  let nextXp = Math.max(0, xp) + Math.max(0, Math.floor(amount))
  let nextLevel = Math.max(1, level)
  let leveled = 0
  while (nextLevel < 99 && nextXp >= xpToNext(nextLevel)) {
    nextXp -= xpToNext(nextLevel)
    nextLevel += 1
    leveled += 1
  }
  return { xp: nextXp, level: nextLevel, leveled }
}

export function runXp(run: RunStats): number {
  const distance = Math.floor(run.distance * 0.08)
  const orbs = run.orbs * 2
  const avoided = run.hazardsAvoided
  const near = run.nearMisses * 2
  const power = run.powerupsUsed * 4
  return Math.max(8, distance + orbs + avoided + near + power)
}
