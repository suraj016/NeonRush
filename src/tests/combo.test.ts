import { describe, expect, it } from 'vitest'
import { SCORE } from '../game/config.ts'
import { COMBO, comboRank, emptyCombo, hitCombo, tickCombo } from '../game/combo.ts'

describe('combo', () => {
  it('ranks style tiers without skipping labels', () => {
    expect(comboRank(0)).toBe('FLOW')
    expect(comboRank(10)).toBe('RUSH')
    expect(comboRank(25)).toBe('OVERCLOCK')
    expect(comboRank(50)).toBe('NEON')
    expect(comboRank(80)).toBe('GODSPEED')
  })

  it('adds additive combo points and a one-time tier bonus', () => {
    const first = hitCombo(emptyCombo(), 10)
    expect(first.state.value).toBe(10)
    expect(first.tierUp).toBe(true)
    expect(first.bonus).toBe(SCORE.comboHit * 10 + SCORE.comboTier)
    const next = hitCombo(first.state, 1)
    expect(next.tierUp).toBe(false)
    expect(next.bonus).toBe(SCORE.comboHit * 11)
  })

  it('decays after idle but keeps the run peak', () => {
    const charged = hitCombo(emptyCombo(), 20).state
    const idle = tickCombo(charged, COMBO.decayDelay + 1)
    expect(idle.value).toBeLessThan(charged.value)
    expect(idle.max).toBe(20)
  })
})
