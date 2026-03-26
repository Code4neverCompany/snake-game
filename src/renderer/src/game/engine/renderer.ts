/**
 * PixiJS rendering layer.
 *
 * Owns all display objects and knows how to draw a SnakeState onto the stage.
 * Completely decoupled from game logic — receives state snapshots and renders them.
 */
import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js'
import type { SnakeConfig, SnakeState, Vec2 } from './types'

// ─── Colour palette ──────────────────────────────────────────────────────────

const PALETTE = {
  bg: 0x111111,
  grid: 0x1a1a2e,
  gridLine: 0x16213e,
  snakeHead: 0x4ade80,
  snakeBody: 0x22c55e,
  snakeBorder: 0x166534,
  food: 0xf87171,
  foodGlow: 0xfca5a5,
  textPrimary: 0xffffff,
  textSecondary: 0x9ca3af,
  pauseOverlay: 0x000000
}

const CELL_PADDING = 1 // px gap between cells

export class SnakeRenderer {
  private app: Application
  private config: SnakeConfig

  // Layer containers (drawn in order)
  private gridLayer: Container
  private foodLayer: Container
  private snakeLayer: Container
  private uiLayer: Container

  private cellSize = 0
  private offsetX = 0
  private offsetY = 0

  private scoreText!: Text
  private pauseOverlay!: Graphics
  private pauseText!: Text

  // Reusable graphics objects
  private snakeGraphics!: Graphics
  private foodGraphics!: Graphics
  private foodPulse = 0 // animation counter

  constructor(app: Application, config: SnakeConfig) {
    this.app = app
    this.config = config

    this.gridLayer = new Container()
    this.foodLayer = new Container()
    this.snakeLayer = new Container()
    this.uiLayer = new Container()

    app.stage.addChild(this.gridLayer)
    app.stage.addChild(this.foodLayer)
    app.stage.addChild(this.snakeLayer)
    app.stage.addChild(this.uiLayer)

    this.recalcLayout()
    this.buildGridBackground()
    this.buildSnakeGraphics()
    this.buildFoodGraphics()
    this.buildUI()
  }

  // ─── Layout ────────────────────────────────────────────────────────────────

  private recalcLayout(): void {
    const { gridWidth, gridHeight } = this.config
    const w = this.app.screen.width
    const h = this.app.screen.height

    // Reserve 40px at top for score HUD
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

  // ─── Build static objects ──────────────────────────────────────────────────

  private buildGridBackground(): void {
    const { gridWidth, gridHeight } = this.config
    const bg = new Graphics()

    // Dark board fill
    bg.beginFill(PALETTE.grid)
    bg.drawRect(
      this.offsetX,
      this.offsetY,
      this.cellSize * gridWidth,
      this.cellSize * gridHeight
    )
    bg.endFill()

    // Subtle grid lines
    bg.lineStyle(1, PALETTE.gridLine, 0.5)
    for (let x = 0; x <= gridWidth; x++) {
      const px = this.offsetX + x * this.cellSize
      bg.moveTo(px, this.offsetY)
      bg.lineTo(px, this.offsetY + this.cellSize * gridHeight)
    }
    for (let y = 0; y <= gridHeight; y++) {
      const py = this.offsetY + y * this.cellSize
      bg.moveTo(this.offsetX, py)
      bg.lineTo(this.offsetX + this.cellSize * gridWidth, py)
    }

    this.gridLayer.addChild(bg)
  }

  private buildSnakeGraphics(): void {
    this.snakeGraphics = new Graphics()
    this.snakeLayer.addChild(this.snakeGraphics)
  }

  private buildFoodGraphics(): void {
    this.foodGraphics = new Graphics()
    this.foodLayer.addChild(this.foodGraphics)
  }

  private buildUI(): void {
    const style = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 20,
      fill: PALETTE.textPrimary,
      fontWeight: 'bold'
    })
    this.scoreText = new Text('Score: 0', style)
    this.scoreText.x = 16
    this.scoreText.y = 10
    this.uiLayer.addChild(this.scoreText)

