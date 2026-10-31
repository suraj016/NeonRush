import { useEffect, useRef } from 'react'
import { Hud } from '../components/Hud.tsx'
import { getEngine, setEngine } from '../game/bridge.ts'
import { GameEngine } from '../game/engine.ts'
import { EngineStates, Screens } from '../game/types.ts'
import { CharacterSelect } from '../screens/CharacterSelect.tsx'
import { GameOverScreen } from '../screens/GameOverScreen.tsx'
import { HowToPlay } from '../screens/HowToPlay.tsx'
import { MainMenu } from '../screens/MainMenu.tsx'
import { MapsScreen } from '../screens/MapsScreen.tsx'
import { MissionsScreen } from '../screens/MissionsScreen.tsx'
import { ProgressScreen } from '../screens/ProgressScreen.tsx'
import { PauseScreen } from '../screens/PauseScreen.tsx'
import { SettingsScreen } from '../screens/SettingsScreen.tsx'
import { BootScreen } from '../screens/BootScreen.tsx'
import { WebGLError } from '../screens/WebGLError.tsx'
import { useGameStore } from '../store/gameStore.ts'

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const screen = useGameStore((s) => s.screen)
  const webglError = useGameStore((s) => s.webglError)
  const reduced = useGameStore((s) => s.settings.reducedMotion)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const state = useGameStore.getState()
    let engine: GameEngine | null = null
    try {
      engine = new GameEngine(canvas, state.settings, state.profile.selectedSkin, {
        onHud: (hud) => useGameStore.getState().setHud(hud),
        onGameOver: (result) => {
          useGameStore.getState().finishRun(result)
        },
        onState: (engineState) => {
          const current = useGameStore.getState().screen
          if (engineState === EngineStates.Paused) {
            useGameStore.getState().setScreen(Screens.Paused)
          }
          if (engineState === EngineStates.Playing && current === Screens.Paused) {
            useGameStore.getState().setScreen(Screens.Playing)
          }
        },
        onEnergy: () => {
          const store = useGameStore.getState()
          store.applyEnergy(store.profile.totalEnergy + 1)
        },
        onMissionProgress: (missions) => useGameStore.getState().applyMissions(missions),
      })
      setEngine(engine)
      engine.applyMap(state.profile.selectedMap)
      engine.setTutorial(!state.profile.seenTutorial)
      engine.start()
      useGameStore.getState().ensureCalendar()
      useGameStore.getState().setScreen(Screens.Menu)
    } catch {
      useGameStore.getState().setWebglError(true)
    }

    return () => {
      engine?.destroy()
      setEngine(null)
    }
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('playing', screen === Screens.Playing)
    document.documentElement.classList.toggle('reduced-motion', reduced)
  }, [screen, reduced])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && screen === Screens.Playing) {
        getEngine()?.pause()
        useGameStore.getState().setScreen(Screens.Paused)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [screen])

  return (
    <div className="app-shell">
      <canvas ref={canvasRef} className="game-canvas" aria-label="Neon Rush 3D game view" />
      <div className="ui-layer">
        {webglError ? <WebGLError /> : null}
        {screen === Screens.Boot ? <BootScreen /> : null}
        {screen === Screens.Menu ? <MainMenu /> : null}
        {screen === Screens.HowTo ? <HowToPlay /> : null}
        {screen === Screens.Characters ? <CharacterSelect /> : null}
        {screen === Screens.Missions ? <MissionsScreen /> : null}
        {screen === Screens.Progress ? <ProgressScreen /> : null}
        {screen === Screens.Settings ? <SettingsScreen /> : null}
        {screen === Screens.Maps ? <MapsScreen /> : null}
        {screen === Screens.Playing ? <Hud /> : null}
        {screen === Screens.Paused ? <PauseScreen /> : null}
        {screen === Screens.GameOver ? <GameOverScreen /> : null}
      </div>
    </div>
  )
}
