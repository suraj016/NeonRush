import { describe, expect, it } from 'vitest'
import { applyMissionProgress, emptyMissions } from '../game/missions.ts'

describe('missions', () => {
  it('completes a run mission only once and grants a reward', () => {
    const first = applyMissionProgress(
      emptyMissions(),
      { score: 100, distance: 1200, energy: 12, duration: 20, orbs: 8, powerupsUsed: 0 },
      8,
    )
    expect(first.completed).toContain('distance_1000')
    expect(first.reward).toBeGreaterThan(0)
    const second = applyMissionProgress(
      first.next,
      { score: 100, distance: 1500, energy: 12, duration: 20, orbs: 8, powerupsUsed: 0 },
      16,
    )
    expect(second.completed).not.toContain('distance_1000')
    expect(second.next.distance_1000.claimed).toBe(true)
  })

  it('tracks lifetime orb progress from real totals', () => {
    const result = applyMissionProgress(
      emptyMissions(),
      { score: 10, distance: 20, energy: 5, duration: 4, orbs: 5, powerupsUsed: 0 },
      100,
    )
    expect(result.completed).toContain('collect_100_total')
    expect(result.next.collect_100_total.progress).toBe(100)
  })
})
