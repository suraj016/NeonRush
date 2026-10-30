import { useState } from 'react'
import { Button } from '../components/Button.tsx'
import { Modal } from '../components/Modal.tsx'
import { getEngine } from '../game/bridge.ts'
import type { Quality } from '../game/types.ts'
import { useGameStore } from '../store/gameStore.ts'

export function SettingsScreen() {
  const settings = useGameStore((s) => s.settings)
  const updateSettings = useGameStore((s) => s.updateSettings)
  const resetData = useGameStore((s) => s.resetData)
  const closeOverlay = useGameStore((s) => s.closeOverlay)
  const [confirm, setConfirm] = useState(false)

  const apply = (patch: Parameters<typeof updateSettings>[0]) => {
    updateSettings(patch)
    getEngine()?.applySettings({ ...settings, ...patch })
  }

  return (
    <div className="screen screen-center overlay">
      <div className="panel">
        <p className="eyebrow">Systems</p>
        <h1 className="title">Settings</h1>
        <div className="stack" style={{ margin: '16px 0' }}>
          <label className="field">
            <span>Master volume {Math.round(settings.master * 100)}%</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={settings.master}
              onChange={(e) => apply({ master: Number(e.target.value) })}
            />
          </label>
          <label className="field">
            <span>Music {Math.round(settings.music * 100)}%</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={settings.music}
              onChange={(e) => apply({ music: Number(e.target.value) })}
            />
          </label>
          <label className="field">
            <span>Sound effects {Math.round(settings.sfx * 100)}%</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={settings.sfx}
              onChange={(e) => apply({ sfx: Number(e.target.value) })}
            />
          </label>
          <label className="field">
            <span>Graphics quality</span>
            <select
              className="select"
              value={settings.quality}
              onChange={(e) => apply({ quality: e.target.value as Quality })}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>
          <label className="field row">
            <input
              type="checkbox"
              checked={settings.reducedMotion}
              onChange={(e) => apply({ reducedMotion: e.target.checked })}
            />
            <span>Reduced motion</span>
          </label>
          <label className="field row">
            <input
              type="checkbox"
              checked={settings.cameraShake}
              onChange={(e) => apply({ cameraShake: e.target.checked })}
            />
            <span>Camera shake</span>
          </label>
          <div className="help-card">
            <p className="muted">
              Keyboard: A/D or arrows to change lanes, W/Up/Space to jump, S/Down to slide, Esc/P to pause.
            </p>
          </div>
          <Button variant="danger" onClick={() => setConfirm(true)}>
            Reset local data
          </Button>
          <Button variant="primary" onClick={closeOverlay}>
            Done
          </Button>
        </div>
      </div>
      {confirm ? (
        <Modal
          title="Reset all progress?"
          danger
          confirmLabel="Erase data"
          onCancel={() => setConfirm(false)}
          onConfirm={() => {
            resetData()
            getEngine()?.applySkin('pulse')
            getEngine()?.applySettings(useGameStore.getState().settings)
            getEngine()?.toMenu()
            setConfirm(false)
          }}
        >
          Scores, energy, unlocks, missions, and settings will be cleared on this device.
        </Modal>
      ) : null}
    </div>
  )
}
