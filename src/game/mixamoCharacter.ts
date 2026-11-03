import * as THREE from 'three'
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js'
import type { SkinId } from './types.ts'
import { damp } from '../utils/math.ts'

export const MIXAMO_ANIM_STATES = ['idle', 'walk', 'run', 'jump', 'fall', 'land', 'slide'] as const
export type MixamoAnimState = (typeof MIXAMO_ANIM_STATES)[number]

const TARGET_HEIGHT = 2.05
const FACE_DOWN_TRACK = Math.PI
const FADE = 0.18
const JUMP_FADE = 0.1

const CLIP_HINTS: Record<MixamoAnimState, RegExp> = {
  idle: /idle|stand|breath|relax/i,
  walk: /walk|jog/i,
  run: /run|sprint|loco|free\s*run/i,
  jump: /jump|up\b|launch/i,
  fall: /fall|air|midair|inair/i,
  land: /land|recover/i,
  slide: /slid|crouch|roll/i,
}

export type MixamoFit = {
  scale: number
  lift: number
  centerX: number
  centerZ: number
}

export type MixamoAvatar = {
  readonly root: THREE.Group
  readonly clipNames: string[]
  readonly available: MixamoAnimState[]
  readonly missing: MixamoAnimState[]
  applySkin(id: SkinId): void
  reset(): void
  dispose(): void
  pose(lean: number, pitch: number, sink: number, scaleY: number): void
  play(state: MixamoAnimState, dt: number, timeScale: number): boolean
  holdStill(): void
  animateProcedural(state: MixamoAnimState, dt: number, speed: number): void
  update(dt: number): void
}

const bufferCache = new Map<string, Promise<ArrayBuffer>>()
const templateCache = new Map<string, Promise<THREE.Group>>()
let cachedAvatar: MixamoAvatar | null = null
let avatarLoad: Promise<MixamoAvatar> | null = null

export function classifyClipName(name: string): MixamoAnimState | 'generic' {
  for (const state of MIXAMO_ANIM_STATES) {
    if (CLIP_HINTS[state].test(name)) return state
  }
  return 'generic'
}

export function clipHasMotion(clip: THREE.AnimationClip, epsilon = 1e-3): boolean {
  for (const track of clip.tracks) {
    const values = track.values
    const stride = track.getValueSize()
    if (values.length <= stride) continue
    for (let i = stride; i < values.length; i += stride) {
      for (let c = 0; c < stride; c += 1) {
        if (Math.abs(values[i + c] - values[c]) > epsilon) return true
      }
    }
  }
  return false
}

export function inferGenericState(clip: THREE.AnimationClip): MixamoAnimState | null {
  if (!clipHasMotion(clip) || clip.duration <= 0) return null
  return clip.duration < 1.2 ? 'run' : 'idle'
}

export function computeFit(height: number, minY: number, target = TARGET_HEIGHT): MixamoFit {
  const scale = height > 0 ? target / height : 1
  const lift = Math.abs(minY) < 1e-12 ? 0 : -minY * scale
  return { scale, lift, centerX: 0, centerZ: 0 }
}

export function makeInPlace(clip: THREE.AnimationClip): THREE.AnimationClip {
  const next = clip.clone()
  for (const track of next.tracks) {
    if (!/hips\.position$/i.test(track.name)) continue
    const values = track.values
    if (values.length < 3) continue
    const x0 = values[0]
    const z0 = values[2]
    for (let i = 0; i < values.length; i += 3) {
      values[i] = x0
      values[i + 2] = z0
    }
  }
  return next
}

/** Start downloading the FBX bytes without blocking the main thread. */
export function beginMixamoPrefetch(url: string): void {
  if (bufferCache.has(url)) return
  bufferCache.set(
    url,
    fetch(url).then((response) => {
      if (!response.ok) throw new Error(`Mixamo FBX fetch failed (${response.status})`)
      return response.arrayBuffer()
    }),
  )
}

export function preloadMixamoAvatar(url: string): Promise<THREE.Group> {
  let pending = templateCache.get(url)
  if (!pending) {
    pending = loadMixamoTemplate(url)
    templateCache.set(url, pending)
  }
  return pending
}

export async function loadMixamoAvatar(url: string): Promise<MixamoAvatar> {
  if (cachedAvatar) return cachedAvatar
  if (!avatarLoad) {
    avatarLoad = preloadMixamoAvatar(url).then((group) => {
      cachedAvatar = createMixamoAvatar(group)
      return cachedAvatar
    })
  }
  return avatarLoad
}

