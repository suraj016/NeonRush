import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import type { Quality } from './types.ts'

function hash(i: number, j = 0, k = 0): number {
  const n = Math.sin(i * 127.1 + j * 311.7 + k * 74.7) * 43758.5453123
  return n - Math.floor(n)
}

function fade(t: number): number {
  return t * t * (3 - 2 * t)
}

function valueNoise(x: number, y: number, z: number, seed: number): number {
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const z0 = Math.floor(z)
  const fx = fade(x - x0)
  const fy = fade(y - y0)
  const fz = fade(z - z0)
  const n = (i: number, j: number, k: number) => hash(i + seed * 17, j + seed * 9, k)
  const x00 = n(x0, y0, z0) * (1 - fx) + n(x0 + 1, y0, z0) * fx
  const x10 = n(x0, y0 + 1, z0) * (1 - fx) + n(x0 + 1, y0 + 1, z0) * fx
  const x01 = n(x0, y0, z0 + 1) * (1 - fx) + n(x0 + 1, y0, z0 + 1) * fx
  const x11 = n(x0, y0 + 1, z0 + 1) * (1 - fx) + n(x0 + 1, y0 + 1, z0 + 1) * fx
  return (x00 * (1 - fy) + x10 * fy) * (1 - fz) + (x01 * (1 - fy) + x11 * fy) * fz
}

function fbm(x: number, y: number, z: number, seed: number, octaves = 3): number {
  let sum = 0
  let amp = 0.55
  let freq = 1
  let norm = 0
  for (let i = 0; i < octaves; i += 1) {
    sum += valueNoise(x * freq, y * freq, z * freq, seed + i * 19) * amp
    norm += amp
    amp *= 0.5
    freq *= 2.05
  }
  return sum / norm
}

function mergeParts(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const merged = mergeGeometries(parts, false) as THREE.BufferGeometry
  for (const part of parts) part.dispose()
  return merged
}

function paintSnowRock(geo: THREE.BufferGeometry, seed: number): void {
  geo.computeVertexNormals()
  const pos = geo.attributes.position
  const nor = geo.attributes.normal
  const colors = new Float32Array(pos.count * 3)
  for (let i = 0; i < pos.count; i += 1) {
    const y = pos.getY(i)
    const ny = nor.getY(i)
    const n = fbm(pos.getX(i) * 0.14, y * 0.12, pos.getZ(i) * 0.14, seed, 2)
    const snow = ny > 0.18 || y > 7.2 + n * 2.2 || (ny > -0.1 && n > 0.62)
    if (snow) {
      const lift = 0.9 + n * 0.1
      colors[i * 3] = 0.93 * lift
      colors[i * 3 + 1] = 0.95 * lift
      colors[i * 3 + 2] = 0.96 * lift
    } else {
      colors[i * 3] = 0.38 + n * 0.12
      colors[i * 3 + 1] = 0.46 + n * 0.1
      colors[i * 3 + 2] = 0.54 + n * 0.1
    }
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
}

function displaceMass(geo: THREE.BufferGeometry, seed: number, lean: number): void {
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i)
    const n = fbm(x * 0.15, y * 0.1, z * 0.13, seed, 4)
    const n2 = fbm(x * 0.07, y * 0.26, z * 0.08, seed + 6, 3)
    const taper = 1 - Math.max(0, (y - 6) / 16) * 0.58
    const shelf = Math.sin(y * 0.62 + n2 * 3.1) * 0.7
    pos.setX(i, x * taper + (n - 0.5) * 3.2 + shelf + lean * (y / 13))
    pos.setZ(i, z + (n2 - 0.5) * 3.0 + Math.sin(y * 0.4 + seed) * 0.5)
    let nextY = y
    if (y > 8) nextY = y - Math.abs(n - 0.45) * 5.0
    if (y < 1.3) nextY = y * 0.28
    pos.setY(i, nextY)
  }
}

