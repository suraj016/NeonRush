import { Button } from '../components/Button.tsx'
import { ProgressBar } from '../components/ProgressBar.tsx'
import { MISSIONS } from '../game/config.ts'
import { Screens } from '../game/types.ts'
import type { MissionId } from '../game/types.ts'
import { useGameStore } from '../store/gameStore.ts'

export function MissionsScreen() {
  const missions = useGameStore((s) => s.missions)
  const setScreen = useGameStore((s) => s.setScreen)

  return (
    <div className="screen screen-center overlay">
      <div className="panel panel-wide">
        <p className="eyebrow">Contracts</p>
        <h1 className="title">Missions</h1>
        <p className="subtitle">Run, skill, and world contracts. Each completes once.</p>
        <div className="stack scroll" style={{ margin: '16px 0' }}>
          {(Object.keys(MISSIONS) as MissionId[]).map((id) => {
            const def = MISSIONS[id]
            const rec = missions[id]
            return (
              <article className="mission-card" key={id}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <h2 style={{ margin: 0, fontSize: 18 }}>{def.title}</h2>
                  <strong>{rec.completed ? 'Complete' : `+${def.reward} energy`}</strong>
                </div>
                <p className="map-tag" style={{ margin: '4px 0 6px' }}>
                  {def.group === 'world' ? 'World' : def.group === 'skill' ? 'Skill' : 'Run'}
                </p>
                <p className="muted">{def.description}</p>
                <ProgressBar value={rec.progress} max={def.target} />
                <p className="muted">
                  {Math.min(Math.floor(rec.progress), def.target)} / {def.target}
                </p>
              </article>
            )
          })}
        </div>
        <Button variant="primary" onClick={() => setScreen(Screens.Menu)}>
          Back
        </Button>
      </div>
    </div>
  )
}
