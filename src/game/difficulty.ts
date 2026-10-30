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
  const density = 0.34 + 0.5 * t
  const movingChance = 0.04 + 0.28 * t
  const dualSliceChance = 0.08 + 0.32 * t
  const reaction = 0.78 - 0.18 * t
  const minSpacing = Math.max(13, speed * reaction)
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
