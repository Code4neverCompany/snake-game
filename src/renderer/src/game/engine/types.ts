export type Direction = 'up' | 'down' | 'left' | 'right'

export interface Vec2 {
  readonly x: number
  readonly y: number
}

export interface SnakeConfig {
  gridWidth: number
  gridHeight: number
  initialLength: number
  ticksPerSecond: number
}

export const DEFAULT_CONFIG: SnakeConfig = {
  gridWidth: 20,
  gridHeight: 20,
  initialLength: 3,
  ticksPerSecond: 8
}

export interface SnakeState {
  /** Body segments — index 0 is the head */
  segments: Vec2[]
  direction: Direction
  /** Next direction queued by input, consumed on next tick */
  pendingDirections: Direction[]
  food: Vec2
  score: number
  alive: boolean
  tickCount: number
}

export type GameEvent =
  | { type: 'food_eaten'; position: Vec2; newScore: number }
  | { type: 'game_over'; score: number; cause: 'wall' | 'self' }
  | { type: 'moved'; head: Vec2 }

export interface TickResult {
  state: SnakeState
  events: GameEvent[]
}
