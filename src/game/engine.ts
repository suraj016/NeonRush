import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { POWERUP } from './config.ts'
import { AudioManager } from './audio.ts'
import { writePlayerAABB, isFatalHit, collectOverlap } from './collision.ts'
import { evaluateDifficulty } from './difficulty.ts'
import { InputManager, type GameAction } from './input.ts'
import { createMaterials, type MaterialSet } from './materials.ts'
import { Player } from './player.ts'
import { distanceScore, milestoneScore, nearMissScore, orbScore, powerupScore } from './score.ts'
import { PickupFx } from './fx.ts'
import { Spawner, type SpawnedPickup } from './spawner.ts'
import { TrackManager } from './track.ts'
import { World } from './world.ts'
import { EngineStates } from './types.ts'
import type { MapId } from './maps.ts'
import type {
  ActivePowerUp,
  EngineHooks,
  EngineState,
  HudSnapshot,
  PowerUpType,
  Quality,
  RunStats,
  Settings,
  SkinId,
} from './types.ts'
import { damp } from '../utils/math.ts'
import { RNG } from '../utils/rng.ts'

export class GameEngine {
  private renderer: THREE.WebGLRenderer
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private materials: MaterialSet
  private player: Player
  private track: TrackManager
  private world: World
  private spawner: Spawner
  private fx: PickupFx
  private audio: AudioManager
  private input: InputManager
  private hooks: EngineHooks
  private settings: Settings
  private state: EngineState = EngineStates.Booting
  private raf = 0
  private last = 0
  private hudAcc = 0
  private readyTimer = 0
  private overTimer = 0
  private shake = 0
  private camX = 0
  private camY = 3.25
  private menuT = 0
  private rng = new RNG()
  private score = 0
  private distance = 0
  private energy = 0
  private orbs = 0
  private duration = 0
  private powerupsUsed = 0
  private powerups: Record<PowerUpType, number> = { shield: 0, magnet: 0, multiplier: 0 }
  private disposed = false
  private canvas: HTMLCanvasElement
  private skin: SkinId
  private mapId: MapId = 'emerald'
  private lights: THREE.Light[] = []
  private ambient!: THREE.AmbientLight
  private hemi!: THREE.HemisphereLight
  private key!: THREE.DirectionalLight
  private fill!: THREE.DirectionalLight
  private rim!: THREE.DirectionalLight
  private composer: EffectComposer | null = null
  private bloomPass: UnrealBloomPass | null = null
  private pmrem: THREE.PMREMGenerator | null = null
  private envMap: THREE.Texture | null = null
  private frames = 0
  private fpsAcc = 0
  private fps = 60
  private fpsLow = 0
  private autoDropped = false
  private mobile = false
  private pausedDrawn = false
  private playerBox = { minX: 0, maxX: 0, minY: 0, maxY: 0, minZ: 0, maxZ: 0 }
  private lastHud = { score: -1, distance: -1, energy: -1, speed: -1, ready: '' as string | null, hint: '' as string | null, milestone: '' as string | null }
  private hazardsAvoided = 0
  private laneChanges = 0
  private nearMisses = 0
  private nearCool = 0
  private tutorialActive = false
  private milestoneLabel: string | null = null
  private milestoneTimer = 0
  private nextMilestone = 0
  private readonly milestones = [500, 1000, 2500, 5000]

