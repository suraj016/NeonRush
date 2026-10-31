import { describe, expect, it } from 'vitest'
import { makeCliffGeo, makeCactusGeo, makeRidgeGeo, makeRockGeo } from '../game/desertGeo.ts'

describe('desertGeo', () => {
  it('builds displaced cliffs instead of a single box', () => {
    const cliff = makeCliffGeo(11, 1)
    expect(cliff.attributes.position.count).toBeGreaterThan(200)
    expect(cliff.attributes.color).toBeTruthy()
    cliff.dispose()
  })

  it('builds irregular ridges and rocks', () => {
    const ridge = makeRidgeGeo(3, 1, 28, 15)
    const rock = makeRockGeo(4, 1)
    const cactus = makeCactusGeo(2)
    expect(ridge.attributes.position.count).toBeGreaterThan(40)
    expect(rock.attributes.position.count).toBeGreaterThan(12)
    expect(cactus.attributes.position.count).toBeGreaterThan(20)
    ridge.dispose()
    rock.dispose()
    cactus.dispose()
  })
})
