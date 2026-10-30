import { PLAYER } from './config.ts'
import type { AABB, ObstacleType } from './types.ts'
import { makeBox, overlap, writeBox } from '../utils/math.ts'

export function playerAABB(x: number, y: number, sliding: boolean): AABB {
  const height = sliding ? PLAYER.slideHeight : PLAYER.height
  return makeBox(x, y, 0, PLAYER.halfWidth, height, PLAYER.halfDepth)
}

export function writePlayerAABB(out: AABB, x: number, y: number, sliding: boolean): AABB {
  const height = sliding ? PLAYER.slideHeight : PLAYER.height
  return writeBox(out, x, y, 0, PLAYER.halfWidth, height, PLAYER.halfDepth)
}

export function writeObstacleAABB(
  out: AABB,
  type: ObstacleType,
  x: number,
  z: number,
  extra?: { width?: number; length?: number },
): AABB {
  const width = extra?.width ?? 0.95
  const length = extra?.length ?? 0.55

  switch (type) {
    case 'low':
      return writeBox(out, x, 0, z, width, 0.82, length)
    case 'overhead':
      return writeBox(out, x, 0.92, z, width, 1.55, length)
    case 'gap':
      return writeBox(out, x, -1.4, z, width, 1.85, extra?.length ?? 2.4)
    case 'spinner':
      return writeBox(out, x, 0.35, z, 0.7, 1.05, 0.7)
    case 'barrier':
    case 'moving':
    default:
      return writeBox(out, x, 0, z, width, 1.7, length)
  }
}

export function obstacleAABB(
  type: ObstacleType,
  x: number,
  z: number,
  extra?: { width?: number; length?: number },
): AABB {
  return writeObstacleAABB({ minX: 0, maxX: 0, minY: 0, maxY: 0, minZ: 0, maxZ: 0 }, type, x, z, extra)
}

export function isFatalHit(type: ObstacleType, player: AABB, hazard: AABB): boolean {
  if (!overlap(player, hazard)) return false
  if (type === 'gap') return player.minY < 0.55
  return true
}

export function collectOverlap(player: AABB, pickup: AABB): boolean {
  return overlap(player, pickup)
}
