import { describe, expect, it } from 'vitest'
import { applyAchievements, emptyAchievements } from '../game/achievements.ts'

describe('achievements', () => {
  it('unlocks first run once and does not repeat the reward', () => {
    const first = applyAchievements(emptyAchievements(), {
      totalRuns: 1,
      bestDistance: 120,
      orbsLifetime: 4,
      hazardsAvoidedLifetime: 2,
      mapsPlayed: ['emerald'],
      missionsCompleted: 0,
      isBestDistance: true,
      previousBestDistance: 0,
    })
    expect(first.unlocked).toContain('first_run')
    expect(first.unlocked).not.toContain('personal_best')
    expect(first.reward).toBeGreaterThan(0)
    const second = applyAchievements(first.next, {
      totalRuns: 2,
      bestDistance: 120,
      orbsLifetime: 8,
      hazardsAvoidedLifetime: 4,
      mapsPlayed: ['emerald'],
      missionsCompleted: 0,
      isBestDistance: false,
      previousBestDistance: 120,
    })
    expect(second.unlocked).toEqual([])
    expect(second.reward).toBe(0)
  })

  it('unlocks map explorer only after all three worlds', () => {
    const result = applyAchievements(emptyAchievements(), {
      totalRuns: 3,
      bestDistance: 400,
      orbsLifetime: 20,
      hazardsAvoidedLifetime: 10,
      mapsPlayed: ['emerald', 'desert', 'frozen'],
      missionsCompleted: 2,
      isBestDistance: false,
      previousBestDistance: 400,
    })
    expect(result.unlocked).toContain('map_explorer')
  })
})
