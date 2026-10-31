import { describe, expect, it } from 'vitest'
import { dailyForDate, streakReward, syncDaily, updateStreak } from '../game/daily.ts'
import { defaultProfile } from '../services/saveService.ts'

describe('daily', () => {
  it('returns the same challenge for the same local date', () => {
    expect(dailyForDate('2026-10-31').id).toBe(dailyForDate('2026-10-31').id)
    expect(dailyForDate('2026-10-31').target).toBeGreaterThan(0)
  })

  it('increments streak on consecutive days and keeps it after a gap', () => {
    const next = updateStreak('2026-10-30', 4, '2026-10-31')
    expect(next.streak).toBe(5)
    expect(next.incremented).toBe(true)
    const gap = updateStreak('2026-10-28', 5, '2026-10-31')
    expect(gap.streak).toBe(5)
    expect(gap.incremented).toBe(false)
    expect(streakReward(6, true)).toBe(25)
    expect(streakReward(5, true)).toBe(8)
  })

  it('resets daily progress when the calendar day changes', () => {
    const profile = syncDaily({ ...defaultProfile(), dailyDate: '2026-10-30', dailyProgress: 40, dailyClaimed: true }, '2026-10-31')
    expect(profile.dailyProgress).toBe(0)
    expect(profile.dailyClaimed).toBe(false)
    expect(profile.dailyDate).toBe('2026-10-31')
  })
})
