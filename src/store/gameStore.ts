import { create } from 'zustand'
import { SKINS } from '../game/config.ts'
import { applyMissionProgress } from '../game/missions.ts'
import { missionBonus } from '../game/score.ts'
import { loadSave, persistSave, resetSave } from '../services/saveService.ts'
import type {
  HudSnapshot,
  RunResult,
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
  finishRun: (result: Omit<RunResult, 'isBestScore' | 'isBestDistance' | 'completedMissions'>) => RunResult
  buySkin: (id: SkinId) => { ok: boolean; reason?: string }
  selectSkin: (id: SkinId) => boolean
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
}

function write(data: SaveData): boolean {
  return persistSave(data)
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

  setHud: (hud) => set({ hud }),
  setWebglError: (webglError) => set({ webglError }),

  updateSettings: (patch) => {
    const settings = { ...get().settings, ...patch }
    set({ settings })
    const ok = write(snapshot(get()))
    set({ persistError: !ok })
  },

  applyEnergy: (total) => {
    set({ profile: { ...get().profile, totalEnergy: total } })
    write(snapshot(get()))
  },

  applyMissions: (missions) => {
    set({ missions })
    write(snapshot(get()))
  },

  finishRun: (raw) => {
    const state = get()
    const lifetimeOrbs = state.statistics.orbsLifetime + raw.orbs
    const missionResult = applyMissionProgress(state.missions, raw, lifetimeOrbs)
    const bonus = missionBonus(missionResult.completed.length)
    const score = raw.score + bonus
    const isBestScore = score > state.profile.bestScore
    const isBestDistance = raw.distance > state.profile.bestDistance
    const result: RunResult = {
      ...raw,
      score,
      isBestScore,
      isBestDistance,
      completedMissions: missionResult.completed,
    }

    const next: SaveData = {
      version: state.version,
      settings: state.settings,
      profile: {
        ...state.profile,
        bestScore: Math.max(state.profile.bestScore, score),
        bestDistance: Math.max(state.profile.bestDistance, raw.distance),
        totalEnergy: state.profile.totalEnergy + missionResult.reward,
        totalRuns: state.profile.totalRuns + 1,
        longestTime: Math.max(state.profile.longestTime, raw.duration),
      },
      unlockedSkins: state.unlockedSkins,
      missions: missionResult.next,
      statistics: {
        orbsLifetime: lifetimeOrbs,
        powerupsUsed: state.statistics.powerupsUsed + raw.powerupsUsed,
        distanceLifetime: state.statistics.distanceLifetime + raw.distance,
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
