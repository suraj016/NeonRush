import { describe, expect, it } from 'vitest'
import { POWERUP_DEFS, powerUpDuration, rollPowerUp } from '../game/powerUps.ts'
import { RNG } from '../utils/rng.ts'

describe('powerUps', () => {
  it('defines four modular power-ups with durations', () => {
    expect(powerUpDuration('shield')).toBe(10)
    expect(powerUpDuration('magnet')).toBe(8)
    expect(powerUpDuration('multiplier')).toBe(10)
    expect(powerUpDuration('turbo')).toBe(5)
    expect(Object.keys(POWERUP_DEFS).length).toBe(4)
  })

  it('rolls weighted power-ups deterministically from seed', () => {
    const rng = new RNG(42)
    const first = rollPowerUp(rng)
    const second = rollPowerUp(new RNG(42))
    expect(first).toBe(second)
  })
})
