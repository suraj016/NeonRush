import { useState } from 'react'
import { Button } from '../components/Button.tsx'
import { SKINS } from '../game/config.ts'
import { getEngine } from '../game/bridge.ts'
import { Screens } from '../game/types.ts'
import type { SkinId } from '../game/types.ts'
import { useGameStore } from '../store/gameStore.ts'

export function CharacterSelect() {
  const profile = useGameStore((s) => s.profile)
  const unlocked = useGameStore((s) => s.unlockedSkins)
  const buySkin = useGameStore((s) => s.buySkin)
  const selectSkin = useGameStore((s) => s.selectSkin)
  const setScreen = useGameStore((s) => s.setScreen)
  const [message, setMessage] = useState('')

  const choose = (id: SkinId) => {
    if (unlocked.includes(id)) {
      selectSkin(id)
      getEngine()?.applySkin(id)
      setMessage(`${SKINS[id].name} selected`)
      return
    }
    const result = buySkin(id)
    if (result.ok) {
      getEngine()?.applySkin(id)
      setMessage(`${SKINS[id].name} unlocked`)
    } else {
      setMessage(result.reason ?? 'Unable to unlock')
    }
  }

  return (
    <div className="screen screen-center overlay">
      <div className="panel panel-wide">
        <p className="eyebrow">Loadout</p>
        <h1 className="title">Runners</h1>
        <p className="subtitle">Energy: {profile.totalEnergy.toLocaleString()}</p>
        <div className="card-grid scroll" style={{ margin: '16px 0' }}>
          {(Object.keys(SKINS) as SkinId[]).map((id) => {
            const skin = SKINS[id]
            const owned = unlocked.includes(id)
            const selected = profile.selectedSkin === id
            return (
              <article className={`char-card ${selected ? 'selected' : ''} ${owned ? '' : 'locked'}`} key={id}>
                <img src={skin.portrait} alt={`${skin.name} portrait`} />
                <h2 style={{ margin: '0 0 4px' }}>{skin.name}</h2>
                <p className="muted">{skin.tagline}</p>
                <p className="muted">{owned ? 'Unlocked' : `${skin.cost} energy`}</p>
                <Button
                  variant={selected ? 'primary' : 'secondary'}
                  onClick={() => choose(id)}
                  disabled={selected}
                  style={{ marginTop: 10, width: '100%' }}
                >
                  {selected ? 'Equipped' : owned ? 'Select' : profile.totalEnergy < skin.cost ? 'Locked' : 'Unlock'}
                </Button>
              </article>
            )
          })}
        </div>
        {message ? <p className="muted">{message}</p> : null}
        <Button variant="ghost" onClick={() => setScreen(Screens.Menu)}>
          Back
        </Button>
      </div>
    </div>
  )
}
