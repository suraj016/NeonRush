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

export function valueNoise(x: number, y: number, z: number, seed: number): number {
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
  const y0z = x00 * (1 - fy) + x10 * fy
  const y1z = x01 * (1 - fy) + x11 * fy
  return y0z * (1 - fz) + y1z * fz
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

function paintStrata(geo: THREE.BufferGeometry, seed: number): void {
  const pos = geo.attributes.position
  const colors = new Float32Array(pos.count * 3)
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i)
    const n = fbm(x * 0.12, y * 0.16, z * 0.12, seed, 3)
    const shelf = 0.5 + 0.5 * Math.sin(y * 0.38 + n * 2.2)
    const r = 0.58 + n * 0.22 + shelf * 0.08
    const g = 0.4 + n * 0.14 + shelf * 0.04
    const b = 0.24 + n * 0.08
    colors[i * 3] = r
    colors[i * 3 + 1] = g
    colors[i * 3 + 2] = b
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
}

function displaceMass(geo: THREE.BufferGeometry, seed: number, lean: number, carve: number): void {
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i)
    const n = fbm(x * 0.16, y * 0.1, z * 0.14, seed, 4)
    const n2 = fbm(x * 0.07 + 3, y * 0.28, z * 0.08, seed + 5, 3)
    const n3 = fbm(z * 0.2, y * 0.18, seed, seed + 11, 2)
    const taper = 1 - Math.max(0, (y - 6) / 16) * 0.55
    const bite = y > 9 ? Math.abs(n3 - 0.5) * carve : 0
    const shelf = Math.sin(y * 0.72 + n2 * 3.4) * 0.55
    pos.setX(i, x * taper + (n - 0.5) * 2.8 + shelf + lean * (y / 14) - bite * Math.sign(x || 1))
    pos.setZ(i, z + (n2 - 0.5) * 2.6 + Math.sin(y * 0.35 + seed) * 0.45)
    let nextY = y
    if (y > 8) nextY = y - Math.abs(n - 0.45) * 4.8 - bite * 0.8
    if (y < 1.4) nextY = y * 0.28 + n * 0.25
    pos.setY(i, nextY)
  }
  geo.computeVertexNormals()
  paintStrata(geo, seed)
}

export function makeCliffGeo(seed: number, detail: number): THREE.BufferGeometry {
  const wSeg = detail > 1 ? 6 : 4
  const hSeg = detail > 0 ? 12 : 8
  const dSeg = detail > 1 ? 7 : 4
  const core = new THREE.BoxGeometry(6.2, 16.5, 14.5, wSeg, hSeg, dSeg)
  core.translate(0, 7.8, 0)
  displaceMass(core, seed, seed % 2 === 0 ? -0.28 : 0.24, 2.4)
  const outcrop = new THREE.BoxGeometry(4.4, 9.2, 8.4, Math.max(3, wSeg - 1), 7, 4)
  outcrop.translate(seed % 2 === 0 ? -1.8 : 1.6, 4.2, seed % 3 === 0 ? 2.2 : -1.8)
  displaceMass(outcrop, seed + 9, seed % 2 === 0 ? 0.2 : -0.16, 1.6)
  const crown = new THREE.BoxGeometry(3.6, 6.5, 6.2, 3, 5, 3)
  crown.translate(seed % 2 === 0 ? 0.8 : -1.1, 13.2, 0.4)
  displaceMass(crown, seed + 21, 0.08, 3.1)
  const geo = mergeParts([core, outcrop, crown])
  geo.computeVertexNormals()
  paintStrata(geo, seed)
  return geo
}

export function makeMesaGeo(seed: number, detail: number): THREE.BufferGeometry {
  const geo = new THREE.BoxGeometry(9.5, 8.5, 11, detail > 0 ? 5 : 3, detail > 0 ? 7 : 4, 4)
  geo.translate(0, 4.1, 0)
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i)
    const n = fbm(x * 0.16, y * 0.2, z * 0.16, seed, 3)
    pos.setX(i, x + (n - 0.5) * 1.6)
    pos.setZ(i, z + (n - 0.45) * 1.3)
    if (y > 6.2) pos.setY(i, y - Math.abs(n - 0.5) * 1.4)
  }
  geo.computeVertexNormals()
  paintStrata(geo, seed + 3)
  return geo
}

