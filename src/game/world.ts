import * as THREE from 'three'
import { THEMES } from './config.ts'
import { createBuildingGeometry, createSkylineGeometry } from './cityBuildings.ts'
import { createDesertEnv } from './envDesert.ts'
import { createFrozenEnv } from './envFrozen.ts'
import type { EnvPack } from './envShared.ts'
import type { MapId } from './maps.ts'
import type { MaterialSet } from './materials.ts'
import type { Quality } from './types.ts'
import { damp } from '../utils/math.ts'
import { themeIndexForDistance } from './difficulty.ts'

type InstanceData = {
  x: number
  y: number
  z: number
  sx: number
  sy: number
  sz: number
  rot: number
}

type Layer = {
  mesh: THREE.InstancedMesh
  data: InstanceData[]
  wrap: number
  parallax: number
}

export class World {
  readonly root = new THREE.Group()
  private layers: Layer[] = []
  private arches: THREE.InstancedMesh
  private drones: THREE.Group[] = []
  private trains: THREE.Group[] = []
  private holos: THREE.Mesh[] = []
  private particles: THREE.Points
  private particleGeo: THREE.BufferGeometry
  private dummy = new THREE.Object3D()
  private archData: { z: number }[] = []
  private theme = 0
  private fog: THREE.Fog
  private scene: THREE.Scene
  private reduced = false
  private extras: THREE.BufferGeometry[] = []
  private time = 0
  private sky: THREE.Mesh
  private floorL: THREE.Mesh
  private floorR: THREE.Mesh
  private rails: THREE.Mesh[] = []
  private holoPulse = 0
  private themeTarget = new THREE.Color()
  private themeAccent = new THREE.Color()
  private holoFrame = 0
  private mapId: MapId = 'emerald'
  private emeraldRoot = new THREE.Group()
  private desert: EnvPack
  private frozen: EnvPack

