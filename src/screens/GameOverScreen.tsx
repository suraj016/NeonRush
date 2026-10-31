import { Button } from '../components/Button.tsx'
import { ProgressBar } from '../components/ProgressBar.tsx'
import { ACHIEVEMENTS } from '../game/achievements.ts'
import { MISSIONS } from '../game/config.ts'
import { getEngine } from '../game/bridge.ts'
import { xpToNext } from '../game/progress.ts'
import { Screens } from '../game/types.ts'
import { useGameStore } from '../store/gameStore.ts'

export function GameOverScreen() {
  const result = useGameStore((s) => s.lastResult)
  const missions = useGameStore((s) => s.missions)
  const profile = useGameStore((s) => s.profile)
  const setScreen = useGameStore((s) => s.setScreen)
  const needed = xpToNext(profile.level)

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
                <span>Avoided</span>
                <strong>{result.hazardsAvoided}</strong>
              </div>
            </div>
            {result.isBestDistance ? (
              <p className="record-banner">
                New personal best · {result.previousBestDistance}m → {Math.floor(result.distance)}m
              </p>
            ) : result.previousBestDistance > 0 ? (
              <p className="muted">Best distance: {result.previousBestDistance}m</p>
            ) : null}
            {result.isBestScore ? <p className="eyebrow">New high score</p> : null}
            <article className="mission-card" style={{ margin: '10px 0 12px' }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <strong>+{result.xpEarned} XP</strong>
                <span className="muted">
                  Lv {result.levelBefore}
                  {result.levelAfter > result.levelBefore ? ` → ${result.levelAfter}` : ''}
                </span>
              </div>
              <ProgressBar value={profile.xp} max={needed} />
            </article>
            {result.dailyCompleted && result.dailyTitle ? (
              <p className="subtitle">Daily complete: {result.dailyTitle}</p>
            ) : null}
            {result.unlockedAchievements.length > 0 ? (
              <p className="subtitle">
                Achievement: {result.unlockedAchievements.map((id) => ACHIEVEMENTS[id].title).join(', ')}
              </p>
            ) : null}
            {result.completedMissions.length > 0 ? (
              <div className="stack" style={{ margin: '8px 0 12px' }}>
                {result.completedMissions.slice(0, 3).map((id) => (
                  <div key={id}>
                    <p className="muted">{MISSIONS[id].title}</p>
                    <ProgressBar value={missions[id].progress} max={MISSIONS[id].target} />
                  </div>
                ))}
              </div>
            ) : null}
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
            Play again
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
