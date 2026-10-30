import * as THREE from 'three'

type Burst = {
  group: THREE.Group
  ring: THREE.Mesh
  sparks: THREE.Mesh[]
  dirs: THREE.Vector3[]
  sprite: THREE.Sprite
  age: number
  life: number
  active: boolean
}

function labelTexture(text: string, color: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 64
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.clearRect(0, 0, 128, 64)
    ctx.font = '700 34px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.shadowColor = color
    ctx.shadowBlur = 10
    ctx.fillStyle = color
    ctx.fillText(text, 64, 32)
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

export class PickupFx {
  readonly root = new THREE.Group()
  private bursts: Burst[] = []
  private pool: Burst[] = []
  private sparkGeo: THREE.BufferGeometry
  private ringGeo: THREE.BufferGeometry
  private mintMat: THREE.MeshBasicMaterial
  private limeMat: THREE.MeshBasicMaterial
  private ringMat: THREE.MeshBasicMaterial
  private labels: Record<string, THREE.SpriteMaterial>
  private textures: THREE.CanvasTexture[] = []

  constructor() {
    this.sparkGeo = new THREE.BoxGeometry(0.05, 0.05, 0.05)
    this.ringGeo = new THREE.TorusGeometry(0.22, 0.018, 6, 16)
    this.mintMat = new THREE.MeshBasicMaterial({
      color: 0x00f5a0,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    })
    this.limeMat = new THREE.MeshBasicMaterial({
      color: 0xa6ff4d,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    })
    this.ringMat = new THREE.MeshBasicMaterial({
      color: 0x00f5a0,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    })
    this.labels = {
      '+10': this.makeLabel('+10', '#A6FF4D'),
      '+20': this.makeLabel('+20', '#A6FF4D'),
      '+25': this.makeLabel('+25', '#FFD166'),
      '+50': this.makeLabel('+50', '#FFD166'),
      PWR: this.makeLabel('PWR', '#18B8C9'),
    }
    for (let i = 0; i < 8; i += 1) this.pool.push(this.createBurst())
  }

  spawn(x: number, y: number, z: number, label: string): void {
    let burst = this.pool.pop()
    if (!burst) {
      burst = this.bursts.shift()
      if (!burst) return
      burst.group.removeFromParent()
    }
    burst.group.position.set(x, y, z)
    burst.group.visible = true
    burst.group.scale.set(1, 1, 1)
    burst.age = 0
    burst.life = 0.38
    burst.active = true
    burst.ring.scale.set(1, 1, 1)
    ;(burst.ring.material as THREE.MeshBasicMaterial).opacity = 0.7
    const key = label in this.labels ? label : '+10'
    burst.sprite.material = this.labels[key]
    burst.sprite.position.set(0, 0.15, 0)
    burst.sprite.scale.set(0.85, 0.42, 1)
    for (let i = 0; i < burst.sparks.length; i += 1) {
      const spark = burst.sparks[i]
      spark.position.set(0, 0, 0)
      spark.scale.setScalar(1)
      burst.dirs[i].set(Math.random() - 0.5, Math.random() * 0.8 + 0.1, Math.random() - 0.5).normalize()
    }
    this.root.add(burst.group)
    this.bursts.push(burst)
  }

  update(dt: number): void {
    if (this.bursts.length === 0) return
    for (let i = this.bursts.length - 1; i >= 0; i -= 1) {
      const burst = this.bursts[i]
      burst.age += dt
      const t = burst.age / burst.life
      const fade = Math.max(0, 1 - t)
      burst.ring.scale.setScalar(1 + t * 2.4)
      ;(burst.ring.material as THREE.MeshBasicMaterial).opacity = 0.7 * fade
      burst.sprite.position.y = 0.15 + t * 0.7
      burst.sprite.scale.set(0.85 * fade, 0.42 * fade, 1)
      for (let s = 0; s < burst.sparks.length; s += 1) {
        burst.sparks[s].position.addScaledVector(burst.dirs[s], dt * 3.4)
        burst.sparks[s].scale.setScalar(1 - t * 0.7)
      }
      if (burst.age >= burst.life) {
        burst.active = false
        burst.group.visible = false
        burst.group.removeFromParent()
        this.bursts.splice(i, 1)
        this.pool.push(burst)
      }
    }
  }

  reset(): void {
    for (const burst of this.bursts) {
      burst.active = false
      burst.group.visible = false
      burst.group.removeFromParent()
      this.pool.push(burst)
    }
    this.bursts = []
  }

  dispose(): void {
    this.reset()
    for (const burst of this.pool) {
      ;(burst.ring.material as THREE.Material).dispose()
    }
    this.sparkGeo.dispose()
    this.ringGeo.dispose()
    this.mintMat.dispose()
    this.limeMat.dispose()
    this.ringMat.dispose()
    for (const mat of Object.values(this.labels)) mat.dispose()
    for (const tex of this.textures) tex.dispose()
  }

  private makeLabel(text: string, color: string): THREE.SpriteMaterial {
    const tex = labelTexture(text, color)
    this.textures.push(tex)
    return new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    })
  }

  private createBurst(): Burst {
    const group = new THREE.Group()
    group.visible = false
    const ring = new THREE.Mesh(this.ringGeo, this.ringMat.clone())
    group.add(ring)
    const sparks: THREE.Mesh[] = []
    const dirs: THREE.Vector3[] = []
    for (let i = 0; i < 6; i += 1) {
      const spark = new THREE.Mesh(this.sparkGeo, i % 2 === 0 ? this.mintMat : this.limeMat)
      sparks.push(spark)
      dirs.push(new THREE.Vector3())
      group.add(spark)
    }
    const sprite = new THREE.Sprite(this.labels['+10'])
    sprite.scale.set(0.85, 0.42, 1)
    group.add(sprite)
    return { group, ring, sparks, dirs, sprite, age: 0, life: 0.38, active: false }
  }
}