export function makeRidgeGeo(seed: number, detail: number, span: number, peak: number): THREE.BufferGeometry {
  const cols = detail > 1 ? 16 : detail > 0 ? 12 : 8
  const rows = detail > 0 ? 7 : 4
  const geo = new THREE.PlaneGeometry(span, 1, cols, rows)
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i)
    const y0 = pos.getY(i)
    const nx = x / (span * 0.5)
    const ridge = Math.max(0.12, 1 - Math.abs(nx) ** 1.15)
    const n = fbm(x * 0.09, seed, y0 * 3, seed, 4)
    const n2 = fbm(x * 0.22, 2.4, seed * 0.3, seed + 8, 3)
    const height = peak * ridge * (0.42 + n * 0.7) + n2 * 1.8
    pos.setY(i, Math.max(0.15, height))
    pos.setZ(i, (n - 0.5) * 3.4 + Math.abs(nx) * 1.2)
  }
  geo.computeVertexNormals()
  return geo
}

export function makeRockGeo(seed: number, detail: number): THREE.BufferGeometry {
  const geo = new THREE.IcosahedronGeometry(0.85, detail > 0 ? 1 : 0)
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i)
    const n = fbm(x * 1.6, y * 1.4, z * 1.6, seed, 3)
    const flatten = 0.55 + hash(seed, i, 2) * 0.55
    pos.setXYZ(i, x * (0.75 + n * 0.7), y * flatten * (0.7 + n * 0.5), z * (0.8 + n * 0.55))
  }
  geo.computeVertexNormals()
  return geo
}

function mergeParts(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const merged = mergeGeometries(parts, false) as THREE.BufferGeometry
  for (const part of parts) part.dispose()
  return merged
}

export function makeCactusGeo(seed: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = []
  const h = 2.2 + (seed % 3) * 0.35
  const trunk = new THREE.CylinderGeometry(0.14, 0.2, h, 8, 4)
  const tpos = trunk.attributes.position
  for (let i = 0; i < tpos.count; i += 1) {
    const y = tpos.getY(i)
    tpos.setX(i, tpos.getX(i) + Math.sin(y * 1.4 + seed) * 0.04)
  }
  trunk.translate(0, h * 0.5, 0)
  parts.push(trunk)
  const arms = 1 + (seed % 3)
  for (let a = 0; a < arms; a += 1) {
    const dir = a % 2 === 0 ? 1 : -1
    const lift = 0.85 + a * 0.42 + hash(seed, a) * 0.2
    const arm = new THREE.CylinderGeometry(0.07, 0.1, 0.78, 7, 2)
    arm.rotateZ(dir * 1.05)
    arm.translate(dir * 0.48, lift, (hash(seed, a, 4) - 0.5) * 0.12)
    const tip = new THREE.CylinderGeometry(0.065, 0.075, 0.48, 7, 1)
    tip.translate(dir * 0.82, lift + 0.28, 0)
    parts.push(arm, tip)
  }
  const geo = mergeParts(parts)
  geo.computeVertexNormals()
  return geo
}

export function makeShrubGeo(seed: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = []
  const count = 4 + (seed % 3)
  for (let i = 0; i < count; i += 1) {
    const blob = new THREE.SphereGeometry(0.22 + hash(seed, i) * 0.16, 6, 5)
    blob.scale(1.15, 0.55 + hash(seed, i, 2) * 0.35, 1.05)
    blob.translate(
      (hash(seed, i, 3) - 0.5) * 0.55,
      0.18 + hash(seed, i, 5) * 0.16,
      (hash(seed, i, 7) - 0.5) * 0.45,
    )
    parts.push(blob)
  }
  const geo = mergeParts(parts)
  geo.computeVertexNormals()
  return geo
}