export function makeAlpineCliff(seed: number, detail: number): THREE.BufferGeometry {
  const segs = detail > 0 ? 6 : 4
  const core = new THREE.BoxGeometry(6.4, 15.5, 13.5, segs, detail > 0 ? 11 : 7, segs)
  core.translate(0, 7.4, 0)
  displaceMass(core, seed, seed % 2 === 0 ? -0.22 : 0.2)
  const ledge = new THREE.BoxGeometry(4.2, 7.5, 7.8, 4, 5, 4)
  ledge.translate(seed % 2 === 0 ? -1.6 : 1.5, 5.2, seed % 3 === 0 ? 2 : -1.6)
  displaceMass(ledge, seed + 8, 0.1)
  const cap = new THREE.BoxGeometry(3.2, 5.4, 5.5, 3, 4, 3)
  cap.translate(seed % 2 === 0 ? 0.7 : -0.9, 12.6, 0.3)
  displaceMass(cap, seed + 17, 0)
  const geo = mergeParts([core, ledge, cap])
  paintSnowRock(geo, seed)
  return geo
}

export function makeAlpineRidge(seed: number, detail: number, span: number, peak: number): THREE.BufferGeometry {
  const cols = detail > 1 ? 16 : detail > 0 ? 12 : 8
  const geo = new THREE.PlaneGeometry(span, 1, cols, detail > 0 ? 7 : 4)
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i)
    const nx = x / (span * 0.5)
    const ridge = Math.max(0.1, 1 - Math.abs(nx) ** 1.2)
    const n = fbm(x * 0.08, seed, 1.2, seed, 4)
    const n2 = fbm(x * 0.2, 2.1, seed * 0.2, seed + 9, 3)
    pos.setY(i, Math.max(0.2, peak * ridge * (0.4 + n * 0.72) + n2 * 1.6))
    pos.setZ(i, (n - 0.5) * 3.2)
  }
  paintSnowRock(geo, seed)
  return geo
}

export function makeSnowRock(seed: number, detail: number): THREE.BufferGeometry {
  const geo = new THREE.IcosahedronGeometry(0.8, detail > 0 ? 1 : 0)
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i)
    const n = fbm(x * 1.5, y * 1.3, z * 1.5, seed, 3)
    pos.setXYZ(i, x * (0.75 + n * 0.65), y * (0.5 + n * 0.45), z * (0.8 + n * 0.5))
  }
  paintSnowRock(geo, seed)
  return geo
}

