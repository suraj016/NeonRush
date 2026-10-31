import { SPEED, TIER_NAMES } from './config.ts'
import { clamp, easeInOut } from '../utils/math.ts'

export type DifficultyState = {
  speed: number
  density: number
  movingChance: number
  dualSliceChance: number
  minSpacing: number
  tier: string
  tierIndex: number
}

export function evaluateDifficulty(distance: number): DifficultyState {
  const t = easeInOut(clamp(distance / SPEED.rampDistance, 0, 1))
  const speed = SPEED.start + (SPEED.max - SPEED.start) * t
  const density = 0.3 + 0.52 * t
  const movingChance = t < 0.16 ? 0 : 0.05 + 0.26 * t
  const dualSliceChance = 0.02 + 0.36 * t
  const reaction = 0.86 - 0.2 * t
  const minSpacing = Math.max(14, speed * reaction)
  const tierIndex = distance < 400 ? 0 : distance < 1100 ? 1 : distance < 2000 ? 2 : 3
  return {
    speed,
    density,
    movingChance,
    dualSliceChance,
    minSpacing,
    tier: TIER_NAMES[tierIndex],
    tierIndex,
  }
}

export function themeIndexForDistance(distance: number): number {
  if (distance >= 1800) return 2
  if (distance >= 800) return 1
  return 0
}
