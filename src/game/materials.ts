import * as THREE from 'three'
import { COLORS } from './config.ts'
import {
  makeCityGrid,
  makeFacadeAlbedo,
  makeFacadeEmissive,
  makeHoloTexture,
  makeRoadAlbedo,
  makeSkyTexture,
} from './cityTextures.ts'

function makeWindowTexture(): THREE.CanvasTexture {
  return makeFacadeAlbedo(0)
}

function makeRoadTexture(): THREE.CanvasTexture {
  return makeRoadAlbedo()
}

export type MaterialSet = ReturnType<typeof createMaterials>

export function createMaterials() {
  const windowTex = makeWindowTexture()
  const roadTex = makeRoadTexture()
  const facadeMaps = [0, 1, 2, 3].map((seed) => makeFacadeAlbedo(seed))
  const facadeEmissive = [0, 1, 2, 3].map((seed) => makeFacadeEmissive(seed))
  const cityGrid = makeCityGrid()
  const skyTex = makeSkyTexture()
  const holos = [
    makeHoloTexture('NEON RUSH', '#00F5A0', 'EMERALD TRANSIT'),
    makeHoloTexture('AETHER', '#18B8C9', 'GRID ONLINE'),
    makeHoloTexture('LUMEN', '#A6FF4D', 'SECTOR 07'),
    makeHoloTexture('NEXUS', '#00C987', 'UPLINK ON'),
    makeHoloTexture('AURUM', '#FFD166', 'CORE STABLE'),
    makeHoloTexture('PULSE', '#00F5A0', 'MAX FLOW'),
  ]

  const facades = facadeMaps.map(
    (map, i) =>
      new THREE.MeshStandardMaterial({
        color: 0xb7d4cc,
        map,
        emissive: 0xffffff,
        emissiveMap: facadeEmissive[i],
        emissiveIntensity: 0.95,
        roughness: 0.66,
        metalness: 0.2,
      }),
  )

  const mats = {
    road: new THREE.MeshStandardMaterial({
      color: 0x6e9088,
      roughness: 0.48,
      metalness: 0.3,
      map: roadTex,
    }),
    pit: new THREE.MeshStandardMaterial({
      color: 0x081612,
      roughness: 1,
      metalness: 0,
    }),
    rail: new THREE.MeshStandardMaterial({
      color: 0x294746,
      roughness: 0.34,
      metalness: 0.58,
    }),
    glowCyan: new THREE.MeshBasicMaterial({ color: COLORS.cyan }),
    glowBlue: new THREE.MeshBasicMaterial({ color: COLORS.blue }),
    glowMagenta: new THREE.MeshBasicMaterial({ color: COLORS.danger }),
    glowViolet: new THREE.MeshBasicMaterial({ color: COLORS.violet }),
    glowAmber: new THREE.MeshBasicMaterial({ color: COLORS.gold }),
    glowPink: new THREE.MeshBasicMaterial({ color: COLORS.lime }),
    glowLime: new THREE.MeshBasicMaterial({ color: COLORS.lime }),
    glowDanger: new THREE.MeshBasicMaterial({ color: COLORS.danger }),
    energy: new THREE.MeshStandardMaterial({
      color: 0x3a1014,
      emissive: COLORS.danger,
      emissiveIntensity: 0.9,
      transparent: true,
      opacity: 0.55,
      roughness: 0.2,
      metalness: 0.4,
    }),
    energyMagenta: new THREE.MeshStandardMaterial({
      color: 0x3a1014,
      emissive: COLORS.danger,
      emissiveIntensity: 0.9,
      transparent: true,
      opacity: 0.5,
      roughness: 0.2,
    }),
    energyAmber: new THREE.MeshStandardMaterial({
      color: 0x2a1a08,
      emissive: COLORS.gold,
      emissiveIntensity: 0.85,
      transparent: true,
      opacity: 0.5,
    }),
    energyViolet: new THREE.MeshStandardMaterial({
      color: 0x3a1014,
      emissive: COLORS.danger,
      emissiveIntensity: 0.9,
      transparent: true,
      opacity: 0.5,
    }),
    metal: new THREE.MeshStandardMaterial({
      color: 0x3d5c58,
      roughness: 0.4,
      metalness: 0.68,
    }),
    building: facades[0],
    facades,
    skyline: new THREE.MeshStandardMaterial({
      color: 0x8fb8ae,
      map: facadeMaps[1],
      emissive: 0xffffff,
      emissiveMap: facadeEmissive[1],
      emissiveIntensity: 0.72,
      roughness: 0.74,
      metalness: 0.16,
    }),
    cityFloor: new THREE.MeshStandardMaterial({
      color: 0x123b32,
      map: cityGrid,
      emissive: 0x0c3a32,
      emissiveIntensity: 0.28,
      roughness: 0.85,
      metalness: 0.12,
    }),
    sky: new THREE.MeshBasicMaterial({
      map: skyTex,
      side: THREE.BackSide,
      fog: false,
      depthWrite: false,
    }),
    holoMats: holos.map(
      (map) =>
        new THREE.MeshBasicMaterial({
          map,
          transparent: true,
          opacity: 0.92,
          side: THREE.DoubleSide,
          toneMapped: false,
        }),
    ),
    lamp: new THREE.MeshBasicMaterial({ color: 0xc8ffe8, toneMapped: false }),
    graphite: new THREE.MeshStandardMaterial({
      color: 0x232e2f,
      roughness: 0.38,
      metalness: 0.72,
    }),
    hazardPanel: new THREE.MeshStandardMaterial({
      color: 0x2a4440,
      roughness: 0.46,
      metalness: 0.48,
    }),
    coinRim: new THREE.MeshStandardMaterial({
      color: 0x173c32,
      roughness: 0.28,
      metalness: 0.84,
    }),
    coinFace: new THREE.MeshStandardMaterial({
      color: 0x477768,
      roughness: 0.34,
      metalness: 0.58,
    }),
    coinRing: new THREE.MeshStandardMaterial({
      color: 0x00f5a0,
      emissive: COLORS.cyan,
      emissiveIntensity: 0.52,
      roughness: 0.28,
      metalness: 0.35,
    }),
    coinCore: new THREE.MeshStandardMaterial({
      color: 0xa6ff4d,
      emissive: COLORS.lime,
      emissiveIntensity: 0.42,
      roughness: 0.22,
    }),
    coinTeal: new THREE.MeshStandardMaterial({
      color: 0x18b8c9,
      emissive: COLORS.blue,
      emissiveIntensity: 0.28,
      roughness: 0.3,
    }),
    warnLamp: new THREE.MeshBasicMaterial({ color: COLORS.danger, toneMapped: false }),
    orb: new THREE.MeshStandardMaterial({
      color: 0xb8ffd9,
      emissive: COLORS.cyan,
      emissiveIntensity: 0.55,
      roughness: 0.22,
      metalness: 0.3,
    }),
    shield: new THREE.MeshStandardMaterial({
      color: 0x9fffd0,
      emissive: COLORS.cyan,
      emissiveIntensity: 0.55,
      roughness: 0.24,
    }),
    magnet: new THREE.MeshStandardMaterial({
      color: 0x8ce8f0,
      emissive: COLORS.blue,
      emissiveIntensity: 0.55,
      roughness: 0.24,
    }),
    multiplier: new THREE.MeshStandardMaterial({
      color: 0xffe08a,
      emissive: COLORS.gold,
      emissiveIntensity: 0.58,
      roughness: 0.24,
    }),
    playerSuit: new THREE.MeshStandardMaterial({
      color: 0x172923,
      roughness: 0.6,
      metalness: 0.18,
    }),
    playerAccent: new THREE.MeshStandardMaterial({
      color: COLORS.cyan,
      emissive: COLORS.cyan,
      emissiveIntensity: 0.4,
      roughness: 0.32,
    }),
    playerVisor: new THREE.MeshStandardMaterial({
      color: 0x081c16,
      emissive: COLORS.cyan,
      emissiveIntensity: 0.34,
      roughness: 0.12,
      metalness: 0.84,
    }),
    windowTex,
    roadTex,
    facadeMaps,
    facadeEmissive,
    cityGrid,
    skyTex,
    holos,
  }

  return {
    ...mats,
    dispose() {
      const dump = Object.values(mats).flatMap((value) => (Array.isArray(value) ? value : [value]))
      for (const value of dump) {
        if (value instanceof THREE.Material) {
          value.dispose()
        }
        if (value instanceof THREE.Texture) value.dispose()
      }
    },
  }
}
