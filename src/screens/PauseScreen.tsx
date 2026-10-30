import { Button } from '../components/Button.tsx'
import { getEngine } from '../game/bridge.ts'
import { Screens } from '../game/types.ts'
import { useGameStore } from '../store/gameStore.ts'

export function PauseScreen() {
  const setScreen = useGameStore((s) => s.setScreen)
  const openOverlay = useGameStore((s) => s.openOverlay)

  return (
    <div className="screen screen-center overlay">
      <div className="panel">
        <p className="eyebrow">Halted</p>
        <h1 className="title">Paused</h1>
        <p className="subtitle">The city is frozen. Resume when you are ready.</p>
        <div className="stack" style={{ marginTop: 18 }}>
          <Button
            variant="primary"
            onClick={() => {
              getEngine()?.resume()
              setScreen(Screens.Playing)
            }}
          >
            Resume
          </Button>
          <Button
            onClick={() => {
              getEngine()?.restart()
              setScreen(Screens.Playing)
            }}
          >
            Restart run
          </Button>
          <Button onClick={() => openOverlay(Screens.Settings)}>Settings</Button>
          <Button
            variant="ghost"
            onClick={() => {
              getEngine()?.toMenu()
              setScreen(Screens.Menu)
            }}
          >
            Main menu
          </Button>
        </div>
      </div>
    </div>
  )
}
