import type { MapId } from './maps.ts'

export const Screens = {
  Boot: 'boot',
  Menu: 'menu',
  HowTo: 'howto',
  Characters: 'characters',
  Missions: 'missions',
  Progress: 'progress',
  Settings: 'settings',
  Maps: 'maps',
  Playing: 'playing',
  Paused: 'paused',
  GameOver: 'gameover',
} as const

export type ScreenId = (typeof Screens)[keyof typeof Screens]

export const EngineStates = {
  Booting: 'booting',
  MainMenu: 'main_menu',
  Ready: 'ready',
  Playing: 'playing',
  Paused: 'paused',
  GameOver: 'game_over',
} as const

export type EngineState = (typeof EngineStates)[keyof typeof EngineStates]

export const Qualities = {
  Low: 'low',
  Medium: 'medium',
  High: 'high',
} as const

export type Quality = (typeof Qualities)[keyof typeof Qualities]

export type Settings = {
  master: number
  music: number
  sfx: number
  quality: Quality
  reducedMotion: boolean
  cameraShake: boolean
}

export type SkinId = 'pulse' | 'volt' | 'ember'

export type Profile = {
  bestScore: number
  bestDistance: number
  totalEnergy: number
  selectedSkin: SkinId
  selectedMap: MapId
  totalRuns: number
  longestTime: number
  xp: number
  level: number
  seenTutorial: boolean
  lastPlayDate: string
  streak: number
  dailyDate: string
  dailyProgress: number
  dailyClaimed: boolean
}

export type MissionId =
  | 'collect_50_run'
  | 'survive_60'
  | 'distance_1000'
  | 'powerups_3_run'
  | 'collect_100_total'
  | 'score_5000'
  | 'avoid_20_run'
  | 'lanes_20_run'
  | 'emerald_orbs_30'
  | 'desert_1000'
  | 'frozen_avoid_20'

export type AchievementId =
  | 'first_run'
  | 'distance_1000'
  | 'distance_5000'
  | 'energy_100'
  | 'energy_1000'
  | 'survivor_50'
  | 'map_explorer'
  | 'mission_master'
  | 'personal_best'

export type AchievementRecord = {
  unlocked: boolean
  claimed: boolean
}

export type MissionRecord = {
  progress: number
  completed: boolean
  claimed: boolean
}

export type Statistics = {
  orbsLifetime: number
  powerupsUsed: number
  distanceLifetime: number
  hazardsAvoided: number
  laneChanges: number
  nearMisses: number
  mapsPlayed: MapId[]
  achievements: Record<AchievementId, AchievementRecord>
}

export type SaveData = {
  version: number
  settings: Settings
  profile: Profile
  unlockedSkins: SkinId[]
  missions: Record<MissionId, MissionRecord>
  statistics: Statistics
}

export type ObstacleType =
  | 'barrier'
  | 'low'
  | 'overhead'
  | 'moving'
  | 'spinner'
  | 'gap'

export type PowerUpType = 'shield' | 'magnet' | 'multiplier'

export type PickupType = 'orb' | PowerUpType

export type Lane = 0 | 1 | 2

export type AABB = {
  minX: number
  maxX: number
  minY: number
  maxY: number
  minZ: number
  maxZ: number
}

export type ActivePowerUp = {
  type: PowerUpType
  remaining: number
}

export type HudSnapshot = {
  score: number
  distance: number
  energy: number
  speed: number
  tier: string
  multiplier: number
  powerups: ActivePowerUp[]
  readyLabel: string | null
  hint: string | null
  milestone: string | null
}

export type RunStats = {
  score: number
  distance: number
  energy: number
  duration: number
  orbs: number
  powerupsUsed: number
  hazardsAvoided: number
  laneChanges: number
  nearMisses: number
  mapId: MapId
}

export type RunResult = RunStats & {
  isBestScore: boolean
  isBestDistance: boolean
  completedMissions: MissionId[]
  xpEarned: number
  levelBefore: number
  levelAfter: number
  previousBestDistance: number
  unlockedAchievements: AchievementId[]
  dailyCompleted: boolean
  dailyTitle: string | null
  streak: number
}

export type EngineHooks = {
  onHud: (hud: HudSnapshot) => void
  onGameOver: (result: RunStats) => void
  onState: (state: EngineState) => void
  onEnergy: (total: number, run: number) => void
  onMissionProgress: (missions: Record<MissionId, MissionRecord>) => void
}
