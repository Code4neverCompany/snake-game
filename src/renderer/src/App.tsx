import { useState } from 'react'
import GameCanvas from './game/GameCanvas'
import './App.css'

type Screen = 'menu' | 'game' | 'gameover'

export default function App(): JSX.Element {
  const [screen, setScreen] = useState<Screen>('menu')
  const [score, setScore] = useState(0)

  const handleGameOver = (finalScore: number): void => {
    setScore(finalScore)
    setScreen('gameover')
  }

  return (
    <div className="app">
      {screen === 'menu' && (
        <div className="menu">
          <h1 className="title">SNAKE</h1>
          <p className="subtitle">Use arrow keys or WASD to move</p>
          <button className="btn-start" onClick={() => setScreen('game')}>
            Start Game
          </button>
        </div>
      )}

      {screen === 'game' && (
        <GameCanvas onGameOver={handleGameOver} />
      )}

      {screen === 'gameover' && (
        <div className="menu">
          <h1 className="title">GAME OVER</h1>
          <p className="score">Score: {score}</p>
          <button className="btn-start" onClick={() => setScreen('game')}>
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
