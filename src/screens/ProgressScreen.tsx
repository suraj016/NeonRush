import { Button } from '../components/Button.tsx'
import { ProgressBar } from '../components/ProgressBar.tsx'
import { ACHIEVEMENT_ORDER, ACHIEVEMENTS } from '../game/achievements.ts'
import { SKINS } from '../game/config.ts'
import { dailyForDate, localDateKey } from '../game/daily.ts'
import { xpToNext } from '../game/progress.ts'
import { Screens } from '../game/types.ts'
import type { SkinId } from '../game/types.ts'
import { useGameStore } from '../store/gameStore.ts'

function nextSkin(unlocked: SkinId[]): { name: string; cost: number } | null {
  for (const id of Object.keys(SKINS) as SkinId[]) {
    if (!unlocked.includes(id)) return { name: SKINS[id].name, cost: SKINS[id].cost }
  }
  return null
}

export function ProgressScreen() {
  const profile = useGameStore((s) => s.profile)
  const statistics = useGameStore((s) => s.statistics)
  const unlockedSkins = useGameStore((s) => s.unlockedSkins)
  const setScreen = useGameStore((s) => s.setScreen)
  const daily = dailyForDate(profile.dailyDate || localDateKey())
  const unlock = nextSkin(unlockedSkins)
  const needed = xpToNext(profile.level)

  return (
    <div className="screen screen-center overlay">
      <div className="panel panel-wide">
        <p className="eyebrow">Operator</p>
        <h1 className="title">Progress</h1>
        <p className="subtitle">Level {profile.level} · {profile.streak} day streak</p>
        <div className="stack scroll" style={{ margin: '16px 0' }}>
          <article className="mission-card">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>Level {profile.level}</h2>
              <strong>{profile.xp} / {needed} XP</strong>
            </div>
            <ProgressBar value={profile.xp} max={needed} />
            <p className="muted">
              {unlock ? `Next unlock: ${unlock.name} · ${unlock.cost} energy` : 'All runner suits unlocked'}
            </p>
          </article>
          <article className="mission-card">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>{daily.title}</h2>
              <strong>{profile.dailyClaimed ? 'Claimed' : `+${daily.reward} energy`}</strong>
            </div>
            <p className="muted">{daily.description}</p>
            <ProgressBar value={profile.dailyProgress} max={daily.target} />
            <p className="muted">
              {Math.min(Math.floor(profile.dailyProgress), daily.target)} / {daily.target}
            </p>
          </article>
          <article className="mission-card">
            <h2 style={{ margin: '0 0 6px', fontSize: 18 }}>Daily streak</h2>
            <p className="muted">
              {profile.streak} day{profile.streak === 1 ? '' : 's'}. Missed days keep your streak — they just pause the count.
            </p>
            <p className="muted">Next bonus: +{profile.streak > 0 && (profile.streak + 1) % 3 === 0 ? 25 : 8} energy on tomorrow’s first run.</p>
          </article>
          {ACHIEVEMENT_ORDER.map((id) => {
            const def = ACHIEVEMENTS[id]
            const rec = statistics.achievements[id]
            return (
              <article className={`mission-card${rec.unlocked ? ' achieve-done' : ''}`} key={id}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <h2 style={{ margin: 0, fontSize: 18 }}>{def.title}</h2>
                  <strong>{rec.unlocked ? 'Unlocked' : `+${def.reward}`}</strong>
                </div>
                <p className="muted">{def.description}</p>
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
