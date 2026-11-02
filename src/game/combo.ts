import { SCORE } from './config.ts'

export const COMBO = {
  max: 99,
  decayDelay: 2.4,
  decayPerSecond: 10,
  laneCooldown: 0.32,
  orb: 1,
  near: 2,
  avoid: 1,
  lane: 1,
  power: 3,
  milestone: 4,
} as const

export const COMBO_TIERS = [
  { min: 0, id: 'flow', rank: 'FLOW', color: 0x00cfff },
  { min: 10, id: 'rush', rank: 'RUSH', color: 0x00f5a0 },
  { min: 25, id: 'overclock', rank: 'OVERCLOCK', color: 0xa6ff4d },
  { min: 50, id: 'neon', rank: 'NEON', color: 0xffd166 },
  { min: 80, id: 'godspeed', rank: 'GODSPEED', color: 0xff6ad5 },
] as const

export type ComboState = {
  value: number
  max: number
  idle: number
  laneCool: number
}

export function emptyCombo(): ComboState {
  return { value: 0, max: 0, idle: 0, laneCool: 0 }
}

export function comboTierIndex(value: number): number {
  let index = 0
  for (let i = 0; i < COMBO_TIERS.length; i += 1) {
    if (value >= COMBO_TIERS[i].min) index = i
  }
  return index
}

export function comboRank(value: number): string {
  return COMBO_TIERS[comboTierIndex(value)].rank
}

export function comboColor(value: number): number {
  return COMBO_TIERS[comboTierIndex(value)].color
}

export function comboFxLabel(value: number): string {
  const rank = comboRank(value)
  if (rank === 'OVERCLOCK') return 'OVER'
  if (rank === 'GODSPEED') return 'GOD'
  return rank
}

export function hitCombo(
  state: ComboState,
  amount: number,
): { state: ComboState; bonus: number; tierUp: boolean } {
  const before = comboTierIndex(state.value)
  const value = Math.min(COMBO.max, Math.max(0, state.value + amount))
  const after = comboTierIndex(value)
  const tierUp = after > before
  const bonus = SCORE.comboHit * Math.min(25, Math.floor(value)) + (tierUp ? SCORE.comboTier : 0)
  return {
    state: {
      value,
      max: Math.max(state.max, value),
      idle: 0,
      laneCool: state.laneCool,
    },
    bonus,
    tierUp,
  }
}

export function tickCombo(state: ComboState, dt: number): ComboState {
  let { value, idle, laneCool, max } = state
  idle += dt
  laneCool = Math.max(0, laneCool - dt)
  if (value > 0 && idle > COMBO.decayDelay) {
    value = Math.max(0, value - COMBO.decayPerSecond * dt)
  }
  return { value, max, idle, laneCool }
}
