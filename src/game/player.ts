import * as THREE from 'three'
import { LANES, PLAYER, SKINS } from './config.ts'
import type { MaterialSet } from './materials.ts'
import { describeMixamoMaterials, loadMixamoAvatar, type MixamoAnimState, type MixamoAvatar } from './mixamoCharacter.ts'
import { buildRunner, createRunnerMats, type RunnerMats, type RunnerRig } from './runnerModel.ts'
import type { Lane, SkinId } from './types.ts'
import { clamp, damp } from '../utils/math.ts'
import characterUrl from '../assets/models/Characternew.fbx?url'

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
  private landHold = 0
  private runPhase = 0
  private rig: RunnerRig
  private runnerMats: RunnerMats
  private shieldMesh: THREE.Mesh
  private trail: THREE.Mesh[]
  private trailMat: THREE.MeshBasicMaterial
  private trailBoost = false
  private trailTier = -1
  private skinId: SkinId = 'pulse'
  private mixamo: MixamoAvatar | null = null
  private loadToken = 0
  private disposed = false

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

    this.root.position.set(0, 0, 0)
    this.applySkin('pulse')
    void this.mountMixamo()
  }

  applySkin(id: SkinId): void {
    this.skinId = id
    const skin = SKINS[id]
    this.runnerMats.armor.color.setHex(0x101b35)
    this.runnerMats.armor2.color.setHex(0x17294a)
    this.runnerMats.facet.color.setHex(0x29466f)
    this.runnerMats.shadow.color.setHex(0x09111f)
    this.runnerMats.cyan.color.setHex(skin.accent)
    this.runnerMats.cyan.emissive.setHex(skin.accent)
    this.runnerMats.cyan.emissiveIntensity = 0.95
    this.runnerMats.visor.color.setHex(skin.visor)
    this.runnerMats.visor.emissive.setHex(skin.accent)
    this.runnerMats.visor.emissiveIntensity = 1.25
    this.trailMat.color.setHex(skin.accent)
    this.mixamo?.applySkin(id)
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
    this.landHold = 0
    this.runPhase = 0
    this.root.rotation.set(0, 0, 0)
    this.root.position.set(0, 0, 0)
    this.resetFallbackPose()
    this.mixamo?.reset()
    this.setTrailStyle(false, 0)
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
    this.landHold = 0
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

  update(dt: number, speed: number, animate: boolean, running = false): void {
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
        this.landHold = 0.18
      }
    }
    if (this.landHold > 0) this.landHold = Math.max(0, this.landHold - dt)

    if (this.sliding) {
      this.slideTimer -= dt
      if (this.slideTimer <= 0) this.sliding = false
    }

    if (this.invuln > 0) this.invuln = Math.max(0, this.invuln - dt)

    this.root.position.x = this.x
    this.root.position.y = this.y
    this.root.position.z = 0

    if (!animate) return
    if (this.mixamo) this.updateMixamo(dt, speed, running)
    else if (running && !this.crashed) this.animateRun(dt, speed)
    else this.animateIdle(dt)
  }

  dispose(): void {
    this.disposed = true
    this.loadToken += 1
    this.mixamo?.dispose()
    this.mixamo = null
    this.rig.body.removeFromParent()
    this.shieldMesh.geometry.dispose()
    ;(this.shieldMesh.material as THREE.Material).dispose()
    this.trail[0]?.geometry.dispose()
    this.trailMat.dispose()
    for (const material of Object.values(this.runnerMats)) material.dispose()
  }

  private async mountMixamo(): Promise<void> {
    const token = ++this.loadToken
    try {
      const avatar = await loadMixamoAvatar(characterUrl)
      if (this.disposed || token !== this.loadToken) {
        avatar.dispose()
        return
      }
      this.rig.body.visible = false
      this.mixamo = avatar
      this.root.add(avatar.root)
      avatar.applySkin(this.skinId)
      avatar.reset()
      avatar.holdStill()
      ;(
        window as unknown as {
          __neonMixamo?: {
            clips: string[]
            available: MixamoAnimState[]
            missing: MixamoAnimState[]
            materials: { mesh: string; map: boolean; color: string }[]
          }
        }
      ).__neonMixamo = {
        clips: avatar.clipNames,
        available: avatar.available,
        missing: avatar.missing,
        materials: describeMixamoMaterials(avatar.root),
      }
    } catch (error) {
      console.warn('Mixamo character failed to load; keeping built-in runner.', error)
    }
  }

  private updateMixamo(dt: number, speed: number, running: boolean): void {
    const avatar = this.mixamo
    if (!avatar) return

    const lean = this.crashed ? 0.22 : clamp((LANES[this.lane] - this.x) * 0.22, -0.2, 0.2)
    const pitch = this.sliding && !this.crashed ? -0.92 : this.crashed ? 0.32 : 0
    const sink = this.sliding && !this.crashed ? -0.32 : 0
    avatar.pose(lean, pitch, sink, 1)
    const state = this.resolveMixamoState(running, speed)
    const timeScale = this.mixamoTimeScale(speed, running)
    if (this.sliding && !this.crashed) {
      if (!avatar.play('slide', dt, 1)) avatar.holdStill()
    } else if (!running || this.crashed) {
      if (!avatar.play(state, dt, 1)) avatar.holdStill()
    } else if (!avatar.play(state, dt, timeScale)) {
      avatar.play('run', dt, timeScale)
    }
    avatar.update(dt)
    this.root.position.y = this.y
  }

  private resolveMixamoState(running: boolean, speed: number): MixamoAnimState {
    if (this.crashed) return 'idle'
    if (!this.grounded) return this.vy > 0.4 ? 'jump' : 'fall'
    if (this.landHold > 0) return 'land'
    if (this.sliding) return 'slide'
    if (!running) return 'idle'
    return speed < 9 ? 'walk' : 'run'
  }

  private mixamoTimeScale(speed: number, running: boolean): number {
    if (!running || this.crashed || this.sliding || !this.grounded) return 1
    return clamp(0.85 + speed * 0.03, 0.85, 1.45)
  }

  private resetFallbackPose(): void {
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

  setShieldVisible(on: boolean): void {
    this.shieldMesh.visible = on
  }

  setTrailStyle(boosting: boolean, tier: number): void {
    const index = Math.max(0, Math.min(4, Math.floor(tier)))
    if (this.trailBoost === boosting && this.trailTier === index) return
    this.trailBoost = boosting
    this.trailTier = index
    const colors = [0x00cfff, 0x00f5a0, 0xa6ff4d, 0xffd166, 0xff6ad5]
    this.trailMat.color.setHex(boosting && index === 0 ? 0x66e8ff : colors[index])
    this.trailMat.opacity = boosting ? 0.52 : 0.16 + index * 0.07
    for (let i = 0; i < this.trail.length; i += 1) {
      const grow = 1 + index * 0.12
      this.trail[i].scale.set((1 - i * 0.18) * grow, (1 - i * 0.15) * grow, 1 + index * 0.2)
    }
  }

  private animateIdle(dt: number): void {
    const { body, helmet, leftShoulder, rightShoulder, leftElbow, rightElbow, leftHip, rightHip, leftKnee, rightKnee } =
      this.rig

    if (this.crashed) {
      this.animateCrash(dt)
      return
    }

    this.runPhase = 0
    this.root.rotation.x = damp(this.root.rotation.x, 0, 12, dt)
    this.root.rotation.z = damp(this.root.rotation.z, 0, 10, dt)
    body.position.y = damp(body.position.y, 0, 14, dt)
    body.rotation.x = damp(body.rotation.x, 0.04, 10, dt)
    body.rotation.y = damp(body.rotation.y, 0, 10, dt)
    helmet.rotation.x = damp(helmet.rotation.x, 0, 10, dt)
    leftHip.rotation.x = damp(leftHip.rotation.x, 0.06, 10, dt)
    rightHip.rotation.x = damp(rightHip.rotation.x, -0.06, 10, dt)
    leftKnee.rotation.x = damp(leftKnee.rotation.x, 0.1, 10, dt)
    rightKnee.rotation.x = damp(rightKnee.rotation.x, 0.1, 10, dt)
    leftShoulder.rotation.x = damp(leftShoulder.rotation.x, -0.04, 10, dt)
    rightShoulder.rotation.x = damp(rightShoulder.rotation.x, -0.04, 10, dt)
    leftElbow.rotation.x = damp(leftElbow.rotation.x, 0.35, 10, dt)
    rightElbow.rotation.x = damp(rightElbow.rotation.x, 0.35, 10, dt)
    this.root.position.y = this.y
  }

  private animateCrash(dt: number): void {
    const { body } = this.rig
    this.root.rotation.x = damp(this.root.rotation.x, -0.45, 10, dt)
    this.root.rotation.z = damp(this.root.rotation.z, 0.32, 10, dt)
    body.rotation.x = damp(body.rotation.x, 0.15, 8, dt)
  }

  private animateRun(dt: number, speed: number): void {
    const { body, helmet, leftShoulder, rightShoulder, leftElbow, rightElbow, leftHip, rightHip, leftKnee, rightKnee } =
      this.rig

    if (this.crashed) {
      this.animateCrash(dt)
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
