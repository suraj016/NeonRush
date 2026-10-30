import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { POWERUP } from './config.ts'
import { AudioManager } from './audio.ts'
import { playerAABB, isFatalHit, collectOverlap } from './collision.ts'
import { evaluateDifficulty } from './difficulty.ts'
import { InputManager, type GameAction } from './input.ts'
import { createMaterials, type MaterialSet } from './materials.ts'
import { Player } from './player.ts'
import { distanceScore, orbScore, powerupScore } from './score.ts'
import { PickupFx } from './fx.ts'
import { Spawner, type SpawnedPickup } from './spawner.ts'
import { TrackManager } from './track.ts'
import { World } from './world.ts'
import { EngineStates } from './types.ts'
import type {
  ActivePowerUp,
  EngineHooks,
  EngineState,
  HudSnapshot,
  PowerUpType,
  Quality,
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
  private lights: THREE.Light[] = []
  private composer: EffectComposer | null = null
  private bloomPass: UnrealBloomPass | null = null
  private pmrem: THREE.PMREMGenerator | null = null
  private envMap: THREE.Texture | null = null
  private frames = 0
  private fpsAcc = 0
  private fps = 0

  constructor(canvas: HTMLCanvasElement, settings: Settings, skin: SkinId, hooks: EngineHooks) {
    this.canvas = canvas
    this.settings = settings
    this.skin = skin
    this.hooks = hooks

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: settings.quality !== 'low',
      alpha: false,
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
    this.world = new World(this.scene, this.materials, settings.quality)
    this.world.setQuality(settings.quality, settings.reducedMotion)
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
    this.setupComposer(settings.quality !== 'low' && !settings.reducedMotion)
    this.resize()
    window.addEventListener('resize', this.onResize)
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
    document.removeEventListener('visibilitychange', this.onVisibility)
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
    this.composer = null
    this.bloomPass = null
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
    this.world.setQuality(settings.quality, settings.reducedMotion)
    this.renderer.setPixelRatio(this.pixelRatio(settings.quality))
    this.setupComposer(settings.quality !== 'low' && !settings.reducedMotion)
    this.resize()
  }

  applySkin(id: SkinId): void {
    this.skin = id
    this.player.applySkin(id)
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
      this.render()
      return
    }

    if (this.state === EngineStates.GameOver) {
      this.player.update(dt, 0, true)
      this.shake = damp(this.shake, 0, 6, dt)
      this.updateCamera(dt, false)
      this.overTimer -= dt
      this.render()
      if (this.overTimer <= 0) {
        this.overTimer = 999
        this.hooks.onGameOver({
          score: Math.floor(this.score),
          distance: Math.floor(this.distance),
          energy: this.energy,
          duration: this.duration,
          orbs: this.orbs,
          powerupsUsed: this.powerupsUsed,
          isBestScore: false,
          isBestDistance: false,
          completedMissions: [],
        })
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
    this.player.setShieldVisible(this.powerups.shield > 0)

    const recycled = this.track.advance(moved)
    for (const segment of recycled) {
      this.spawner.reclaimSegment(segment)
      const safe = this.distance < 55
      this.spawner.populate(segment, this.distance, this.rng, difficulty, safe)
    }

    this.spawner.update(dt, true)
    if (!this.settings.reducedMotion) this.fx.update(dt)
    this.track.update(dt)
    this.world.update(dt, moved, this.distance, true)
    this.resolvePickups(dt)
    this.resolveHazards()
    this.shake = damp(this.shake, 0, 8, dt)
    this.updateCamera(dt, false)
    this.hudAcc += dt
    if (this.hudAcc >= 0.12) {
      this.hudAcc = 0
      this.pushHud(null)
    }
    this.render()
  }

  private resolvePickups(dt: number): void {
    const box = playerAABB(this.player.x, this.player.y, this.player.sliding)
    const magnet = this.powerups.magnet > 0
    for (const pickup of [...this.spawner.pickups]) {
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
    if (this.settings.reducedMotion) return
    const x = pickup.mesh.position.x
    const y = pickup.mesh.position.y
    const z = pickup.segment.group.position.z + pickup.mesh.position.z
    this.fx.spawn(x, y, z, label)
  }

  private resolveHazards(): void {
    if (this.player.invuln > 0 || this.player.crashed) return
    const box = playerAABB(this.player.x, this.player.y, this.player.sliding)
    for (const hazard of [...this.spawner.hazards]) {
      if (!hazard.alive) continue
      const hz = this.spawner.worldBox(hazard)
      if (!isFatalHit(hazard.type, box, hz)) continue
      if (this.powerups.shield > 0) {
        this.powerups.shield = 0
        this.player.hitShield()
        this.spawner.killHazard(hazard)
        this.audio.play('shield')
        if (this.settings.cameraShake && !this.settings.reducedMotion) this.shake = 0.28
        return
      }
      this.crash()
      return
    }
  }

  private crash(): void {
    this.player.crashed = true
    this.audio.play('crash')
    if (this.settings.cameraShake && !this.settings.reducedMotion) this.shake = 0.55
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
      if (this.powerups[key] > 0) this.powerups[key] = Math.max(0, this.powerups[key] - dt)
    }
  }

  private handleAction(action: GameAction): void {
    if (action === 'pause') {
      if (this.state === EngineStates.Playing) this.pause()
      else if (this.state === EngineStates.Paused) this.resume()
      return
    }
    if (this.state !== EngineStates.Playing && this.state !== EngineStates.Ready) return
    if (action === 'left') this.player.moveLeft()
    if (action === 'right') this.player.moveRight()
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
    this.camX = damp(this.camX, this.player.x * 0.55, 6, dt)
    this.camY = damp(this.camY, 3.35 + this.player.y * 0.18, 6, dt)
    const sx = this.shake ? (Math.random() - 0.5) * this.shake : 0
    const sy = this.shake ? (Math.random() - 0.5) * this.shake : 0
    this.camera.position.set(this.camX + sx, this.camY + sy, 8.15)
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
    }
    this.hooks.onHud(hud)
  }

  private setState(state: EngineState): void {
    this.state = state
    this.hooks.onState(state)
  }

  private addLights(): void {
    const ambient = new THREE.AmbientLight(0x1f4a42, 0.58)
    const hemi = new THREE.HemisphereLight(0x8fd4c4, 0x102923, 1.08)
    const key = new THREE.DirectionalLight(0xe9fff6, 0.52)
    key.position.set(-6, 14, 8)
    const fill = new THREE.DirectionalLight(0x18b8c9, 0.32)
    fill.position.set(8, 7, 5)
    const rim = new THREE.DirectionalLight(0x00f5a0, 0.34)
    rim.position.set(5, 4, -6)
    this.scene.add(ambient, hemi, key, fill, rim)
    this.lights.push(ambient, hemi, key, fill, rim)
  }

  private setupComposer(enabled: boolean): void {
    if (!enabled) {
      this.composer = null
      this.bloomPass = null
      return
    }
    const size = new THREE.Vector2(this.canvas.clientWidth || 1280, this.canvas.clientHeight || 720)
    const composer = new EffectComposer(this.renderer)
    composer.addPass(new RenderPass(this.scene, this.camera))
    const bloom = new UnrealBloomPass(size, 0.16, 0.26, 0.9)
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
    ;(window as unknown as { __neonPerf?: { fps: number } }).__neonPerf = { fps: Math.round(this.fps) }
  }

  private render(): void {
    if (this.composer) this.composer.render()
    else this.renderer.render(this.scene, this.camera)
  }

  private resize(): void {
    const width = this.canvas.clientWidth || window.innerWidth
    const height = this.canvas.clientHeight || window.innerHeight
    this.renderer.setSize(width, height, false)
    this.composer?.setSize(width, height)
    this.bloomPass?.resolution.set(width, height)
    this.camera.aspect = width / Math.max(1, height)
    this.camera.updateProjectionMatrix()
  }

  private onResize = (): void => {
    this.resize()
  }

  private onVisibility = (): void => {
    if (document.hidden && this.state === EngineStates.Playing) this.pause()
  }

  private pixelRatio(quality: Quality): number {
    const cap = quality === 'low' ? 1 : quality === 'medium' ? 1.25 : 2
    return Math.min(window.devicePixelRatio || 1, cap)
  }
}