function paintPine(geo: THREE.BufferGeometry, seed: number): void {
  const pos = geo.attributes.position
  const colors = new Float32Array(pos.count * 3)
  for (let i = 0; i < pos.count; i += 1) {
    const y = pos.getY(i)
    const r = Math.hypot(pos.getX(i), pos.getZ(i))
    if (r < 0.28 && y < 1.7) {
      colors[i * 3] = 0.42
      colors[i * 3 + 1] = 0.3
      colors[i * 3 + 2] = 0.2
    } else if (y > 2.1 && hash(seed, i, 3) > 0.55) {
      colors[i * 3] = 0.93
      colors[i * 3 + 1] = 0.95
      colors[i * 3 + 2] = 0.96
    } else {
      const n = hash(seed, i, 1)
      colors[i * 3] = 0.12 + n * 0.05
      colors[i * 3 + 1] = 0.26 + n * 0.08
      colors[i * 3 + 2] = 0.2 + n * 0.04
    }
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
}

export function makePineTree(seed: number, style: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = []
  const tall = style === 0
  const small = style === 2
  const layers = small ? 3 : tall ? 6 : 5
  const height = small ? 3.2 : tall ? 6.6 : 5.1
  const trunk = new THREE.CylinderGeometry(0.1, 0.16, height * 0.38, 6, 1)
  trunk.translate(0, height * 0.19, 0)
  parts.push(trunk)
  for (let i = 0; i < layers; i += 1) {
    const t = i / Math.max(1, layers - 1)
    const radius = (small ? 0.72 : 1.15) * (1 - t * 0.72) * (0.82 + hash(seed, i) * 0.28)
    const h = (small ? 1.05 : 1.45) * (0.85 + hash(seed, i, 2) * 0.25)
    const cy = 1.15 + i * (height / layers) * 0.78
    const cone = new THREE.ConeGeometry(radius, h, 7, 1)
    cone.rotateY(hash(seed, i, 4) * 0.8)
    cone.translate((hash(seed, i, 5) - 0.5) * 0.12, cy, (hash(seed, i, 6) - 0.5) * 0.1)
    parts.push(cone)
    const snow = new THREE.ConeGeometry(radius * 0.7, 0.2, 7, 1)
    snow.translate(0, cy + h * 0.32, 0)
    parts.push(snow)
  }
  const geo = mergeParts(parts)
  geo.computeVertexNormals()
  paintPine(geo, seed)
  return geo
}

export function makeCabin(seed: number): THREE.BufferGeometry {
  const parts = [
    new THREE.BoxGeometry(2.8, 1.7, 2.3).translate(0, 0.85, 0),
    new THREE.BoxGeometry(3.2, 0.16, 2.6).translate(0, 1.78, 0),
    (() => {
      const roof = new THREE.BoxGeometry(3.3, 0.9, 0.16)
      roof.rotateX(0.62)
      roof.translate(0, 2.28, 0)
      return roof
    })(),
    new THREE.BoxGeometry(0.28, 0.7, 0.28).translate(0.7, 2.55, 0.2),
    new THREE.BoxGeometry(0.55, 0.45, 0.06).translate(0.85, 1.05, 1.16),
  ]
  const geo = mergeParts(parts)
  const pos = geo.attributes.position
  const colors = new Float32Array(pos.count * 3)
  for (let i = 0; i < pos.count; i += 1) {
    const y = pos.getY(i)
    if (y > 1.7) {
      colors[i * 3] = 0.93
      colors[i * 3 + 1] = 0.95
      colors[i * 3 + 2] = 0.96
    } else if (pos.getZ(i) > 1.12 && y > 0.8 && y < 1.3) {
      colors[i * 3] = 1
      colors[i * 3 + 1] = 0.85
      colors[i * 3 + 2] = 0.6
    } else {
      const n = hash(seed, i, 2)
      colors[i * 3] = 0.42 + n * 0.08
      colors[i * 3 + 1] = 0.3 + n * 0.05
      colors[i * 3 + 2] = 0.2
    }
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geo.computeVertexNormals()
  return geo
}

export function makeBridge(): THREE.BufferGeometry {
  const parts = [
    new THREE.BoxGeometry(3.6, 0.18, 7.2).translate(0, 1.05, 0),
    new THREE.BoxGeometry(3.7, 0.08, 7.3).translate(0, 1.16, 0),
    new THREE.BoxGeometry(0.12, 0.62, 7.2).translate(-1.7, 1.42, 0),
    new THREE.BoxGeometry(0.12, 0.62, 7.2).translate(1.7, 1.42, 0),
    new THREE.BoxGeometry(0.18, 2.1, 0.18).translate(-1.7, 1.05, -3.1),
    new THREE.BoxGeometry(0.18, 2.1, 0.18).translate(1.7, 1.05, 3.1),
    new THREE.BoxGeometry(0.18, 2.1, 0.18).translate(-1.7, 1.05, 3.1),
    new THREE.BoxGeometry(0.18, 2.1, 0.18).translate(1.7, 1.05, -3.1),
  ]
  const geo = mergeParts(parts)
  const pos = geo.attributes.position
  const colors = new Float32Array(pos.count * 3)
  for (let i = 0; i < pos.count; i += 1) {
    const y = pos.getY(i)
    if (y > 1.12 && Math.abs(pos.getX(i)) < 1.65) {
      colors[i * 3] = 0.93
      colors[i * 3 + 1] = 0.95
      colors[i * 3 + 2] = 0.96
    } else {
      colors[i * 3] = 0.44
      colors[i * 3 + 1] = 0.32
      colors[i * 3 + 2] = 0.21
    }
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return geo
}

export function makeFence(): THREE.BufferGeometry {
  const parts = [
    new THREE.BoxGeometry(0.08, 0.85, 0.08).translate(-0.9, 0.42, 0),
    new THREE.BoxGeometry(0.08, 0.85, 0.08).translate(0.9, 0.42, 0),
    new THREE.BoxGeometry(2.1, 0.07, 0.06).translate(0, 0.38, 0),
    new THREE.BoxGeometry(2.1, 0.07, 0.06).translate(0, 0.62, 0),
    new THREE.BoxGeometry(2.0, 0.05, 0.2).translate(0, 0.88, 0),
  ]
  const geo = mergeParts(parts)
  const pos = geo.attributes.position
  const colors = new Float32Array(pos.count * 3)
  for (let i = 0; i < pos.count; i += 1) {
    const snow = pos.getY(i) > 0.78
    colors[i * 3] = snow ? 0.93 : 0.45
    colors[i * 3 + 1] = snow ? 0.95 : 0.33
    colors[i * 3 + 2] = snow ? 0.96 : 0.22
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return geo
}

export function makeWaterfall(): THREE.BufferGeometry {
  const parts = [
    new THREE.BoxGeometry(2.2, 6.4, 0.35).translate(0, 3.2, 0),
    new THREE.BoxGeometry(2.6, 0.7, 1.4).translate(0, 0.2, 0.4),
    new THREE.BoxGeometry(2.4, 0.55, 1.8).translate(0, 6.4, -0.1),
    new THREE.BoxGeometry(0.9, 1.2, 0.7).translate(-1.1, 2.2, 0.15),
    new THREE.BoxGeometry(0.8, 1.5, 0.6).translate(1.05, 3.6, 0.1),
  ]
  const geo = mergeParts(parts)
  geo.computeVertexNormals()
  return geo
}

export function makeIceSpike(seed: number): THREE.BufferGeometry {
  const geo = new THREE.ConeGeometry(0.35 + hash(seed) * 0.15, 1.6 + hash(seed, 2) * 0.6, 6, 1)
  geo.translate(0, 0.85, 0)
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i += 1) {
    const n = hash(seed, i, 3)
    pos.setX(i, pos.getX(i) * (0.85 + n * 0.3))
    pos.setZ(i, pos.getZ(i) * (0.85 + n * 0.3))
  }
  geo.computeVertexNormals()
  return geo
}

export function makeLake(detail: number): THREE.BufferGeometry {
  const geo = new THREE.CircleGeometry(6.4, detail > 0 ? 18 : 10)
  const pos = geo.attributes.position
  for (let i = 1; i < pos.count; i += 1) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const n = fbm(x * 0.2, y * 0.2, 1, 6, 2)
    pos.setX(i, x * (0.82 + n * 0.28))
    pos.setY(i, y * (0.7 + n * 0.3))
  }
  geo.rotateX(-Math.PI / 2)
  geo.computeVertexNormals()
  return geo
}

export function makeSnowbank(detail: number): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(7.4, 4.2, detail > 0 ? 6 : 3, detail > 0 ? 4 : 2)
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const n = fbm(x * 0.3, y * 0.3, 2.1, 8, 3)
    pos.setZ(i, 0.15 + n * 0.55 + Math.max(0, 0.22 - Math.abs(x) * 0.03))
  }
  geo.rotateX(-Math.PI / 2)
  geo.computeVertexNormals()
  return geo
}

