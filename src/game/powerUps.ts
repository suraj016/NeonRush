import type { PowerUpType } from './types.ts'
import type { RNG } from '../utils/rng.ts'

export type PowerUpDef = {
  id: PowerUpType
  name: string
  description: string
  duration: number
  weight: number
  fxLabel: string
  hudLabel: string
}

export const POWERUP_DEFS: Record<PowerUpType, PowerUpDef> = {
  shield: {
    id: 'shield',
    name: 'Energy Shield',
    description: 'Absorbs one collision. Expires after 10 seconds if unused.',
    duration: 10,
    weight: 1,
    fxLabel: 'SHLD',
    hudLabel: 'Shield',
  },
  magnet: {
    id: 'magnet',
    name: 'Energy Magnet',
    description: 'Pulls nearby energy coins toward you for 8 seconds.',
    duration: 8,
    weight: 1.1,
    fxLabel: 'MAG',
    hudLabel: 'Magnet',
  },
  multiplier: {
    id: 'multiplier',
    name: 'Score Multiplier',
    description: 'Doubles eligible score gains for 10 seconds.',
    duration: 10,
    weight: 0.9,
    fxLabel: 'x2',
    hudLabel: 'Score x2',
  },
  turbo: {
    id: 'turbo',
    name: 'Turbo Boost',
    description: 'Automatic speed surge for 5 seconds.',
    duration: 5,
    weight: 0.75,
    fxLabel: 'TURBO',
    hudLabel: 'Turbo',
  },
}

export const POWERUP_ORDER = Object.keys(POWERUP_DEFS) as PowerUpType[]

export function powerUpDuration(type: PowerUpType): number {
  return POWERUP_DEFS[type].duration
}

export function powerUpFxLabel(type: PowerUpType): string {
  return POWERUP_DEFS[type].fxLabel
}

export function rollPowerUp(rng: RNG): PowerUpType {
  const total = POWERUP_ORDER.reduce((sum, id) => sum + POWERUP_DEFS[id].weight, 0)
  let roll = rng.next() * total
  for (const id of POWERUP_ORDER) {
    roll -= POWERUP_DEFS[id].weight
    if (roll <= 0) return id
  }
  return 'shield'
}
