/**
 * Fixed-timestep game loop using requestAnimationFrame.
 *
 * The loop accumulates elapsed time and calls onTick() at a fixed interval
 * regardless of frame rate. onRender() receives an interpolation factor
 * [0, 1] so renderers can interpolate between ticks for smooth display.
 */
export interface GameLoopOptions {
  ticksPerSecond: number
  onTick: () => void
  onRender: (interpolation: number) => void
}

export class GameLoop {
  private tickInterval: number
  private onTick: () => void
  private onRender: (alpha: number) => void

  private rafId: number | null = null
  private lastTime: number | null = null
  private accumulator = 0
  private running = false
  private paused = false

  constructor(options: GameLoopOptions) {
    this.tickInterval = 1000 / options.ticksPerSecond
    this.onTick = options.onTick
    this.onRender = options.onRender
  }

  get isRunning(): boolean {
    return this.running
  }

  get isPaused(): boolean {
    return this.paused
  }

  /** Update ticks-per-second without stopping the loop. */
  setTicksPerSecond(tps: number): void {
    this.tickInterval = 1000 / tps
  }

  start(): void {
    if (this.running) return
    this.running = true
    this.paused = false
    this.lastTime = null
    this.accumulator = 0
    this.rafId = requestAnimationFrame(this.loop)
  }

  stop(): void {
    this.running = false
    this.paused = false
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }

  pause(): void {
    if (!this.running || this.paused) return
    this.paused = true
    // Don't cancel RAF — we still render the paused frame
  }

  resume(): void {
    if (!this.running || !this.paused) return
    this.paused = false
    this.lastTime = null // Reset timing to avoid a huge accumulated delta
    this.accumulator = 0
  }

  private loop = (timestamp: number): void => {
    if (!this.running) return

    if (this.lastTime === null) {
      this.lastTime = timestamp
    }

    if (!this.paused) {
      const elapsed = timestamp - this.lastTime
      this.accumulator += elapsed

      // Cap accumulator to avoid spiral of death after tab becomes active
      const maxAccumulator = this.tickInterval * 5
      if (this.accumulator > maxAccumulator) {
        this.accumulator = maxAccumulator
      }

      while (this.accumulator >= this.tickInterval) {
        this.onTick()
        this.accumulator -= this.tickInterval
      }
    }

    this.lastTime = timestamp
    const interpolation = this.paused ? 0 : this.accumulator / this.tickInterval
    this.onRender(interpolation)

    this.rafId = requestAnimationFrame(this.loop)
  }
}
