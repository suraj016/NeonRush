import * as THREE from 'three'

export type InstanceData = {
  x: number
  y: number
  z: number
  sx: number
  sy: number
  sz: number
  rot: number
}

export type EnvPack = {
  root: THREE.Group
  fog: number
  bg: number
  fogNear: number
  fogFar: number
  update: (dt: number, moved: number, distance: number, playing: boolean) => void
  reset: () => void
  setReduced: (reduced: boolean) => void
  dispose: () => void
}

export function seedLayer(
  count: number,
  _wrap: number,
  place: (i: number) => InstanceData,
): InstanceData[] {
  const data: InstanceData[] = []
  for (let i = 0; i < count; i += 1) data.push(place(i))
  return data
}

export function writeInstances(mesh: THREE.InstancedMesh, data: InstanceData[], dummy: THREE.Object3D): void {
  for (let i = 0; i < data.length; i += 1) {
    const item = data[i]
    dummy.position.set(item.x, item.y, item.z)
    dummy.scale.set(item.sx, item.sy, item.sz)
    dummy.rotation.set(0, item.rot, 0)
    dummy.updateMatrix()
    mesh.setMatrixAt(i, dummy.matrix)
  }
  mesh.instanceMatrix.needsUpdate = true
}

export function scrollLayer(data: InstanceData[], moved: number, wrap: number, limit = 28): void {
  for (let i = 0; i < data.length; i += 1) {
    data[i].z += moved
    if (data[i].z > limit) data[i].z -= wrap
  }
}

export function makePoints(count: number, color: number, size: number): THREE.Points {
  const positions = new Float32Array(Math.max(1, count) * 3)
  for (let i = 0; i < count; i += 1) {
    positions[i * 3] = (Math.random() - 0.5) * 26
    positions[i * 3 + 1] = 1 + Math.random() * 14
    positions[i * 3 + 2] = -Math.random() * 150
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  return new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      color,
      size,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    }),
  )
}
