import * as THREE from 'three'
import { RECYCLE_Z, SEGMENT_COUNT, SEGMENT_LENGTH } from './config.ts'
import type { MapId } from './maps.ts'
import type { MaterialSet } from './materials.ts'

export type TrackSegment = {
  group: THREE.Group
  lanes: THREE.Mesh[]
  content: THREE.Group
  index: number
}

function role(mesh: THREE.Object3D, name: string): void {
  mesh.userData.role = name
}

export class TrackManager {
  readonly root = new THREE.Group()
  readonly segments: TrackSegment[] = []
  private geometries: THREE.BufferGeometry[]
  private materials: MaterialSet
  private mapId: MapId = 'emerald'

  constructor(materials: MaterialSet) {
    this.materials = materials
    const roadGeo = new THREE.BoxGeometry(2.28, 0.16, SEGMENT_LENGTH)
    const deckGeo = new THREE.BoxGeometry(8.8, 0.12, SEGMENT_LENGTH)
    const railGeo = new THREE.BoxGeometry(0.18, 0.42, SEGMENT_LENGTH)
    const glowGeo = new THREE.BoxGeometry(0.12, 0.1, SEGMENT_LENGTH)
    const underGlowGeo = new THREE.BoxGeometry(0.22, 0.06, SEGMENT_LENGTH)
    const dashGeo = new THREE.BoxGeometry(0.1, 0.04, 1.35)
    const pitGeo = new THREE.BoxGeometry(9.2, 2.2, SEGMENT_LENGTH)
    const poleGeo = new THREE.CylinderGeometry(0.05, 0.07, 2.4, 6)
    const lampGeo = new THREE.SphereGeometry(0.07, 8, 8)
    const gantryGeo = new THREE.BoxGeometry(9.2, 0.12, 0.16)
    const postGeo = new THREE.BoxGeometry(0.14, 3.4, 0.14)
    const signBarGeo = new THREE.BoxGeometry(2.6, 0.16, 0.08)
    this.geometries = [
      roadGeo,
      deckGeo,
      railGeo,
      glowGeo,
      underGlowGeo,
      dashGeo,
      pitGeo,
      poleGeo,
      lampGeo,
      gantryGeo,
      postGeo,
      signBarGeo,
    ]

    for (let i = 0; i < SEGMENT_COUNT; i += 1) {
      const group = new THREE.Group()
      const pit = new THREE.Mesh(pitGeo, materials.pit)
      pit.position.set(0, -1.3, 0)
      role(pit, 'pit')
      group.add(pit)

      const deck = new THREE.Mesh(deckGeo, materials.metal)
      deck.position.set(0, -0.02, 0)
      role(deck, 'deck')
      group.add(deck)

      const lanes: THREE.Mesh[] = []
      for (let lane = 0; lane < 3; lane += 1) {
        const mesh = new THREE.Mesh(roadGeo, materials.road)
        mesh.position.set((lane - 1) * 2.35, 0.06, 0)
        role(mesh, 'road')
        group.add(mesh)
        lanes.push(mesh)
      }

      const leftRail = new THREE.Mesh(railGeo, materials.rail)
      leftRail.position.set(-4.25, 0.22, 0)
      role(leftRail, 'rail')
      const rightRail = leftRail.clone()
      rightRail.position.x = 4.25
      group.add(leftRail, rightRail)

      const leftGlow = new THREE.Mesh(glowGeo, materials.glowCyan)
      leftGlow.position.set(-4.25, 0.48, 0)
      role(leftGlow, 'glow')
      const rightGlow = leftGlow.clone()
      rightGlow.position.x = 4.25
      group.add(leftGlow, rightGlow)

      const leftUnder = new THREE.Mesh(underGlowGeo, materials.glowBlue)
      leftUnder.position.set(-4.45, 0.02, 0)
      role(leftUnder, 'under')
      const rightUnder = leftUnder.clone()
      rightUnder.position.x = 4.45
      group.add(leftUnder, rightUnder)

      const innerLeft = new THREE.Mesh(glowGeo, materials.glowCyan)
      innerLeft.position.set(-1.175, 0.12, 0)
      innerLeft.scale.set(0.35, 0.45, 1)
      role(innerLeft, 'inner')
      const innerRight = innerLeft.clone()
      innerRight.position.x = 1.175
      group.add(innerLeft, innerRight)

      for (const divider of [-1.175, 1.175]) {
        for (let d = 0; d < 5; d += 1) {
          const dash = new THREE.Mesh(dashGeo, materials.glowBlue)
          dash.position.set(divider, 0.15, -SEGMENT_LENGTH / 2 + 2.4 + d * 4.0)
          dash.userData.dash = true
          role(dash, 'dash')
          group.add(dash)
        }
      }

      for (const side of [-1, 1]) {
        const pole = new THREE.Mesh(poleGeo, materials.metal)
        pole.position.set(side * 4.7, 1.2, -SEGMENT_LENGTH * 0.18)
        role(pole, 'pole')
        const lamp = new THREE.Mesh(lampGeo, materials.lamp)
        lamp.position.set(side * 4.55, 2.42, -SEGMENT_LENGTH * 0.18)
        role(lamp, 'lamp')
        group.add(pole, lamp)
      }

      if (i % 3 === 0) {
        const postL = new THREE.Mesh(postGeo, materials.metal)
        postL.position.set(-4.4, 2.2, 4)
        role(postL, 'gantry')
        const postR = postL.clone()
        postR.position.x = 4.4
        const beam = new THREE.Mesh(gantryGeo, materials.metal)
        beam.position.set(0, 4.35, 4)
        role(beam, 'gantry')
        const neon = new THREE.Mesh(signBarGeo, materials.glowCyan)
        neon.position.set(0, 4.12, 4.12)
        role(neon, 'neon')
        group.add(postL, postR, beam, neon)
      }

      const content = new THREE.Group()
      group.add(content)
      group.position.z = -i * SEGMENT_LENGTH
      this.root.add(group)
      this.segments.push({ group, lanes, content, index: i })
    }
  }

