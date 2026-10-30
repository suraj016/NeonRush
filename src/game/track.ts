import * as THREE from 'three'
import { RECYCLE_Z, SEGMENT_COUNT, SEGMENT_LENGTH } from './config.ts'
import type { MaterialSet } from './materials.ts'

export type TrackSegment = {
  group: THREE.Group
  lanes: THREE.Mesh[]
  content: THREE.Group
  index: number
}

export class TrackManager {
  readonly root = new THREE.Group()
  readonly segments: TrackSegment[] = []
  private geometries: THREE.BufferGeometry[]

  constructor(materials: MaterialSet) {
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
      group.add(pit)

      const deck = new THREE.Mesh(deckGeo, materials.metal)
      deck.position.set(0, -0.02, 0)
      group.add(deck)

      const lanes: THREE.Mesh[] = []
      for (let lane = 0; lane < 3; lane += 1) {
        const mesh = new THREE.Mesh(roadGeo, materials.road)
        mesh.position.set((lane - 1) * 2.35, 0.06, 0)
        group.add(mesh)
        lanes.push(mesh)
      }

      const leftRail = new THREE.Mesh(railGeo, materials.rail)
      leftRail.position.set(-4.25, 0.22, 0)
      const rightRail = leftRail.clone()
      rightRail.position.x = 4.25
      group.add(leftRail, rightRail)

      const leftGlow = new THREE.Mesh(glowGeo, materials.glowCyan)
      leftGlow.position.set(-4.25, 0.48, 0)
      const rightGlow = leftGlow.clone()
      rightGlow.position.x = 4.25
      group.add(leftGlow, rightGlow)

      const leftUnder = new THREE.Mesh(underGlowGeo, materials.glowBlue)
      leftUnder.position.set(-4.45, 0.02, 0)
      const rightUnder = leftUnder.clone()
      rightUnder.position.x = 4.45
      group.add(leftUnder, rightUnder)

      const innerLeft = new THREE.Mesh(glowGeo, materials.glowCyan)
      innerLeft.position.set(-1.175, 0.12, 0)
      innerLeft.scale.set(0.35, 0.45, 1)
      const innerRight = innerLeft.clone()
      innerRight.position.x = 1.175
      group.add(innerLeft, innerRight)

      for (const divider of [-1.175, 1.175]) {
        for (let d = 0; d < 5; d += 1) {
          const dash = new THREE.Mesh(dashGeo, materials.glowBlue)
          dash.position.set(divider, 0.15, -SEGMENT_LENGTH / 2 + 2.4 + d * 4.0)
          dash.userData.dash = true
          group.add(dash)
        }
      }

      for (const side of [-1, 1]) {
        const pole = new THREE.Mesh(poleGeo, materials.metal)
        pole.position.set(side * 4.7, 1.2, -SEGMENT_LENGTH * 0.18)
        const lamp = new THREE.Mesh(lampGeo, materials.lamp)
        lamp.position.set(side * 4.55, 2.42, -SEGMENT_LENGTH * 0.18)
        group.add(pole, lamp)
      }

      if (i % 3 === 0) {
        const postL = new THREE.Mesh(postGeo, materials.metal)
        postL.position.set(-4.4, 2.2, 4)
        const postR = postL.clone()
        postR.position.x = 4.4
        const beam = new THREE.Mesh(gantryGeo, materials.metal)
        beam.position.set(0, 4.35, 4)
        const neon = new THREE.Mesh(signBarGeo, materials.glowCyan)
        neon.position.set(0, 4.12, 4.12)
        group.add(postL, postR, beam, neon)
      }

      const content = new THREE.Group()
      group.add(content)
      group.position.z = -i * SEGMENT_LENGTH
      this.root.add(group)
      this.segments.push({ group, lanes, content, index: i })
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
}