export function makeTempleGeo(): THREE.BufferGeometry {
  const parts = [
    new THREE.BoxGeometry(5.2, 0.85, 3.8).translate(0, 0.22, 0),
    new THREE.BoxGeometry(4.4, 0.28, 3.2).translate(0, 0.78, 0),
    new THREE.BoxGeometry(3.8, 2.8, 0.38).translate(0, 2.3, -1.45),
    new THREE.CylinderGeometry(0.26, 0.32, 3.6, 8).translate(-1.35, 2.55, 0.7),
    new THREE.CylinderGeometry(0.22, 0.3, 2.7, 8).translate(1.3, 2.1, 0.55),
    new THREE.BoxGeometry(3.4, 0.34, 0.5).translate(0, 4.2, -1.4),
    new THREE.BoxGeometry(1.1, 0.7, 0.22).translate(-1.1, 4.7, -1.4),
    new THREE.BoxGeometry(2.2, 0.16, 1.8).translate(0, 1.0, 1.1),
  ]
  const geo = mergeParts(parts)
  geo.computeVertexNormals()
  return geo
}

export function makeRuinGeo(seed: number): THREE.BufferGeometry {
  const parts = [
    new THREE.BoxGeometry(3.2, 0.7, 2.8).translate(0, 0.18, 0),
    new THREE.BoxGeometry(0.42, 3.6 + (seed % 3) * 0.4, 0.42).translate(-1.05, 2.1, -0.9),
    new THREE.BoxGeometry(0.38, 2.4, 0.38).translate(1.0, 1.4, 0.7),
    new THREE.BoxGeometry(0.4, 1.5, 0.4).translate(0.2, 0.95, -1.0),
    new THREE.BoxGeometry(2.2, 0.28, 0.4).translate(-0.2, 3.9, -0.9),
  ]
  if (seed % 2 === 0) parts.push(new THREE.BoxGeometry(1.6, 1.4, 0.28).translate(0.4, 1.1, 1.1))
  const geo = mergeParts(parts)
  geo.computeVertexNormals()
  return geo
}

export function makeArchGeo(): THREE.BufferGeometry {
  const parts = [
    new THREE.BoxGeometry(0.48, 3.4, 0.48).translate(-1.15, 1.7, 0),
    new THREE.BoxGeometry(0.48, 3.1, 0.48).translate(1.15, 1.55, 0),
    new THREE.BoxGeometry(3.1, 0.42, 0.5).translate(0, 3.5, 0),
    new THREE.TorusGeometry(1.15, 0.2, 6, 10, Math.PI).rotateZ(Math.PI).translate(0, 3.15, 0),
    new THREE.BoxGeometry(1.8, 0.35, 1.6).translate(0, 0.08, 0.2),
  ]
  const geo = mergeParts(parts)
  geo.computeVertexNormals()
  return geo
}

export function makeDuneGeo(detail: number): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(8.5, 5.2, detail > 0 ? 6 : 3, detail > 0 ? 4 : 2)
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const n = fbm(x * 0.28, y * 0.28, 1.2, 4, 3)
    pos.setZ(i, n * 0.55 + Math.max(0, 0.28 - Math.abs(x) * 0.04))
  }
  geo.rotateX(-Math.PI / 2)
  geo.computeVertexNormals()
  return geo
}

export function createDesertGeos(quality: Quality) {
  const detail = quality === 'low' ? 0 : quality === 'high' ? 2 : 1
  const geos = {
    cliffA: makeCliffGeo(11, detail),
    cliffB: makeCliffGeo(27, detail),
    mesa: makeMesaGeo(8, detail),
    ridgeNear: makeRidgeGeo(3, detail, 28, 15),
    ridgeFar: makeRidgeGeo(15, detail, 40, 20),
    rockA: makeRockGeo(4, detail),
    rockB: makeRockGeo(19, detail),
    cactusA: makeCactusGeo(2),
    cactusB: makeCactusGeo(7),
    shrub: makeShrubGeo(5),
    temple: makeTempleGeo(),
    ruin: makeRuinGeo(1),
    ruinB: makeRuinGeo(4),
    arch: makeArchGeo(),
    dune: makeDuneGeo(detail),
  }
  return {
    ...geos,
    dispose() {
      for (const value of Object.values(geos)) value.dispose()
    },
  }
}
