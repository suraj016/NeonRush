import type { MissionId, Settings, SkinId } from './types.ts'
import { asset } from '../utils/assets.ts'

export const SAVE_VERSION = 1
export const SAVE_KEY = 'neon-rush-save-v1'

export const LANES = [-2.35, 0, 2.35] as const
export const LANE_WIDTH = 2.35

export const SEGMENT_LENGTH = 22
export const SEGMENT_COUNT = 10
export const RECYCLE_Z = 16

export const PLAYER = {
  height: 1.52,
  slideHeight: 0.62,
  halfWidth: 0.36,
  halfDepth: 0.32,
  laneLerp: 14,
  gravity: -28,
  jumpVelocity: 10.1,
  slideDuration: 0.55,
  invulnDuration: 0.38,
}

export const SPEED = {
  start: 17,
  max: 36,
  rampDistance: 2800,
}

export const SCORE = {
  distancePerMetre: 2,
  orb: 10,
  powerup: 25,
  missionBonus: 200,
}

export const POWERUP = {
  shield: 8,
  magnet: 8,
  multiplier: 10,
  magnetRadius: 5.5,
  scoreMul: 2,
}

export const SKINS: Record<
  SkinId,
  {
    id: SkinId
    name: string
    tagline: string
    cost: number
    accent: number
    secondary: number
    suit: number
    visor: number
    portrait: string
  }
> = {
  pulse: {
    id: 'pulse',
    name: 'Pulse',
    tagline: 'Standard interceptor suit',
    cost: 0,
    accent: 0x00f5a0,
    secondary: 0x18b8c9,
    suit: 0x243f3c,
    visor: 0xe9fff6,
    portrait: asset('assets/images/character-pulse.jpg'),
  },
  volt: {
    id: 'volt',
    name: 'Volt',
    tagline: 'Overclocked neon chassis',
    cost: 200,
    accent: 0x18b8c9,
    secondary: 0x00c987,
    suit: 0x1b3535,
    visor: 0xa6ff4d,
    portrait: asset('assets/images/character-volt.jpg'),
  },
  ember: {
    id: 'ember',
    name: 'Ember',
    tagline: 'Heat-sink raid prototype',
    cost: 500,
    accent: 0xffd166,
    secondary: 0xa6ff4d,
    suit: 0x294746,
    visor: 0xfff4c2,
    portrait: asset('assets/images/character-ember.jpg'),
  },
}

export const MISSIONS: Record<
  MissionId,
  {
    id: MissionId
    title: string
    description: string
    target: number
    reward: number
    scope: 'run' | 'lifetime'
    stat: 'orbs' | 'duration' | 'distance' | 'powerups' | 'score' | 'orbsLifetime'
  }
> = {
  collect_50_run: {
    id: 'collect_50_run',
    title: 'Orb Sweep',
    description: 'Collect 50 energy orbs in a single run.',
    target: 50,
    reward: 60,
    scope: 'run',
    stat: 'orbs',
  },
  survive_60: {
    id: 'survive_60',
    title: 'Stay Online',
    description: 'Survive for 60 seconds in one escape.',
    target: 60,
    reward: 70,
    scope: 'run',
    stat: 'duration',
  },
  distance_1000: {
    id: 'distance_1000',
    title: 'Kilometre Break',
    description: 'Reach 1,000 metres in a single run.',
    target: 1000,
    reward: 80,
    scope: 'run',
    stat: 'distance',
  },
  powerups_3_run: {
    id: 'powerups_3_run',
    title: 'Systems Overload',
    description: 'Activate 3 power-ups during one run.',
    target: 3,
    reward: 50,
    scope: 'run',
    stat: 'powerups',
  },
  collect_100_total: {
    id: 'collect_100_total',
    title: 'Grid Harvest',
    description: 'Collect 100 energy orbs across all runs.',
    target: 100,
    reward: 90,
    scope: 'lifetime',
    stat: 'orbsLifetime',
  },
  score_5000: {
    id: 'score_5000',
    title: 'High Voltage',
    description: 'Score 5,000 points in a single run.',
    target: 5000,
    reward: 120,
    scope: 'run',
    stat: 'score',
  },
}

export const DEFAULT_SETTINGS: Settings = {
  master: 0.8,
  music: 0.45,
  sfx: 0.75,
  quality: 'high',
  reducedMotion: false,
  cameraShake: true,
}

export const TIER_NAMES = ['WARMUP', 'RUSH', 'OVERDRIVE', 'SINGULARITY'] as const

export const THEMES = [
  {
    id: 'city',
    name: 'CYBER CITY',
    fog: 0x102923,
    accent: 0x00f5a0,
    alt: 0x18b8c9,
    building: 0x1b3535,
    start: 0,
  },
  {
    id: 'tunnel',
    name: 'NEON TUNNEL',
    fog: 0x0c221c,
    accent: 0x00c987,
    alt: 0xa6ff4d,
    building: 0x123b32,
    start: 800,
  },
  {
    id: 'industrial',
    name: 'INDUSTRIAL GRID',
    fog: 0x123b32,
    accent: 0xa6ff4d,
    alt: 0x18b8c9,
    building: 0x294746,
    start: 1800,
  },
] as const

export const COLORS = {
  bg: 0x102923,
  cyan: 0x00f5a0,
  blue: 0x18b8c9,
  violet: 0x00c987,
  magenta: 0xff5364,
  amber: 0xffd166,
  lime: 0xa6ff4d,
  danger: 0xff5364,
  gold: 0xffd166,
  road: 0x102923,
  rail: 0x294746,
}
