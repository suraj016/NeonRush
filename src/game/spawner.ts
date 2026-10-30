import * as THREE from 'three'
import { LANES } from './config.ts'
import { writeObstacleAABB } from './collision.ts'
import type { MaterialSet } from './materials.ts'
import type { AABB, Lane, ObstacleType, PickupType } from './types.ts'
import type { TrackSegment } from './track.ts'
import type { RNG } from '../utils/rng.ts'
import type { DifficultyState } from './difficulty.ts'
import {
  createPropGeos,
  disposePropGeos,
  makeBarrier,
  makeGap,
  makeLow,
  makeMagnet,
  makeMoving,
  makeMultiplier,
  makeOrb,
  makeOverhead,
  makeShield,
  makeSpinner,
  type PropGeos,
} from './props.ts'

export type SpawnedHazard = {
  kind: 'hazard'
  type: ObstacleType
  mesh: THREE.Object3D
  lane: Lane
  localZ: number
  segment: TrackSegment
  alive: boolean
  spin: number
  moveFrom: Lane
  moveTo: Lane
  phase: number
}

export type SpawnedPickup = {
  kind: 'pickup'
  type: PickupType
  mesh: THREE.Object3D
  lane: Lane
  localZ: number
  segment: TrackSegment
  alive: boolean
  bob: number
}

type Pools = {
  barrier: THREE.Group[]
  low: THREE.Group[]
  overhead: THREE.Group[]
  moving: THREE.Group[]
  spinner: THREE.Group[]
  gap: THREE.Group[]
  orb: THREE.Group[]
  shield: THREE.Group[]
  magnet: THREE.Group[]
  multiplier: THREE.Group[]
}

export class Spawner {
  hazards: SpawnedHazard[] = []
  pickups: SpawnedPickup[] = []
  private pools: Pools
  private geos!: PropGeos
  private materials!: MaterialSet
  private lastDecision = 40
  private spawnedDistance = 0
  private scratchBox: AABB = { minX: 0, maxX: 0, minY: 0, maxY: 0, minZ: 0, maxZ: 0 }

  constructor(materials: MaterialSet) {
    this.pools = {
      barrier: [],
      low: [],
      overhead: [],
      moving: [],
      spinner: [],
      gap: [],
      orb: [],
      shield: [],
      magnet: [],
      multiplier: [],
    }
    this.materials = materials
    this.buildPools(materials)
  }

  reset(): void {
    this.reclaimAll()
    this.lastDecision = 40
    this.spawnedDistance = 0
  }

  populate(
    segment: TrackSegment,
    worldDistance: number,
    rng: RNG,
    difficulty: DifficultyState,
    safe: boolean,
  ): void {
    if (safe) {
      this.placeOrbs(segment, rng, 1)
      return
    }

    this.spawnedDistance = Math.max(this.spawnedDistance, worldDistance)
    const sliceCount = rng.chance(difficulty.dualSliceChance) ? 2 : 1
    const offsets = sliceCount === 2 ? [-5, -15] : [-9]

    for (const localZ of offsets) {
      const approx = worldDistance + Math.abs(segment.group.position.z) + Math.abs(localZ)
      if (approx - this.lastDecision < difficulty.minSpacing) {
        this.placeOrbs(segment, rng, 0.45, localZ)
        continue
      }
      this.lastDecision = approx
      this.spawnPattern(segment, localZ, rng, difficulty)
    }
  }

  update(dt: number, playing: boolean): void {
    if (!playing) return
    for (const hazard of this.hazards) {
      if (!hazard.alive) continue
      if (hazard.type === 'spinner') {
        hazard.phase += dt * 2.4
        const rotors = hazard.mesh.userData.spin as THREE.Object3D | undefined
        if (rotors) rotors.rotation.y += dt * 16
        hazard.mesh.position.y = Math.sin(hazard.phase) * 0.07
      }
      if (hazard.type === 'overhead') {
        hazard.phase += dt * 4
        const beam = hazard.mesh.userData.beam as THREE.Object3D | undefined
        if (beam) beam.scale.z = 1 + Math.sin(hazard.phase) * 0.12
      }
      if (hazard.type === 'moving') {
        hazard.phase += dt * 1.35
        const t = 0.5 + 0.5 * Math.sin(hazard.phase)
        const x = LANES[hazard.moveFrom] + (LANES[hazard.moveTo] - LANES[hazard.moveFrom]) * t
        hazard.mesh.position.x = x
      }
    }
    for (const pickup of this.pickups) {
      if (!pickup.alive) continue
      pickup.bob += dt * 3
      pickup.mesh.rotation.y += dt * 2.4
      pickup.mesh.position.y = 0.85 + Math.sin(pickup.bob) * 0.12
      const core = pickup.mesh.userData.core as THREE.Object3D | undefined
      if (core) {
        const pulse = 1 + Math.sin(pickup.bob * 1.8) * 0.14
        core.scale.setScalar(pulse)
      }
    }
  }

