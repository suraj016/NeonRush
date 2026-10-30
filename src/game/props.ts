import * as THREE from 'three'
import type { MaterialSet } from './materials.ts'

export type PropGeos = ReturnType<typeof createPropGeos>

export function createPropGeos() {
  return {
    barrierBody: new THREE.BoxGeometry(1.52, 1.12, 0.26),
    barrierBase: new THREE.BoxGeometry(1.72, 0.1, 0.48),
    barrierPost: new THREE.BoxGeometry(0.16, 1.58, 0.18),
    barrierCap: new THREE.BoxGeometry(1.72, 0.1, 0.22),
    barrierStripe: new THREE.BoxGeometry(1.38, 0.1, 0.04),
    lamp: new THREE.SphereGeometry(0.055, 8, 6),
    lowBody: new THREE.BoxGeometry(1.68, 0.5, 0.44),
    lowStripe: new THREE.BoxGeometry(1.72, 0.08, 0.46),
    lowMark: new THREE.BoxGeometry(0.32, 0.05, 0.08),
    pillar: new THREE.BoxGeometry(0.2, 1.85, 0.2),
    gantry: new THREE.BoxGeometry(1.95, 0.14, 0.22),
    beam: new THREE.BoxGeometry(1.72, 0.1, 0.1),
    hoverPad: new THREE.CylinderGeometry(0.12, 0.16, 0.05, 8),
    droneBody: new THREE.BoxGeometry(0.48, 0.18, 0.4),
    droneArm: new THREE.BoxGeometry(0.46, 0.045, 0.05),
    rotor: new THREE.CylinderGeometry(0.14, 0.14, 0.02, 10),
    gapBar: new THREE.BoxGeometry(1.75, 0.08, 0.14),
    gapPost: new THREE.BoxGeometry(0.11, 0.46, 0.11),
    coinRim: new THREE.TorusGeometry(0.3, 0.05, 8, 24),
    coinFace: new THREE.CylinderGeometry(0.24, 0.24, 0.05, 22),
    coinRing: new THREE.TorusGeometry(0.165, 0.03, 6, 20),
    coinCore: new THREE.OctahedronGeometry(0.1),
    coinNub: new THREE.BoxGeometry(0.045, 0.045, 0.1),
    shieldRing: new THREE.TorusGeometry(0.3, 0.045, 8, 16),
    shieldCore: new THREE.OctahedronGeometry(0.2),
    magnetArc: new THREE.TorusGeometry(0.26, 0.07, 8, 14, Math.PI),
    magnetCore: new THREE.BoxGeometry(0.14, 0.14, 0.1),
    multiStar: new THREE.OctahedronGeometry(0.26),
    multiRing: new THREE.TorusGeometry(0.2, 0.032, 6, 14),
  }
}

export function disposePropGeos(geos: PropGeos): void {
  for (const geo of Object.values(geos)) geo.dispose()
}

function add(
  parent: THREE.Object3D,
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  x: number,
  y: number,
  z: number,
): THREE.Mesh {
  const item = new THREE.Mesh(geo, mat)
  item.position.set(x, y, z)
  parent.add(item)
  return item
}

export function makeBarrier(geos: PropGeos, mats: MaterialSet): THREE.Group {
  const g = new THREE.Group()
  add(g, geos.barrierBase, mats.graphite, 0, 0.05, 0)
  add(g, geos.barrierBody, mats.hazardPanel, 0, 0.72, 0)
  add(g, geos.barrierPost, mats.graphite, -0.8, 0.8, 0)
  add(g, geos.barrierPost, mats.graphite, 0.8, 0.8, 0)
  add(g, geos.barrierCap, mats.graphite, 0, 1.55, 0)
  add(g, geos.barrierStripe, mats.warnLamp, 0, 1.18, 0.16)
  add(g, geos.barrierStripe, mats.glowAmber, 0, 0.42, 0.16)
  add(g, geos.lamp, mats.warnLamp, -0.72, 1.64, 0.08)
  add(g, geos.lamp, mats.warnLamp, 0.72, 1.64, 0.08)
  return g
}

export function makeLow(geos: PropGeos, mats: MaterialSet): THREE.Group {
  const g = new THREE.Group()
  add(g, geos.lowBody, mats.graphite, 0, 0.28, 0)
  add(g, geos.lowStripe, mats.glowAmber, 0, 0.54, 0)
  add(g, geos.lowMark, mats.warnLamp, -0.45, 0.56, 0.2)
  add(g, geos.lowMark, mats.warnLamp, 0, 0.56, 0.2)
  add(g, geos.lowMark, mats.warnLamp, 0.45, 0.56, 0.2)
  add(g, geos.lamp, mats.warnLamp, -0.72, 0.42, 0.16)
  add(g, geos.lamp, mats.warnLamp, 0.72, 0.42, 0.16)
  return g
}