    // Pause overlay (hidden by default)
    this.pauseOverlay = new Graphics()
    this.pauseOverlay.beginFill(PALETTE.pauseOverlay, 0.6)
    this.pauseOverlay.drawRect(0, 0, this.app.screen.width, this.app.screen.height)
    this.pauseOverlay.endFill()
    this.pauseOverlay.visible = false
    this.uiLayer.addChild(this.pauseOverlay)

    const pauseStyle = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 36,
      fill: PALETTE.textPrimary,
      fontWeight: 'bold'
    })
    this.pauseText = new Text('PAUSED', pauseStyle)
    this.pauseText.anchor.set(0.5)
    this.pauseText.x = this.app.screen.width / 2
    this.pauseText.y = this.app.screen.height / 2
    this.pauseText.visible = false
    this.uiLayer.addChild(this.pauseText)
  }

  // ─── Frame rendering ───────────────────────────────────────────────────────

  /** Called every animation frame with the latest game state. */
  render(state: SnakeState, paused: boolean, _interpolation: number): void {
    this.renderSnake(state)
    this.renderFood(state.food)
    this.scoreText.text = `Score: ${state.score}`
    this.pauseOverlay.visible = paused
    this.pauseText.visible = paused
    this.foodPulse = (this.foodPulse + 0.05) % (Math.PI * 2)
  }

  private renderSnake(state: SnakeState): void {
    const g = this.snakeGraphics
    g.clear()
    const p = CELL_PADDING
    const cs = this.cellSize

    state.segments.forEach((seg, i) => {
      const { px, py } = this.cellToScreen(seg)
      const isHead = i === 0
      const color = isHead ? PALETTE.snakeHead : PALETTE.snakeBody

      g.lineStyle(1, PALETTE.snakeBorder, 0.8)
      g.beginFill(color)
      g.drawRoundedRect(px + p, py + p, cs - p * 2, cs - p * 2, isHead ? 4 : 2)
      g.endFill()

      // Eyes on head
      if (isHead) {
        this.drawEyes(g, state.direction, px, py, cs)
      }
    })
  }

  private drawEyes(
    g: Graphics,
    dir: import('./types').Direction,
    px: number,
    py: number,
    cs: number
  ): void {
    const eyeRadius = Math.max(2, cs * 0.08)
    const pupilRadius = Math.max(1, cs * 0.04)

    let eye1: Vec2, eye2: Vec2

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

    for (const eye of [eye1, eye2]) {
      g.lineStyle(0)
      g.beginFill(0xffffff)
      g.drawCircle(eye.x, eye.y, eyeRadius)
      g.endFill()
      g.beginFill(0x111111)
      g.drawCircle(eye.x, eye.y, pupilRadius)
      g.endFill()
    }
  }

  private renderFood(food: Vec2): void {
    const g = this.foodGraphics
    g.clear()

    const { px, py } = this.cellToScreen(food)
    const cs = this.cellSize
    const cx = px + cs / 2
    const cy = py + cs / 2
    const pulse = Math.sin(this.foodPulse)
    const radius = cs * 0.35 + pulse * cs * 0.04

    // Glow
    g.beginFill(PALETTE.foodGlow, 0.2 + pulse * 0.1)
    g.drawCircle(cx, cy, radius + cs * 0.1)
    g.endFill()

    // Food circle
    g.beginFill(PALETTE.food)
    g.drawCircle(cx, cy, radius)
    g.endFill()
  }

  /** Resize renderer when window resizes. */
  resize(): void {
    this.recalcLayout()
    this.gridLayer.removeChildren()
    this.buildGridBackground()

    this.pauseOverlay.clear()
    this.pauseOverlay.beginFill(PALETTE.pauseOverlay, 0.6)
    this.pauseOverlay.drawRect(0, 0, this.app.screen.width, this.app.screen.height)
    this.pauseOverlay.endFill()

    this.pauseText.x = this.app.screen.width / 2
    this.pauseText.y = this.app.screen.height / 2
  }

  destroy(): void {
    this.gridLayer.destroy({ children: true })
    this.foodLayer.destroy({ children: true })
    this.snakeLayer.destroy({ children: true })
    this.uiLayer.destroy({ children: true })
  }
}
