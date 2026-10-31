import { describe, expect, it } from 'vitest'
import { applyMissionProgress, emptyMissions } from '../game/missions.ts'
import type { RunStats } from '../game/types.ts'

function run(partial: Partial<RunStats> = {}): RunStats {
  return {
    score: 100,
    distance: 20,
    energy: 5,
    duration: 4,
    orbs: 5,
    powerupsUsed: 0,
    hazardsAvoided: 0,
    laneChanges: 0,
    nearMisses: 0,
    mapId: 'emerald',
    ...partial,
  }
}

describe('missions', () => {
  it('completes a run mission only once and grants a reward', () => {
    const first = applyMissionProgress(emptyMissions(), run({ distance: 1200, energy: 12, duration: 20, orbs: 8 }), 8)
    expect(first.completed).toContain('distance_1000')
    expect(first.reward).toBeGreaterThan(0)
    const second = applyMissionProgress(first.next, run({ distance: 1500, energy: 12, duration: 20, orbs: 8 }), 16)
    expect(second.completed).not.toContain('distance_1000')
    expect(second.next.distance_1000.claimed).toBe(true)
  })

  it('tracks lifetime orb progress from real totals', () => {
    const result = applyMissionProgress(emptyMissions(), run(), 100)
    expect(result.completed).toContain('collect_100_total')
    expect(result.next.collect_100_total.progress).toBe(100)
  })

  it('only counts world missions on the matching map', () => {
    const desert = applyMissionProgress(emptyMissions(), run({ distance: 1200, mapId: 'desert' }), 8)
    expect(desert.completed).toContain('desert_1000')
    expect(desert.completed).not.toContain('emerald_orbs_30')
    const emerald = applyMissionProgress(emptyMissions(), run({ orbs: 30, mapId: 'emerald' }), 30)
    expect(emerald.completed).toContain('emerald_orbs_30')
  })
})
