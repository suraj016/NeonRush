import { describe, expect, it } from 'vitest'
import { readSwipe, swipeThreshold } from '../game/input.ts'

describe('touch swipe', () => {
  it('ignores tiny movement so taps do not change lanes', () => {
    expect(readSwipe(8, 2, 16)).toBeNull()
    expect(readSwipe(0, -10, 16)).toBeNull()
  })

  it('reads a lane change as soon as the swipe crosses the threshold', () => {
    expect(readSwipe(-24, 4, 16)).toBe('left')
    expect(readSwipe(30, -6, 16)).toBe('right')
  })

  it('reads jump and slide from vertical swipes', () => {
    expect(readSwipe(2, -28, 16)).toBe('jump')
    expect(readSwipe(-3, 32, 16)).toBe('slide')
  })

  it('keeps a reachable threshold on phones', () => {
    expect(swipeThreshold(390, 844)).toBeGreaterThanOrEqual(16)
    expect(swipeThreshold(390, 844)).toBeLessThan(24)
  })
})
