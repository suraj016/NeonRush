import { describe, expect, it } from 'vitest'
import { nextLocalZ } from '../game/envShared.ts'

describe('env scroll', () => {
  it('only rewinds a local z when that instance crosses the camera limit', () => {
    expect(nextLocalZ(-20, 10, 200, 28)).toBe(-20)
    expect(nextLocalZ(20, 10, 200, 28)).toBe(-180)
  })
})
