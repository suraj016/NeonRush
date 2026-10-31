import * as THREE from 'three'
import { LANES, PLAYER } from './config.ts'
import type { MaterialSet } from './materials.ts'
import { buildRunner, createRunnerMats, type RunnerMats, type RunnerRig } from './runnerModel.ts'
import type { Lane, SkinId } from './types.ts'
import { clamp, damp } from '../utils/math.ts'

export class Player {
  readonly root: THREE.Group
  lane: Lane = 1
  x = 0
  y = 0
  vy = 0
  grounded = true
  sliding = false
  slideTimer = 0
  crashed = false
  invuln = 0
  justLanded = false
  private runPhase = 0
  private rig: RunnerRig
  private runnerMats: RunnerMats
  private shieldMesh: THREE.Mesh
  private trail: THREE.Mesh[]
  private trailMat: THREE.MeshBasicMaterial

  constructor(_materials: MaterialSet) {
    this.root = new THREE.Group()
    this.runnerMats = createRunnerMats()
    this.rig = buildRunner(this.runnerMats)
    this.root.add(this.rig.body)

    this.shieldMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.95, 16, 12),
      new THREE.MeshBasicMaterial({
        color: 0x00cfff,
        transparent: true,
        opacity: 0.14,
        wireframe: true,
      }),
    )
    this.shieldMesh.position.y = 0.9
    this.shieldMesh.visible = false
    this.root.add(this.shieldMesh)

    this.trailMat = new THREE.MeshBasicMaterial({
      color: 0x00cfff,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
    })
    this.trail = []
    const streakGeo = new THREE.BoxGeometry(0.08, 0.06, 0.32)
    for (let i = 0; i < 3; i += 1) {
      const streak = new THREE.Mesh(streakGeo, this.trailMat)
      streak.position.set(0, 0.95, 0.42 + i * 0.28)
      streak.scale.set(1 - i * 0.18, 1 - i * 0.15, 1)
      this.trail.push(streak)
      this.root.add(streak)
    }

    this.root.position.set(0, 0, 0)
    this.applySkin('pulse')
  }

  applySkin(_id: SkinId): void {
    this.runnerMats.armor.color.setHex(0x101b35)
    this.runnerMats.armor2.color.setHex(0x17294a)
    this.runnerMats.facet.color.setHex(0x29466f)
    this.runnerMats.shadow.color.setHex(0x09111f)
    this.runnerMats.cyan.color.setHex(0x00cfff)
    this.runnerMats.cyan.emissive.setHex(0x00cfff)
    this.runnerMats.cyan.emissiveIntensity = 0.95
    this.runnerMats.visor.color.setHex(0x35e8ff)
    this.runnerMats.visor.emissive.setHex(0x00cfff)
    this.runnerMats.visor.emissiveIntensity = 1.25
    this.trailMat.color.setHex(0x00cfff)
  }

  reset(): void {
    this.lane = 1
    this.x = 0
    this.y = 0
    this.vy = 0
    this.grounded = true
    this.sliding = false
    this.slideTimer = 0
    this.crashed = false
    this.invuln = 0
    this.justLanded = false
    this.runPhase = 0
    this.root.rotation.set(0, 0, 0)
    this.root.position.set(0, 0, 0)
    this.rig.body.rotation.set(0, 0, 0)
    this.rig.body.position.y = 0
    this.rig.helmet.rotation.set(0, 0, 0)
    this.rig.leftShoulder.rotation.set(0, 0, 0)
    this.rig.rightShoulder.rotation.set(0, 0, 0)
    this.rig.leftElbow.rotation.set(0, 0, 0)
    this.rig.rightElbow.rotation.set(0, 0, 0)
    this.rig.leftHip.rotation.set(0, 0, 0)
    this.rig.rightHip.rotation.set(0, 0, 0)
    this.rig.leftKnee.rotation.set(0, 0, 0)
    this.rig.rightKnee.rotation.set(0, 0, 0)
  }

  moveLeft(): boolean {
    if (this.crashed) return false
    const next = Math.max(0, this.lane - 1) as Lane
    if (next === this.lane) return false
    this.lane = next
    return true
  }

  moveRight(): boolean {
    if (this.crashed) return false
    const next = Math.min(2, this.lane + 1) as Lane
    if (next === this.lane) return false
    this.lane = next
    return true
  }

  jump(): boolean {
    if (this.crashed || !this.grounded || this.sliding) return false
    this.grounded = false
    this.vy = PLAYER.jumpVelocity
    return true
  }

  slide(): boolean {
    if (this.crashed || !this.grounded || this.sliding) return false
    this.sliding = true
    this.slideTimer = PLAYER.slideDuration
    return true
  }

  hitShield(): void {
    this.invuln = PLAYER.invulnDuration
  }

  update(dt: number, speed: number, animate: boolean): void {
    const targetX = LANES[this.lane]
    this.x = damp(this.x, targetX, PLAYER.laneLerp, dt)

    this.justLanded = false
    if (!this.grounded) {
      this.vy += PLAYER.gravity * dt
      this.y += this.vy * dt
      if (this.y <= 0) {
        this.y = 0
        this.vy = 0
        this.grounded = true
        this.justLanded = true
      }
    }

    if (this.sliding) {
      this.slideTimer -= dt
      if (this.slideTimer <= 0) this.sliding = false
    }

    if (this.invuln > 0) this.invuln = Math.max(0, this.invuln - dt)

    this.root.position.x = this.x
    this.root.position.y = this.y
    this.root.position.z = 0

    if (!animate) return
    this.animate(dt, speed)
    for (let i = 0; i < this.trail.length; i += 1) {
      this.trail[i].visible = !this.crashed
      this.trail[i].position.y = this.sliding ? 0.42 : 0.95
    }
  }

  setShieldVisible(on: boolean): void {
    this.shieldMesh.visible = on
  }

  private animate(dt: number, speed: number): void {
    const { body, helmet, leftShoulder, rightShoulder, leftElbow, rightElbow, leftHip, rightHip, leftKnee, rightKnee } =
      this.rig

    if (this.crashed) {
      this.root.rotation.x = damp(this.root.rotation.x, -0.45, 10, dt)
      this.root.rotation.z = damp(this.root.rotation.z, 0.32, 10, dt)
      body.rotation.x = damp(body.rotation.x, 0.15, 8, dt)
      return
    }

    this.root.rotation.x = damp(this.root.rotation.x, 0, 12, dt)
    this.root.rotation.z = damp(this.root.rotation.z, clamp((LANES[this.lane] - this.x) * 0.1, -0.16, 0.16), 10, dt)

    if (this.sliding) {
      body.position.y = damp(body.position.y, -0.28, 16, dt)
      body.rotation.x = damp(body.rotation.x, 0.72, 16, dt)
      helmet.rotation.x = damp(helmet.rotation.x, -0.15, 12, dt)
      leftHip.rotation.x = damp(leftHip.rotation.x, -0.15, 14, dt)
      rightHip.rotation.x = damp(rightHip.rotation.x, -0.15, 14, dt)
      leftKnee.rotation.x = damp(leftKnee.rotation.x, 1.35, 14, dt)
      rightKnee.rotation.x = damp(rightKnee.rotation.x, 1.35, 14, dt)
      leftShoulder.rotation.x = damp(leftShoulder.rotation.x, 0.85, 14, dt)
      rightShoulder.rotation.x = damp(rightShoulder.rotation.x, 0.85, 14, dt)
      leftElbow.rotation.x = damp(leftElbow.rotation.x, 0.7, 14, dt)
      rightElbow.rotation.x = damp(rightElbow.rotation.x, 0.7, 14, dt)
      return
    }

    body.position.y = damp(body.position.y, 0, 14, dt)
    body.rotation.x = damp(body.rotation.x, this.grounded ? 0.1 : -0.12, 12, dt)
    helmet.rotation.x = damp(helmet.rotation.x, 0, 10, dt)

    if (!this.grounded) {
      leftHip.rotation.x = damp(leftHip.rotation.x, -0.45, 10, dt)
      rightHip.rotation.x = damp(rightHip.rotation.x, 0.35, 10, dt)
      leftKnee.rotation.x = damp(leftKnee.rotation.x, 0.85, 10, dt)
      rightKnee.rotation.x = damp(rightKnee.rotation.x, 0.35, 10, dt)
      leftShoulder.rotation.x = damp(leftShoulder.rotation.x, 0.55, 10, dt)
      rightShoulder.rotation.x = damp(rightShoulder.rotation.x, -0.25, 10, dt)
      leftElbow.rotation.x = damp(leftElbow.rotation.x, 0.8, 10, dt)
      rightElbow.rotation.x = damp(rightElbow.rotation.x, 0.5, 10, dt)
      return
    }

    this.runPhase += dt * (8.4 + speed * 0.16)
    const swing = Math.sin(this.runPhase)
    const lead = Math.cos(this.runPhase)
    leftHip.rotation.x = swing * 0.82
    rightHip.rotation.x = -swing * 0.82
    leftKnee.rotation.x = Math.max(0.12, -swing) * 1.15
    rightKnee.rotation.x = Math.max(0.12, swing) * 1.15
    leftShoulder.rotation.x = -swing * 0.66
    rightShoulder.rotation.x = swing * 0.66
    leftElbow.rotation.x = 0.55 + Math.abs(swing) * 0.35
    rightElbow.rotation.x = 0.55 + Math.abs(lead) * 0.35
    body.rotation.y = damp(body.rotation.y, swing * 0.06, 8, dt)
    this.root.position.y = this.y + Math.abs(swing) * 0.028
  }
}
