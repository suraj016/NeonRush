import { Button } from '../components/Button.tsx'
import { ProgressBar } from '../components/ProgressBar.tsx'
import { ACHIEVEMENTS } from '../game/achievements.ts'
import { MISSIONS } from '../game/config.ts'
import { getEngine } from '../game/bridge.ts'
import { MAPS } from '../game/maps.ts'
import { xpToNext } from '../game/progress.ts'
import { starLabel } from '../game/records.ts'
import { Screens } from '../game/types.ts'
import { useGameStore } from '../store/gameStore.ts'

export function GameOverScreen() {
  const result = useGameStore((s) => s.lastResult)
  const missions = useGameStore((s) => s.missions)
  const profile = useGameStore((s) => s.profile)
  const setScreen = useGameStore((s) => s.setScreen)
  const needed = xpToNext(profile.level)
  const world = result ? MAPS[result.mapId].name : 'the grid'

  return (
    <div className="screen screen-center overlay">
      <div className="panel">
        <p className="eyebrow">Signal lost</p>
        <h1 className="title">Run Over</h1>
        {result ? (
          <>
            <div className="stack" style={{ margin: '0 0 12px' }}>
            <p className="style-rank">
              {result.styleRank}
              {result.maxCombo > 0 ? ` · combo ${result.maxCombo}` : ''}
            </p>
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
                <span>Orbs</span>
                <strong>{result.orbs}</strong>
              </div>
              <div className="stat">
                <span>Boost</span>
                <strong>{result.boostTime.toFixed(1)}s</strong>
              </div>
            </div>
            {result.isMapBestDistance ? (
              <p className="record-banner">
                New {world} best · {Math.floor(result.previousMapDistance)}m → {Math.floor(result.distance)}m
              </p>
            ) : result.previousMapDistance > 0 ? (
              <p className="muted">
                {world} best: {Math.floor(result.previousMapDistance)}m · {starLabel(result.mapStars)}
              </p>
            ) : (
              <p className="muted">First record on {world}</p>
            )}
            {result.isBestScore ? <p className="eyebrow">New high score</p> : null}
            {result.isBestCombo ? <p className="eyebrow">New style combo</p> : null}
            {result.hallRank > 0 && result.hallRank <= 8 ? (
              <p className="muted">Hall of fame #{result.hallRank}</p>
            ) : null}
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
            {result.nextGoal ? (
              <article className="mission-card" style={{ margin: '0 0 12px' }}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <strong>Next: {result.nextGoal.title}</strong>
                  <span className="muted">
                    {Math.floor(result.nextGoal.progress)}/{result.nextGoal.target}
                  </span>
                </div>
                <ProgressBar value={result.nextGoal.progress} max={result.nextGoal.target} />
              </article>
            ) : null}
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
