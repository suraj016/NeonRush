import { describe, expect, it } from 'vitest'
import { makeAlpineCliff, makeAlpineRidge, makePineTree } from '../game/frozenGeo.ts'

describe('frozenGeo', () => {
  it('builds displaced alpine cliffs with snow/rock colours', () => {
    const cliff = makeAlpineCliff(9, 1)
    expect(cliff.attributes.position.count).toBeGreaterThan(200)
    expect(cliff.attributes.color).toBeTruthy()
    cliff.dispose()
  })

  it('builds ridged mountains and layered pines', () => {
    const ridge = makeAlpineRidge(4, 1, 30, 16)
    const pine = makePineTree(3, 0)
    expect(ridge.attributes.position.count).toBeGreaterThan(40)
    expect(pine.attributes.position.count).toBeGreaterThan(40)
    expect(pine.attributes.color).toBeTruthy()
    ridge.dispose()
    pine.dispose()
  })
})
