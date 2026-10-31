import type { CSSProperties } from 'react'
import { Button } from '../components/Button.tsx'
import { getEngine } from '../game/bridge.ts'
import { MAP_ORDER, MAPS, type MapId } from '../game/maps.ts'
import { Screens } from '../game/types.ts'
import { useGameStore } from '../store/gameStore.ts'

function MapPreview({ id }: { id: MapId }) {
  if (id === 'desert') {
    return (
      <div className="map-preview map-preview-desert" aria-hidden>
        <span className="map-sky" />
        <span className="map-peak map-peak-a" />
        <span className="map-peak map-peak-b" />
        <span className="map-wall map-wall-l" />
        <span className="map-wall map-wall-r" />
        <span className="map-path" />
        <span className="map-ruin" />
      </div>
    )
  }
  if (id === 'frozen') {
    return (
      <div className="map-preview map-preview-frozen" aria-hidden>
        <span className="map-sky" />
        <span className="map-peak map-peak-a" />
        <span className="map-peak map-peak-b" />
        <span className="map-tree map-tree-a" />
        <span className="map-tree map-tree-b" />
        <span className="map-tree map-tree-c" />
        <span className="map-path" />
        <span className="map-cabin" />
      </div>
    )
  }
  return (
    <div className="map-preview map-preview-emerald" aria-hidden>
      <span className="map-sky" />
      <span className="map-tower map-tower-a" />
      <span className="map-tower map-tower-b" />
      <span className="map-tower map-tower-c" />
      <span className="map-path" />
      <span className="map-glow" />
    </div>
  )
}

export function MapsScreen() {
  const selected = useGameStore((s) => s.profile.selectedMap)
  const selectMap = useGameStore((s) => s.selectMap)
  const setScreen = useGameStore((s) => s.setScreen)

  const choose = (id: MapId) => {
    selectMap(id)
    getEngine()?.applyMap(id)
  }

  const play = (id: MapId) => {
    choose(id)
    getEngine()?.play()
    setScreen(Screens.Playing)
  }

  return (
    <div className="screen screen-center overlay">
      <div className="panel panel-wide">
        <p className="eyebrow">Sectors</p>
        <h1 className="title">Worlds</h1>
        <p className="subtitle">Three distinct runs. Same runner, same rules.</p>
        <div className="card-grid scroll" style={{ margin: '16px 0' }}>
          {MAP_ORDER.map((id) => {
            const map = MAPS[id]
            const active = selected === id
            return (
              <article
                className={`map-card map-card-${id} ${active ? 'selected' : ''}`}
                key={id}
                style={{ '--map-accent': map.accent, '--map-tone': map.tone } as CSSProperties}
              >
                <MapPreview id={id} />
                <p className="map-tag">{map.tagline}</p>
                <h2>{map.name}</h2>
                <p className="muted">{map.description}</p>
                <div className="map-actions">
                  <Button variant={active ? 'primary' : 'secondary'} onClick={() => choose(id)}>
                    {active ? 'Selected' : 'Select'}
                  </Button>
                  <Button variant="primary" onClick={() => play(id)}>
                    Play
                  </Button>
                </div>
              </article>
            )
          })}
        </div>
        <Button variant="ghost" onClick={() => setScreen(Screens.Menu)}>
          Back
        </Button>
      </div>
    </div>
  )
}
