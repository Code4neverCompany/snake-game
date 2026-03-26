/**
 * Audio system — procedural Web Audio API sounds.
 *
 * No audio files required. All sounds are synthesised in real-time.
 * Volume can be adjusted or muted at any time.
 */
export class AudioSystem {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private muted = false
  private volume = 0.5

  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext()
      this.masterGain = this.ctx.createGain()
      this.masterGain.gain.value = this.muted ? 0 : this.volume
      this.masterGain.connect(this.ctx.destination)
    }
    // Resume if suspended (browser autoplay policy)
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume()
    }
    return this.ctx
  }

  private getMaster(): GainNode {
    this.getCtx()
    return this.masterGain!
  }

  // ─── Volume & mute ─────────────────────────────────────────────────────────

  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v))
    if (this.masterGain && !this.muted) {
      this.masterGain.gain.value = this.volume
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    if (this.masterGain) {
      this.masterGain.gain.value = muted ? 0 : this.volume
    }
  }

  toggleMute(): boolean {
    this.setMuted(!this.muted)
    return this.muted
  }

  get isMuted(): boolean {
    return this.muted
  }

  // ─── Sound effects ─────────────────────────────────────────────────────────

  /** Short beep when the snake eats food. Pitch rises with score. */
  playEat(score: number): void {
    const ctx = this.getCtx()
    const master = this.getMaster()
    const now = ctx.currentTime

    const baseFreq = 440 + score * 15
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'square'
    osc.frequency.setValueAtTime(baseFreq, now)
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.06)

    gain.gain.setValueAtTime(0.18, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12)

    osc.connect(gain)
    gain.connect(master)

    osc.start(now)
    osc.stop(now + 0.12)
    osc.onended = () => {
      gain.disconnect()
    }
  }

  /** Descending tone on game over. */
  playGameOver(): void {
    const ctx = this.getCtx()
    const master = this.getMaster()
    const now = ctx.currentTime

    const notes = [440, 370, 311, 261]
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const t = now + i * 0.18

      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(freq, t)

      gain.gain.setValueAtTime(0.0, t)
      gain.gain.linearRampToValueAtTime(0.22, t + 0.04)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16)

      osc.connect(gain)
      gain.connect(master)

      osc.start(t)
      osc.stop(t + 0.18)
      osc.onended = () => {
        gain.disconnect()
      }
    })
  }

  /** Soft click when direction changes. */
  playTurn(): void {
    const ctx = this.getCtx()
    const master = this.getMaster()
    const now = ctx.currentTime

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, now)

    gain.gain.setValueAtTime(0.07, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04)

    osc.connect(gain)
    gain.connect(master)

    osc.start(now)
    osc.stop(now + 0.04)
    osc.onended = () => {
      gain.disconnect()
    }
  }

  /** Ascending arpeggio for high score celebration. */
  playHighScore(): void {
    const ctx = this.getCtx()
    const master = this.getMaster()
    const now = ctx.currentTime

    const notes = [261, 329, 392, 523, 659]
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const t = now + i * 0.1

      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, t)

      gain.gain.setValueAtTime(0.15, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12)

      osc.connect(gain)
      gain.connect(master)

      osc.start(t)
      osc.stop(t + 0.15)
      osc.onended = () => {
        gain.disconnect()
      }
    })
  }

  destroy(): void {
    void this.ctx?.close()
    this.ctx = null
    this.masterGain = null
  }
}
