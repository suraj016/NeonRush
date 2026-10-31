import { describe, expect, it } from 'vitest'
import { applyXp, runXp, xpToNext } from '../game/progress.ts'
import type { RunStats } from '../game/types.ts'

function run(partial: Partial<RunStats> = {}): RunStats {
  return {
    score: 0,
    distance: 0,
    energy: 0,
    duration: 0,
    orbs: 0,
    powerupsUsed: 0,
    hazardsAvoided: 0,
    laneChanges: 0,
    nearMisses: 0,
    mapId: 'emerald',
    ...partial,
  }
}

describe('progress', () => {
  it('levels up without leftover XP going missing', () => {
    const needed = xpToNext(1)
    const result = applyXp(needed - 10, 1, 40)
    expect(result.level).toBe(2)
    expect(result.xp).toBe(30)
    expect(result.leveled).toBe(1)
  })

  it('awards a minimum of XP for any completed run', () => {
    expect(runXp(run())).toBe(8)
    expect(runXp(run({ distance: 500, orbs: 10, hazardsAvoided: 5 }))).toBeGreaterThan(8)
  })
})
