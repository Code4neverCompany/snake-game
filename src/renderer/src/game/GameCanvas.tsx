import { useCallback, useEffect, useRef, useState } from 'react'
import { Application } from 'pixi.js'
import { DEFAULT_CONFIG } from './engine/types'
import { createInitialState, queueDirection, tick } from './engine/snakeLogic'
import { GameLoop } from './engine/gameLoop'
import { InputHandler } from './engine/inputHandler'
import { SnakeRenderer } from './engine/renderer'
import { AudioSystem } from './engine/audio'
import type { SnakeState } from './engine/types'

interface GameCanvasProps {
  onGameOver: (score: number, isHighScore: boolean) => void
  onScoreChange: (score: number) => void
  highScore: number
}

export default function GameCanvas({
  onGameOver,
  onScoreChange,
  highScore
}: GameCanvasProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const [muted, setMuted] = useState(false)
  const audioRef = useRef<AudioSystem | null>(null)

  const handleMuteToggle = useCallback(() => {
    if (audioRef.current) {
      const nowMuted = audioRef.current.toggleMute()
      setMuted(nowMuted)
    }
  }, [])

  useEffect(() => {
    if (!containerRef.current) return

    const config = { ...DEFAULT_CONFIG }
    let state: SnakeState = createInitialState(config)
    let paused = false
    let gameOverFired = false

    const audio = new AudioSystem()
    audioRef.current = audio

    const containerW = containerRef.current.clientWidth || 800
    const containerH = containerRef.current.clientHeight || 600

    // PixiJS application — forceCanvas bypasses WebGL (unavailable without GPU).
    // Stop the auto-render ticker so we drive rendering manually from the game loop,
    // which prevents double-render and ensures state is always current when drawn.
    const app = new Application({
      width: containerW,
      height: containerH,
      backgroundColor: 0x111111,
      antialias: false,
      resolution: 1,
      autoDensity: false,
      forceCanvas: true
    })
    app.ticker.stop()

    const canvas = app.view as HTMLCanvasElement
    canvas.style.width = `${containerW}px`
    canvas.style.height = `${containerH}px`
    containerRef.current.appendChild(canvas)

    // Rendering layer
    const renderer = new SnakeRenderer(app, config)

    // Input system
    const input = new InputHandler({
      onDirection: (dir) => {
        if (!state.alive || paused) return
        const prev = state.direction
        state = queueDirection(state, dir)
        if (state.pendingDirections.length > 0 || state.direction !== prev) {
          audio.playTurn()
        }
      },
      onPause: () => {
        if (!state.alive) return
        paused = !paused
        if (paused) loop.pause()
        else loop.resume()
      }
    })
    input.attach()

    // Fixed-timestep game loop
    const loop = new GameLoop({
      ticksPerSecond: config.ticksPerSecond,
      onTick: () => {
        if (!state.alive || gameOverFired) return
        const result = tick(state, config)
        state = result.state

        for (const event of result.events) {
          if (event.type === 'food_eaten') {
            audio.playEat(event.newScore)
            onScoreChange(event.newScore)
          }
          if (event.type === 'game_over') {
            gameOverFired = true
            loop.stop()
            const isHS = event.score > highScore
            if (isHS) {
              audio.playHighScore()
            } else {
              audio.playGameOver()
            }
            // Small delay so the death frame renders before transitioning
            setTimeout(() => onGameOver(event.score, isHS), 800)
          }
        }
      },
      onRender: (interpolation) => {
        renderer.render(state, paused, interpolation)
        // Explicitly flush the stage to the canvas — required when the PixiJS
        // auto-render ticker is stopped (we drive rendering from the game loop).
        app.renderer.render(app.stage)
      }
    })
    loop.start()

    // Resize handler
    const handleResize = (): void => {
      if (!containerRef.current) return
      const w = containerRef.current.clientWidth
      const h = containerRef.current.clientHeight
      app.renderer.resize(w, h)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      renderer.resize()
    }
    window.addEventListener('resize', handleResize)

    return () => {
      loop.stop()
      input.detach()
      window.removeEventListener('resize', handleResize)
      renderer.destroy()
      app.destroy(true, { children: true })
      audio.destroy()
      audioRef.current = null
    }
  }, [onGameOver, onScoreChange, highScore])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      />
      <button
        onClick={handleMuteToggle}
        title={muted ? 'Unmute' : 'Mute'}
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          background: 'rgba(0,0,0,0.5)',
          border: '1px solid #374151',
          borderRadius: 4,
          color: '#9ca3af',
          cursor: 'pointer',
          fontSize: '1rem',
          padding: '4px 8px',
          lineHeight: 1
        }}
      >
        {muted ? '🔇' : '🔊'}
      </button>
    </div>
  )
}
