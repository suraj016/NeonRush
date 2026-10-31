import type { Settings } from './types.ts'

type Tone = {
  freq: number
  dur: number
  type: OscillatorType
  gain: number
  delay?: number
}

export class AudioManager {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private musicGain: GainNode | null = null
  private sfxGain: GainNode | null = null
  private musicNodes: AudioNode[] = []
  private musicTimer = 0
  private step = 0
  private unlocked = false
  private settings: Settings
  private playingMusic = false

  constructor(settings: Settings) {
    this.settings = settings
  }

  applySettings(settings: Settings): void {
    this.settings = settings
    this.updateGains()
  }

  unlock(): void {
    if (this.unlocked) {
      void this.ctx?.resume()
      return
    }
    try {
      const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctx) return
      this.ctx = new Ctx()
      this.master = this.ctx.createGain()
      this.musicGain = this.ctx.createGain()
      this.sfxGain = this.ctx.createGain()
      this.musicGain.connect(this.master)
      this.sfxGain.connect(this.master)
      this.master.connect(this.ctx.destination)
      this.unlocked = true
      this.updateGains()
      void this.ctx.resume()
    } catch {
      this.unlocked = false
    }
  }

  startMusic(): void {
    this.unlock()
    this.playingMusic = true
  }

  stopMusic(): void {
    this.playingMusic = false
    this.disposeMusic()
  }

  update(dt: number): void {
    if (!this.playingMusic || !this.ctx || !this.musicGain) return
    if (this.ctx.state !== 'running') return
    this.musicTimer -= dt
    if (this.musicTimer > 0) return
    this.musicTimer = 0.5
    this.scheduleBar()
  }

  play(name: 'ui' | 'jump' | 'slide' | 'orb' | 'power' | 'crash' | 'shield' | 'start' | 'land' | 'near' | 'milestone' | 'achieve'): void {
    this.unlock()
    if (!this.ctx || !this.sfxGain) return
    const tones: Record<typeof name, Tone[]> = {
      ui: [{ freq: 640, dur: 0.06, type: 'triangle', gain: 0.08 }],
      jump: [{ freq: 320, dur: 0.09, type: 'square', gain: 0.07 }, { freq: 520, dur: 0.08, type: 'square', gain: 0.05, delay: 0.05 }],
      slide: [{ freq: 180, dur: 0.1, type: 'sawtooth', gain: 0.05 }],
      orb: [{ freq: 880, dur: 0.07, type: 'sine', gain: 0.07 }, { freq: 1320, dur: 0.08, type: 'sine', gain: 0.04, delay: 0.04 }],
      power: [{ freq: 360, dur: 0.12, type: 'triangle', gain: 0.08 }, { freq: 540, dur: 0.14, type: 'triangle', gain: 0.06, delay: 0.08 }],
      crash: [{ freq: 90, dur: 0.28, type: 'sawtooth', gain: 0.12 }, { freq: 50, dur: 0.32, type: 'square', gain: 0.08, delay: 0.02 }],
      shield: [{ freq: 240, dur: 0.16, type: 'triangle', gain: 0.09 }, { freq: 160, dur: 0.2, type: 'sine', gain: 0.06, delay: 0.05 }],
      start: [{ freq: 420, dur: 0.1, type: 'square', gain: 0.07 }, { freq: 630, dur: 0.12, type: 'square', gain: 0.06, delay: 0.1 }],
      land: [{ freq: 210, dur: 0.05, type: 'triangle', gain: 0.05 }],
      near: [{ freq: 1180, dur: 0.04, type: 'sine', gain: 0.035 }],
      milestone: [{ freq: 520, dur: 0.1, type: 'square', gain: 0.07 }, { freq: 780, dur: 0.12, type: 'triangle', gain: 0.06, delay: 0.08 }],
      achieve: [{ freq: 660, dur: 0.1, type: 'triangle', gain: 0.07 }, { freq: 880, dur: 0.14, type: 'sine', gain: 0.05, delay: 0.09 }],
    }
    for (const tone of tones[name]) this.beep(tone)
  }

  dispose(): void {
    this.stopMusic()
    if (this.ctx) {
      void this.ctx.close()
    }
    this.ctx = null
    this.master = null
    this.musicGain = null
    this.sfxGain = null
    this.unlocked = false
  }

  private updateGains(): void {
    if (!this.master || !this.musicGain || !this.sfxGain) return
    this.master.gain.value = this.settings.master
    this.musicGain.gain.value = this.settings.music
    this.sfxGain.gain.value = this.settings.sfx
  }

  private scheduleBar(): void {
    if (!this.ctx || !this.musicGain) return
    this.disposeMusic()
    const bass = [98, 98, 87, 82]
    const lead = [392, 466, 523, 622]
    const i = this.step % 4
    this.step += 1
    this.drone(bass[i], 0.5, 0.045)
    this.drone(lead[i], 0.18, 0.03)
    if (i === 0) this.drone(49, 0.12, 0.06)
  }

  private drone(freq: number, dur: number, gain: number): void {
    if (!this.ctx || !this.musicGain) return
    const osc = this.ctx.createOscillator()
    const g = this.ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    g.gain.setValueAtTime(0.0001, this.ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(gain, this.ctx.currentTime + 0.03)
    g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + dur)
    osc.connect(g)
    g.connect(this.musicGain)
    osc.start()
    osc.stop(this.ctx.currentTime + dur + 0.02)
    this.musicNodes.push(osc, g)
  }

  private beep(tone: Tone): void {
    if (!this.ctx || !this.sfxGain) return
    const t = this.ctx.currentTime + (tone.delay ?? 0)
    const osc = this.ctx.createOscillator()
    const g = this.ctx.createGain()
    osc.type = tone.type
    osc.frequency.setValueAtTime(tone.freq, t)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(tone.gain, t + 0.012)
    g.gain.exponentialRampToValueAtTime(0.0001, t + tone.dur)
    osc.connect(g)
    g.connect(this.sfxGain)
    osc.start(t)
    osc.stop(t + tone.dur + 0.03)
  }

  private disposeMusic(): void {
    for (const node of this.musicNodes) {
      try {
        if ('stop' in node) (node as OscillatorNode).stop()
        node.disconnect()
      } catch {
        // already stopped
      }
    }
    this.musicNodes = []
  }
}
