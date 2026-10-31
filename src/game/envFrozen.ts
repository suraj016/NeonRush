import * as THREE from 'three'
import { createFrozenGeos } from './frozenGeo.ts'
import { makePoints, scrollLayer, seedLayer, writeInstances, type EnvPack, type InstanceData } from './envShared.ts'
import type { MaterialSet } from './materials.ts'
import type { Quality } from './types.ts'

function themeOf(index: number): number {
  return Math.floor(index / 2) % 8
}

function cliffX(theme: number, side: number, index: number): number {
  const jitter = (index % 3) * 0.4
  if (theme === 0) return side * (8.4 + jitter)
  if (theme === 1) return side * (14.2 + (index % 3) * 1.1)
  if (theme === 2) return side * (16.0 + jitter)
  if (theme === 3) return side * (8.8 + jitter * 0.5)
  if (theme === 4) return side * (12.4 + jitter)
  if (theme === 5) return side * (9.6 + jitter)
  if (theme === 6) return side * (11.2 + jitter)
  return side * (14.6 + (index % 2))
}

export function createFrozenEnv(materials: MaterialSet, quality: Quality): EnvPack {
  const root = new THREE.Group()
  const dummy = new THREE.Object3D()
  const extras: THREE.BufferGeometry[] = []
  const meshes: THREE.InstancedMesh[] = []
  const geos = createFrozenGeos(quality)
  let reduced = false

  const sky = new THREE.Mesh(new THREE.SphereGeometry(170, 16, 12), materials.frozenSkyMat)
  extras.push(sky.geometry)
  sky.position.y = 18
  root.add(sky)

  const floorGeo = new THREE.PlaneGeometry(92, 280)
  extras.push(floorGeo)
  const floorL = new THREE.Mesh(floorGeo, materials.frozenDeck)
  floorL.rotation.x = -Math.PI / 2
  floorL.position.set(-46, -0.34, -90)
  const floorR = floorL.clone()
  floorR.position.x = 46
  root.add(floorL, floorR)

  const layerList: { mesh: THREE.InstancedMesh; data: InstanceData[]; wrap: number; parallax: number }[] = []

  const addLayer = (
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    data: InstanceData[],
    wrap: number,
    parallax: number,
  ) => {
    const mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, data.length))
    mesh.frustumCulled = false
    writeInstances(mesh, data, dummy)
    root.add(mesh)
    meshes.push(mesh)
    layerList.push({ mesh, data, wrap, parallax })
  }

  const low = quality === 'low'
  const cliffCount = low ? 8 : 14
  const cliffA: InstanceData[] = []
  const cliffB: InstanceData[] = []
  for (let i = 0; i < cliffCount; i += 1) {
    const side = i % 2 === 0 ? -1 : 1
    const theme = themeOf(i)
    const item: InstanceData = {
      x: cliffX(theme, side, i),
      y: 0,
      z: -((i * 16) % 224) - 8,
      sx: theme === 3 ? 1.0 : 0.82 + (i % 3) * 0.06,
      sy: theme === 0 || theme === 3 ? 0.95 + (i % 2) * 0.08 : 0.72 + (i % 3) * 0.08,
      sz: 0.9,
      rot: side * (0.04 + (i % 3) * 0.03),
    }
    if (i % 2 === 0) cliffA.push(item)
    else cliffB.push(item)
  }
  addLayer(geos.cliffA, materials.alpineCliff, cliffA, 224, 1)
  addLayer(geos.cliffB, materials.alpineCliff, cliffB, 224, 1)

  addLayer(
    geos.ridgeNear,
    materials.mountain,
    seedLayer(low ? 6 : 10, 240, (i) => {
      const side = i % 2 === 0 ? -1 : 1
      return {
        x: side * (24 + (i % 4) * 2),
        y: 0,
        z: -((i * 24) % 240) - 26,
        sx: 1.05,
        sy: 0.88 + (i % 3) * 0.1,
        sz: 1,
        rot: side * 0.08,
      }
    }),
    240,
    0.5,
  )

  addLayer(
    geos.ridgeFar,
    materials.peakFar,
    seedLayer(low ? 8 : 12, 280, (i) => {
      const side = i % 2 === 0 ? -1 : 1
      return {
        x: side * (38 + (i % 5) * 2.4),
        y: -0.3,
        z: -((i * 22) % 280) - 40,
        sx: 1.12,
        sy: 0.82 + (i % 3) * 0.12,
        sz: 1,
        rot: 0,
      }
    }),
    280,
    0.26,
  )

  addLayer(
    geos.pineTall,
    materials.pine,
    seedLayer(low ? 8 : 14, 188, (i) => {
      const side = i % 2 === 0 ? -1 : 1
      const cluster = Math.floor(i / 3)
      return {
        x: side * (6.5 + (i % 3) * 0.55 + (cluster % 2) * 0.35),
        y: 0,
        z: -((cluster * 20 + (i % 3) * 1.5) % 188) - 6,
        sx: 0.85 + (i % 3) * 0.12,
        sy: 0.9 + (i % 4) * 0.12,
        sz: 0.85,
        rot: (i % 6) * 0.3,
      }
    }),
    188,
    1,
  )

  addLayer(
    geos.pineMid,
    materials.pine,
    seedLayer(low ? 8 : 12, 176, (i) => {
      const side = i % 2 === 0 ? 1 : -1
      return {
        x: side * (6.7 + (i % 5) * 0.6),
        y: 0,
        z: -((i * 14 + 8) % 176) - 9,
        sx: 0.8 + (i % 3) * 0.15,
        sy: 0.8 + (i % 2) * 0.18,
        sz: 0.8,
        rot: i * 0.35,
      }
    }),
    176,
    1,
  )

  addLayer(
    geos.pineSmall,
    materials.pine,
    seedLayer(low ? 6 : 10, 164, (i) => {
      const side = i % 2 === 0 ? -1 : 1
      return {
        x: side * (6.35 + (i % 4) * 0.45),
        y: 0,
        z: -((i * 16 + 4) % 164) - 5,
        sx: 0.7 + (i % 3) * 0.14,
        sy: 0.65 + (i % 3) * 0.16,
        sz: 0.7,
        rot: i * 0.5,
      }
    }),
    164,
    1,
  )

  addLayer(
    geos.lake,
    materials.ice,
    seedLayer(low ? 3 : 5, 200, (i) => {
      const side = i % 2 === 0 ? -1 : 1
      return {
        x: side * (13.8 + (i % 2)),
        y: -0.16,
        z: -((i * 40 + 18) % 200) - 22,
        sx: 1 + (i % 2) * 0.15,
        sy: 1,
        sz: 0.85,
        rot: side * 0.2,
      }
    }),
    200,
    1,
  )

  addLayer(
    geos.cabin,
    materials.bark,
    seedLayer(low ? 3 : 5, 210, (i) => {
      const side = i % 2 === 0 ? -1 : 1
      return {
        x: side * (9.6 + (i % 2) * 0.4),
        y: 0,
        z: -((i * 42 + 20) % 210) - 26,
        sx: 1,
        sy: 1,
        sz: 1,
        rot: side > 0 ? -0.22 : 0.2,
      }
    }),
    210,
    1,
  )

  addLayer(
    geos.bridge,
    materials.bark,
    seedLayer(low ? 2 : 4, 200, (i) => {
      const side = i % 2 === 0 ? -1 : 1
      return {
        x: side * 7.5,
        y: 0,
        z: -((i * 50 + 30) % 200) - 24,
        sx: 1,
        sy: 1,
        sz: 1,
        rot: 0,
      }
    }),
    200,
    1,
  )

  addLayer(
    geos.fence,
    materials.bark,
    seedLayer(low ? 8 : 14, 172, (i) => {
      const side = i % 2 === 0 ? -1 : 1
      return {
        x: side * 4.55,
        y: 0,
        z: -((i * 12) % 172) - 4,
        sx: 1,
        sy: 1,
        sz: 1,
        rot: 0,
      }
    }),
    172,
    1,
  )

  addLayer(
    geos.fall,
    materials.ice,
    seedLayer(low ? 2 : 3, 220, (i) => {
      const side = i % 2 === 0 ? -1 : 1
      return {
        x: side * 8.8,
        y: 0,
        z: -((i * 72 + 36) % 220) - 32,
        sx: 1,
        sy: 1,
        sz: 1,
        rot: side * 0.1,
      }
    }),
    220,
    1,
  )

  addLayer(
    geos.spike,
    materials.ice,
    seedLayer(low ? 6 : 10, 156, (i) => {
      const side = i % 2 === 0 ? -1 : 1
      return {
        x: side * (6.1 + (i % 4) * 0.35),
        y: 0,
        z: -((i * 15 + 7) % 156) - 8,
        sx: 0.8 + (i % 3) * 0.2,
        sy: 0.75 + (i % 4) * 0.2,
        sz: 0.8,
        rot: i * 0.4,
      }
    }),
    156,
    1,
  )

  addLayer(
    geos.rockA,
    materials.alpineCliff,
    seedLayer(low ? 8 : 12, 158, (i) => {
      const side = i % 2 === 0 ? -1 : 1
      return {
        x: side * (5.9 + (i % 4) * 0.32),
        y: 0.06,
        z: -((i * 13 + 5) % 158) - 5,
        sx: 0.7 + (i % 4) * 0.2,
        sy: 0.45 + (i % 3) * 0.18,
        sz: 0.65 + (i % 2) * 0.15,
        rot: i * 0.6,
      }
    }),
    158,
    1,
  )

  addLayer(
    geos.rockB,
    materials.alpineCliff,
    seedLayer(low ? 8 : 14, 148, (i) => {
      const side = i % 2 === 0 ? 1 : -1
      return {
        x: side * (5.85 + (i % 5) * 0.25),
        y: 0.04,
        z: -((i * 10 + 3) % 148) - 4,
        sx: 0.32 + (i % 3) * 0.1,
        sy: 0.2 + (i % 2) * 0.08,
        sz: 0.3,
        rot: i * 0.8,
      }
    }),
    148,
    1,
  )

  addLayer(
    geos.bank,
    materials.snow,
    seedLayer(low ? 6 : 10, 180, (i) => {
      const side = i % 2 === 0 ? -1 : 1
      return {
        x: side * (7.2 + (i % 3) * 1.2),
        y: -0.08,
        z: -((i * 18 + 8) % 180) - 10,
        sx: 1 + (i % 2) * 0.2,
        sy: 1,
        sz: 0.9,
        rot: side * 0.12,
      }
    }),
    180,
    1,
  )

  const snowCount = quality === 'low' ? 0 : quality === 'high' ? 70 : 36
  const snow = makePoints(snowCount, 0xedf3f5, 0.05)
  extras.push(snow.geometry)
  snow.visible = snowCount > 0
  root.add(snow)

  return {
    root,
    fog: 0xc5d4de,
    bg: 0xd5e3ea,
    fogNear: 72,
    fogFar: 245,
    setReduced(value) {
      reduced = value
      snow.visible = snowCount > 0 && !value
    },
    reset() {
      sky.rotation.y = 0
    },
    update(dt, moved, distance, playing) {
      sky.rotation.y += dt * 0.002
      floorL.position.z = -90 + ((distance * 0.12) % 20)
      floorR.position.z = floorL.position.z
      for (const layer of layerList) {
        scrollLayer(layer.data, moved * layer.parallax, layer.wrap)
        writeInstances(layer.mesh, layer.data, dummy)
      }
      if (snow.visible && playing && !reduced) {
        const pos = snow.geometry.attributes.position
        const array = pos.array as Float32Array
        for (let i = 0; i < array.length; i += 3) {
          array[i] += dt * 0.55
          array[i + 1] -= dt * 2.6
          array[i + 2] += moved * 0.85
          if (array[i + 1] < 0.2 || array[i + 2] > 12) {
            array[i] = (Math.random() - 0.5) * 20
            array[i + 1] = 8 + Math.random() * 10
            array[i + 2] = -70 - Math.random() * 70
          }
        }
        pos.needsUpdate = true
      }
    },
    dispose() {
      for (const mesh of meshes) mesh.dispose()
      ;(snow.material as THREE.Material).dispose()
      for (const geo of extras) geo.dispose()
      geos.dispose()
    },
  }
}
