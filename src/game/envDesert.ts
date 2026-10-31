import * as THREE from 'three'
import { createDesertGeos } from './desertGeo.ts'
import { makePoints, scrollLayer, seedLayer, writeInstances, type EnvPack, type InstanceData } from './envShared.ts'
import type { MaterialSet } from './materials.ts'
import type { Quality } from './types.ts'

function themeOf(index: number): number {
  return Math.floor(index / 2) % 7
}

function wallX(theme: number, side: number, index: number): number {
  const jitter = (index % 3) * 0.35
  if (theme === 0) return side * (6.75 + jitter * 0.4)
  if (theme === 1) return side * (14.8 + (index % 4) * 1.1)
  if (theme === 2) return side * (11.4 + jitter)
  if (theme === 3) return side * (7.7 + jitter * 0.5)
  if (theme === 4) return side * (12.6 + jitter)
  if (theme === 5) return side * (8.15 + jitter * 0.45)
  return side * (13.4 + (index % 2) * 0.8)
}

function wallScale(theme: number, index: number): { sx: number; sy: number; sz: number } {
  if (theme === 0) return { sx: 0.95, sy: 1.12 + (index % 3) * 0.08, sz: 0.92 }
  if (theme === 1) return { sx: 0.82, sy: 0.62 + (index % 2) * 0.1, sz: 1.05 }
  if (theme === 3) return { sx: 1.05, sy: 0.88, sz: 0.78 }
  if (theme === 5) return { sx: 1.08, sy: 1.22 + (index % 2) * 0.1, sz: 1.0 }
  return { sx: 0.92 + (index % 2) * 0.08, sy: 0.86 + (index % 4) * 0.08, sz: 0.9 }
}

