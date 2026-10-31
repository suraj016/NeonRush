import { create } from 'zustand'
import { applyAchievements } from '../game/achievements.ts'
import { SKINS } from '../game/config.ts'
import { dailyForDate, dailyStat, localDateKey, streakReward, syncDaily, updateStreak } from '../game/daily.ts'
import { applyMissionProgress } from '../game/missions.ts'
import { applyXp, runXp } from '../game/progress.ts'
import { missionBonus } from '../game/score.ts'
import { loadSave, persistSave, resetSave } from '../services/saveService.ts'
import type { MapId } from '../game/maps.ts'
import type {
  HudSnapshot,
  RunResult,
  RunStats,
  SaveData,
  ScreenId,
  Settings,
  SkinId,
} from '../game/types.ts'
import { Screens } from '../game/types.ts'

export type GameStore = SaveData & {
  screen: ScreenId
  previousScreen: ScreenId
  webglError: boolean
  hud: HudSnapshot
  lastResult: RunResult | null
  persistError: boolean
  setScreen: (screen: ScreenId) => void
  openOverlay: (screen: ScreenId) => void
  closeOverlay: () => void
  setHud: (hud: HudSnapshot) => void
  setWebglError: (value: boolean) => void
  updateSettings: (patch: Partial<Settings>) => void
  applyEnergy: (total: number) => void
  applyMissions: (missions: SaveData['missions']) => void
  finishRun: (result: RunStats) => RunResult
  buySkin: (id: SkinId) => { ok: boolean; reason?: string }
  selectSkin: (id: SkinId) => boolean
  selectMap: (id: MapId) => void
  skipTutorial: () => void
  ensureCalendar: () => void
  resetData: () => void
}

const initial = loadSave()

const emptyHud: HudSnapshot = {
  score: 0,
  distance: 0,
  energy: 0,
  speed: 0,
  tier: 'WARMUP',
  multiplier: 1,
  powerups: [],
  readyLabel: null,
  hint: null,
  milestone: null,
}

function write(data: SaveData): boolean {
  return persistSave(data)
}

function addMap(list: MapId[], id: MapId): MapId[] {
  return list.includes(id) ? list : [...list, id]
}

