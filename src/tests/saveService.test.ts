import { beforeEach, describe, expect, it } from 'vitest'
import { SAVE_KEY, SAVE_VERSION } from '../game/config.ts'
import { canAffordSkin, defaultSave, loadSave, migrateSave, persistSave, resetSave } from '../services/saveService.ts'

describe('saveService', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns defaults for missing or corrupt data', () => {
    expect(loadSave().profile.selectedSkin).toBe('pulse')
    localStorage.setItem(SAVE_KEY, '{not-json')
    expect(loadSave().profile.bestScore).toBe(0)
    const migrated = migrateSave({ version: 0, profile: { selectedSkin: 'nope', totalEnergy: -4 } })
    expect(migrated.profile.selectedSkin).toBe('pulse')
    expect(migrated.profile.selectedMap).toBe('emerald')
    expect(migrated.profile.totalEnergy).toBe(0)
  })

  it('keeps a valid selected map and rejects unknown ones', () => {
    const data = defaultSave()
    data.profile.selectedMap = 'desert'
    expect(persistSave(data)).toBe(true)
    expect(loadSave().profile.selectedMap).toBe('desert')
    const migrated = migrateSave({ version: 1, profile: { selectedMap: 'volcano' } })
    expect(migrated.profile.selectedMap).toBe('emerald')
  })

  it('persists and resets safely', () => {
    const data = defaultSave()
    data.profile.bestScore = 900
    expect(persistSave(data)).toBe(true)
    expect(loadSave().profile.bestScore).toBe(900)
    expect(resetSave().profile.bestScore).toBe(0)
  })

  it('migrates v1 saves to progression defaults without dropping map progress', () => {
    const migrated = migrateSave({
      version: 1,
      profile: { bestScore: 50, selectedMap: 'frozen', totalEnergy: 12 },
      statistics: { orbsLifetime: 9 },
    })
    expect(migrated.version).toBe(SAVE_VERSION)
    expect(migrated.profile.level).toBe(1)
    expect(migrated.profile.xp).toBe(0)
    expect(migrated.profile.selectedMap).toBe('frozen')
    expect(migrated.profile.seenTutorial).toBe(false)
    expect(migrated.statistics.achievements.first_run.unlocked).toBe(false)
    expect(migrated.statistics.orbsLifetime).toBe(9)
  })

  it('blocks unaffordable cosmetic unlocks', () => {
    expect(canAffordSkin(0, 'pulse')).toBe(true)
    expect(canAffordSkin(100, 'volt')).toBe(false)
    expect(canAffordSkin(200, 'volt')).toBe(true)
  })
})
