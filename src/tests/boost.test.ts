import { describe, expect, it } from 'vitest'
import { BOOST } from '../game/config.ts'
import { combinedSpeedMultiplier, rechargeBoost, tickBoostEnergy } from '../game/boost.ts'

describe('boost', () => {
  it('uses the higher of manual and turbo multipliers without stacking them', () => {
    expect(combinedSpeedMultiplier(1, false)).toBe(BOOST.maxMultiplier)
    expect(combinedSpeedMultiplier(0, true)).toBe(BOOST.turboMultiplier)
    expect(combinedSpeedMultiplier(1, true)).toBe(BOOST.turboMultiplier)
    expect(combinedSpeedMultiplier(1, true)).toBeLessThanOrEqual(BOOST.maxCombinedMultiplier)
  })

  it('drains charge while boosting and clamps at zero', () => {
    const next = tickBoostEnergy({ charge: 100, blend: 0 }, 1, true)
    expect(next.charge).toBeLessThan(100)
    expect(next.blend).toBeGreaterThan(0)
    const empty = tickBoostEnergy({ charge: 1, blend: 1 }, 2, true)
    expect(empty.charge).toBe(0)
  })

  it('recharges from orb pickups without exceeding max', () => {
    expect(rechargeBoost(90, BOOST.orbRecharge)).toBe(100)
    expect(rechargeBoost(100, BOOST.orbRecharge)).toBe(100)
  })
})