export const useGameStore = create<GameStore>((set, get) => ({
  ...initial,
  screen: Screens.Boot,
  previousScreen: Screens.Menu,
  webglError: false,
  hud: emptyHud,
  lastResult: null,
  persistError: false,

  setScreen: (screen) => set({ screen, previousScreen: get().screen }),

  openOverlay: (screen) => {
    const current = get().screen
    set({
      previousScreen: current === Screens.Settings || current === Screens.HowTo ? get().previousScreen : current,
      screen,
    })
  },

  closeOverlay: () => {
    const prev = get().previousScreen
    set({ screen: prev === get().screen ? Screens.Menu : prev })
  },

  setWebglError: (webglError) => set({ webglError }),

  updateSettings: (patch) => {
    const settings = { ...get().settings, ...patch }
    set({ settings })
    const ok = write(snapshot(get()))
    set({ persistError: !ok })
  },

  applyEnergy: (total) => {
    set({ profile: { ...get().profile, totalEnergy: total } })
  },

  setHud: (hud) => {
    const prev = get().hud
    if (
      prev.score === hud.score &&
      prev.distance === hud.distance &&
      prev.energy === hud.energy &&
      prev.tier === hud.tier &&
      prev.readyLabel === hud.readyLabel &&
      prev.multiplier === hud.multiplier &&
      prev.hint === hud.hint &&
      prev.milestone === hud.milestone &&
      Math.floor(prev.speed) === Math.floor(hud.speed) &&
      prev.powerups.length === hud.powerups.length
    ) {
      return
    }
    set({ hud })
  },

  applyMissions: (missions) => {
    set({ missions })
    write(snapshot(get()))
  },

  ensureCalendar: () => {
    const today = localDateKey()
    const profile = syncDaily(get().profile, today)
    if (profile === get().profile) return
    set({ profile })
    write(snapshot(get()))
  },

  skipTutorial: () => {
    const profile = { ...get().profile, seenTutorial: true }
    set({ profile })
    write(snapshot(get()))
  },

  finishRun: (raw) => {
    const state = get()
    const today = localDateKey()
    const profile = syncDaily(state.profile, today)
    const lifetimeOrbs = state.statistics.orbsLifetime + raw.orbs
    const lifetimeAvoided = state.statistics.hazardsAvoided + raw.hazardsAvoided
    const mapsPlayed = addMap(state.statistics.mapsPlayed, raw.mapId)
    const missionResult = applyMissionProgress(state.missions, raw, lifetimeOrbs)
    const bonus = missionBonus(missionResult.completed.length)
    const score = raw.score + bonus
    const previousBestDistance = profile.bestDistance
    const isBestScore = score > profile.bestScore
    const isBestDistance = raw.distance > previousBestDistance
    const missionsCompleted = Object.values(missionResult.next).filter((item) => item.completed).length
    const achieve = applyAchievements(state.statistics.achievements, {
      totalRuns: profile.totalRuns + 1,
      bestDistance: Math.max(previousBestDistance, raw.distance),
      orbsLifetime: lifetimeOrbs,
      hazardsAvoidedLifetime: lifetimeAvoided,
      mapsPlayed,
      missionsCompleted,
      isBestDistance,
      previousBestDistance,
    })
    const daily = dailyForDate(today)
    const dailyProgress = Math.max(profile.dailyProgress, dailyStat(daily, raw))
    const dailyJust = !profile.dailyClaimed && dailyProgress >= daily.target
    const streakResult = updateStreak(profile.lastPlayDate, profile.streak, today)
    const streakEnergy = streakReward(streakResult.streak, streakResult.incremented)
    let xpGain = runXp(raw)
    xpGain += missionResult.completed.length * 25
    if (dailyJust) xpGain += daily.xp
    if (isBestDistance && previousBestDistance > 0) xpGain += 30
    xpGain += achieve.unlocked.length * 20
    const levelBefore = profile.level
    const leveled = applyXp(profile.xp, profile.level, xpGain)
    const energyGain = missionResult.reward + achieve.reward + (dailyJust ? daily.reward : 0) + streakEnergy
    const result: RunResult = {
      ...raw,
      score,
      isBestScore,
      isBestDistance,
      completedMissions: missionResult.completed,
      xpEarned: xpGain,
      levelBefore,
      levelAfter: leveled.level,
      previousBestDistance,
      unlockedAchievements: achieve.unlocked,
      dailyCompleted: dailyJust,
      dailyTitle: dailyJust ? daily.title : null,
      streak: streakResult.streak,
    }

    const next: SaveData = {
      version: state.version,
      settings: state.settings,
      profile: {
        ...profile,
        bestScore: Math.max(profile.bestScore, score),
        bestDistance: Math.max(profile.bestDistance, raw.distance),
        totalEnergy: profile.totalEnergy + energyGain,
        totalRuns: profile.totalRuns + 1,
        longestTime: Math.max(profile.longestTime, raw.duration),
        xp: leveled.xp,
        level: leveled.level,
        seenTutorial: true,
        lastPlayDate: streakResult.lastPlayDate,
        streak: streakResult.streak,
        dailyDate: today,
        dailyProgress,
        dailyClaimed: profile.dailyClaimed || dailyJust,
      },
      unlockedSkins: state.unlockedSkins,
      missions: missionResult.next,
      statistics: {
        orbsLifetime: lifetimeOrbs,
        powerupsUsed: state.statistics.powerupsUsed + raw.powerupsUsed,
        distanceLifetime: state.statistics.distanceLifetime + raw.distance,
        hazardsAvoided: lifetimeAvoided,
        laneChanges: state.statistics.laneChanges + raw.laneChanges,
        nearMisses: state.statistics.nearMisses + raw.nearMisses,
        mapsPlayed,
        achievements: achieve.next,
      },
    }

    set({
      ...next,
      lastResult: result,
      screen: Screens.GameOver,
    })
    const ok = write(next)
    set({ persistError: !ok })
    return result
  },

  buySkin: (id) => {
    const state = get()
    if (state.unlockedSkins.includes(id)) {
      return { ok: false, reason: 'Already unlocked' }
    }
    const cost = SKINS[id].cost
    if (state.profile.totalEnergy < cost) {
      return { ok: false, reason: 'Not enough energy' }
    }
    const next: SaveData = {
      ...snapshot(state),
      profile: {
        ...state.profile,
        totalEnergy: state.profile.totalEnergy - cost,
        selectedSkin: id,
      },
      unlockedSkins: [...state.unlockedSkins, id],
    }
    set({
      profile: next.profile,
      unlockedSkins: next.unlockedSkins,
    })
    const ok = write(next)
    set({ persistError: !ok })
    return { ok: true }
  },

  selectSkin: (id) => {
    if (!get().unlockedSkins.includes(id)) return false
    const profile = { ...get().profile, selectedSkin: id }
    set({ profile })
    write(snapshot(get()))
    return true
  },

  selectMap: (id) => {
    const profile = { ...get().profile, selectedMap: id }
    set({ profile })
    write(snapshot(get()))
  },

  resetData: () => {
    const fresh = resetSave()
    set({
      ...fresh,
      lastResult: null,
      hud: emptyHud,
      persistError: false,
      screen: Screens.Menu,
      previousScreen: Screens.Menu,
    })
  },
}))

function snapshot(state: GameStore): SaveData {
  return {
    version: state.version,
    settings: state.settings,
    profile: state.profile,
    unlockedSkins: state.unlockedSkins,
    missions: state.missions,
    statistics: state.statistics,
  }
}
