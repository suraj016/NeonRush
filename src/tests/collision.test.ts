import { describe, expect, it } from 'vitest'
import { isFatalHit, obstacleAABB, playerAABB } from '../game/collision.ts'
import { collectOverlap } from '../game/collision.ts'

describe('collision', () => {
  it('lets a jumping player clear a low barrier', () => {
    const player = playerAABB(0, 1.7, false)
    const hazard = obstacleAABB('low', 0, 0)
    expect(isFatalHit('low', player, hazard)).toBe(false)
  })

  it('lets a sliding player pass under an overhead gate', () => {
    const player = playerAABB(0, 0, true)
    const hazard = obstacleAABB('overhead', 0, 0)
    expect(isFatalHit('overhead', player, hazard)).toBe(false)
  })

  it('kills a standing player on a solid barrier', () => {
    const player = playerAABB(0, 0, false)
    const hazard = obstacleAABB('barrier', 0, 0)
    expect(isFatalHit('barrier', player, hazard)).toBe(true)
  })

  it('kills a grounded player over a gap and allows a jump', () => {
    const grounded = playerAABB(0, 0, false)
    const airborne = playerAABB(0, 1.6, false)
    const gap = obstacleAABB('gap', 0, 0)
    expect(isFatalHit('gap', grounded, gap)).toBe(true)
    expect(isFatalHit('gap', airborne, gap)).toBe(false)
  })

  it('detects orb collection once via overlap', () => {
    const player = playerAABB(0, 0, false)
    const orb = { minX: -0.2, maxX: 0.2, minY: 0.4, maxY: 1.2, minZ: -0.2, maxZ: 0.2 }
    expect(collectOverlap(player, orb)).toBe(true)
    const missed = { ...orb, minX: 3, maxX: 4 }
    expect(collectOverlap(player, missed)).toBe(false)
  })
})
