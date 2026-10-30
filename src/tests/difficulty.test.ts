import { describe, expect, it } from 'vitest'
import { evaluateDifficulty, themeIndexForDistance } from '../game/difficulty.ts'
import { SPEED } from '../game/config.ts'

describe('difficulty', () => {
  it('increases speed toward a capped maximum', () => {
    const early = evaluateDifficulty(0)
    const late = evaluateDifficulty(5000)
    expect(late.speed).toBeGreaterThan(early.speed)
    expect(late.speed).toBeLessThanOrEqual(SPEED.max)
    expect(early.speed).toBe(SPEED.start)
  })

  it('selects environment themes by distance', () => {
    expect(themeIndexForDistance(10)).toBe(0)
    expect(themeIndexForDistance(900)).toBe(1)
    expect(themeIndexForDistance(2000)).toBe(2)
  })
})