  constructor(scene: THREE.Scene, materials: MaterialSet, quality: Quality) {
    this.scene = scene
    this.fog = new THREE.Fog(0x102923, 58, 205)
    scene.fog = this.fog
    scene.background = new THREE.Color(0x0e2420)

    const skyGeo = new THREE.SphereGeometry(170, 16, 12)
    this.extras.push(skyGeo)
    this.sky = new THREE.Mesh(skyGeo, materials.sky)
    this.sky.position.y = 20
    this.root.add(this.sky)

    const floorGeo = new THREE.PlaneGeometry(70, 260)
    this.extras.push(floorGeo)
    this.floorL = new THREE.Mesh(floorGeo, materials.cityFloor)
    this.floorL.rotation.x = -Math.PI / 2
    this.floorL.position.set(-40, -0.35, -90)
    this.floorR = this.floorL.clone()
    this.floorR.position.x = 40
    this.root.add(this.floorL, this.floorR)

    const neonMats = [materials.glowCyan, materials.glowBlue, materials.glowLime, materials.glowViolet]
    const nearCount = quality === 'low' ? 4 : 6
    const kinds = quality === 'low' ? 4 : 6
    for (let kind = 0; kind < kinds; kind += 1) {
      const geo = createBuildingGeometry(kind)
      this.extras.push(geo)
      const facade = materials.facades[kind % materials.facades.length]
      const neon = neonMats[kind % neonMats.length]
      const mesh = new THREE.InstancedMesh(geo, [facade, neon], nearCount)
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
      mesh.castShadow = false
      mesh.receiveShadow = false
      mesh.frustumCulled = false
      const data: InstanceData[] = []
      for (let i = 0; i < nearCount; i += 1) {
        const side = (kind + i) % 2 === 0 ? -1 : 1
        const lane = 7.4 + (kind % 3) * 1.6 + (i % 2) * 0.7
        const z = -((i * 34 + kind * 17) % 204) - 8
        const sy = 0.55 + ((kind * 5 + i * 3) % 7) * 0.13
        data.push({
          x: side * lane,
          y: 0,
          z,
          sx: 0.88 + (i % 3) * 0.08,
          sy,
          sz: 0.86 + (kind % 2) * 0.1,
          rot: side > 0 ? Math.PI : 0,
        })
      }
      this.layers.push({ mesh, data, wrap: 204, parallax: 1 })
      this.root.add(mesh)
    }

    const farCount = quality === 'low' ? 18 : quality === 'medium' ? 28 : 36
    const skyGeoBuilding = createSkylineGeometry()
    this.extras.push(skyGeoBuilding)
    const skyMesh = new THREE.InstancedMesh(skyGeoBuilding, materials.skyline, farCount)
    skyMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    skyMesh.frustumCulled = false
    const farData: InstanceData[] = []
    for (let i = 0; i < farCount; i += 1) {
      const side = i % 2 === 0 ? -1 : 1
      farData.push({
        x: side * (16 + (i % 8) * 2.4),
        y: 0,
        z: -((i * 9.5) % 280) - 20,
        sx: 1.1 + (i % 4) * 0.18,
        sy: 1.2 + (i % 7) * 0.22,
        sz: 1.05,
        rot: side > 0 ? Math.PI : 0,
      })
    }
    this.layers.push({ mesh: skyMesh, data: farData, wrap: 280, parallax: 0.48 })
    this.root.add(skyMesh)

    for (const layer of this.layers) this.writeLayer(layer)

    const railGeo = new THREE.BoxGeometry(0.22, 0.08, 80)
    this.extras.push(railGeo)
    for (const side of [-1, 1]) {
      const rail = new THREE.Mesh(railGeo, materials.glowBlue)
      rail.position.set(side * 10.4, 7.6, -40)
      this.rails.push(rail)
      this.root.add(rail)
    }

    const archGeo = new THREE.TorusGeometry(5.6, 0.07, 8, 24, Math.PI)
    this.extras.push(archGeo)
    this.arches = new THREE.InstancedMesh(archGeo, materials.glowViolet, 10)
    this.arches.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    for (let i = 0; i < 10; i += 1) {
      this.archData.push({ z: -i * 22 - 14 })
      this.writeArch(i, 0.08)
    }
    this.root.add(this.arches)

    const droneCount = quality === 'low' ? 3 : 7
    for (let i = 0; i < droneCount; i += 1) {
      const drone = new THREE.Group()
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.16, 0.34), materials.metal)
      const wing = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.04, 0.18), materials.glowCyan)
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.4), i % 2 ? materials.glowLime : materials.glowBlue)
      tail.position.z = 0.3
      drone.add(body, wing, tail)
      drone.position.set((i % 2 ? 11 : -11) + (i % 3), 9 + (i % 4) * 1.6, -24 - i * 18)
      this.drones.push(drone)
      this.root.add(drone)
    }

    for (let i = 0; i < 2; i += 1) {
      const train = new THREE.Group()
      const car = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.45, 3.4), materials.metal)
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.08, 3.4), i ? materials.glowBlue : materials.glowCyan)
      stripe.position.y = 0.12
      train.add(car, stripe)
      train.position.set(i ? 10.4 : -10.4, 7.85, -30 - i * 40)
      this.trains.push(train)
      this.root.add(train)
    }

    const signGeo = new THREE.PlaneGeometry(2.8, 1.3)
    this.extras.push(signGeo)
    for (let i = 0; i < materials.holoMats.length; i += 1) {
      const sign = new THREE.Mesh(signGeo, materials.holoMats[i])
      const side = i % 2 === 0 ? -1 : 1
      sign.position.set(side * 5.35, 3.1 + (i % 3) * 0.35, -18 - i * 24)
      sign.rotation.y = side > 0 ? -0.48 : 0.48
      this.holos.push(sign)
      this.root.add(sign)
    }

    const extraHolo = new THREE.PlaneGeometry(3.6, 5.2)
    this.extras.push(extraHolo)
    for (let i = 0; i < 4; i += 1) {
      const mat = materials.holoMats[i]
      const board = new THREE.Mesh(extraHolo, mat)
      const side = i % 2 === 0 ? -1 : 1
      board.position.set(side * 7.3, 8.5, -40 - i * 36)
      board.rotation.y = side > 0 ? -0.2 : 0.2
      this.holos.push(board)
      this.root.add(board)
    }

    const particleCount = quality === 'low' ? 0 : quality === 'high' ? 80 : 36
    const positions = new Float32Array(Math.max(1, particleCount) * 3)
    for (let i = 0; i < particleCount; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 28
      positions[i * 3 + 1] = 1 + Math.random() * 16
      positions[i * 3 + 2] = -Math.random() * 150
    }
    this.particleGeo = new THREE.BufferGeometry()
    this.particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    this.particles = new THREE.Points(
      this.particleGeo,
      new THREE.PointsMaterial({
        color: 0x8fffd0,
        size: 0.06,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
      }),
    )
    this.particles.visible = particleCount > 0
    this.root.add(this.particles)

    const existing = [...this.root.children]
    for (const child of existing) this.emeraldRoot.add(child)
    this.root.add(this.emeraldRoot)
    this.desert = createDesertEnv(materials, quality)
    this.frozen = createFrozenEnv(materials, quality)
    this.desert.root.visible = false
    this.frozen.root.visible = false
    this.root.add(this.desert.root, this.frozen.root)
  }

  setQuality(quality: Quality, reduced: boolean): void {
    this.reduced = reduced
    this.particles.visible = this.mapId === 'emerald' && quality !== 'low' && !reduced
    this.desert.setReduced(reduced)
    this.frozen.setReduced(reduced)
  }

  setMap(id: MapId): void {
    this.mapId = id
    this.emeraldRoot.visible = id === 'emerald'
    this.desert.root.visible = id === 'desert'
    this.frozen.root.visible = id === 'frozen'
    this.particles.visible = id === 'emerald' && !this.reduced
    const pack = id === 'desert' ? this.desert : id === 'frozen' ? this.frozen : null
    if (pack) {
      this.scene.background = new THREE.Color(pack.bg)
      this.fog.color.setHex(pack.fog)
      this.fog.near = pack.fogNear
      this.fog.far = pack.fogFar
    } else {
      this.applyTheme(0, 8)
    }
  }

  currentMap(): MapId {
    return this.mapId
  }

  reset(): void {
    this.theme = 0
    this.time = 0
    this.desert.reset()
    this.frozen.reset()
    if (this.mapId === 'emerald') this.applyTheme(0, 1)
    else this.setMap(this.mapId)
  }

  update(dt: number, distanceMoved: number, runDistance: number, playing: boolean): void {
    if (this.mapId === 'desert') {
      this.desert.update(dt, distanceMoved, runDistance, playing)
      return
    }
    if (this.mapId === 'frozen') {
      this.frozen.update(dt, distanceMoved, runDistance, playing)
      return
    }
    this.time += dt
    const targetTheme = themeIndexForDistance(runDistance)
    if (targetTheme !== this.theme) this.theme = targetTheme
    this.applyTheme(this.theme, dt)
    this.holoPulse += dt
    this.holoFrame += 1

    for (const layer of this.layers) {
      const moved = distanceMoved * layer.parallax
      for (let i = 0; i < layer.data.length; i += 1) {
        const data = layer.data[i]
        data.z += moved
        if (data.z > 28) data.z -= layer.wrap
      }
      this.writeLayer(layer)
    }

    const tunnel = this.theme === 1 ? 1 : 0.12
    for (let i = 0; i < this.archData.length; i += 1) {
      this.archData[i].z += distanceMoved
      if (this.archData[i].z > 18) this.archData[i].z -= 10 * 22
      this.writeArch(i, tunnel)
    }
    this.arches.instanceMatrix.needsUpdate = true
    this.arches.visible = this.theme !== 0 || runDistance > 700

    for (let i = 0; i < this.drones.length; i += 1) {
      const drone = this.drones[i]
      drone.position.z += distanceMoved * 0.7 + dt * 4
      drone.position.y = 9 + (i % 4) * 1.6 + Math.sin(this.time * 0.9 + i) * 0.35
      drone.rotation.z = Math.sin(this.time * 1.4 + i) * 0.08
      if (drone.position.z > 22) drone.position.z -= 140
    }

    for (let i = 0; i < this.trains.length; i += 1) {
      const train = this.trains[i]
      train.position.z += distanceMoved * 0.85 + dt * (i ? 10 : 8)
      if (train.position.z > 20) train.position.z -= 120
    }

    for (const rail of this.rails) {
      rail.position.z += distanceMoved * 0.85
      if (rail.position.z > 20) rail.position.z -= 80
    }

    const pulseHolo = this.holoFrame % 3 === 0 && !this.reduced
    for (let i = 0; i < this.holos.length; i += 1) {
      const sign = this.holos[i]
      sign.position.z += distanceMoved
      if (sign.position.z > 18) sign.position.z -= 8 * 24
      if (pulseHolo) {
        const mat = sign.material as THREE.MeshBasicMaterial
        mat.opacity = 0.72 + Math.sin(this.holoPulse * 2.2 + i) * 0.18
      }
    }

    this.sky.rotation.y += dt * 0.01
    this.floorL.position.z = -90 + ((runDistance * 0.15) % 20)
    this.floorR.position.z = this.floorL.position.z

    if (this.particles.visible && playing && !this.reduced) {
      const pos = this.particleGeo.attributes.position
      const array = pos.array as Float32Array
      for (let i = 0; i < array.length; i += 3) {
        array[i + 2] += distanceMoved * 1.25
        array[i + 1] -= dt * 2.4
        if (array[i + 2] > 12 || array[i + 1] < 0.2) {
          array[i] = (Math.random() - 0.5) * 22
          array[i + 1] = 4 + Math.random() * 12
          array[i + 2] = -70 - Math.random() * 80
        }
      }
      pos.needsUpdate = true
    }
  }

  private writeLayer(layer: Layer): void {
    for (let i = 0; i < layer.data.length; i += 1) {
      const data = layer.data[i]
      this.dummy.position.set(data.x, data.y, data.z)
      this.dummy.scale.set(data.sx, data.sy, data.sz)
      this.dummy.rotation.set(0, data.rot, 0)
      this.dummy.updateMatrix()
      layer.mesh.setMatrixAt(i, this.dummy.matrix)
    }
    layer.mesh.instanceMatrix.needsUpdate = true
  }

  private writeArch(i: number, visible: number): void {
    this.dummy.position.set(0, 0.15, this.archData[i].z)
    this.dummy.rotation.set(0, 0, 0)
    this.dummy.scale.set(visible, visible, visible)
    this.dummy.updateMatrix()
    this.arches.setMatrixAt(i, this.dummy.matrix)
  }

  private applyTheme(index: number, dt: number): void {
    const theme = THEMES[index]
    const current = this.scene.background as THREE.Color
    this.themeTarget.setHex(index === 0 ? 0x0e2420 : theme.fog)
    current.lerp(this.themeTarget, 1 - Math.exp(-dt * 0.9))
    this.fog.color.copy(current)
    this.fog.near = 55
    this.fog.far = damp(this.fog.far, index === 1 ? 150 : 210, 1.2, dt)
    this.themeAccent.setHex(theme.accent)
    ;(this.arches.material as THREE.MeshBasicMaterial).color.lerp(this.themeAccent, 0.08)
  }

  dispose(): void {
    for (const layer of this.layers) layer.mesh.dispose()
    this.arches.dispose()
    this.particleGeo.dispose()
    ;(this.particles.material as THREE.Material).dispose()
    for (const geo of this.extras) geo.dispose()
    this.desert.dispose()
    this.frozen.dispose()
  }
}
