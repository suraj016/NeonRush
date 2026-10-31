import { describe, expect, it } from 'vitest'
import { isMapId, MAP_ORDER, MAPS } from '../game/maps.ts'

describe('maps', () => {
  it('lists three distinct playable worlds', () => {
    expect(MAP_ORDER).toEqual(['emerald', 'desert', 'frozen'])
    expect(MAPS.emerald.name).toBe('Cyber Emerald')
    expect(MAPS.desert.name).toBe('Desert Frontier')
    expect(MAPS.frozen.name).toBe('Frozen Wilds')
  })

  it('accepts only known map ids', () => {
    expect(isMapId('emerald')).toBe(true)
    expect(isMapId('desert')).toBe(true)
    expect(isMapId('frozen')).toBe(true)
    expect(isMapId('neon')).toBe(false)
    expect(isMapId(null)).toBe(false)
  })
})
