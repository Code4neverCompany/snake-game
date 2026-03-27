/**
 * Native Canvas2D rendering layer.
 *
 * Replaces the PixiJS renderer with direct Canvas2D calls so the game works
 * in environments without WebGL / GPU acceleration (e.g. no-GPU Electron on WSL).
 * Public interface is identical to the old PixiJS renderer — GameCanvas.tsx is unchanged.
 */
import type { Direction, SnakeConfig, SnakeState, Vec2 } from './types'

// ─── Colour palette ──────────────────────────────────────────────────────────

const PALETTE = {
  bg: '#111111',
  grid: '#1a1a2e',
  gridLine: '#16213e',
  snakeHead: '#4ade80',
  snakeBody: '#22c55e',
  snakeBorder: '#166534',
  food: '#f87171',
  foodGlow: 'rgba(252,165,165,',
  textPrimary: '#ffffff',
  textSecondary: '#9ca3af'
}

const CELL_PADDING = 1

export class SnakeRenderer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private config: SnakeConfig

  private cellSize = 0
  private offsetX = 0
  private offsetY = 0
  private foodPulse = 0

  constructor(canvas: HTMLCanvasElement, config: SnakeConfig) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.config = config
    this.recalcLayout()
  }

  // ─── Layout ──────────────────────────────────────────────────────────────

  private recalcLayout(): void {
    const { gridWidth, gridHeight } = this.config
    const w = this.canvas.width
    const h = this.canvas.height
    const playH = h - 40
    const cellW = Math.floor(w / gridWidth)
    const cellH = Math.floor(playH / gridHeight)
    this.cellSize = Math.min(cellW, cellH)
    this.offsetX = Math.floor((w - this.cellSize * gridWidth) / 2)
    this.offsetY = 40 + Math.floor((playH - this.cellSize * gridHeight) / 2)
  }

  private cellToScreen(v: Vec2): { px: number; py: number } {
    return {
      px: this.offsetX + v.x * this.cellSize,
      py: this.offsetY + v.y * this.cellSize
    }
  }

  // ─── Frame rendering ────────────────────────────────────────────────────

  render(state: SnakeState, paused: boolean, _interpolation: number): void {
    const { ctx, canvas } = this
    const w = canvas.width
    const h = canvas.height

    // Background
    ctx.fillStyle = PALETTE.bg
    ctx.fillRect(0, 0, w, h)

    // Grid fill
    ctx.fillStyle = PALETTE.grid
    ctx.fillRect(
      this.offsetX,
      this.offsetY,
      this.cellSize * this.config.gridWidth,
      this.cellSize * this.config.gridHeight
    )

    // Grid lines
    ctx.save()
    ctx.globalAlpha = 0.5
    ctx.strokeStyle = PALETTE.gridLine
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let x = 0; x <= this.config.gridWidth; x++) {
      const px = this.offsetX + x * this.cellSize
      ctx.moveTo(px, this.offsetY)
      ctx.lineTo(px, this.offsetY + this.cellSize * this.config.gridHeight)
    }
    for (let y = 0; y <= this.config.gridHeight; y++) {
      const py = this.offsetY + y * this.cellSize
      ctx.moveTo(this.offsetX, py)
      ctx.lineTo(this.offsetX + this.cellSize * this.config.gridWidth, py)
    }
    ctx.stroke()
    ctx.restore()

    // Food first so snake head overlaps it on collision
    this.renderFood(state.food)
    this.renderSnake(state)

    // Score HUD
    ctx.fillStyle = PALETTE.textPrimary
    ctx.font = 'bold 20px monospace'
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'left'
    ctx.fillText(`Score: ${state.score}`, 16, 20)

    // Pause overlay
    if (paused) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)'
      ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = PALETTE.textPrimary
      ctx.font = 'bold 36px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('PAUSED', w / 2, h / 2)
    }

    this.foodPulse = (this.foodPulse + 0.05) % (Math.PI * 2)
  }

  private renderSnake(state: SnakeState): void {
    const { ctx } = this
    const p = CELL_PADDING
    const cs = this.cellSize
    const cornerR = Math.max(2, cs * 0.15)

    state.segments.forEach((seg, i) => {
      const { px, py } = this.cellToScreen(seg)
      const isHead = i === 0
      ctx.fillStyle = isHead ? PALETTE.snakeHead : PALETTE.snakeBody
      ctx.strokeStyle = PALETTE.snakeBorder
      ctx.lineWidth = 1
      this.roundRect(px + p, py + p, cs - p * 2, cs - p * 2, cornerR)
      if (isHead) {
        this.drawEyes(state.direction, px, py, cs)
      }
    })
  }

  private roundRect(x: number, y: number, w: number, h: number, r: number): void {
    const { ctx } = this
    const safe = Math.min(r, w / 2, h / 2)
    ctx.beginPath()
    ctx.moveTo(x + safe, y)
    ctx.lineTo(x + w - safe, y)
    ctx.arcTo(x + w, y, x + w, y + safe, safe)
    ctx.lineTo(x + w, y + h - safe)
    ctx.arcTo(x + w, y + h, x + w - safe, y + h, safe)
    ctx.lineTo(x + safe, y + h)
    ctx.arcTo(x, y + h, x, y + h - safe, safe)
    ctx.lineTo(x, y + safe)
    ctx.arcTo(x, y, x + safe, y, safe)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }

  private drawEyes(dir: Direction, px: number, py: number, cs: number): void {
    const { ctx } = this
    const er = Math.max(2, cs * 0.08)
    const pr = Math.max(1, cs * 0.04)

    let eye1: Vec2
    let eye2: Vec2
    switch (dir) {
      case 'right':
        eye1 = { x: px + cs * 0.75, y: py + cs * 0.3 }
        eye2 = { x: px + cs * 0.75, y: py + cs * 0.7 }
        break
      case 'left':
        eye1 = { x: px + cs * 0.25, y: py + cs * 0.3 }
        eye2 = { x: px + cs * 0.25, y: py + cs * 0.7 }
        break
      case 'up':
        eye1 = { x: px + cs * 0.3, y: py + cs * 0.25 }
        eye2 = { x: px + cs * 0.7, y: py + cs * 0.25 }
        break
      case 'down':
        eye1 = { x: px + cs * 0.3, y: py + cs * 0.75 }
        eye2 = { x: px + cs * 0.7, y: py + cs * 0.75 }
        break
    }

    for (const eye of [eye1!, eye2!]) {
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(eye.x, eye.y, er, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#111111'
      ctx.beginPath()
      ctx.arc(eye.x, eye.y, pr, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  private renderFood(food: Vec2): void {
    const { ctx } = this
    const { px, py } = this.cellToScreen(food)
    const cs = this.cellSize
    const cx = px + cs / 2
    const cy = py + cs / 2
    const pulse = Math.sin(this.foodPulse)
    const radius = cs * 0.35 + pulse * cs * 0.04

    // Glow ring
    ctx.fillStyle = `${PALETTE.foodGlow}${(0.2 + pulse * 0.1).toFixed(2)})`
    ctx.beginPath()
    ctx.arc(cx, cy, radius + cs * 0.1, 0, Math.PI * 2)
    ctx.fill()

    // Food dot
    ctx.fillStyle = PALETTE.food
    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.fill()
  }

  resize(): void {
    this.recalcLayout()
  }

  destroy(): void {
    // Nothing to clean up — canvas lifetime is managed by GameCanvas
  }
}
