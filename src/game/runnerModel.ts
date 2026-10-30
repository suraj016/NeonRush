import * as THREE from 'three'

export type RunnerRig = {
  body: THREE.Group
  helmet: THREE.Group
  leftShoulder: THREE.Group
  rightShoulder: THREE.Group
  leftElbow: THREE.Group
  rightElbow: THREE.Group
  leftHip: THREE.Group
  rightHip: THREE.Group
  leftKnee: THREE.Group
  rightKnee: THREE.Group
}

export type RunnerMats = {
  armor: THREE.MeshStandardMaterial
  armor2: THREE.MeshStandardMaterial
  facet: THREE.MeshStandardMaterial
  shadow: THREE.MeshStandardMaterial
  joint: THREE.MeshStandardMaterial
  cyan: THREE.MeshStandardMaterial
  visor: THREE.MeshStandardMaterial
}

export function createRunnerMats(): RunnerMats {
  const armor = (color: number, metal = 0.52, rough = 0.4) =>
    new THREE.MeshStandardMaterial({
      color,
      metalness: metal,
      roughness: rough,
      flatShading: true,
    })
  return {
    armor: armor(0x101b35, 0.58, 0.38),
    armor2: armor(0x17294a, 0.5, 0.42),
    facet: armor(0x29466f, 0.46, 0.34),
    shadow: armor(0x09111f, 0.4, 0.52),
    joint: armor(0x09111f, 0.22, 0.7),
    cyan: new THREE.MeshStandardMaterial({
      color: 0x00cfff,
      emissive: 0x00cfff,
      emissiveIntensity: 0.95,
      roughness: 0.28,
      metalness: 0.2,
      flatShading: true,
      toneMapped: false,
    }),
    visor: new THREE.MeshStandardMaterial({
      color: 0x35e8ff,
      emissive: 0x00cfff,
      emissiveIntensity: 1.25,
      roughness: 0.12,
      metalness: 0.15,
      flatShading: true,
      toneMapped: false,
    }),
  }
}

function add(
  parent: THREE.Object3D,
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  x = 0,
  y = 0,
  z = 0,
  sx = 1,
  sy = 1,
  sz = 1,
): THREE.Mesh {
  const item = new THREE.Mesh(geo, mat)
  item.position.set(x, y, z)
  item.scale.set(sx, sy, sz)
  parent.add(item)
  return item
}

function vPlate(mats: RunnerMats, xSign: number): THREE.Mesh {
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.055, 0.035), mats.cyan)
  plate.position.set(0.09 * xSign, 1.34, -0.145)
  plate.rotation.z = 0.62 * xSign
  return plate
}

