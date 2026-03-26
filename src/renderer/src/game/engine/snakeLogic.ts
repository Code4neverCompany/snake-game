/**
 * Pure snake game logic — no rendering dependencies.
 * All functions are side-effect-free and return new state objects.
 */
import type { Direction, GameEvent, SnakeConfig, SnakeState, TickResult, Vec2 } from './types'

// ─── helpers ────────────────────────────────────────────────────────────────

function vec2(x: number, y: number): Vec2 {
  return { x, y }
}

function vecEq(a: Vec2, b: Vec2): boolean {
  return a.x === b.x && a.y === b.y
}

function delta(dir: Direction): Vec2 {
  switch (dir) {
    case 'up':
      return vec2(0, -1)
    case 'down':
      return vec2(0, 1)
    case 'left':
      return vec2(-1, 0)
    case 'right':
      return vec2(1, 0)
  }
}

/** Returns true when dir and current are not directly opposite. */
function isValidTurn(current: Direction, next: Direction): boolean {
  const opposites: Record<Direction, Direction> = {
    up: 'down',
    down: 'up',
    left: 'right',
    right: 'left'
  }
  return opposites[current] !== next
}

/** Pick a random empty cell for food, avoiding snake segments. */
function spawnFood(config: SnakeConfig, segments: Vec2[], rng = Math.random): Vec2 {
  const total = config.gridWidth * config.gridHeight
  const occupied = new Set(segments.map((s) => s.y * config.gridWidth + s.x))

  // Collect free cells
  const free: number[] = []
  for (let i = 0; i < total; i++) {
    if (!occupied.has(i)) free.push(i)
  }

  if (free.length === 0) {
    // Board is full — place food at head (game will end naturally)
    return segments[0]
  }

  const idx = free[Math.floor(rng() * free.length)]
  return vec2(idx % config.gridWidth, Math.floor(idx / config.gridWidth))
}

// ─── public API ─────────────────────────────────────────────────────────────

/** Create fresh initial state for a new game. */
export function createInitialState(config: SnakeConfig, rng = Math.random): SnakeState {
  const startX = Math.floor(config.gridWidth / 2)
  const startY = Math.floor(config.gridHeight / 2)

  const segments: Vec2[] = []
  for (let i = 0; i < config.initialLength; i++) {
    segments.push(vec2(startX - i, startY))
  }

  const food = spawnFood(config, segments, rng)

  return {
    segments,
    direction: 'right',
    pendingDirections: [],
    food,
    score: 0,
    alive: true,
    tickCount: 0
  }
}

/**
 * Queue a direction change. The direction is validated and ignored if it
 * would immediately reverse the snake. At most 2 pending directions are kept
 * so rapid inputs buffer cleanly without stacking up.
 */
export function queueDirection(state: SnakeState, dir: Direction): SnakeState {
  const pending = state.pendingDirections
  const referenceDir = pending.length > 0 ? pending[pending.length - 1] : state.direction

  if (!isValidTurn(referenceDir, dir)) return state
  if (pending.length >= 2) return state

  // Deduplicate consecutive identical queues
  if (pending.length > 0 && pending[pending.length - 1] === dir) return state

  return { ...state, pendingDirections: [...pending, dir] }
}

/**
 * Advance the game by one tick. Returns new state and a list of events that
 * occurred during this tick. Calling tick on a dead snake is a no-op.
 */
export function tick(state: SnakeState, config: SnakeConfig, rng = Math.random): TickResult {
  if (!state.alive) return { state, events: [] }

  const events: GameEvent[] = []

  // Consume the next pending direction if valid
  let dir = state.direction
  let pendingDirections = state.pendingDirections
  if (pendingDirections.length > 0) {
    const [next, ...rest] = pendingDirections
    if (isValidTurn(dir, next)) {
      dir = next
    }
    pendingDirections = rest
  }

  // Compute new head position
  const d = delta(dir)
  const head = state.segments[0]
  const newHead = vec2(head.x + d.x, head.y + d.y)

  // Wall collision
  if (
    newHead.x < 0 ||
    newHead.x >= config.gridWidth ||
    newHead.y < 0 ||
    newHead.y >= config.gridHeight
  ) {
    const dead: SnakeState = { ...state, alive: false, direction: dir, pendingDirections }
    events.push({ type: 'game_over', score: state.score, cause: 'wall' })
    return { state: dead, events }
  }

  // Self collision — check against all segments except the tail (it will move away)
  const bodyWithoutTail = state.segments.slice(0, state.segments.length - 1)
  if (bodyWithoutTail.some((s) => vecEq(s, newHead))) {
    const dead: SnakeState = { ...state, alive: false, direction: dir, pendingDirections }
    events.push({ type: 'game_over', score: state.score, cause: 'self' })
    return { state: dead, events }
  }

  const ateFood = vecEq(newHead, state.food)

  // Build new segments: prepend head, drop tail unless eating
  const newSegments = ateFood
    ? [newHead, ...state.segments]
    : [newHead, ...state.segments.slice(0, state.segments.length - 1)]

  const newScore = ateFood ? state.score + 1 : state.score
  const newFood = ateFood ? spawnFood(config, newSegments, rng) : state.food

  if (ateFood) {
    events.push({ type: 'food_eaten', position: state.food, newScore })
  }

  events.push({ type: 'moved', head: newHead })

  const newState: SnakeState = {
    segments: newSegments,
    direction: dir,
    pendingDirections,
    food: newFood,
    score: newScore,
    alive: true,
    tickCount: state.tickCount + 1
  }

  return { state: newState, events }
}