export function createDesertEnv(materials: MaterialSet, quality: Quality): EnvPack {
  const root = new THREE.Group()
  const dummy = new THREE.Object3D()
  const extras: THREE.BufferGeometry[] = []
  const meshes: THREE.InstancedMesh[] = []
  const geos = createDesertGeos(quality)
  let reduced = false

  const sky = new THREE.Mesh(new THREE.SphereGeometry(170, 16, 12), materials.desertSkyMat)
  extras.push(sky.geometry)
  sky.position.y = 18
  root.add(sky)

  const floorGeo = new THREE.PlaneGeometry(92, 280)
  extras.push(floorGeo)
  const floorL = new THREE.Mesh(floorGeo, materials.desertDeck)
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
    const mesh = new THREE.InstancedMesh(geo, mat, data.length)
    mesh.frustumCulled = false
    writeInstances(mesh, data, dummy)
    root.add(mesh)
    meshes.push(mesh)
    layerList.push({ mesh, data, wrap, parallax })
  }

  const low = quality === 'low'
  const cliffCount = low ? 8 : 14
  const cliffAData: InstanceData[] = []
  const cliffBData: InstanceData[] = []
  for (let i = 0; i < cliffCount; i += 1) {
    const side = i % 2 === 0 ? -1 : 1
    const theme = themeOf(i)
    const scale = wallScale(theme, i)
    const item: InstanceData = {
      x: wallX(theme, side, i),
      y: 0,
      z: -((i * 16) % 224) - 8,
      sx: scale.sx,
      sy: scale.sy,
      sz: scale.sz,
      rot: side > 0 ? 0.04 + (i % 3) * 0.03 : -0.05 - (i % 2) * 0.03,
    }
    if (i % 2 === 0) cliffAData.push(item)
    else cliffBData.push(item)
  }
  addLayer(geos.cliffA, materials.canyon, cliffAData, 224, 1)
  addLayer(geos.cliffB, materials.canyon, cliffBData, 224, 1)

  const mesaCount = low ? 4 : 7
  addLayer(
    geos.mesa,
    materials.canyonLight,
    seedLayer(mesaCount, 210, (i) => {
      const side = i % 2 === 0 ? -1 : 1
      return {
        x: side * (16.5 + (i % 3) * 1.4),
        y: 0,
        z: -((i * 30 + 12) % 210) - 18,
        sx: 0.85 + (i % 2) * 0.15,
        sy: 0.7 + (i % 3) * 0.12,
        sz: 0.9,
        rot: side * 0.12,
      }
    }),
    210,
    0.72,
  )

  addLayer(
    geos.ridgeNear,
    materials.canyonLight,
    seedLayer(low ? 6 : 10, 240, (i) => {
      const side = i % 2 === 0 ? -1 : 1
      return {
        x: side * (24 + (i % 4) * 2.2),
        y: 0,
        z: -((i * 24) % 240) - 28,
        sx: 1.05 + (i % 3) * 0.08,
        sy: 0.85 + (i % 4) * 0.1,
        sz: 1,
        rot: side * 0.08,
      }
    }),
    240,
    0.48,
  )

  addLayer(
    geos.ridgeFar,
    materials.mesaFar,
    seedLayer(low ? 8 : 12, 280, (i) => {
      const side = i % 2 === 0 ? -1 : 1
      return {
        x: side * (38 + (i % 5) * 2.6),
        y: -0.4,
        z: -((i * 22) % 280) - 40,
        sx: 1.15,
        sy: 0.8 + (i % 3) * 0.12,
        sz: 1,
        rot: 0,
      }
    }),
    280,
    0.26,
  )

  addLayer(
    geos.ruin,
    materials.sandstone,
    seedLayer(low ? 4 : 7, 200, (i) => {
      const side = i % 2 === 0 ? -1 : 1
      const buried = i % 3 === 0
      return {
        x: side * (7.1 + (i % 3) * 0.7),
        y: buried ? -0.35 : 0,
        z: -((i * 28 + 10) % 200) - 14,
        sx: 0.9 + (i % 2) * 0.12,
        sy: buried ? 0.72 : 0.95,
        sz: 0.9,
        rot: (i % 5) * 0.22 * side,
      }
    }),
    200,
    1,
  )

  addLayer(
    geos.ruinB,
    materials.sandstone,
    seedLayer(low ? 3 : 5, 190, (i) => {
      const side = i % 2 === 0 ? 1 : -1
      return {
        x: side * (8.4 + (i % 2)),
        y: i % 2 === 0 ? -0.2 : 0,
        z: -((i * 36 + 20) % 190) - 22,
        sx: 1,
        sy: 0.85 + (i % 2) * 0.15,
        sz: 1,
        rot: side * 0.3,
      }
    }),
    190,
    1,
  )

  addLayer(
    geos.temple,
    materials.sandstone,
    seedLayer(low ? 3 : 5, 220, (i) => {
      const side = i % 2 === 0 ? -1 : 1
      return {
        x: side * (10.4 + (i % 2) * 0.5),
        y: i % 3 === 0 ? -0.25 : 0,
        z: -((i * 44 + 26) % 220) - 30,
        sx: 0.95,
        sy: 0.88 + (i % 2) * 0.1,
        sz: 0.95,
        rot: side > 0 ? -0.2 : 0.18,
      }
    }),
    220,
    1,
  )

  addLayer(
    geos.arch,
    materials.sandstone,
    seedLayer(low ? 2 : 4, 200, (i) => {
      const side = i % 2 === 0 ? -1 : 1
      return {
        x: side * 7.6,
        y: 0,
        z: -((i * 50 + 32) % 200) - 24,
        sx: 1,
        sy: 0.92,
        sz: 1,
        rot: side * 0.08,
      }
    }),
    200,
    1,
  )

  addLayer(
    geos.cactusA,
    materials.cactus,
    seedLayer(low ? 8 : 12, 176, (i) => {
      const side = i % 2 === 0 ? -1 : 1
      const cluster = Math.floor(i / 3)
      return {
        x: side * (6.35 + (i % 3) * 0.42 + (cluster % 2) * 0.3),
        y: 0,
        z: -((cluster * 22 + (i % 3) * 1.4) % 176) - 7,
        sx: 0.85 + (i % 3) * 0.18,
        sy: 0.8 + (i % 4) * 0.16,
        sz: 0.85 + (i % 2) * 0.12,
        rot: (i % 5) * 0.35,
      }
    }),
    176,
    1,
  )

  addLayer(
    geos.cactusB,
    materials.cactus,
    seedLayer(low ? 5 : 8, 168, (i) => {
      const side = i % 2 === 0 ? 1 : -1
      return {
        x: side * (6.6 + (i % 4) * 0.5),
        y: 0,
        z: -((i * 20 + 9) % 168) - 11,
        sx: 0.7 + (i % 3) * 0.2,
        sy: 0.75 + (i % 2) * 0.25,
        sz: 0.75,
        rot: i * 0.4,
      }
    }),
    168,
    1,
  )

  addLayer(
    geos.shrub,
    materials.desertShrub,
    seedLayer(low ? 8 : 14, 170, (i) => {
      const side = i % 2 === 0 ? -1 : 1
      const cluster = Math.floor(i / 2)
      return {
        x: side * (6.2 + (i % 4) * 0.55),
        y: 0,
        z: -((cluster * 18 + (i % 2) * 1.1) % 170) - 6,
        sx: 0.9 + (i % 3) * 0.2,
        sy: 0.75 + (i % 2) * 0.2,
        sz: 0.9,
        rot: i * 0.5,
      }
    }),
    170,
    1,
  )

  addLayer(
    geos.rockA,
    materials.desertRock,
    seedLayer(low ? 8 : 12, 158, (i) => {
      const side = i % 2 === 0 ? -1 : 1
      return {
        x: side * (5.85 + (i % 4) * 0.38),
        y: 0.08,
        z: -((i * 13 + 5) % 158) - 5,
        sx: 0.7 + (i % 5) * 0.22,
        sy: 0.45 + (i % 3) * 0.22,
        sz: 0.65 + (i % 4) * 0.18,
        rot: i * 0.7,
      }
    }),
    158,
    1,
  )

  addLayer(
    geos.rockB,
    materials.desertRock,
    seedLayer(low ? 8 : 16, 150, (i) => {
      const side = i % 2 === 0 ? 1 : -1
      return {
        x: side * (5.95 + (i % 5) * 0.28),
        y: 0.04,
        z: -((i * 9 + 3) % 150) - 4,
        sx: 0.35 + (i % 4) * 0.12,
        sy: 0.22 + (i % 3) * 0.1,
        sz: 0.32 + (i % 2) * 0.1,
        rot: i * 0.9,
      }
    }),
    150,
    1,
  )

  addLayer(
    geos.dune,
    materials.desertDeck,
    seedLayer(low ? 6 : 10, 186, (i) => {
      const side = i % 2 === 0 ? -1 : 1
      return {
        x: side * (8.8 + (i % 3) * 1.6),
        y: -0.12,
        z: -((i * 18 + 8) % 186) - 10,
        sx: 1 + (i % 3) * 0.2,
        sy: 1,
        sz: 0.9 + (i % 2) * 0.2,
        rot: side * 0.15,
      }
    }),
    186,
    1,
  )

  const dustCount = quality === 'low' ? 0 : quality === 'high' ? 56 : 28
  const dust = makePoints(dustCount, 0xddd0b0, 0.055)
  extras.push(dust.geometry)
  dust.visible = dustCount > 0
  root.add(dust)

  return {
    root,
    fog: 0xd2c09a,
    bg: 0xe8d4b0,
    fogNear: 78,
    fogFar: 250,
    setReduced(value) {
      reduced = value
      dust.visible = dustCount > 0 && !value
    },
    reset() {
      sky.rotation.y = 0
    },
    update(dt, moved, distance, playing) {
      sky.rotation.y += dt * 0.003
      floorL.position.z = -90 + ((distance * 0.12) % 20)
      floorR.position.z = floorL.position.z
      for (const layer of layerList) {
        scrollLayer(layer.data, moved * layer.parallax, layer.wrap)
        writeInstances(layer.mesh, layer.data, dummy)
      }
      if (dust.visible && playing && !reduced) {
        const pos = dust.geometry.attributes.position
        const array = pos.array as Float32Array
        for (let i = 0; i < array.length; i += 3) {
          array[i] += dt * 1.2
          array[i + 2] += moved * 1.05
          if (array[i + 2] > 12 || array[i] > 14) {
            array[i] = (Math.random() - 0.5) * 22
            array[i + 1] = 1 + Math.random() * 7
            array[i + 2] = -80 - Math.random() * 60
          }
        }
        pos.needsUpdate = true
      }
    },
    dispose() {
      for (const mesh of meshes) mesh.dispose()
      ;(dust.material as THREE.Material).dispose()
      for (const geo of extras) geo.dispose()
      geos.dispose()
    },
  }
}
