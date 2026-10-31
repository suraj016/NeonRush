import { useEffect, useRef, useState } from 'react'
import { IconPause } from './Icons.tsx'
import { useGameStore } from '../store/gameStore.ts'
import { getEngine } from '../game/bridge.ts'
import { Screens } from '../game/types.ts'

export function Hud() {
  const hud = useGameStore((s) => s.hud)
  const [pop, setPop] = useState<'score' | 'energy' | null>(null)
  const prev = useRef({ score: 0, energy: 0 })

  useEffect(() => {
    let next: 'score' | 'energy' | null = null
    if (hud.energy > prev.current.energy) next = 'energy'
    else if (hud.score - prev.current.score >= 10) next = 'score'
    prev.current = { score: hud.score, energy: hud.energy }
    if (!next) return
    setPop(next)
    const id = window.setTimeout(() => setPop(null), 280)
    return () => window.clearTimeout(id)
  }, [hud.energy, hud.score])

  return (
    <div className="hud hud-root">
      <div className="hud-top">
        <div className="hud-cluster">
          <div className={`chip${pop === 'score' ? ' chip-pop' : ''}`}>
            <span>Score</span>
            <strong>{hud.score.toLocaleString()}</strong>
          </div>
          <div className="chip">
            <span>Distance</span>
            <strong>{hud.distance}m</strong>
          </div>
          <div className={`chip${pop === 'energy' ? ' chip-pop' : ''}`}>
            <span>Energy</span>
            <strong>{hud.energy}</strong>
          </div>
          <div className="chip">
            <span>{hud.tier}</span>
            <strong>{hud.speed.toFixed(0)} m/s</strong>
          </div>
        </div>
        <button
          className="icon-btn"
          aria-label="Pause game"
          onClick={() => {
            getEngine()?.pause()
            useGameStore.getState().setScreen(Screens.Paused)
          }}
        >
          <IconPause />
        </button>
      </div>
      {hud.readyLabel ? <div className="ready-banner">{hud.readyLabel}</div> : null}
      {hud.milestone ? <div className="hud-milestone">{hud.milestone}</div> : null}
      {hud.hint ? (
        <div className="hud-hint">
          <p>{hud.hint}</p>
          <button
            type="button"
            className="hint-skip"
            onClick={() => {
              getEngine()?.setTutorial(false)
              useGameStore.getState().skipTutorial()
            }}
          >
            Skip
          </button>
        </div>
      ) : null}
      {hud.powerups.length > 0 ? (
        <div className="power-row">
          {hud.powerups.map((item) => (
            <div className="chip" key={item.type}>
              <span>{item.type} {hud.multiplier > 1 && item.type === 'multiplier' ? `x${hud.multiplier}` : ''}</span>
              <strong>{item.remaining.toFixed(1)}s</strong>
            </div>
          ))}
        </div>
      ) : (
        <div />
      )}
    </div>
  )
}
