import { LANES } from '../game/config.ts'
import type { AABB, Lane } from '../game/types.ts'

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function damp(current: number, target: number, lambda: number, dt: number): number {
  return lerp(current, target, 1 - Math.exp(-lambda * dt))
}

export function laneX(lane: Lane): number {
  return LANES[lane]
}

export function nearestLane(x: number): Lane {
  let best: Lane = 1
  let bestDist = Infinity
  for (let i = 0 as Lane; i <= 2; i = (i + 1) as Lane) {
    const d = Math.abs(x - LANES[i])
    if (d < bestDist) {
      bestDist = d
      best = i
    }
  }
  return best
}

export function overlap(a: AABB, b: AABB): boolean {
  return (
    a.minX <= b.maxX &&
    a.maxX >= b.minX &&
    a.minY <= b.maxY &&
    a.maxY >= b.minY &&
    a.minZ <= b.maxZ &&
    a.maxZ >= b.minZ
  )
}

export function writeBox(
  out: AABB,
  x: number,
  y: number,
  z: number,
  hx: number,
  hy: number,
  hz: number,
): AABB {
  out.minX = x - hx
  out.maxX = x + hx
  out.minY = y
  out.maxY = y + hy
  out.minZ = z - hz
  out.maxZ = z + hz
  return out
}

export function makeBox(
  x: number,
  y: number,
  z: number,
  hx: number,
  hy: number,
  hz: number,
): AABB {
  return writeBox({ minX: 0, maxX: 0, minY: 0, maxY: 0, minZ: 0, maxZ: 0 }, x, y, z, hx, hy, hz)
}

export function easeInOut(t: number): number {
  const x = clamp(t, 0, 1)
  return x * x * (3 - 2 * x)
}