export function buildRunner(mats: RunnerMats): RunnerRig {
  const body = new THREE.Group()
  body.scale.set(1.12, 1.1, 1.12)

  const ico = new THREE.IcosahedronGeometry(1, 0)
  const octa = new THREE.OctahedronGeometry(1, 0)
  const hex = (rt: number, rb: number, h: number) => new THREE.CylinderGeometry(rt, rb, h, 6)
  const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d)

  add(body, hex(0.16, 0.18, 0.16), mats.armor2, 0, 0.9, 0)
  add(body, hex(0.15, 0.14, 0.14), mats.shadow, 0, 1.04, 0)
  const chest = add(body, ico, mats.armor, 0, 1.3, 0.01, 0.24, 0.2, 0.16)
  chest.rotation.y = 0.35
  add(body, ico, mats.facet, 0, 1.38, -0.02, 0.2, 0.12, 0.14)
  add(body, hex(0.2, 0.17, 0.1), mats.armor2, 0, 1.48, 0)

  body.add(vPlate(mats, -1), vPlate(mats, 1))
  add(body, box(0.07, 0.05, 0.03), mats.cyan, 0, 1.22, -0.145)
  add(body, box(0.22, 0.035, 0.03), mats.cyan, 0, 1.12, -0.13)
  add(body, box(0.04, 0.28, 0.03), mats.cyan, 0, 1.28, 0.15)
  add(body, box(0.16, 0.03, 0.03), mats.cyan, 0, 1.42, 0.15)

  const helmet = new THREE.Group()
  helmet.position.set(0, 1.62, 0)
  body.add(helmet)
  add(helmet, ico, mats.armor, 0, 0.04, 0.02, 0.145, 0.155, 0.16)
  add(helmet, ico, mats.armor2, 0, 0.02, -0.02, 0.12, 0.13, 0.14)
  add(helmet, ico, mats.shadow, 0, 0.08, 0.06, 0.1, 0.08, 0.1)
  const visor = add(helmet, octa, mats.visor, 0, 0.01, -0.1, 0.11, 0.1, 0.06)
  visor.rotation.y = 0.2
  add(helmet, box(0.16, 0.02, 0.02), mats.cyan, 0, 0.08, -0.12)
  add(helmet, box(0.02, 0.1, 0.08), mats.visor, -0.1, 0.0, -0.06)
  add(helmet, box(0.02, 0.1, 0.08), mats.visor, 0.1, 0.0, -0.06)
  add(helmet, box(0.03, 0.08, 0.05), mats.armor2, -0.12, 0.02, 0.02)
  add(helmet, box(0.03, 0.08, 0.05), mats.armor2, 0.12, 0.02, 0.02)

  add(body, ico, mats.armor, -0.26, 1.5, 0, 0.12, 0.09, 0.13)
  add(body, ico, mats.armor, 0.26, 1.5, 0, 0.12, 0.09, 0.13)
  add(body, box(0.12, 0.03, 0.1), mats.cyan, -0.26, 1.56, 0)
  add(body, box(0.12, 0.03, 0.1), mats.cyan, 0.26, 1.56, 0)

  const pack = new THREE.Group()
  pack.position.set(-0.3, 1.46, 0.12)
  pack.rotation.z = 0.18
  pack.rotation.y = 0.25
  body.add(pack)
  add(pack, box(0.12, 0.16, 0.18), mats.armor2)
  add(pack, octa, mats.shadow, 0, 0.08, 0.12, 0.08, 0.08, 0.1)
  add(pack, octa, mats.cyan, 0, 0.02, 0.16, 0.05, 0.05, 0.05)

  const leftShoulder = new THREE.Group()
  leftShoulder.position.set(-0.3, 1.42, 0)
  body.add(leftShoulder)
  add(leftShoulder, hex(0.07, 0.06, 0.26), mats.armor2, 0, -0.14, 0)
  add(leftShoulder, box(0.035, 0.16, 0.04), mats.cyan, -0.06, -0.12, 0.02)
  add(leftShoulder, box(0.04, 0.16, 0.03), mats.cyan, 0.02, -0.12, -0.055)
  const leftElbow = new THREE.Group()
  leftElbow.position.set(0, -0.28, 0)
  leftShoulder.add(leftElbow)
  add(leftElbow, hex(0.04, 0.04, 0.05), mats.joint, 0, 0, 0)
  add(leftElbow, hex(0.065, 0.055, 0.24), mats.armor, 0, -0.14, 0)
  add(leftElbow, box(0.045, 0.14, 0.03), mats.cyan, 0.01, -0.12, -0.055)
  add(leftElbow, box(0.09, 0.1, 0.08), mats.shadow, 0, -0.28, -0.01)

  const rightShoulder = new THREE.Group()
  rightShoulder.position.set(0.3, 1.42, 0)
  body.add(rightShoulder)
  add(rightShoulder, hex(0.07, 0.06, 0.26), mats.armor2, 0, -0.14, 0)
  add(rightShoulder, box(0.035, 0.16, 0.04), mats.cyan, 0.06, -0.12, 0.02)
  add(rightShoulder, box(0.04, 0.16, 0.03), mats.cyan, -0.02, -0.12, -0.055)
  const rightElbow = new THREE.Group()
  rightElbow.position.set(0, -0.28, 0)
  rightShoulder.add(rightElbow)
  add(rightElbow, hex(0.04, 0.04, 0.05), mats.joint, 0, 0, 0)
  add(rightElbow, hex(0.065, 0.055, 0.24), mats.armor, 0, -0.14, 0)
  add(rightElbow, box(0.045, 0.14, 0.03), mats.cyan, -0.01, -0.12, -0.055)
  add(rightElbow, box(0.09, 0.1, 0.08), mats.shadow, 0, -0.28, -0.01)

  const leftHip = new THREE.Group()
  leftHip.position.set(-0.11, 0.84, 0)
  body.add(leftHip)
  add(leftHip, hex(0.085, 0.07, 0.36), mats.armor, 0, -0.18, 0)
  add(leftHip, box(0.035, 0.2, 0.04), mats.cyan, -0.07, -0.16, 0.02)
  add(leftHip, box(0.04, 0.2, 0.03), mats.cyan, 0.01, -0.16, -0.065)
  const leftKnee = new THREE.Group()
  leftKnee.position.set(0, -0.38, 0)
  leftHip.add(leftKnee)
  add(leftKnee, octa, mats.facet, 0, 0.02, 0.02, 0.07, 0.06, 0.07)
  add(leftKnee, hex(0.065, 0.055, 0.3), mats.armor2, 0, -0.16, 0)
  add(leftKnee, box(0.04, 0.18, 0.03), mats.cyan, 0.01, -0.14, -0.055)
  add(leftKnee, box(0.11, 0.08, 0.18), mats.shadow, 0, -0.36, -0.03)

  const rightHip = new THREE.Group()
  rightHip.position.set(0.11, 0.84, 0)
  body.add(rightHip)
  add(rightHip, hex(0.085, 0.07, 0.36), mats.armor, 0, -0.18, 0)
  add(rightHip, box(0.035, 0.2, 0.04), mats.cyan, 0.07, -0.16, 0.02)
  add(rightHip, box(0.04, 0.2, 0.03), mats.cyan, -0.01, -0.16, -0.065)
  const rightKnee = new THREE.Group()
  rightKnee.position.set(0, -0.38, 0)
  rightHip.add(rightKnee)
  add(rightKnee, octa, mats.facet, 0, 0.02, 0.02, 0.07, 0.06, 0.07)
  add(rightKnee, hex(0.065, 0.055, 0.3), mats.armor2, 0, -0.16, 0)
  add(rightKnee, box(0.04, 0.18, 0.03), mats.cyan, -0.01, -0.14, -0.055)
  add(rightKnee, box(0.11, 0.08, 0.18), mats.shadow, 0, -0.36, -0.03)

  return {
    body,
    helmet,
    leftShoulder,
    rightShoulder,
    leftElbow,
    rightElbow,
    leftHip,
    rightHip,
    leftKnee,
    rightKnee,
  }
}
