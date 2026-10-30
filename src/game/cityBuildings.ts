import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

function setBoxUVs(geo: THREE.BoxGeometry, w: number, h: number, d: number, tile = 0.055): void {
  const uv = geo.attributes.uv
  const faces = [
    [d, h],
    [d, h],
    [w, d],
    [w, d],
    [w, h],
    [w, h],
  ]
  for (let f = 0; f < 6; f += 1) {
    const su = Math.max(1, faces[f][0] * tile)
    const sv = Math.max(1, faces[f][1] * tile)
    for (let i = 0; i < 4; i += 1) {
      const idx = f * 4 + i
      uv.setXY(idx, uv.getX(idx) * su, uv.getY(idx) * sv)
    }
  }
  uv.needsUpdate = true
}

function box(
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  tile = true,
): THREE.BufferGeometry {
  const geo = new THREE.BoxGeometry(w, h, d)
  if (tile) setBoxUVs(geo, w, h, d)
  geo.translate(x, y, z)
  return geo
}

export function createBuildingGeometry(kind: number): THREE.BufferGeometry {
  const body: THREE.BufferGeometry[] = []
  const neon: THREE.BufferGeometry[] = []

  if (kind === 0) {
    body.push(box(3.4, 2.4, 3.8, 0, 1.2, 0))
    body.push(box(2.6, 20, 2.8, 0, 13.4, 0))
    body.push(box(1.9, 9, 2.1, 0.2, 28, 0))
    body.push(box(2.2, 0.45, 2.4, 0, 32.7, 0, false))
    body.push(box(0.18, 4.4, 0.18, 0, 35.1, 0, false))
    neon.push(box(0.12, 20, 0.12, 1.38, 13.4, 1.3, false))
    neon.push(box(0.12, 20, 0.12, 1.38, 13.4, -1.3, false))
    neon.push(box(2.4, 0.16, 0.12, 0, 23.4, 1.46, false))
  } else if (kind === 1) {
    body.push(box(4.2, 3.2, 3.6, 0, 1.6, 0))
    body.push(box(3.2, 14, 2.8, -0.3, 10.4, 0))
    body.push(box(2.4, 11, 2.4, 0.5, 23, 0.2))
    body.push(box(1.6, 7, 1.8, 0.1, 32.2, 0))
    neon.push(box(0.14, 14, 0.14, 1.4, 10.4, 1.2, false))
    neon.push(box(3.0, 0.2, 0.12, 0, 17.4, 1.46, false))
    neon.push(box(2.2, 0.2, 0.12, 0.5, 28.4, 1.26, false))
  } else if (kind === 2) {
    body.push(box(2.2, 26, 2.4, -1.1, 13, 0))
    body.push(box(2.2, 22, 2.4, 1.2, 11, 0.2))
    body.push(box(4.6, 2.2, 3.2, 0, 1.1, 0))
    body.push(box(0.2, 6, 0.2, -1.1, 29, 0, false))
    body.push(box(0.2, 5, 0.2, 1.2, 24.6, 0.2, false))
    neon.push(box(0.12, 26, 0.12, 0.05, 13, 1.26, false))
    neon.push(box(4.2, 0.18, 0.12, 0, 8.4, 1.66, false))
  } else if (kind === 3) {
    body.push(box(4.6, 2.6, 4.2, 0, 1.3, 0))
    body.push(box(3.4, 10, 3.2, 0, 7.6, 0))
    body.push(box(2.2, 16, 2.2, 0, 20.6, 0))
    body.push(box(1.1, 10, 1.1, 0, 33.6, 0))
    body.push(box(0.16, 6, 0.16, 0, 41.6, 0, false))
    neon.push(box(0.14, 16, 0.14, 1.18, 20.6, 1.18, false))
    neon.push(box(2.0, 0.16, 0.12, 0, 28.6, 1.16, false))
  } else if (kind === 4) {
    body.push(box(5.2, 4, 3.4, 0, 2, 0))
    body.push(box(2.4, 18, 2.6, -1.3, 13, 0))
    body.push(box(2.2, 12, 2.4, 1.5, 10, 0.3))
    body.push(box(1.6, 8, 1.8, -0.2, 26, 0))
    neon.push(box(5.0, 0.22, 0.12, 0, 4.1, 1.76, false))
    neon.push(box(0.12, 18, 0.12, -0.05, 13, 1.36, false))
  } else {
    body.push(box(3.0, 28, 2.6, 0, 14, 0))
    body.push(box(3.6, 2, 3.2, 0, 1, 0))
    body.push(box(3.2, 0.5, 2.8, 0, 28.25, 0, false))
    body.push(box(0.7, 1.2, 0.7, 0, 29.2, 0, false))
    neon.push(box(0.16, 28, 0.16, 1.58, 14, 0, false))
    neon.push(box(2.8, 0.18, 0.14, 0, 18, 1.36, false))
    neon.push(box(2.8, 0.18, 0.14, 0, 24, 1.36, false))
  }

  const bodyMerged = mergeGeometries(body, false)
  const neonMerged = mergeGeometries(neon, false)
  if (!bodyMerged || !neonMerged) {
    return body[0] ?? new THREE.BoxGeometry(2, 16, 2)
  }
  const merged = mergeGeometries([bodyMerged, neonMerged], true)
  body.forEach((g) => g.dispose())
  neon.forEach((g) => g.dispose())
  bodyMerged.dispose()
  neonMerged.dispose()
  return merged ?? bodyMerged
}

export function createSkylineGeometry(): THREE.BufferGeometry {
  const parts = [
    box(2.4, 22, 2.4, 0, 11, 0),
    box(1.6, 8, 1.6, 0.2, 26, 0),
    box(0.2, 5, 0.2, 0, 31.5, 0, false),
  ]
  const merged = mergeGeometries(parts, false)
  parts.forEach((g) => g.dispose())
  return merged ?? new THREE.BoxGeometry(2.4, 22, 2.4)
}
