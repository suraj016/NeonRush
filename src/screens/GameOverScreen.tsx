import { Button } from '../components/Button.tsx'
import { ProgressBar } from '../components/ProgressBar.tsx'
import { MISSIONS } from '../game/config.ts'
import { getEngine } from '../game/bridge.ts'
import { Screens } from '../game/types.ts'
import { useGameStore } from '../store/gameStore.ts'

export function GameOverScreen() {
  const result = useGameStore((s) => s.lastResult)
  const missions = useGameStore((s) => s.missions)
  const setScreen = useGameStore((s) => s.setScreen)

  return (
    <div className="screen screen-center overlay">
      <div className="panel">
        <p className="eyebrow">Signal lost</p>
        <h1 className="title">Run Over</h1>
        {result ? (
          <>
            <div className="stats-row">
              <div className="stat">
                <span>Score</span>
                <strong>{result.score.toLocaleString()}</strong>
              </div>
              <div className="stat">
                <span>Distance</span>
                <strong>{Math.floor(result.distance)}m</strong>
              </div>
              <div className="stat">
                <span>Energy</span>
                <strong>{result.energy}</strong>
              </div>
              <div className="stat">
                <span>Time</span>
                <strong>{result.duration.toFixed(1)}s</strong>
              </div>
            </div>
            {result.isBestScore ? <p className="eyebrow">New personal best</p> : null}
            {result.completedMissions.length > 0 ? (
              <p className="subtitle">Missions completed: {result.completedMissions.length}</p>
            ) : null}
            <div className="stack" style={{ margin: '12px 0 16px' }}>
              {result.completedMissions.slice(0, 3).map((id) => (
                <div key={id}>
                  <p className="muted">{MISSIONS[id].title}</p>
                  <ProgressBar value={missions[id].progress} max={MISSIONS[id].target} />
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="subtitle">No run data available.</p>
        )}
        <div className="stack">
          <Button
            variant="primary"
            onClick={() => {
              getEngine()?.restart()
              setScreen(Screens.Playing)
            }}
          >
            Restart
          </Button>
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