  worldBox(hazard: SpawnedHazard): AABB {
    const worldZ = hazard.segment.group.position.z + hazard.localZ
    return writeObstacleAABB(
      this.scratchBox,
      hazard.type,
      hazard.mesh.position.x,
      worldZ,
      hazard.type === 'gap' ? { length: 2.6, width: 1.05 } : undefined,
    )
  }

  pickupBox(pickup: SpawnedPickup): AABB {
    const worldZ = pickup.segment.group.position.z + pickup.localZ
    const box = this.scratchBox
    box.minX = pickup.mesh.position.x - 0.4
    box.maxX = pickup.mesh.position.x + 0.4
    box.minY = 0.3
    box.maxY = 1.6
    box.minZ = worldZ - 0.4
    box.maxZ = worldZ + 0.4
    return box
  }

  killHazard(hazard: SpawnedHazard): void {
    hazard.alive = false
    hazard.mesh.visible = false
    this.release(hazard.type, hazard.mesh as THREE.Group)
    this.removeItem(this.hazards, hazard)
  }

  collect(pickup: SpawnedPickup): void {
    pickup.alive = false
    pickup.mesh.visible = false
    this.release(pickup.type, pickup.mesh as THREE.Group)
    this.removeItem(this.pickups, pickup)
  }

  attract(pickup: SpawnedPickup, targetX: number, dt: number): void {
    pickup.mesh.position.x += (targetX - pickup.mesh.position.x) * Math.min(1, dt * 7)
    pickup.localZ += (0 - pickup.localZ) * Math.min(1, dt * 4)
    pickup.mesh.position.z = pickup.localZ
  }

  reclaimSegment(segment: TrackSegment): void {
    for (let i = this.hazards.length - 1; i >= 0; i -= 1) {
      const item = this.hazards[i]
      if (item.segment !== segment) continue
      this.release(item.type, item.mesh as THREE.Group)
      this.hazards[i] = this.hazards[this.hazards.length - 1]
      this.hazards.pop()
    }
    for (let i = this.pickups.length - 1; i >= 0; i -= 1) {
      const item = this.pickups[i]
      if (item.segment !== segment) continue
      this.release(item.type, item.mesh as THREE.Group)
      this.pickups[i] = this.pickups[this.pickups.length - 1]
      this.pickups.pop()
    }
  }

  dispose(): void {
    this.reclaimAll()
    disposePropGeos(this.geos)
  }

  private spawnPattern(segment: TrackSegment, localZ: number, rng: RNG, difficulty: DifficultyState): void {
    const roll = rng.next()
    const blocked = new Set<Lane>()
    const open = (): Lane[] => ([0, 1, 2] as Lane[]).filter((lane) => !blocked.has(lane))

    if (roll < 0.2) {
      const lane = rng.pick([0, 1, 2] as Lane[])
      this.addHazard(segment, 'barrier', lane, localZ)
      blocked.add(lane)
    } else if (roll < 0.36) {
      const first = rng.pick([0, 1, 2] as Lane[])
      const second = rng.pick(([0, 1, 2] as Lane[]).filter((lane) => lane !== first))
      this.addHazard(segment, 'barrier', first, localZ)
      this.addHazard(segment, 'low', second, localZ)
      blocked.add(first)
    } else if (roll < 0.5) {
      const lane = rng.pick([0, 1, 2] as Lane[])
      this.addHazard(segment, 'overhead', lane, localZ)
      if (rng.chance(0.45)) {
        const other = rng.pick(open().filter((item) => item !== lane))
        this.addHazard(segment, 'low', other, localZ)
      }
    } else if (roll < 0.62) {
      const lane = rng.pick([0, 1, 2] as Lane[])
      this.addHazard(segment, 'low', lane, localZ)
      if (rng.chance(0.5)) {
        const other = rng.pick(([0, 1, 2] as Lane[]).filter((item) => item !== lane))
        this.addHazard(segment, 'low', other, localZ)
      }
    } else if (roll < 0.62 + difficulty.movingChance) {
      const from = rng.pick([0, 2] as Lane[])
      const to = from === 0 ? 2 : 0
      this.addHazard(segment, 'moving', from, localZ, from, to)
    } else if (roll < 0.8) {
      const lane = rng.pick([0, 1, 2] as Lane[])
      this.addHazard(segment, 'spinner', lane, localZ)
    } else if (roll < 0.9 && difficulty.tierIndex > 0) {
      const lane = rng.pick([0, 1, 2] as Lane[])
      this.addHazard(segment, 'gap', lane, localZ)
      segment.lanes[lane].visible = false
    } else {
      const first = rng.pick([0, 1, 2] as Lane[])
      this.addHazard(segment, 'overhead', first, localZ)
    }

    for (const lane of open()) {
      if (rng.chance(0.55 + difficulty.density * 0.2)) {
        this.addPickup(segment, 'orb', lane, localZ + rng.range(-1.4, 1.4))
      }
    }

    if (rng.chance(0.08 + difficulty.tierIndex * 0.03)) {
      const lane = rng.pick(open().length ? open() : ([1] as Lane[]))
      const type = rng.pick(['shield', 'magnet', 'multiplier'] as const)
      this.addPickup(segment, type, lane, localZ - 3)
    }
  }

