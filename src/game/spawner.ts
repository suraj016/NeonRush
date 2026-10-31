import * as THREE from 'three'
import { LANES } from './config.ts'
import { writeObstacleAABB } from './collision.ts'
import type { MaterialSet } from './materials.ts'
import type { AABB, Lane, ObstacleType, PickupType } from './types.ts'
import type { TrackSegment } from './track.ts'
import type { RNG } from '../utils/rng.ts'
import type { DifficultyState } from './difficulty.ts'
import type { MapId } from './maps.ts'
import {
  makeDesertBarrier,
  makeDesertGap,
  makeDesertLow,
  makeDesertMoving,
  makeDesertOrb,
  makeDesertOverhead,
  makeDesertSpinner,
  makeFrozenBarrier,
  makeFrozenGap,
  makeFrozenLow,
  makeFrozenMoving,
  makeFrozenOrb,
  makeFrozenOverhead,
  makeFrozenSpinner,
} from './mapProps.ts'
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
  passed: boolean
  nearMissed: boolean
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
  private mapId: MapId = 'emerald'
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
    this.buildPools()
  }

  setMap(id: MapId): void {
    if (id === this.mapId) return
    this.reclaimAll()
    this.clearPools()
    this.mapId = id
    this.buildPools()
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
    const blocked = new Set<Lane>()
    const open = (): Lane[] => ([0, 1, 2] as Lane[]).filter((lane) => !blocked.has(lane))
    const roll = rng.next()
    const tier = difficulty.tierIndex

    if (tier === 0) {
      if (roll < 0.28) this.patternLaneDecision(segment, localZ, rng, blocked)
      else if (roll < 0.52) this.patternJump(segment, localZ, rng)
      else if (roll < 0.74) this.patternSlide(segment, localZ, rng)
      else this.patternTrail(segment, localZ, rng)
    } else if (tier === 1) {
      if (roll < 0.2) this.patternLaneDecision(segment, localZ, rng, blocked)
      else if (roll < 0.38) this.patternJump(segment, localZ, rng)
      else if (roll < 0.52) this.patternSlide(segment, localZ, rng)
      else if (roll < 0.7) this.patternRapid(segment, localZ, rng, blocked)
      else if (roll < 0.86) this.patternRisk(segment, localZ, rng, blocked)
      else this.patternTrail(segment, localZ, rng)
    } else {
      if (roll < 0.14) this.patternLaneDecision(segment, localZ, rng, blocked)
      else if (roll < 0.28) this.patternJump(segment, localZ, rng)
      else if (roll < 0.4) this.patternSlide(segment, localZ, rng)
      else if (roll < 0.56) this.patternRapid(segment, localZ, rng, blocked)
      else if (roll < 0.68) this.patternRisk(segment, localZ, rng, blocked)
      else if (roll < 0.68 + difficulty.movingChance) this.patternMoving(segment, localZ, rng)
      else if (roll < 0.86) this.patternSpinner(segment, localZ, rng, blocked)
      else if (roll < 0.94 && tier >= 3) this.patternGap(segment, localZ, rng)
      else this.patternTrail(segment, localZ, rng)
    }

    const safe = open()
    for (const lane of safe) {
      if (rng.chance(0.5 + difficulty.density * 0.22)) {
        this.addPickup(segment, 'orb', lane, localZ + rng.range(-1.2, 1.2))
      }
    }

    if (rng.chance(0.07 + difficulty.tierIndex * 0.03)) {
      const lane = rng.pick(safe.length ? safe : ([1] as Lane[]))
      const type = rng.pick(['shield', 'magnet', 'multiplier'] as const)
      this.addPickup(segment, type, lane, localZ - 3)
    }
  }

  private patternLaneDecision(segment: TrackSegment, localZ: number, rng: RNG, blocked: Set<Lane>): void {
    const lane = rng.pick([0, 1, 2] as Lane[])
    this.addHazard(segment, 'barrier', lane, localZ)
    blocked.add(lane)
    const reward = rng.pick(([0, 1, 2] as Lane[]).filter((item) => item !== lane))
    this.placeTrail(segment, reward, localZ + 1.2, 3)
  }

  private patternJump(segment: TrackSegment, localZ: number, rng: RNG): void {
    const lane = rng.pick([0, 1, 2] as Lane[])
    this.addHazard(segment, 'low', lane, localZ)
    this.placeTrail(segment, lane, localZ - 2.2, 3)
  }

  private patternSlide(segment: TrackSegment, localZ: number, rng: RNG): void {
    const lane = rng.pick([0, 1, 2] as Lane[])
    this.addHazard(segment, 'overhead', lane, localZ)
    if (rng.chance(0.4)) this.addPickup(segment, 'orb', lane, localZ - 2)
  }

  private patternRapid(segment: TrackSegment, localZ: number, rng: RNG, blocked: Set<Lane>): void {
    const first = rng.pick([0, 1, 2] as Lane[])
    const second = rng.pick(([0, 1, 2] as Lane[]).filter((lane) => lane !== first))
    this.addHazard(segment, 'barrier', first, localZ)
    this.addHazard(segment, 'barrier', second, localZ)
    blocked.add(first)
    blocked.add(second)
  }

  private patternRisk(segment: TrackSegment, localZ: number, rng: RNG, blocked: Set<Lane>): void {
    const lane = rng.pick([0, 1, 2] as Lane[])
    this.addHazard(segment, 'barrier', lane, localZ)
    blocked.add(lane)
    this.placeTrail(segment, lane, localZ + 2.4, 2)
    const safe = rng.pick(([0, 1, 2] as Lane[]).filter((item) => item !== lane))
    this.addPickup(segment, 'orb', safe, localZ)
  }

  private patternMoving(segment: TrackSegment, localZ: number, rng: RNG): void {
    const from = rng.pick([0, 2] as Lane[])
    const to = from === 0 ? 2 : 0
    this.addHazard(segment, 'moving', from, localZ, from, to)
    this.placeTrail(segment, 1, localZ + 1.4, 3)
  }

  private patternSpinner(segment: TrackSegment, localZ: number, rng: RNG, blocked: Set<Lane>): void {
    const lane = rng.pick([0, 1, 2] as Lane[])
    this.addHazard(segment, 'spinner', lane, localZ)
    blocked.add(lane)
  }

  private patternGap(segment: TrackSegment, localZ: number, rng: RNG): void {
    const lane = rng.pick([0, 1, 2] as Lane[])
    this.addHazard(segment, 'gap', lane, localZ)
    segment.lanes[lane].visible = false
    this.addPickup(segment, 'orb', lane, localZ - 2.4)
  }

  private patternTrail(segment: TrackSegment, localZ: number, rng: RNG): void {
    const lane = rng.pick([0, 1, 2] as Lane[])
    this.placeTrail(segment, lane, localZ + 1.6, 4)
  }

  private placeTrail(segment: TrackSegment, lane: Lane, startZ: number, count: number): void {
    for (let i = 0; i < count; i += 1) {
      this.addPickup(segment, 'orb', lane, startZ - i * 2.1)
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
      passed: false,
      nearMissed: false,
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
    return this.makeProp(type)
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

  private clearPools(): void {
    this.pools.barrier = []
    this.pools.low = []
    this.pools.overhead = []
    this.pools.moving = []
    this.pools.spinner = []
    this.pools.gap = []
    this.pools.orb = []
    this.pools.shield = []
    this.pools.magnet = []
    this.pools.multiplier = []
  }

  private makeProp(type: ObstacleType | PickupType): THREE.Group {
    const geos = this.geos
    const mats = this.materials
    if (type === 'shield') return makeShield(geos, mats)
    if (type === 'magnet') return makeMagnet(geos, mats)
    if (type === 'multiplier') return makeMultiplier(geos, mats)
    if (this.mapId === 'desert') {
      if (type === 'orb') return makeDesertOrb(geos, mats)
      if (type === 'barrier') return makeDesertBarrier(geos, mats)
      if (type === 'low') return makeDesertLow(geos, mats)
      if (type === 'overhead') return makeDesertOverhead(geos, mats)
      if (type === 'moving') return makeDesertMoving(geos, mats)
      if (type === 'spinner') return makeDesertSpinner(geos, mats)
      return makeDesertGap(geos, mats)
    }
    if (this.mapId === 'frozen') {
      if (type === 'orb') return makeFrozenOrb(geos, mats)
      if (type === 'barrier') return makeFrozenBarrier(geos, mats)
      if (type === 'low') return makeFrozenLow(geos, mats)
      if (type === 'overhead') return makeFrozenOverhead(geos, mats)
      if (type === 'moving') return makeFrozenMoving(geos, mats)
      if (type === 'spinner') return makeFrozenSpinner(geos, mats)
      return makeFrozenGap(geos, mats)
    }
    if (type === 'orb') return makeOrb(geos, mats)
    if (type === 'barrier') return makeBarrier(geos, mats)
    if (type === 'low') return makeLow(geos, mats)
    if (type === 'overhead') return makeOverhead(geos, mats)
    if (type === 'moving') return makeMoving(geos, mats)
    if (type === 'spinner') return makeSpinner(geos, mats)
    return makeGap(geos, mats)
  }

  private buildPools(): void {
    if (!this.geos) this.geos = createPropGeos()
    const fill = (type: keyof Pools, count: number) => {
      for (let i = 0; i < count; i += 1) this.pools[type].push(this.makeProp(type))
    }
    fill('barrier', 16)
    fill('low', 16)
    fill('overhead', 14)
    fill('moving', 8)
    fill('spinner', 10)
    fill('gap', 8)
    fill('orb', 72)
    fill('shield', 6)
    fill('magnet', 6)
    fill('multiplier', 6)
  }
}