  constructor(canvas: HTMLCanvasElement, settings: Settings, skin: SkinId, hooks: EngineHooks) {
    this.canvas = canvas
    this.settings = settings
    this.skin = skin
    this.hooks = hooks

    this.mobile = this.detectMobile()
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: settings.quality === 'high' && !this.mobile,
      alpha: false,
      stencil: false,
      powerPreference: 'high-performance',
    })
    renderer.setPixelRatio(this.pixelRatio(settings.quality))
    renderer.setClearColor(0x102923, 1)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.28
    this.renderer = renderer

    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(58, 1, 0.1, 320)
    this.camera.position.set(0, 3.35, 8.1)

    this.pmrem = new THREE.PMREMGenerator(renderer)
    this.envMap = this.pmrem.fromScene(new RoomEnvironment(), 0.03).texture
    this.scene.environment = this.envMap
    this.scene.environmentIntensity = 0.42

    this.materials = createMaterials()
    this.player = new Player(this.materials)
    this.player.applySkin(skin)
    this.track = new TrackManager(this.materials)
    const worldQuality = this.worldQuality(settings.quality)
    this.world = new World(this.scene, this.materials, worldQuality)
    this.world.setQuality(worldQuality, settings.reducedMotion)
    this.spawner = new Spawner(this.materials)
    this.fx = new PickupFx()
    this.scene.add(this.fx.root)
    this.audio = new AudioManager(settings)
    this.input = new InputManager(canvas.parentElement ?? canvas, {
      onAction: (action) => this.handleAction(action),
      isGameplayActive: () =>
        this.state === EngineStates.Playing || this.state === EngineStates.Ready,
    })

    this.scene.add(this.track.root, this.world.root, this.player.root)
    this.addLights()
    this.applyMap('emerald')
    this.setupComposer(this.shouldBloom())
    this.resize()
    window.addEventListener('resize', this.onResize)
    window.visualViewport?.addEventListener('resize', this.onResize)
    document.addEventListener('visibilitychange', this.onVisibility)
    this.setState(EngineStates.MainMenu)
    this.seedMenu()
  }

  start(): void {
    if (this.raf || this.disposed) return
    this.last = performance.now()
    const loop = (now: number) => {
      if (this.disposed) return
      this.raf = requestAnimationFrame(loop)
      this.tick(now)
    }
    this.raf = requestAnimationFrame(loop)
  }

  destroy(): void {
    if (this.disposed) return
    this.disposed = true
    if (this.raf) cancelAnimationFrame(this.raf)
    this.raf = 0
    window.removeEventListener('resize', this.onResize)
    window.visualViewport?.removeEventListener('resize', this.onResize)
    document.removeEventListener('visibilitychange', this.onVisibility)
    this.disposeComposer()
    this.input.dispose()
    this.audio.dispose()
    this.fx.dispose()
    this.spawner.dispose()
    this.track.dispose()
    this.world.dispose()
    this.materials.dispose()
    for (const light of this.lights) {
      this.scene.remove(light)
    }
    this.envMap?.dispose()
    this.pmrem?.dispose()
    this.renderer.dispose()
  }

  uiClick(): void {
    this.audio.unlock()
    this.audio.startMusic()
    this.audio.play('ui')
  }

  applySettings(settings: Settings): void {
    this.settings = settings
    this.audio.applySettings(settings)
    this.world.setQuality(this.worldQuality(settings.quality), settings.reducedMotion)
    this.renderer.setPixelRatio(this.pixelRatio(settings.quality))
    this.setupComposer(this.shouldBloom())
    this.resize()
  }

  applySkin(id: SkinId): void {
    this.skin = id
    this.player.applySkin(id)
  }

  setTutorial(active: boolean): void {
    this.tutorialActive = active
  }

  applyMap(id: MapId): void {
    this.mapId = id
    this.world.setMap(id)
    this.track.setMap(id)
    this.spawner.setMap(id)
    this.applyMapLights(id)
    this.renderer.setClearColor(id === 'desert' ? 0xe8d4b0 : id === 'frozen' ? 0xd5e3ea : 0x102923, 1)
    this.renderer.toneMappingExposure = id === 'desert' ? 1.08 : id === 'frozen' ? 1.06 : 1.28
    this.scene.environmentIntensity = id === 'emerald' ? 0.42 : 0.16
    this.setupComposer(this.shouldBloom())
    if (this.state === EngineStates.MainMenu) this.seedMenu()
  }

  play(): void {
    this.audio.unlock()
    this.audio.startMusic()
    this.audio.play('start')
    this.resetRun()
    this.readyTimer = 1.15
    this.setState(EngineStates.Ready)
  }

  pause(): void {
    if (this.state !== EngineStates.Playing) return
    this.setState(EngineStates.Paused)
  }

  resume(): void {
    if (this.state !== EngineStates.Paused) return
    this.last = performance.now()
    this.setState(EngineStates.Playing)
  }

  restart(): void {
    this.audio.unlock()
    this.audio.startMusic()
    this.resetRun()
    this.readyTimer = 1.15
    this.setState(EngineStates.Ready)
  }

  toMenu(): void {
    this.resetRun()
    this.seedMenu()
    this.setState(EngineStates.MainMenu)
  }

  private tick(now: number): void {
    const raw = (now - this.last) / 1000
    this.last = now
    const dt = Math.min(raw, 0.05)
    this.audio.update(dt)

    this.sampleFps(dt)

    if (this.state === EngineStates.MainMenu) {
      this.menuT += dt
      this.world.update(dt, dt * 5.5, 120, true)
      this.track.update(dt)
      this.player.update(dt, 12, !this.settings.reducedMotion)
      this.updateCamera(dt, true)
      this.render()
      return
    }

    if (this.state === EngineStates.Ready) {
      this.readyTimer -= dt
      this.player.update(dt, 0, true)
      this.updateCamera(dt, false)
      this.hudAcc += dt
      if (this.hudAcc >= 0.12) {
        this.hudAcc = 0
        this.pushHud('READY')
      }
      this.render()
      if (this.readyTimer <= 0) this.setState(EngineStates.Playing)
      return
    }

    if (this.state === EngineStates.Paused) {
      if (!this.pausedDrawn) {
        this.render()
        this.pausedDrawn = true
      }
      return
    }
    this.pausedDrawn = false

    if (this.state === EngineStates.GameOver) {
      this.player.update(dt, 0, true)
      this.shake = damp(this.shake, 0, 6, dt)
      this.updateCamera(dt, false)
      this.overTimer -= dt
      this.render()
      if (this.overTimer <= 0) {
        this.overTimer = 999
        this.tutorialActive = false
        this.hooks.onGameOver(this.runStats())
      }
      return
    }

    if (this.state !== EngineStates.Playing) {
      this.render()
      return
    }

    const difficulty = evaluateDifficulty(this.distance)
    const moved = difficulty.speed * dt
    this.distance += moved
    this.duration += dt
    const mul = this.powerups.multiplier > 0 ? POWERUP.scoreMul : 1
    this.score += distanceScore(moved, mul)

    this.tickPowerups(dt)
    this.player.update(dt, difficulty.speed, !this.settings.reducedMotion)
    if (this.player.justLanded) this.audio.play('land')
    this.player.setShieldVisible(this.powerups.shield > 0)
    this.tickMilestones(dt, mul)
    if (this.nearCool > 0) this.nearCool = Math.max(0, this.nearCool - dt)

    const recycled = this.track.advance(moved)
    for (const segment of recycled) {
      this.spawner.reclaimSegment(segment)
      const safe = this.distance < 55
      this.spawner.populate(segment, this.distance, this.rng, difficulty, safe)
    }

    this.spawner.update(dt, true)
    this.fx.update(dt)
    this.track.update(dt)
    this.world.update(dt, moved, this.distance, true)
    this.resolvePickups(dt)
    this.resolveHazards()
    this.resolveAvoided()
    this.shake = damp(this.shake, 0, 8, dt)
    this.updateCamera(dt, false)
    this.hudAcc += dt
    if (this.hudAcc >= 0.2) {
      this.hudAcc = 0
      this.pushHud(null)
    }
    this.render()
  }

  private resolvePickups(dt: number): void {
    const box = writePlayerAABB(this.playerBox, this.player.x, this.player.y, this.player.sliding)
    const magnet = this.powerups.magnet > 0
    const pickups = this.spawner.pickups
    for (let i = pickups.length - 1; i >= 0; i -= 1) {
      const pickup = pickups[i]
      if (!pickup.alive) continue
      const worldZ = pickup.segment.group.position.z + pickup.localZ
      if (magnet && Math.abs(worldZ) < POWERUP.magnetRadius) {
        this.spawner.attract(pickup, this.player.x, dt)
      }
      if (!collectOverlap(box, this.spawner.pickupBox(pickup))) continue
      if (pickup.type === 'orb') {
        const mul = this.powerups.multiplier > 0 ? POWERUP.scoreMul : 1
        const gained = orbScore(mul)
        this.score += gained
        this.energy += 1
        this.orbs += 1
        this.hooks.onEnergy(this.energy, this.energy)
        this.audio.play('orb')
        this.spawnCollectFx(pickup, `+${gained}`)
      } else {
        const mul = this.powerups.multiplier > 0 ? POWERUP.scoreMul : 1
        this.spawnCollectFx(pickup, `+${powerupScore(mul)}`)
        this.activatePower(pickup.type)
      }
      this.spawner.collect(pickup)
    }
  }

  private spawnCollectFx(pickup: SpawnedPickup, label: string): void {
    if (this.settings.reducedMotion || (this.mobile && this.autoDropped)) return
    const x = pickup.mesh.position.x
    const y = pickup.mesh.position.y
    const z = pickup.segment.group.position.z + pickup.mesh.position.z
    this.fx.spawn(x, y, z, label)
  }

  private resolveHazards(): void {
    if (this.player.invuln > 0 || this.player.crashed) return
    const box = writePlayerAABB(this.playerBox, this.player.x, this.player.y, this.player.sliding)
    const hazards = this.spawner.hazards
    for (let i = 0; i < hazards.length; i += 1) {
      const hazard = hazards[i]
      if (!hazard.alive) continue
      const hz = this.spawner.worldBox(hazard)
      if (!isFatalHit(hazard.type, box, hz)) continue
      if (this.powerups.shield > 0) {
        this.powerups.shield = 0
        this.player.hitShield()
        this.spawner.killHazard(hazard)
        this.audio.play('shield')
        if (this.canShake()) this.shake = 0.28
        return
      }
      this.crash()
      return
    }
  }

  private crash(): void {
    this.player.crashed = true
    this.audio.play('crash')
    if (this.canShake()) this.shake = 0.55
    this.overTimer = 0.55
    this.setState(EngineStates.GameOver)
  }

  private activatePower(type: PowerUpType): void {
    this.powerups[type] = POWERUP[type]
    this.powerupsUsed += 1
    this.score += powerupScore(this.powerups.multiplier > 0 ? POWERUP.scoreMul : 1)
    this.audio.play('power')
  }

  private tickPowerups(dt: number): void {
    for (const key of Object.keys(this.powerups) as PowerUpType[]) {
      const was = this.powerups[key]
      if (was <= 0) continue
      this.powerups[key] = Math.max(0, was - dt)
      if (was > 0 && this.powerups[key] === 0) this.audio.play('ui')
    }
  }

  private handleAction(action: GameAction): void {
    if (action === 'pause') {
      if (this.state === EngineStates.Playing) this.pause()
      else if (this.state === EngineStates.Paused) this.resume()
      return
    }
    if (this.state !== EngineStates.Playing && this.state !== EngineStates.Ready) return
    if (action === 'left' && this.player.moveLeft() && this.state === EngineStates.Playing) this.laneChanges += 1
    if (action === 'right' && this.player.moveRight() && this.state === EngineStates.Playing) this.laneChanges += 1
    if (this.state !== EngineStates.Playing) return
    if (action === 'jump' && this.player.jump()) this.audio.play('jump')
    if (action === 'slide' && this.player.slide()) this.audio.play('slide')
  }

  private resetRun(): void {
    this.rng = new RNG()
    this.score = 0
    this.distance = 0
    this.energy = 0
    this.orbs = 0
    this.duration = 0
    this.powerupsUsed = 0
    this.hazardsAvoided = 0
    this.laneChanges = 0
    this.nearMisses = 0
    this.nearCool = 0
    this.milestoneLabel = null
    this.milestoneTimer = 0
    this.nextMilestone = 0
    this.powerups = { shield: 0, magnet: 0, multiplier: 0 }
    this.shake = 0
    this.overTimer = 0
    this.player.reset()
    this.player.applySkin(this.skin)
    this.track.reset()
    this.spawner.reset()
    this.fx.reset()
    this.world.reset()
    for (const segment of this.track.segments) {
      const z = Math.abs(segment.group.position.z)
      this.spawner.populate(segment, z, this.rng, evaluateDifficulty(0), z < 60)
    }
    this.pushHud('READY')
  }

  private seedMenu(): void {
    this.player.reset()
    this.player.applySkin(this.skin)
    this.track.reset()
    this.spawner.reset()
    this.fx.reset()
    this.world.reset()
    for (const segment of this.track.segments) {
      if (Math.abs(segment.group.position.z) > 30) {
        this.spawner.populate(segment, 200, this.rng, evaluateDifficulty(400), false)
      }
    }
  }

  private updateCamera(dt: number, menu: boolean): void {
    if (menu) {
      const t = this.settings.reducedMotion ? 0 : this.menuT
      const x = 2.8 + Math.sin(t * 0.22) * 1.35
      const y = 3.1 + Math.sin(t * 0.17) * 0.28
      const z = 7.8
      this.camera.position.set(x, y, z)
      this.camera.lookAt(this.player.x * 0.35, 2.2, -14)
      return
    }
    const follow = this.mobile ? 8 : 6
    this.camX = damp(this.camX, this.player.x * 0.55, follow, dt)
    this.camY = damp(this.camY, 3.35 + this.player.y * 0.18, follow, dt)
    const sx = this.shake ? (Math.random() - 0.5) * this.shake : 0
    const sy = this.shake ? (Math.random() - 0.5) * this.shake : 0
    this.camera.position.set(this.camX + sx, this.camY + sy, this.camera.aspect < 0.75 ? 9.1 : 8.15)
    this.camera.lookAt(this.player.x * 0.32, 1.55 + this.player.y * 0.1, -12)
  }

  private pushHud(ready: string | null): void {
    const difficulty = evaluateDifficulty(this.distance)
    const powerups: ActivePowerUp[] = []
    for (const type of Object.keys(this.powerups) as PowerUpType[]) {
      if (this.powerups[type] > 0) powerups.push({ type, remaining: this.powerups[type] })
    }
    const hud: HudSnapshot = {
      score: Math.floor(this.score),
      distance: Math.floor(this.distance),
      energy: this.energy,
      speed: difficulty.speed,
      tier: difficulty.tier,
      multiplier: this.powerups.multiplier > 0 ? POWERUP.scoreMul : 1,
      powerups,
      readyLabel: ready,
      hint: this.tutorialHint(),
      milestone: this.milestoneLabel,
    }
    if (
      this.lastHud.score === hud.score &&
      this.lastHud.distance === hud.distance &&
      this.lastHud.energy === hud.energy &&
      this.lastHud.speed === Math.floor(hud.speed) &&
      this.lastHud.ready === hud.readyLabel &&
      this.lastHud.hint === hud.hint &&
      this.lastHud.milestone === hud.milestone
    ) {
      return
    }
    this.lastHud.score = hud.score
    this.lastHud.distance = hud.distance
    this.lastHud.energy = hud.energy
    this.lastHud.speed = Math.floor(hud.speed)
    this.lastHud.ready = hud.readyLabel
    this.lastHud.hint = hud.hint
    this.lastHud.milestone = hud.milestone
    this.hooks.onHud(hud)
  }

  private runStats(): RunStats {
    return {
      score: Math.floor(this.score),
      distance: Math.floor(this.distance),
      energy: this.energy,
      duration: this.duration,
      orbs: this.orbs,
      powerupsUsed: this.powerupsUsed,
      hazardsAvoided: this.hazardsAvoided,
      laneChanges: this.laneChanges,
      nearMisses: this.nearMisses,
      mapId: this.mapId,
    }
  }

  private tutorialHint(): string | null {
    if (!this.tutorialActive || this.state !== EngineStates.Playing) return null
    if (this.duration < 4) return 'A / D or swipe to change lanes'
    if (this.duration < 8) return 'W or swipe up to jump'
    if (this.duration < 12) return 'S or swipe down to slide'
    if (this.duration < 16) return 'Collect energy coins'
    return null
  }

  private tickMilestones(dt: number, mul: number): void {
    if (this.nextMilestone < this.milestones.length && this.distance >= this.milestones[this.nextMilestone]) {
      const mark = this.milestones[this.nextMilestone]
      this.nextMilestone += 1
      this.milestoneLabel = `${mark.toLocaleString()} m`
      this.milestoneTimer = 2.4
      this.score += milestoneScore(mul)
      this.audio.play('milestone')
      this.pushHud(null)
    }
    if (this.milestoneTimer > 0) {
      this.milestoneTimer -= dt
      if (this.milestoneTimer <= 0) this.milestoneLabel = null
    }
  }

  private resolveAvoided(): void {
    const hazards = this.spawner.hazards
    for (let i = 0; i < hazards.length; i += 1) {
      const hazard = hazards[i]
      if (!hazard.alive) continue
      const worldZ = hazard.segment.group.position.z + hazard.localZ
      if (!hazard.nearMissed && worldZ > -1.35 && worldZ < 1.15) {
        const dx = Math.abs(hazard.mesh.position.x - this.player.x)
        if (dx > 1.1 && dx < 3) {
          hazard.nearMissed = true
          this.nearMisses += 1
          this.score += nearMissScore(this.powerups.multiplier > 0 ? POWERUP.scoreMul : 1)
          if (this.nearCool <= 0) {
            this.audio.play('near')
            this.nearCool = 0.28
          }
        }
      }
      if (!hazard.passed && worldZ > 1.6) {
        hazard.passed = true
        this.hazardsAvoided += 1
      }
    }
  }

  private setState(state: EngineState): void {
    this.state = state
    this.hooks.onState(state)
  }

  private addLights(): void {
    this.ambient = new THREE.AmbientLight(0x1f4a42, 0.58)
    this.hemi = new THREE.HemisphereLight(0x8fd4c4, 0x102923, 1.08)
    this.key = new THREE.DirectionalLight(0xe9fff6, 0.52)
    this.key.position.set(-6, 14, 8)
    this.fill = new THREE.DirectionalLight(0x18b8c9, 0.32)
    this.fill.position.set(8, 7, 5)
    this.rim = new THREE.DirectionalLight(0x00f5a0, 0.34)
    this.rim.position.set(5, 4, -6)
    this.scene.add(this.ambient, this.hemi, this.key, this.fill, this.rim)
    this.lights.push(this.ambient, this.hemi, this.key, this.fill, this.rim)
  }

  private applyMapLights(id: MapId): void {
    if (id === 'desert') {
      this.ambient.color.setHex(0xe6d6b8)
      this.ambient.intensity = 0.64
      this.hemi.color.setHex(0xffefd2)
      this.hemi.groundColor.setHex(0x7a5a40)
      this.hemi.intensity = 0.98
      this.key.color.setHex(0xfff2d6)
      this.key.intensity = 0.78
      this.key.position.set(-12, 18, 2)
      this.fill.color.setHex(0xc4b089)
      this.fill.intensity = 0.18
      this.fill.position.set(9, 6, 6)
      this.rim.color.setHex(0x8a6a4a)
      this.rim.intensity = 0.14
      this.rim.position.set(5, 5, -8)
      return
    }
    if (id === 'frozen') {
      this.ambient.color.setHex(0xd8e4ec)
      this.ambient.intensity = 0.66
      this.hemi.color.setHex(0xf2f6f8)
      this.hemi.groundColor.setHex(0x4a5e6c)
      this.hemi.intensity = 0.98
      this.key.color.setHex(0xfff6ea)
      this.key.intensity = 0.7
      this.key.position.set(10, 17, 5)
      this.fill.color.setHex(0xb9c8d4)
      this.fill.intensity = 0.2
      this.fill.position.set(-7, 6, 5)
      this.rim.color.setHex(0x8aa4b4)
      this.rim.intensity = 0.16
      this.rim.position.set(-4, 5, -7)
      return
    }
    this.ambient.color.setHex(0x1f4a42)
    this.ambient.intensity = 0.58
    this.hemi.color.setHex(0x8fd4c4)
    this.hemi.groundColor.setHex(0x102923)
    this.hemi.intensity = 1.08
    this.key.color.setHex(0xe9fff6)
    this.key.intensity = 0.52
    this.key.position.set(-6, 14, 8)
    this.fill.color.setHex(0x18b8c9)
    this.fill.intensity = 0.32
    this.fill.position.set(8, 7, 5)
    this.rim.color.setHex(0x00f5a0)
    this.rim.intensity = 0.34
    this.rim.position.set(5, 4, -6)
  }

  private shouldBloom(): boolean {
    return (
      this.mapId === 'emerald' &&
      this.settings.quality === 'high' &&
      !this.settings.reducedMotion &&
      !this.mobile &&
      !this.autoDropped
    )
  }

  private disposeComposer(): void {
    this.composer?.dispose()
    this.composer = null
    this.bloomPass = null
  }

  private setupComposer(enabled: boolean): void {
    this.disposeComposer()
    if (!enabled) return
    const width = Math.max(1, this.canvas.clientWidth || 1280)
    const height = Math.max(1, this.canvas.clientHeight || 720)
    const composer = new EffectComposer(this.renderer)
    composer.addPass(new RenderPass(this.scene, this.camera))
    const bloom = new UnrealBloomPass(new THREE.Vector2(width, height), 0.14, 0.22, 0.92)
    composer.addPass(bloom)
    composer.addPass(new OutputPass())
    this.composer = composer
    this.bloomPass = bloom
  }

  private sampleFps(dt: number): void {
    this.frames += 1
    this.fpsAcc += dt
    if (this.fpsAcc < 0.5) return
    this.fps = this.frames / this.fpsAcc
    this.frames = 0
    this.fpsAcc = 0
    if (this.fps < (this.mobile ? 48 : 44)) this.fpsLow += 1
    else this.fpsLow = 0
    if (this.fpsLow >= (this.mobile ? 2 : 4) && !this.autoDropped) {
      this.autoDropped = true
      this.disposeComposer()
      this.renderer.setPixelRatio(Math.min(this.pixelRatio('low'), 1))
      this.world.setQuality('low', this.settings.reducedMotion)
    }
    ;(window as unknown as { __neonPerf?: { fps: number } }).__neonPerf = { fps: Math.round(this.fps) }
  }

  private render(): void {
    if (this.composer) this.composer.render()
    else this.renderer.render(this.scene, this.camera)
  }

  private resize(): void {
    const view = window.visualViewport
    const width = Math.max(1, this.canvas.clientWidth || view?.width || window.innerWidth)
    const height = Math.max(1, this.canvas.clientHeight || view?.height || window.innerHeight)
    this.renderer.setSize(width, height, false)
    this.composer?.setSize(width, height)
    this.bloomPass?.resolution.set(width, height)
    this.camera.aspect = width / height
    this.camera.fov = this.camera.aspect < 0.7 ? 68 : this.camera.aspect < 1 ? 62 : 56
    this.camera.updateProjectionMatrix()
  }

  private onResize = (): void => {
    this.resize()
  }

  private onVisibility = (): void => {
    if (document.hidden && this.state === EngineStates.Playing) this.pause()
  }

  private pixelRatio(quality: Quality): number {
    const dpr = window.devicePixelRatio || 1
    if (this.mobile) {
      const cap = quality === 'low' ? 1 : quality === 'medium' ? 1.08 : 1.15
      return Math.min(dpr, cap)
    }
    const cap = quality === 'low' ? 1 : quality === 'medium' ? 1.15 : 1.5
    return Math.min(dpr, cap)
  }

  private worldQuality(quality: Quality): Quality {
    if (this.mobile && quality === 'high') return 'medium'
    return quality
  }

  private canShake(): boolean {
    return this.settings.cameraShake && !this.settings.reducedMotion && !this.mobile
  }

  private detectMobile(): boolean {
    const coarse = window.matchMedia('(pointer: coarse)').matches
    const narrow = window.innerWidth < 820
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
    return coarse || narrow || (memory !== undefined && memory <= 4)
  }
}
