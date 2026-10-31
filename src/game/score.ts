import { SCORE } from './config.ts'
import { clamp } from '../utils/math.ts'

export function distanceScore(distanceDelta: number, multiplier: number): number {
  return distanceDelta * SCORE.distancePerMetre * multiplier
}

export function orbScore(multiplier: number): number {
  return SCORE.orb * multiplier
}

export function powerupScore(multiplier: number): number {
  return SCORE.powerup * multiplier
}

export function missionBonus(count: number): number {
  return count * SCORE.missionBonus
}

export function nearMissScore(multiplier: number): number {
  return SCORE.nearMiss * multiplier
}

export function milestoneScore(multiplier: number): number {
  return SCORE.milestone * multiplier
}

export function applyMultiplier(value: number, multiplier: number): number {
  return value * clamp(multiplier, 1, 8)
}
