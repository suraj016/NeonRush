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

function useTouchPlay(): boolean {
  const read = () => {
    if (typeof window === 'undefined') return false
    return (
      window.matchMedia('(pointer: coarse)').matches ||
      window.matchMedia('(hover: none)').matches ||
      Math.min(window.innerWidth, window.innerHeight) < 820
    )
  }
  const [touch, setTouch] = useState(read)
  useEffect(() => {
    const coarse = window.matchMedia('(pointer: coarse)')
    const hover = window.matchMedia('(hover: none)')
    const onChange = () => setTouch(read())
    coarse.addEventListener('change', onChange)
    hover.addEventListener('change', onChange)
    window.addEventListener('resize', onChange)
    return () => {
      coarse.removeEventListener('change', onChange)
      hover.removeEventListener('change', onChange)
      window.removeEventListener('resize', onChange)
    }
  }, [])
  return touch
}

export function Hud() {
  const hud = useGameStore((s) => s.hud)
  const mapId = useGameStore((s) => s.profile.selectedMap)
  const mapBest = useGameStore((s) => s.mapRecords[s.profile.selectedMap]?.bestDistance ?? 0)
  const [pop, setPop] = useState<'score' | 'orbs' | 'combo' | null>(null)
  const prev = useRef({ score: 0, energy: 0, combo: 0 })
  const touch = useTouchPlay()

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
    <div className={`hud hud-root${touch ? ' hud-touch' : ''}${fever ? ' hud-fever' : ''}${hud.comboTier >= 4 ? ' hud-godspeed' : ''}`}>
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
          {chase && !touch ? (
            <div className={`chip chip-chase${hud.distance > mapBest && mapBest > 0 ? ' chip-pop' : ''}`}>
              <span>{MAPS[mapId].name}</span>
              <strong>{chase}</strong>
            </div>
          ) : null}
          <div className={`chip${pop === 'orbs' ? ' chip-pop' : ''}`}>
            <span>Orbs</span>
            <strong>{hud.energy}</strong>
          </div>
          {!touch ? (
            <div className={`chip chip-speed${hud.boostActive ? ' chip-pop' : ''}`}>
              <span>{hud.boostActive ? 'Boost' : 'Speed'}</span>
              <strong>{hud.speed.toFixed(0)} m/s</strong>
            </div>
          ) : null}
          {touch && hud.combo > 0 ? (
            <div className={`chip chip-combo combo-tier-${hud.comboTier}${pop === 'combo' ? ' chip-pop' : ''}`}>
              <span>{hud.comboRank}</span>
              <strong>x{hud.combo}</strong>
            </div>
          ) : null}
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
      {!touch && hud.combo > 0 ? (
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
      <div className="hud-bottom">
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
        <div className="boost-meter">
          <div className="boost-meter-head">
            <span>Boost</span>
            <strong>{hud.boostCharge}%</strong>
          </div>
          <ProgressBar value={hud.boostCharge} max={100} />
          {!touch ? <p className="boost-hint">Hold Space</p> : null}
        </div>
        {touch ? (
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
    </div>
  )
}
