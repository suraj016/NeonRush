import { Button } from '../components/Button.tsx'
import { getEngine } from '../game/bridge.ts'
import { Screens } from '../game/types.ts'
import { useGameStore } from '../store/gameStore.ts'
import { asset } from '../utils/assets.ts'

export function MainMenu() {
  const profile = useGameStore((s) => s.profile)
  const setScreen = useGameStore((s) => s.setScreen)

  return (
    <div className="screen screen-center menu-backdrop">
      <div className="panel">
        <div className="brand">
          <p className="eyebrow">Night Sector 07</p>
          <img src={asset('assets/images/neon-rush-logo.jpg')} alt="Neon Rush Cyber Escape" />
        </div>
        <div className="stats-row">
          <div className="stat">
            <span>Best score</span>
            <strong>{profile.bestScore.toLocaleString()}</strong>
          </div>
          <div className="stat">
            <span>Total energy</span>
            <strong>{profile.totalEnergy.toLocaleString()}</strong>
          </div>
        </div>
        <div className="stack">
          <Button
            variant="primary"
            onClick={() => {
              getEngine()?.play()
              setScreen(Screens.Playing)
            }}
          >
            Play
          </Button>
          <div className="nav-grid">
            <Button onClick={() => setScreen(Screens.Characters)}>Runners</Button>
            <Button onClick={() => setScreen(Screens.Missions)}>Missions</Button>
            <Button onClick={() => setScreen(Screens.HowTo)}>How to Play</Button>
            <Button onClick={() => useGameStore.getState().openOverlay(Screens.Settings)}>Settings</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