export function makeRockyPass(): THREE.BufferGeometry {
  const left = new THREE.BoxGeometry(3.4, 9.2, 7.5, 3, 6, 4)
  left.translate(-6.5, 4.4, 0)
  displaceMass(left, 14, -0.1)
  const right = new THREE.BoxGeometry(3.4, 9.2, 7.5, 3, 6, 4)
  right.translate(6.5, 4.4, 0)
  displaceMass(right, 22, 0.1)
  const top = new THREE.BoxGeometry(10.2, 2.4, 7.2, 4, 2, 3)
  top.translate(0, 9.6, 0)
  displaceMass(top, 31, 0)
  const geo = mergeParts([left, right, top])
  paintSnowRock(geo, 12)
  return geo
}

export function createFrozenGeos(quality: Quality) {
  const detail = quality === 'low' ? 0 : quality === 'high' ? 2 : 1
  const geos = {
    cliffA: makeAlpineCliff(9, detail),
    cliffB: makeAlpineCliff(23, detail),
    ridgeNear: makeAlpineRidge(4, detail, 30, 16),
    ridgeFar: makeAlpineRidge(18, detail, 42, 21),
    rockA: makeSnowRock(5, detail),
    rockB: makeSnowRock(21, detail),
    pineTall: makePineTree(3, 0),
    pineMid: makePineTree(8, 1),
    pineSmall: makePineTree(14, 2),
    cabin: makeCabin(2),
    bridge: makeBridge(),
    fence: makeFence(),
    fall: makeWaterfall(),
    spike: makeIceSpike(4),
    lake: makeLake(detail),
    bank: makeSnowbank(detail),
  }
  return {
    ...geos,
    dispose() {
      for (const value of Object.values(geos)) value.dispose()
    },
  }
}
