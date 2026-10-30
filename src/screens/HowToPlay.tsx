import { Button } from '../components/Button.tsx'
import { useGameStore } from '../store/gameStore.ts'

const items = [
  { title: 'Lane shift', body: 'A / Left or D / Right. Swipe sideways on mobile.' },
  { title: 'Jump', body: 'W, Up, or Space. Swipe up to clear low barriers and gaps.' },
  { title: 'Slide', body: 'S or Down. Swipe down to pass under magenta laser gates.' },
  { title: 'Energy', body: 'Collect cyan orbs for score and persistent energy.' },
  { title: 'Power-ups', body: 'Shield absorbs one hit. Magnet pulls orbs. Multiplier doubles score.' },
  { title: 'Hazards', body: 'Never stay in a blocked lane. Moving amber walls change lanes.' },
]

export function HowToPlay() {
  return (
    <div className="screen screen-center overlay">
      <div className="panel panel-wide">
        <p className="eyebrow">Manual</p>
        <h1 className="title">How to Play</h1>
        <p className="subtitle">Escape the grid. One clean route always exists.</p>
        <div className="help-grid scroll" style={{ margin: '16px 0' }}>
          {items.map((item) => (
            <article className="help-card" key={item.title}>
              <h2 style={{ margin: '0 0 6px', fontSize: 18 }}>{item.title}</h2>
              <p className="muted">{item.body}</p>
            </article>
          ))}
        </div>
        <Button variant="primary" onClick={() => useGameStore.getState().closeOverlay()}>
          Back
        </Button>
      </div>
    </div>
  )
}
