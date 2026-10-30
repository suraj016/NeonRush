export const Screens = {
  Boot: 'boot',
  Menu: 'menu',
  HowTo: 'howto',
  Characters: 'characters',
  Missions: 'missions',
  Settings: 'settings',
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
  totalRuns: number
  longestTime: number
}

export type MissionId =
  | 'collect_50_run'
  | 'survive_60'
  | 'distance_1000'
  | 'powerups_3_run'
  | 'collect_100_total'
  | 'score_5000'

export type MissionRecord = {
  progress: number
  completed: boolean
  claimed: boolean
}

export type Statistics = {
  orbsLifetime: number
  powerupsUsed: number
  distanceLifetime: number
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
}

export type RunResult = {
  score: number
  distance: number
  energy: number
  duration: number
  orbs: number
  powerupsUsed: number
  isBestScore: boolean
  isBestDistance: boolean
  completedMissions: MissionId[]
}

export type RunStats = {
  score: number
  distance: number
  energy: number
  duration: number
  orbs: number
  powerupsUsed: number
}

export type EngineHooks = {
  onHud: (hud: HudSnapshot) => void
  onGameOver: (result: RunResult) => void
  onState: (state: EngineState) => void
  onEnergy: (total: number, run: number) => void
  onMissionProgress: (missions: Record<MissionId, MissionRecord>) => void
}
