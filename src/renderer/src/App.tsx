import { useCallback, useState } from 'react'
import GameCanvas from './game/GameCanvas'
import './App.css'

type Screen = 'menu' | 'game' | 'gameover'

export default function App(): JSX.Element {
  const [screen, setScreen] = useState<Screen>('menu')
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(0)
  const [isNewHighScore, setIsNewHighScore] = useState(false)

  const handleGameOver = useCallback((finalScore: number, isHS: boolean): void => {
    setScore(finalScore)
    if (isHS) setHighScore(finalScore)
    setIsNewHighScore(isHS)
    setScreen('gameover')
  }, [])

  const handleScoreChange = useCallback((s: number): void => {
    setScore(s)
  }, [])

  const startGame = (): void => {
    setScore(0)
    setIsNewHighScore(false)
    setScreen('game')
  }

  return (
    <div className="app">
      {screen === 'menu' && (
        <div className="menu">
          <h1 className="title">SNAKE</h1>
          <p className="subtitle">Arrow keys / WASD · Gamepad · Swipe</p>
          <p className="subtitle" style={{ fontSize: '0.85rem', opacity: 0.6 }}>
            Press Esc or P to pause
          </p>
          {highScore > 0 && <p className="score">Best: {highScore}</p>}
          <button className="btn-start" onClick={startGame}>
            Start Game
          </button>
        </div>
      )}

      {screen === 'game' && (
        <GameCanvas
          onGameOver={handleGameOver}
          onScoreChange={handleScoreChange}
          highScore={highScore}
        />
      )}

      {screen === 'gameover' && (
        <div className="menu">
          <h1 className="title">GAME OVER</h1>
          <p className="score">Score: {score}</p>
          {isNewHighScore && score > 0 && (
            <p className="subtitle" style={{ color: '#4ade80' }}>
              ✦ New High Score! ✦
            </p>
          )}
          <button className="btn-start" onClick={startGame}>
            Play Again
          </button>
          <button className="btn-menu" onClick={() => setScreen('menu')}>
            Main Menu
          </button>
        </div>
      )}
    </div>
  )
}
