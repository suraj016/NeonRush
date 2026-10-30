import { beforeEach, describe, expect, it } from 'vitest'
import { SAVE_KEY } from '../game/config.ts'
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
    expect(migrated.profile.totalEnergy).toBe(0)
  })

  it('persists and resets safely', () => {
    const data = defaultSave()
    data.profile.bestScore = 900
    expect(persistSave(data)).toBe(true)
    expect(loadSave().profile.bestScore).toBe(900)
    expect(resetSave().profile.bestScore).toBe(0)
  })

  it('blocks unaffordable cosmetic unlocks', () => {
    expect(canAffordSkin(0, 'pulse')).toBe(true)
    expect(canAffordSkin(100, 'volt')).toBe(false)
    expect(canAffordSkin(200, 'volt')).toBe(true)
  })
})
