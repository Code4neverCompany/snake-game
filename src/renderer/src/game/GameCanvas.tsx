import { useCallback, useEffect, useRef, useState } from 'react'
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

    // Native Canvas2D — no WebGL/GPU required.
    const canvas = document.createElement('canvas')
    canvas.width = containerW
    canvas.height = containerH
    canvas.style.width = `${containerW}px`
    canvas.style.height = `${containerH}px`
    containerRef.current.appendChild(canvas)

    const renderer = new SnakeRenderer(canvas, config)

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
            setTimeout(() => onGameOver(event.score, isHS), 800)
          }
        }
      },
      onRender: (interpolation) => {
        renderer.render(state, paused, interpolation)
      }
    })
    loop.start()

    // Resize handler
    const handleResize = (): void => {
      if (!containerRef.current) return
      const w = containerRef.current.clientWidth
      const h = containerRef.current.clientHeight
      canvas.width = w
      canvas.height = h
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
      canvas.remove()
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
