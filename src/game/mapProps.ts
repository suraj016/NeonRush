import * as THREE from 'three'
import type { MaterialSet } from './materials.ts'
import type { PropGeos } from './props.ts'

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

export function makeDesertBarrier(geos: PropGeos, mats: MaterialSet): THREE.Group {
  const g = new THREE.Group()
  add(g, geos.barrierBase, mats.desertRock, 0, 0.05, 0)
  add(g, geos.barrierBody, mats.sandstone, 0, 0.72, 0)
  add(g, geos.pillar, mats.sandstone, -0.78, 0.9, 0)
  add(g, geos.pillar, mats.sandstone, 0.78, 0.9, 0)
  add(g, geos.barrierCap, mats.canyon, 0, 1.55, 0)
  add(g, geos.barrierStripe, mats.glowAmber, 0, 1.1, 0.16)
  return g
}

export function makeDesertLow(geos: PropGeos, mats: MaterialSet): THREE.Group {
  const g = new THREE.Group()
  const rock = add(g, geos.shieldCore, mats.desertRock, 0, 0.28, 0)
  rock.scale.set(2.2, 1.4, 1.8)
  add(g, geos.lowStripe, mats.sandstone, 0, 0.5, 0)
  return g
}

export function makeDesertOverhead(geos: PropGeos, mats: MaterialSet): THREE.Group {
  const g = new THREE.Group()
  add(g, geos.pillar, mats.sandstone, -0.88, 0.92, 0)
  add(g, geos.pillar, mats.sandstone, 0.88, 0.92, 0)
  add(g, geos.gantry, mats.canyon, 0, 1.72, 0)
  const beam = add(g, geos.beam, mats.desertRock, 0, 1.18, 0)
  g.userData.beam = beam
  return g
}

export function makeDesertMoving(geos: PropGeos, mats: MaterialSet): THREE.Group {
  const g = new THREE.Group()
  add(g, geos.barrierBody, mats.sandstone, 0, 0.7, 0)
  add(g, geos.hoverPad, mats.desertRock, -0.6, 0.08, 0.16)
  add(g, geos.hoverPad, mats.desertRock, 0.6, 0.08, 0.16)
  add(g, geos.barrierStripe, mats.glowAmber, 0, 0.95, 0.16)
  return g
}

export function makeDesertSpinner(geos: PropGeos, mats: MaterialSet): THREE.Group {
  const g = new THREE.Group()
  add(g, geos.shieldCore, mats.sandstone, 0, 0.92, 0)
  const spin = new THREE.Group()
  spin.position.y = 0.92
  add(spin, geos.coinRim, mats.glowAmber, 0, 0, 0)
  g.add(spin)
  g.userData.spin = spin
  return g
}

export function makeDesertGap(geos: PropGeos, mats: MaterialSet): THREE.Group {
  const g = new THREE.Group()
  for (const z of [-2.2, 2.2]) {
    add(g, geos.gapBar, mats.glowAmber, 0, 0.08, z)
    add(g, geos.gapPost, mats.sandstone, -0.82, 0.24, z)
    add(g, geos.gapPost, mats.sandstone, 0.82, 0.24, z)
  }
  return g
}

export function makeDesertOrb(geos: PropGeos, mats: MaterialSet): THREE.Group {
  const g = new THREE.Group()
  add(g, geos.coinRim, mats.goldCoin, 0, 0, 0)
  const face = add(g, geos.coinFace, mats.sandstone, 0, 0, 0)
  face.rotation.x = Math.PI / 2
  const core = add(g, geos.coinCore, mats.goldCoin, 0, 0, 0)
  g.userData.core = core
  return g
}

export function makeFrozenBarrier(geos: PropGeos, mats: MaterialSet): THREE.Group {
  const g = new THREE.Group()
  add(g, geos.barrierBase, mats.mountain, 0, 0.05, 0)
  add(g, geos.barrierBody, mats.mountain, 0, 0.7, 0)
  add(g, geos.barrierCap, mats.snow, 0, 1.42, 0)
  add(g, geos.barrierStripe, mats.ice, 0, 1.05, 0.16)
  return g
}

export function makeFrozenLow(geos: PropGeos, mats: MaterialSet): THREE.Group {
  const g = new THREE.Group()
  const log = add(g, geos.pillar, mats.bark, 0, 0.28, 0)
  log.rotation.z = Math.PI / 2
  log.scale.set(1, 0.45, 1)
  add(g, geos.lowStripe, mats.snow, 0, 0.48, 0)
  return g
}

export function makeFrozenOverhead(geos: PropGeos, mats: MaterialSet): THREE.Group {
  const g = new THREE.Group()
  add(g, geos.pillar, mats.bark, -0.88, 0.92, 0)
  add(g, geos.pillar, mats.bark, 0.88, 0.92, 0)
  add(g, geos.gantry, mats.frozenRail, 0, 1.72, 0)
  const beam = add(g, geos.beam, mats.ice, 0, 1.18, 0)
  g.userData.beam = beam
  return g
}

export function makeFrozenMoving(geos: PropGeos, mats: MaterialSet): THREE.Group {
  const g = new THREE.Group()
  add(g, geos.barrierBody, mats.ice, 0, 0.72, 0)
  add(g, geos.barrierCap, mats.snow, 0, 1.4, 0)
  add(g, geos.hoverPad, mats.mountain, -0.6, 0.06, 0.14)
  add(g, geos.hoverPad, mats.mountain, 0.6, 0.06, 0.14)
  return g
}

export function makeFrozenSpinner(geos: PropGeos, mats: MaterialSet): THREE.Group {
  const g = new THREE.Group()
  add(g, geos.multiStar, mats.frostCoin, 0, 0.9, 0)
  const spin = new THREE.Group()
  spin.position.y = 0.9
  add(spin, geos.shieldRing, mats.ice, 0, 0, 0)
  g.add(spin)
  g.userData.spin = spin
  return g
}

export function makeFrozenGap(geos: PropGeos, mats: MaterialSet): THREE.Group {
  const g = new THREE.Group()
  for (const z of [-2.2, 2.2]) {
    add(g, geos.gapBar, mats.ice, 0, 0.08, z)
    add(g, geos.gapPost, mats.bark, -0.82, 0.24, z)
    add(g, geos.gapPost, mats.bark, 0.82, 0.24, z)
  }
  return g
}

export function makeFrozenOrb(geos: PropGeos, mats: MaterialSet): THREE.Group {
  const g = new THREE.Group()
  add(g, geos.coinRim, mats.ice, 0, 0, 0)
  const core = add(g, geos.multiStar, mats.frostCoin, 0, 0, 0)
  core.scale.setScalar(0.7)
  g.userData.core = core
  return g
}
