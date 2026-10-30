import { DEFAULT_SETTINGS, SAVE_KEY, SAVE_VERSION, SKINS } from '../game/config.ts'
import { emptyMissions } from '../game/missions.ts'
import type { SaveData, Settings, SkinId } from '../game/types.ts'

export function defaultSave(): SaveData {
  return {
    version: SAVE_VERSION,
    settings: { ...DEFAULT_SETTINGS },
    profile: {
      bestScore: 0,
      bestDistance: 0,
      totalEnergy: 0,
      selectedSkin: 'pulse',
      totalRuns: 0,
      longestTime: 0,
    },
    unlockedSkins: ['pulse'],
    missions: emptyMissions(),
    statistics: {
      orbsLifetime: 0,
      powerupsUsed: 0,
      distanceLifetime: 0,
    },
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

  return {
    version: SAVE_VERSION,
    settings: sanitizeSettings(data.settings),
    profile: {
      bestScore: Math.max(0, data.profile?.bestScore ?? 0),
      bestDistance: Math.max(0, data.profile?.bestDistance ?? 0),
      totalEnergy: Math.max(0, data.profile?.totalEnergy ?? 0),
      selectedSkin: unlocked.includes(selected) ? selected : 'pulse',
      totalRuns: Math.max(0, data.profile?.totalRuns ?? 0),
      longestTime: Math.max(0, data.profile?.longestTime ?? 0),
    },
    unlockedSkins: Array.from(new Set<SkinId>(unlocked)),
    missions,
    statistics: {
      orbsLifetime: Math.max(0, data.statistics?.orbsLifetime ?? 0),
      powerupsUsed: Math.max(0, data.statistics?.powerupsUsed ?? 0),
      distanceLifetime: Math.max(0, data.statistics?.distanceLifetime ?? 0),
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
