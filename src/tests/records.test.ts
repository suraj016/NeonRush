import { describe, expect, it } from 'vitest'
import { applyRunRecords, emptyMapRecords, mapStars } from '../game/records.ts'
import { nextOpenGoal } from '../game/recap.ts'
import { emptyMissions } from '../game/missions.ts'
import type { RunStats } from '../game/types.ts'

function run(partial: Partial<RunStats> = {}): RunStats {
  return {
    score: 1200,
    distance: 800,
    energy: 10,
    duration: 20,
    orbs: 8,
    powerupsUsed: 1,
    hazardsAvoided: 4,
    laneChanges: 6,
    nearMisses: 2,
    mapId: 'desert',
    maxCombo: 18,
    boostTime: 3,
    ...partial,
  }
}

describe('records', () => {
  it('tracks per-map personal bests and hall rank', () => {
    const first = applyRunRecords(emptyMapRecords(), [], run(), '2026-11-02')
    expect(first.isMapBestDistance).toBe(true)
    expect(first.records.desert.bestDistance).toBe(800)
    expect(first.hallRank).toBe(1)
    const second = applyRunRecords(first.records, first.history, run({ score: 400, distance: 200, maxCombo: 4 }), '2026-11-02')
    expect(second.isMapBestDistance).toBe(false)
    expect(second.hallRank).toBe(2)
  })

  it('awards map stars at distance marks', () => {
    expect(mapStars(100)).toBe(0)
    expect(mapStars(600)).toBe(1)
    expect(mapStars(1600)).toBe(2)
    expect(mapStars(3200)).toBe(3)
  })
})

describe('recap', () => {
  it('points at the closest unfinished mission', () => {
    const missions = emptyMissions()
    missions.distance_1000 = { progress: 800, completed: false, claimed: false }
    const goal = nextOpenGoal(missions)
    expect(goal?.title).toBe('Kilometre Break')
    expect(goal?.progress).toBe(800)
  })
})
