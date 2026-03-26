/**
 * Input system — keyboard, mouse (swipe-style), and gamepad.
 *
 * Provides a single `InputHandler` class that translates raw browser events
 * into Direction values and calls a provided callback.
 */
import type { Direction } from './types'

export type DirectionCallback = (dir: Direction) => void
export type PauseCallback = () => void

interface InputHandlerOptions {
  onDirection: DirectionCallback
  onPause: PauseCallback
}

// ─── Keyboard ────────────────────────────────────────────────────────────────

const KEY_MAP: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  s: 'down',
  a: 'left',
  d: 'right',
  W: 'up',
  S: 'down',
  A: 'left',
  D: 'right'
}

const PAUSE_KEYS = new Set(['Escape', 'p', 'P', 'Enter'])

// ─── Gamepad ─────────────────────────────────────────────────────────────────

const AXIS_DEAD_ZONE = 0.4

/** Gamepad button indices (standard mapping). */
const GP_UP = 12
const GP_DOWN = 13
const GP_LEFT = 14
const GP_RIGHT = 15
const GP_START = 9 // "Start" / "Menu"
const GP_PAUSE = 8 // "Select" / "Back"

// ─── Touch / Mouse swipe ─────────────────────────────────────────────────────

const MIN_SWIPE_PX = 30

export class InputHandler {
  private onDirection: DirectionCallback
  private onPause: PauseCallback

  private keydownListener: (e: KeyboardEvent) => void
  private touchStartListener: (e: TouchEvent) => void
  private touchEndListener: (e: TouchEvent) => void

  private touchStartX = 0
  private touchStartY = 0

  private gamepadPollId: number | null = null
  private prevGpButtons: boolean[] = []

  constructor(options: InputHandlerOptions) {
    this.onDirection = options.onDirection
    this.onPause = options.onPause

    this.keydownListener = this.handleKeydown.bind(this)
    this.touchStartListener = this.handleTouchStart.bind(this)
    this.touchEndListener = this.handleTouchEnd.bind(this)
  }

  /** Attach all listeners. Call once when the game starts. */
  attach(): void {
    window.addEventListener('keydown', this.keydownListener)
    window.addEventListener('touchstart', this.touchStartListener, { passive: true })
    window.addEventListener('touchend', this.touchEndListener, { passive: true })
    this.startGamepadPoll()
  }

  /** Remove all listeners. Call on cleanup. */
  detach(): void {
    window.removeEventListener('keydown', this.keydownListener)
    window.removeEventListener('touchstart', this.touchStartListener)
    window.removeEventListener('touchend', this.touchEndListener)
    this.stopGamepadPoll()
  }

  // ─── Keyboard ──────────────────────────────────────────────────────────────

  private handleKeydown(e: KeyboardEvent): void {
    if (PAUSE_KEYS.has(e.key)) {
      e.preventDefault()
      this.onPause()
      return
    }

    const dir = KEY_MAP[e.key]
    if (dir) {
      e.preventDefault()
      this.onDirection(dir)
    }
  }

  // ─── Touch / swipe ─────────────────────────────────────────────────────────

  private handleTouchStart(e: TouchEvent): void {
    const t = e.touches[0]
    this.touchStartX = t.clientX
    this.touchStartY = t.clientY
  }

  private handleTouchEnd(e: TouchEvent): void {
    const t = e.changedTouches[0]
    const dx = t.clientX - this.touchStartX
    const dy = t.clientY - this.touchStartY
    const absDx = Math.abs(dx)
    const absDy = Math.abs(dy)

    if (Math.max(absDx, absDy) < MIN_SWIPE_PX) return

    if (absDx > absDy) {
      this.onDirection(dx > 0 ? 'right' : 'left')
    } else {
      this.onDirection(dy > 0 ? 'down' : 'up')
    }
  }

  // ─── Gamepad ───────────────────────────────────────────────────────────────

  private startGamepadPoll(): void {
    const poll = (): void => {
      this.pollGamepad()
      this.gamepadPollId = requestAnimationFrame(poll)
    }
    this.gamepadPollId = requestAnimationFrame(poll)
  }

  private stopGamepadPoll(): void {
    if (this.gamepadPollId !== null) {
      cancelAnimationFrame(this.gamepadPollId)
      this.gamepadPollId = null
    }
  }

  private pollGamepad(): void {
    const gamepads = navigator.getGamepads?.() ?? []
    const gp = gamepads[0]
    if (!gp) return

    const buttons = gp.buttons.map((b) => b.pressed)

    const justPressed = (idx: number): boolean =>
      buttons[idx] && !(this.prevGpButtons[idx] ?? false)

    if (justPressed(GP_UP)) this.onDirection('up')
    else if (justPressed(GP_DOWN)) this.onDirection('down')
    else if (justPressed(GP_LEFT)) this.onDirection('left')
    else if (justPressed(GP_RIGHT)) this.onDirection('right')

    if (justPressed(GP_START) || justPressed(GP_PAUSE)) this.onPause()

    // Left analogue stick (axes 0 = horizontal, 1 = vertical)
    const ax = gp.axes[0] ?? 0
    const ay = gp.axes[1] ?? 0
    if (Math.abs(ax) > AXIS_DEAD_ZONE || Math.abs(ay) > AXIS_DEAD_ZONE) {
      // Only emit once per stick movement using a simple edge detection
      const stickActive = this.prevGpButtons[100] ?? false
      if (!stickActive) {
        if (Math.abs(ax) > Math.abs(ay)) {
          this.onDirection(ax > 0 ? 'right' : 'left')
        } else {
          this.onDirection(ay > 0 ? 'down' : 'up')
        }
        buttons[100] = true
      } else {
        buttons[100] = true
      }
    } else {
      buttons[100] = false
    }

    this.prevGpButtons = buttons
  }
}
