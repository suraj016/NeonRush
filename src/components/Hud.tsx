import { useEffect, useRef, useState } from 'react'
import { IconPause } from './Icons.tsx'
import { ProgressBar } from './ProgressBar.tsx'
import { POWERUP_DEFS } from '../game/powerUps.ts'
import { MAPS } from '../game/maps.ts'
import { chaseLine } from '../game/records.ts'
import { useGameStore } from '../store/gameStore.ts'
import { getEngine } from '../game/bridge.ts'
import { Screens } from '../game/types.ts'
import type { PowerUpType } from '../game/types.ts'

function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(pointer: coarse)').matches : false,
  )
  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)')
    const onChange = () => setCoarse(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return coarse
}

export function Hud() {
  const hud = useGameStore((s) => s.hud)
  const mapId = useGameStore((s) => s.profile.selectedMap)
  const mapBest = useGameStore((s) => s.mapRecords[s.profile.selectedMap]?.bestDistance ?? 0)
  const [pop, setPop] = useState<'score' | 'orbs' | 'combo' | null>(null)
  const prev = useRef({ score: 0, energy: 0, combo: 0 })
  const coarse = useCoarsePointer()

  useEffect(() => {
    let next: 'score' | 'orbs' | 'combo' | null = null
    if (hud.combo > prev.current.combo && hud.combo >= 10) next = 'combo'
    else if (hud.energy > prev.current.energy) next = 'orbs'
    else if (hud.score - prev.current.score >= 10) next = 'score'
    prev.current = { score: hud.score, energy: hud.energy, combo: hud.combo }
    if (!next) return
    setPop(next)
    const id = window.setTimeout(() => setPop(null), 280)
    return () => window.clearTimeout(id)
  }, [hud.energy, hud.score, hud.combo])

  const releaseBoost = () => getEngine()?.setMobileBoostHeld(false)
  const chase = chaseLine(mapBest, hud.distance)
  const fever = hud.comboTier >= 3

  return (
    <div className={`hud hud-root${fever ? ' hud-fever' : ''}${hud.comboTier >= 4 ? ' hud-godspeed' : ''}`}>
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
          {chase ? (
            <div className={`chip${hud.distance > mapBest && mapBest > 0 ? ' chip-pop' : ''}`}>
              <span>{MAPS[mapId].name}</span>
              <strong>{chase}</strong>
            </div>
          ) : null}
          <div className={`chip${pop === 'orbs' ? ' chip-pop' : ''}`}>
            <span>Orbs</span>
            <strong>{hud.energy}</strong>
          </div>
          <div className={`chip${hud.boostActive ? ' chip-pop' : ''}`}>
            <span>{hud.boostActive ? 'Boost' : 'Speed'}</span>
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
      <div className="boost-meter">
        <div className="boost-meter-head">
          <span>Boost charge</span>
          <strong>{hud.boostCharge}%</strong>
        </div>
        <ProgressBar value={hud.boostCharge} max={100} />
        {!coarse ? <p className="boost-hint">Hold Space to boost</p> : null}
      </div>
      {hud.combo > 0 ? (
        <div className={`combo-banner combo-tier-${hud.comboTier}${pop === 'combo' ? ' combo-pop' : ''}`}>
          <span>{hud.comboRank}</span>
          <strong>x{hud.combo}</strong>
        </div>
      ) : null}
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
              <span>
                {POWERUP_DEFS[item.type as PowerUpType]?.hudLabel ?? item.type}
                {hud.multiplier > 1 && item.type === 'multiplier' ? ` x${hud.multiplier}` : ''}
              </span>
              <strong>{item.remaining.toFixed(1)}s</strong>
            </div>
          ))}
        </div>
      ) : null}
      {coarse ? (
        <button
          type="button"
          className={`boost-hold-btn${hud.boostActive ? ' boost-hold-btn-active' : ''}${!hud.boostReady ? ' boost-hold-btn-empty' : ''}`}
          aria-label="Hold to boost"
          onPointerDown={(event) => {
            event.preventDefault()
            try {
              event.currentTarget.setPointerCapture(event.pointerId)
            } catch {
              /* optional */
            }
            getEngine()?.setMobileBoostHeld(true)
          }}
          onPointerUp={releaseBoost}
          onPointerCancel={releaseBoost}
          onLostPointerCapture={releaseBoost}
        >
          Hold to Boost
        </button>
      ) : null}
    </div>
  )
}
