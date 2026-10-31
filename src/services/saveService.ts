import { emptyAchievements } from '../game/achievements.ts'
import { DEFAULT_SETTINGS, SAVE_KEY, SAVE_VERSION, SKINS } from '../game/config.ts'
import { isMapId } from '../game/maps.ts'
import { emptyMissions } from '../game/missions.ts'
import type { AchievementId, AchievementRecord, Profile, SaveData, Settings, SkinId, Statistics } from '../game/types.ts'

export function defaultProfile(): Profile {
  return {
    bestScore: 0,
    bestDistance: 0,
    totalEnergy: 0,
    selectedSkin: 'pulse',
    selectedMap: 'emerald',
    totalRuns: 0,
    longestTime: 0,
    xp: 0,
    level: 1,
    seenTutorial: false,
    lastPlayDate: '',
    streak: 0,
    dailyDate: '',
    dailyProgress: 0,
    dailyClaimed: false,
  }
}

export function defaultStatistics(): Statistics {
  return {
    orbsLifetime: 0,
    powerupsUsed: 0,
    distanceLifetime: 0,
    hazardsAvoided: 0,
    laneChanges: 0,
    nearMisses: 0,
    mapsPlayed: [],
    achievements: emptyAchievements(),
  }
}

export function defaultSave(): SaveData {
  return {
    version: SAVE_VERSION,
    settings: { ...DEFAULT_SETTINGS },
    profile: defaultProfile(),
    unlockedSkins: ['pulse'],
    missions: emptyMissions(),
    statistics: defaultStatistics(),
  }
}

function isSkinId(value: unknown): value is SkinId {
  return value === 'pulse' || value === 'volt' || value === 'ember'
}

function sanitizeSettings(raw: unknown): Settings {
  const fallback = DEFAULT_SETTINGS
  if (!raw || typeof raw !== 'object') return { ...fallback }
  const data = raw as Partial<Settings>
  const quality = data.quality === 'low' || data.quality === 'medium' || data.quality === 'high'
    ? data.quality
    : fallback.quality
  return {
    master: clamp01(data.master, fallback.master),
    music: clamp01(data.music, fallback.music),
    sfx: clamp01(data.sfx, fallback.sfx),
    quality,
    reducedMotion: Boolean(data.reducedMotion),
    cameraShake: data.cameraShake !== false,
  }
}

function clamp01(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback
  return Math.max(0, Math.min(1, value))
}

function nonNeg(value: unknown, fallback = 0): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback
  return Math.max(0, value)
}

function sanitizeAchievements(raw: unknown): Record<AchievementId, AchievementRecord> {
  const next = emptyAchievements()
  if (!raw || typeof raw !== 'object') return next
  const data = raw as Partial<Record<AchievementId, Partial<AchievementRecord>>>
  for (const id of Object.keys(next) as AchievementId[]) {
    const rec = data[id]
    if (!rec) continue
    next[id] = {
      unlocked: Boolean(rec.unlocked),
      claimed: Boolean(rec.claimed || rec.unlocked),
    }
  }
  return next
}

export function migrateSave(raw: unknown): SaveData {
  const base = defaultSave()
  if (!raw || typeof raw !== 'object') return base
  const data = raw as Partial<SaveData>
  const unlocked: SkinId[] = Array.isArray(data.unlockedSkins)
    ? data.unlockedSkins.filter(isSkinId)
    : ['pulse']
  if (!unlocked.includes('pulse')) unlocked.unshift('pulse')

  const selected = isSkinId(data.profile?.selectedSkin) ? data.profile.selectedSkin : 'pulse'
  const missions = emptyMissions()
  if (data.missions && typeof data.missions === 'object') {
    for (const key of Object.keys(missions) as Array<keyof typeof missions>) {
      const rec = data.missions[key]
      if (!rec) continue
      missions[key] = {
        progress: typeof rec.progress === 'number' ? rec.progress : 0,
        completed: Boolean(rec.completed),
        claimed: Boolean(rec.claimed),
      }
    }
  }

  const mapsPlayed = Array.isArray(data.statistics?.mapsPlayed)
    ? data.statistics.mapsPlayed.filter(isMapId)
    : []

  return {
    version: SAVE_VERSION,
    settings: sanitizeSettings(data.settings),
    profile: {
      bestScore: nonNeg(data.profile?.bestScore),
      bestDistance: nonNeg(data.profile?.bestDistance),
      totalEnergy: nonNeg(data.profile?.totalEnergy),
      selectedSkin: unlocked.includes(selected) ? selected : 'pulse',
      selectedMap: isMapId(data.profile?.selectedMap) ? data.profile.selectedMap : 'emerald',
      totalRuns: nonNeg(data.profile?.totalRuns),
      longestTime: nonNeg(data.profile?.longestTime),
      xp: nonNeg(data.profile?.xp),
      level: Math.max(1, Math.floor(nonNeg(data.profile?.level, 1))),
      seenTutorial: Boolean(data.profile?.seenTutorial),
      lastPlayDate: typeof data.profile?.lastPlayDate === 'string' ? data.profile.lastPlayDate : '',
      streak: nonNeg(data.profile?.streak),
      dailyDate: typeof data.profile?.dailyDate === 'string' ? data.profile.dailyDate : '',
      dailyProgress: nonNeg(data.profile?.dailyProgress),
      dailyClaimed: Boolean(data.profile?.dailyClaimed),
    },
    unlockedSkins: Array.from(new Set<SkinId>(unlocked)),
    missions,
    statistics: {
      orbsLifetime: nonNeg(data.statistics?.orbsLifetime),
      powerupsUsed: nonNeg(data.statistics?.powerupsUsed),
      distanceLifetime: nonNeg(data.statistics?.distanceLifetime),
      hazardsAvoided: nonNeg(data.statistics?.hazardsAvoided),
      laneChanges: nonNeg(data.statistics?.laneChanges),
      nearMisses: nonNeg(data.statistics?.nearMisses),
      mapsPlayed: Array.from(new Set(mapsPlayed)),
      achievements: sanitizeAchievements(data.statistics?.achievements),
    },
  }
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return defaultSave()
    return migrateSave(JSON.parse(raw))
  } catch {
    return defaultSave()
  }
}

export function persistSave(data: SaveData): boolean {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data))
    return true
  } catch {
    return false
  }
}

export function resetSave(): SaveData {
  const fresh = defaultSave()
  persistSave(fresh)
  return fresh
}

export function canAffordSkin(energy: number, skin: SkinId): boolean {
  return energy >= SKINS[skin].cost
}
