import { describe, expect, it } from 'vitest'
import { distanceScore, missionBonus, orbScore, powerupScore } from '../game/score.ts'

describe('score', () => {
  it('applies distance and multiplier', () => {
    expect(distanceScore(10, 1)).toBe(20)
    expect(distanceScore(10, 2)).toBe(40)
  })

  it('rewards orbs and power-ups', () => {
    expect(orbScore(1)).toBe(10)
    expect(orbScore(2)).toBe(20)
    expect(powerupScore(2)).toBe(50)
  })

  it('adds mission bonuses without inventing extra completions', () => {
    expect(missionBonus(0)).toBe(0)
    expect(missionBonus(2)).toBe(400)
  })
})