export function makeOverhead(geos: PropGeos, mats: MaterialSet): THREE.Group {
  const g = new THREE.Group()
  add(g, geos.pillar, mats.graphite, -0.88, 0.92, 0)
  add(g, geos.pillar, mats.graphite, 0.88, 0.92, 0)
  add(g, geos.gantry, mats.hazardPanel, 0, 1.72, 0)
  const beam = add(g, geos.beam, mats.glowDanger, 0, 1.18, 0)
  g.userData.beam = beam
  add(g, geos.lamp, mats.warnLamp, -0.88, 1.78, 0.12)
  add(g, geos.lamp, mats.warnLamp, 0.88, 1.78, 0.12)
  return g
}

export function makeMoving(geos: PropGeos, mats: MaterialSet): THREE.Group {
  const g = makeBarrier(geos, mats)
  add(g, geos.hoverPad, mats.coinTeal, -0.62, 0.04, 0.16)
  add(g, geos.hoverPad, mats.coinTeal, 0.62, 0.04, 0.16)
  add(g, geos.barrierStripe, mats.glowAmber, 0, 0.9, 0.17)
  return g
}

export function makeSpinner(geos: PropGeos, mats: MaterialSet): THREE.Group {
  const g = new THREE.Group()
  add(g, geos.droneBody, mats.graphite, 0, 0.92, 0)
  add(g, geos.droneArm, mats.hazardPanel, 0, 0.98, 0)
  const arm2 = add(g, geos.droneArm, mats.hazardPanel, 0, 0.98, 0)
  arm2.rotation.y = Math.PI / 2
  const rotors = new THREE.Group()
  rotors.position.y = 1.02
  const spots = [
    [-0.22, 0.18],
    [0.22, 0.18],
    [-0.22, -0.18],
    [0.22, -0.18],
  ] as const
  for (const [x, z] of spots) {
    add(rotors, geos.rotor, mats.hazardPanel, x, 0, z)
  }
  g.add(rotors)
  g.userData.spin = rotors
  add(g, geos.lamp, mats.warnLamp, 0, 0.8, 0)
  add(g, geos.lamp, mats.coinTeal, 0, 1.04, 0.16)
  return g
}

export function makeGap(geos: PropGeos, mats: MaterialSet): THREE.Group {
  const g = new THREE.Group()
  const makeGate = (z: number) => {
    add(g, geos.gapBar, mats.glowAmber, 0, 0.08, z)
    add(g, geos.gapPost, mats.graphite, -0.82, 0.24, z)
    add(g, geos.gapPost, mats.graphite, 0.82, 0.24, z)
    add(g, geos.lamp, mats.warnLamp, -0.82, 0.5, z)
    add(g, geos.lamp, mats.warnLamp, 0.82, 0.5, z)
  }
  makeGate(-2.2)
  makeGate(2.2)
  return g
}

export function makeOrb(geos: PropGeos, mats: MaterialSet): THREE.Group {
  const g = new THREE.Group()
  add(g, geos.coinRim, mats.coinRim, 0, 0, 0)
  const face = add(g, geos.coinFace, mats.coinFace, 0, 0, 0)
  face.rotation.x = Math.PI / 2
  add(g, geos.coinRing, mats.coinRing, 0, 0, 0)
  const core = add(g, geos.coinCore, mats.coinCore, 0, 0, 0)
  g.userData.core = core
  add(g, geos.coinNub, mats.coinTeal, 0.3, 0, 0)
  add(g, geos.coinNub, mats.coinTeal, -0.3, 0, 0)
  return g
}

export function makeShield(geos: PropGeos, mats: MaterialSet): THREE.Group {
  const g = new THREE.Group()
  add(g, geos.shieldCore, mats.shield, 0, 0, 0)
  add(g, geos.shieldRing, mats.coinRing, 0, 0, 0)
  const ring2 = add(g, geos.shieldRing, mats.coinTeal, 0, 0, 0)
  ring2.rotation.x = Math.PI / 2
  return g
}

export function makeMagnet(geos: PropGeos, mats: MaterialSet): THREE.Group {
  const g = new THREE.Group()
  const arc = add(g, geos.magnetArc, mats.magnet, 0, 0, 0)
  arc.rotation.z = Math.PI / 2
  add(g, geos.magnetCore, mats.coinTeal, 0, 0, 0)
  return g
}

export function makeMultiplier(geos: PropGeos, mats: MaterialSet): THREE.Group {
  const g = new THREE.Group()
  add(g, geos.multiStar, mats.multiplier, 0, 0, 0)
  add(g, geos.multiRing, mats.glowAmber, 0, 0, 0)
  return g
}