  private placeOrbs(segment: TrackSegment, rng: RNG, chance: number, localZ = -6): void {
    for (let lane = 0 as Lane; lane <= 2; lane = (lane + 1) as Lane) {
      if (rng.chance(chance)) this.addPickup(segment, 'orb', lane, localZ + rng.range(-2, 2))
    }
  }

  private addHazard(
    segment: TrackSegment,
    type: ObstacleType,
    lane: Lane,
    localZ: number,
    moveFrom: Lane = lane,
    moveTo: Lane = lane,
  ): void {
    const mesh = this.acquire(type)
    mesh.position.set(LANES[lane], 0, localZ)
    mesh.visible = true
    segment.content.add(mesh)
    this.hazards.push({
      kind: 'hazard',
      type,
      mesh,
      lane,
      localZ,
      segment,
      alive: true,
      spin: 0,
      moveFrom,
      moveTo,
      phase: 0,
    })
  }

  private addPickup(segment: TrackSegment, type: PickupType, lane: Lane, localZ: number): void {
    const mesh = this.acquire(type)
    mesh.position.set(LANES[lane], 0.85, localZ)
    mesh.visible = true
    segment.content.add(mesh)
    this.pickups.push({
      kind: 'pickup',
      type,
      mesh,
      lane,
      localZ,
      segment,
      alive: true,
      bob: lane,
    })
  }

  private removeItem<T>(list: T[], item: T): void {
    const index = list.indexOf(item)
    if (index < 0) return
    list[index] = list[list.length - 1]
    list.pop()
  }

  private acquire(type: ObstacleType | PickupType): THREE.Group {
    const item = this.pools[type].pop()
    if (item) return item
    if (type === 'orb') return makeOrb(this.geos, this.materials)
    if (type === 'barrier') return makeBarrier(this.geos, this.materials)
    if (type === 'low') return makeLow(this.geos, this.materials)
    if (type === 'overhead') return makeOverhead(this.geos, this.materials)
    if (type === 'moving') return makeMoving(this.geos, this.materials)
    if (type === 'spinner') return makeSpinner(this.geos, this.materials)
    if (type === 'gap') return makeGap(this.geos, this.materials)
    if (type === 'shield') return makeShield(this.geos, this.materials)
    if (type === 'magnet') return makeMagnet(this.geos, this.materials)
    return makeMultiplier(this.geos, this.materials)
  }

  private release(type: ObstacleType | PickupType, mesh: THREE.Group): void {
    mesh.removeFromParent()
    mesh.visible = false
    mesh.position.set(0, 0, 0)
    mesh.rotation.set(0, 0, 0)
    mesh.scale.set(1, 1, 1)
    const core = mesh.userData.core as THREE.Object3D | undefined
    if (core) core.scale.setScalar(1)
    const beam = mesh.userData.beam as THREE.Object3D | undefined
    if (beam) beam.scale.set(1, 1, 1)
    this.pools[type].push(mesh)
  }

  private reclaimAll(): void {
    for (const hazard of this.hazards) this.release(hazard.type, hazard.mesh as THREE.Group)
    for (const pickup of this.pickups) this.release(pickup.type, pickup.mesh as THREE.Group)
    this.hazards = []
    this.pickups = []
  }

  private buildPools(materials: MaterialSet): void {
    this.geos = createPropGeos()
    const fill = (type: keyof Pools, count: number, factory: () => THREE.Group) => {
      for (let i = 0; i < count; i += 1) this.pools[type].push(factory())
    }
    fill('barrier', 16, () => makeBarrier(this.geos, materials))
    fill('low', 16, () => makeLow(this.geos, materials))
    fill('overhead', 14, () => makeOverhead(this.geos, materials))
    fill('moving', 8, () => makeMoving(this.geos, materials))
    fill('spinner', 10, () => makeSpinner(this.geos, materials))
    fill('gap', 8, () => makeGap(this.geos, materials))
    fill('orb', 72, () => makeOrb(this.geos, materials))
    fill('shield', 6, () => makeShield(this.geos, materials))
    fill('magnet', 6, () => makeMagnet(this.geos, materials))
    fill('multiplier', 6, () => makeMultiplier(this.geos, materials))
  }
}
