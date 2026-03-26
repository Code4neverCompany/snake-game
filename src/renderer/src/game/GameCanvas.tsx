import { useEffect, useRef } from 'react'
import { Application, Graphics } from 'pixi.js'

interface GameCanvasProps {
  onGameOver: (score: number) => void
}

/**
 * GameCanvas mounts a PixiJS Application into a div and runs the snake game loop.
 * The full game logic is implemented in NEV-8; this stub confirms PixiJS loads correctly.
 */
export default function GameCanvas({ onGameOver }: GameCanvasProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const appRef = useRef<Application | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const app = new Application({
      width: 800,
      height: 600,
      backgroundColor: 0x111111,
      antialias: false,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true
    })

    containerRef.current.appendChild(app.view as HTMLCanvasElement)
    appRef.current = app

    // Placeholder: draw a green rectangle to confirm PixiJS is wired up
    const rect = new Graphics()
    rect.beginFill(0x4ade80)
    rect.drawRect(10, 10, 40, 40)
    rect.endFill()
    app.stage.addChild(rect)

    // TODO (NEV-8): replace placeholder with full snake game loop
    void onGameOver // referenced to satisfy linter until NEV-8 wires it up

    return () => {
      app.destroy(true, { children: true })
      appRef.current = null
    }
  }, [onGameOver])

  return (
    <div
      ref={containerRef}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    />
  )
}