export function releaseMixamoAvatarCache(): void {
  if (cachedAvatar) destroyMixamoAssets(cachedAvatar)
  cachedAvatar = null
  avatarLoad = null
  templateCache.clear()
}

export function createMixamoAvatar(fbx: THREE.Group): MixamoAvatar {
  return new MixamoAvatarImpl(fbx)
}

async function loadMixamoTemplate(url: string): Promise<THREE.Group> {
  beginMixamoPrefetch(url)
  const buffer = await bufferCache.get(url)!
  await yieldFrames(2)
  const group = new FBXLoader().parse(buffer, resourcePath(url))
  await waitForTextures(group)
  await optimizeMixamoTemplateAsync(group)
  cacheFit(group)
  cacheClipActions(group)
  return group
}

function resourcePath(url: string): string {
  const cut = url.lastIndexOf('/')
  return cut >= 0 ? url.slice(0, cut + 1) : './'
}

function yieldFrames(count: number): Promise<void> {
  return new Promise((resolve) => {
    let left = count
    const step = () => {
      left -= 1
      if (left <= 0) resolve()
      else requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  })
}

function cacheFit(fbx: THREE.Group): void {
  fbx.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(fbx)
  const size = box.getSize(new THREE.Vector3())
  const fit = computeFit(size.y, box.min.y)
  fit.centerX = (box.min.x + box.max.x) * 0.5
  fit.centerZ = (box.min.z + box.max.z) * 0.5
  fbx.userData.neonFit = fit
}

function cacheClipActions(fbx: THREE.Group): void {
  const clips = new Map<MixamoAnimState, THREE.AnimationClip>()
  for (const clip of fbx.animations) {
    if (clip.duration <= 0 || clip.tracks.length === 0 || !clipHasMotion(clip)) continue
    const named = classifyClipName(clip.name)
    const state = named === 'generic' ? inferGenericState(clip) : named
    if (!state || clips.has(state)) continue
    clips.set(state, makeInPlace(clip))
  }
  fbx.userData.neonClips = clips
}

class MixamoAvatarImpl implements MixamoAvatar {
  readonly root: THREE.Group
  readonly clipNames: string[]
  readonly available: MixamoAnimState[]
  readonly missing: MixamoAnimState[]

  private readonly facing: THREE.Group
  private readonly model: THREE.Group
  private readonly mixer: THREE.AnimationMixer
  private readonly actions = new Map<MixamoAnimState, THREE.AnimationAction>()
  private current: MixamoAnimState | null = null
  private holding = false
  private lean = 0
  private pitch = 0
  private sink = 0
  private yaw = 0
  private targetLean = 0
  private targetPitch = 0
  private targetSink = 0
  private targetYaw = 0
  private disposed = false

  constructor(fbx: THREE.Group) {
    this.model = fbx
    this.facing = new THREE.Group()
    this.root = new THREE.Group()
    this.root.name = 'mixamo-avatar'
    applyCachedFit(fbx)
    this.facing.rotation.y = FACE_DOWN_TRACK
    this.facing.add(fbx)
    this.root.add(this.facing)

    this.mixer = new THREE.AnimationMixer(fbx)
    this.clipNames = fbx.animations.map((clip) => clip.name)
    this.bindClips(fbx)
    this.available = MIXAMO_ANIM_STATES.filter((state) => this.actions.has(state))
    this.missing = MIXAMO_ANIM_STATES.filter((state) => !this.actions.has(state))
  }

  applySkin(_id: SkinId): void {
    // Keep Mixamo Joe's authored materials and textures untouched.
  }

  reset(): void {
    this.current = null
    this.holding = false
    this.lean = 0
    this.pitch = 0
    this.sink = 0
    this.yaw = 0
    this.targetLean = 0
    this.targetPitch = 0
    this.targetSink = 0
    this.targetYaw = 0
    this.root.rotation.set(0, 0, 0)
    this.root.position.y = 0
    this.root.scale.set(1, 1, 1)
    this.mixer.stopAllAction()
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.mixer.stopAllAction()
    this.mixer.uncacheRoot(this.model)
    this.root.removeFromParent()
  }

  pose(lean: number, pitch: number, sink: number, _scaleY: number): void {
    this.targetLean = lean
    this.targetPitch = pitch
    this.targetSink = sink
    this.targetYaw = lean * 0.85
  }

  play(state: MixamoAnimState, _dt: number, timeScale: number): boolean {
    const action = this.actions.get(state)
    if (!action) return false
    this.holding = false
    action.paused = false
    const safeScale = Math.max(0.01, timeScale)
    if (this.current !== state) {
      const prev = this.current ? this.actions.get(this.current) : undefined
      this.current = state
      action.enabled = true
      action.setEffectiveTimeScale(safeScale)
      action.setEffectiveWeight(1)
      const fade = state === 'jump' || state === 'fall' || state === 'land' || state === 'slide' ? JUMP_FADE : FADE
      if (prev && prev !== action && prev.getEffectiveWeight() > 0) {
        action.reset()
        action.play()
        action.crossFadeFrom(prev, fade, false)
      } else {
        action.reset()
        action.fadeIn(fade)
        action.play()
      }
    } else {
      action.setEffectiveTimeScale(safeScale)
    }
    return true
  }

  holdStill(): void {
    const idle = this.actions.get('idle')
    if (idle) {
      this.play('idle', 0, 1)
      return
    }
    if (this.holding) return
    this.holding = true
    this.current = null
    this.mixer.stopAllAction()
    const run = this.actions.get('run')
    if (!run) return
    run.reset()
    run.enabled = true
    run.paused = true
    run.time = 0
    run.setEffectiveWeight(1)
    run.play()
  }

  animateProcedural(_state: MixamoAnimState, _dt: number, _speed: number): void {
    // Missing Mixamo clips stay missing. Do not invent bone motion.
  }

  update(dt: number): void {
    this.lean = damp(this.lean, this.targetLean, 10, dt)
    this.pitch = damp(this.pitch, this.targetPitch, 16, dt)
    this.sink = damp(this.sink, this.targetSink, 16, dt)
    this.yaw = damp(this.yaw, this.targetYaw, 9, dt)
    this.root.rotation.z = this.lean
    this.root.rotation.x = this.pitch
    this.root.rotation.y = this.yaw
    this.root.position.y = this.sink
    this.mixer.update(dt)
  }

  private bindClips(fbx: THREE.Group): void {
    const cached = fbx.userData.neonClips as Map<MixamoAnimState, THREE.AnimationClip> | undefined
    if (cached?.size) {
      for (const [state, clip] of cached) this.bindClip(state, clip)
      return
    }
    for (const clip of fbx.animations) {
      if (clip.duration <= 0 || clip.tracks.length === 0 || !clipHasMotion(clip)) continue
      const named = classifyClipName(clip.name)
      const state = named === 'generic' ? inferGenericState(clip) : named
      if (!state || this.actions.has(state)) continue
      this.bindClip(state, makeInPlace(clip))
    }
  }

  private bindClip(state: MixamoAnimState, clip: THREE.AnimationClip): void {
    const action = this.mixer.clipAction(clip)
    action.enabled = true
    if (state === 'jump' || state === 'fall' || state === 'land') {
      action.setLoop(THREE.LoopOnce, 1)
      action.clampWhenFinished = true
    } else {
      action.setLoop(THREE.LoopRepeat, Infinity)
    }
    this.actions.set(state, action)
  }
}

function applyCachedFit(fbx: THREE.Group): void {
  const fit = fbx.userData.neonFit as MixamoFit | undefined
  if (!fit) return
  fbx.scale.setScalar(fit.scale)
  fbx.position.set(-fit.centerX * fit.scale, fit.lift, -fit.centerZ * fit.scale)
}

function maxTextureSize(): number {
  if (typeof window === 'undefined') return 768
  const narrow = Math.min(window.innerWidth, window.innerHeight) < 820
  const coarse = window.matchMedia('(pointer: coarse)').matches
  return narrow || coarse ? 512 : 768
}

async function optimizeMixamoTemplateAsync(root: THREE.Object3D): Promise<void> {
  if (root.userData.neonOptimized) return
  root.userData.neonOptimized = true
  const meshes: THREE.Mesh[] = []
  root.traverse((child) => {
    if (child instanceof THREE.Mesh) meshes.push(child)
  })

  const kept = new Set<THREE.Texture>()
  const dropped = new Set<THREE.Texture>()
  const cap = maxTextureSize()

  for (const child of meshes) {
    if (/eyelash/i.test(child.name)) child.visible = false
    const source = Array.isArray(child.material) ? child.material : [child.material]
    const next = source.map((material) => liteMixamoMaterial(material, child.name, kept, dropped, cap))
    child.material = Array.isArray(child.material) ? next : next[0]
    child.castShadow = false
    child.receiveShadow = false
    if (child instanceof THREE.SkinnedMesh) {
      child.frustumCulled = false
      child.geometry.computeBoundingSphere()
    }
    await yieldFrames(1)
  }
}

function liteMixamoMaterial(
  source: THREE.Material,
  meshName: string,
  kept: Set<THREE.Texture>,
  dropped: Set<THREE.Texture>,
  cap: number,
): THREE.Material {
  const src = source as THREE.MeshPhongMaterial
  const map = src.map instanceof THREE.Texture ? src.map : null
  if (map && !kept.has(map)) {
    map.colorSpace = THREE.SRGBColorSpace
    downscaleTexture(map, cap)
    map.minFilter = THREE.LinearFilter
    map.magFilter = THREE.LinearFilter
    map.generateMipmaps = false
    kept.add(map)
  }
  dropUnusedMaps(src, map, dropped, kept)
  if (source instanceof THREE.MeshLambertMaterial && map) return source
  const hair = /hair|lash/i.test(meshName) || /hair|lash/i.test(source.name)
  const lite = new THREE.MeshLambertMaterial({
    map: map ?? undefined,
    color: src.color?.clone() ?? new THREE.Color(0xcccccc),
    transparent: Boolean(src.transparent || hair),
    opacity: src.opacity ?? 1,
    alphaTest: hair ? 0.35 : (src.alphaTest ?? 0),
    side: src.side,
    depthWrite: !hair,
  })
  lite.name = source.name
  source.dispose()
  return lite
}

function dropUnusedMaps(
  source: THREE.MeshPhongMaterial,
  keep: THREE.Texture | null,
  dropped: Set<THREE.Texture>,
  kept: Set<THREE.Texture>,
): void {
  const extras = [source.normalMap, source.bumpMap, source.specularMap, source.emissiveMap, source.aoMap]
  for (const extra of extras) {
    if (!(extra instanceof THREE.Texture) || extra === keep || kept.has(extra) || dropped.has(extra)) continue
    dropped.add(extra)
    extra.dispose()
  }
}

function downscaleTexture(texture: THREE.Texture, maxSize: number): void {
  const image = texture.image as { width?: number; height?: number } | undefined
  if (!image?.width || !image.height) return
  const longest = Math.max(image.width, image.height)
  if (longest <= maxSize) return
  if (typeof document === 'undefined') return
  const scale = maxSize / longest
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(image.width * scale))
  canvas.height = Math.max(1, Math.round(image.height * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.drawImage(image as CanvasImageSource, 0, 0, canvas.width, canvas.height)
  texture.image = canvas
  texture.needsUpdate = true
}

function waitForTextures(root: THREE.Object3D): Promise<void> {
  const pending: Promise<void>[] = []
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return
    const materials = Array.isArray(child.material) ? child.material : [child.material]
    for (const material of materials) {
      const maps = ['map', 'emissiveMap', 'specularMap', 'normalMap', 'bumpMap', 'alphaMap'] as const
      for (const key of maps) {
        const texture = (material as THREE.MeshPhongMaterial)[key]
        const image = texture instanceof THREE.Texture ? texture.image : null
        if (!(image instanceof HTMLImageElement) || image.complete) continue
        pending.push(
          new Promise((resolve) => {
            image.addEventListener('load', () => resolve(), { once: true })
            image.addEventListener('error', () => resolve(), { once: true })
          }),
        )
      }
    }
  })
  return pending.length ? Promise.all(pending).then(() => undefined) : Promise.resolve()
}

function destroyMixamoAssets(avatar: MixamoAvatar): void {
  avatar.dispose()
  avatar.root.traverse((child) => {
    if (child instanceof THREE.SkinnedMesh) child.skeleton.dispose()
    if (!(child instanceof THREE.Mesh)) return
    child.geometry.dispose()
    const materials = Array.isArray(child.material) ? child.material : [child.material]
    for (const material of materials) material.dispose()
  })
}

export function describeMixamoMaterials(root: THREE.Object3D): { mesh: string; map: boolean; color: string }[] {
  const rows: { mesh: string; map: boolean; color: string }[] = []
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return
    const materials = Array.isArray(child.material) ? child.material : [child.material]
    for (const material of materials) {
      const phong = material as THREE.MeshPhongMaterial
      rows.push({
        mesh: child.name,
        map: Boolean(phong.map),
        color: phong.color ? `#${phong.color.getHexString()}` : 'none',
      })
    }
  })
  return rows
}