  setMap(id: MapId): void {
    this.mapId = id
    for (const segment of this.segments) {
      segment.group.traverse((obj) => {
        if (!(obj instanceof THREE.Mesh)) return
        const name = obj.userData.role as string | undefined
        if (!name) return
        this.styleMesh(obj, name)
      })
    }
  }

  update(dt: number): void {
    for (const segment of this.segments) {
      for (const child of segment.group.children) {
        if (!child.userData.dash) continue
        child.position.z += dt * 8
        const limit = SEGMENT_LENGTH / 2 - 0.8
        if (child.position.z > limit) child.position.z -= SEGMENT_LENGTH - 1.6
      }
    }
  }

  reset(): void {
    for (let i = 0; i < this.segments.length; i += 1) {
      const segment = this.segments[i]
      segment.group.position.z = -i * SEGMENT_LENGTH
      this.restoreLanes(segment)
      while (segment.content.children.length) {
        segment.content.remove(segment.content.children[0])
      }
    }
  }

  advance(distance: number): TrackSegment[] {
    const recycled: TrackSegment[] = []
    for (const segment of this.segments) {
      segment.group.position.z += distance
      if (segment.group.position.z > RECYCLE_Z) {
        segment.group.position.z -= SEGMENT_COUNT * SEGMENT_LENGTH
        this.restoreLanes(segment)
        while (segment.content.children.length) {
          segment.content.remove(segment.content.children[0])
        }
        recycled.push(segment)
      }
    }
    return recycled
  }

  restoreLanes(segment: TrackSegment): void {
    for (const lane of segment.lanes) lane.visible = true
  }

  dispose(): void {
    for (const geo of this.geometries) geo.dispose()
  }

  private styleMesh(mesh: THREE.Mesh, name: string): void {
    const mats = this.materials
    const desert = this.mapId === 'desert'
    const frozen = this.mapId === 'frozen'
    const hideNeon = desert || frozen
    if (name === 'pit') {
      mesh.material = desert ? mats.desertPit : frozen ? mats.frozenPit : mats.pit
      mesh.visible = true
      return
    }
    if (name === 'deck') {
      mesh.material = desert ? mats.desertDeck : frozen ? mats.frozenDeck : mats.metal
      mesh.visible = true
      return
    }
    if (name === 'road') {
      mesh.material = desert ? mats.desertRoad : frozen ? mats.frozenRoad : mats.road
      mesh.visible = true
      return
    }
    if (name === 'rail') {
      mesh.material = desert ? mats.desertRail : frozen ? mats.frozenRail : mats.rail
      mesh.visible = true
      return
    }
    if (name === 'dash') {
      mesh.material = desert ? mats.desertDash : frozen ? mats.frozenDash : mats.glowBlue
      mesh.visible = true
      return
    }
    if (name === 'pole' || name === 'gantry') {
      mesh.material = desert ? mats.sandstone : frozen ? mats.bark : mats.metal
      mesh.visible = true
      return
    }
    if (name === 'glow') {
      mesh.material = mats.glowCyan
      mesh.visible = !hideNeon
      return
    }
    if (name === 'under' || name === 'inner') {
      mesh.material = name === 'under' ? mats.glowBlue : mats.glowCyan
      mesh.visible = !hideNeon
      return
    }
    if (name === 'neon') {
      mesh.material = mats.glowCyan
      mesh.visible = !hideNeon
      return
    }
    if (name === 'lamp') {
      mesh.material = mats.lamp
      mesh.visible = !hideNeon
    }
  }
}
