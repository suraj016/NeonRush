import { describe, expect, it } from 'vitest'
import { RNG } from '../utils/rng.ts'

describe('RNG', () => {
  it('is deterministic for the same seed', () => {
    const a = new RNG(42)
    const b = new RNG(42)
    const seqA = [a.next(), a.next(), a.range(1, 5), a.int(0, 3)]
    const seqB = [b.next(), b.next(), b.range(1, 5), b.int(0, 3)]
    expect(seqA).toEqual(seqB)
  })

  it('stays within requested ranges', () => {
    const rng = new RNG(7)
    for (let i = 0; i < 40; i += 1) {
      const value = rng.range(2, 4)
      expect(value).toBeGreaterThanOrEqual(2)
      expect(value).toBeLessThan(4)
      const integer = rng.int(1, 3)
      expect(integer).toBeGreaterThanOrEqual(1)
      expect(integer).toBeLessThanOrEqual(3)
    }
  })
})
