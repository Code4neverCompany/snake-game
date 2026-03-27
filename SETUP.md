# Snake Game — Setup & Troubleshooting

## Environment

- **Host**: Windows with WSL2 (Ubuntu)
- **Build tool**: electron-vite + electron-builder
- **Runtime**: Electron 31 — Windows exe from `dist/win-unpacked/`
- **Renderer**: React 18 + native Canvas2D (no WebGL / GPU required)

---

## Build & Run

```bash
# Install dependencies
npm install

# Dev (Electron window with hot reload)
npm run dev

# Production build (no packaging)
npm run build

# Package for Windows
npm run build && npx electron-builder --win

# Package for Linux
npm run build && npx electron-builder --linux
```

Distributables end up in `dist/`:

| Platform | File |
|---|---|
| Windows (portable) | `dist/win-unpacked/Snake.exe` |
| Windows (zip) | `dist/Snake-0.1.0-win.zip` |
| Linux | `dist/Snake-0.1.0.AppImage` |

### Launch from WSL

```powershell
Start-Process "\\wsl.localhost\Ubuntu\<absolute-path-to-repo>\dist\win-unpacked\Snake.exe"
```

---

## Known Issues & Fixes

### GPU process crash — window never appears

**Symptom**: `Snake.exe` process starts in Task Manager but no window appears.

**Root cause**: Electron's GPU subprocess fails to launch (`error_code=18`) on
machines without hardware GPU access (VMs, WSL-hosted builds, restricted
environments). This kills the renderer process before the window can show.

**Fix** already applied in `src/main/index.ts`:

```typescript
app.commandLine.appendSwitch('no-sandbox')    // allow subprocesses in restricted envs
app.commandLine.appendSwitch('disable-gpu')   // use Chromium software rasterizer
app.disableHardwareAcceleration()             // belt-and-suspenders
```

These three lines must appear **before** `app.whenReady()`.

---

### Black game canvas after clicking Start

**Symptom**: App opens fine, menu is visible, but the game canvas is black
after clicking Start Game.

**Root cause**: PixiJS v7 with `forceCanvas: true` initialises its Canvas
renderer without error but never actually paints to the canvas in a no-GPU
Electron environment.

**Fix** already applied: PixiJS removed from the rendering path entirely.
`renderer.ts` uses native `CanvasRenderingContext2D` directly. `GameCanvas.tsx`
creates a plain `<canvas>` element.

- Canvas2D works everywhere — no GPU, WebGL, or special flags needed
- Bundle size: ~1.3 MB → ~240 kB (PixiJS no longer bundled)

---

### `electron-builder` not found

Use `npx electron-builder` — the binary is not in `PATH` by default.

---

## Architecture Notes

```
src/
  main/index.ts          — Electron main process (window creation, GPU flags)
  preload/index.ts       — Electron preload bridge
  renderer/src/
    App.tsx              — Screen state machine (menu / game / gameover)
    game/
      GameCanvas.tsx     — Mounts canvas, owns game loop lifecycle
      engine/
        types.ts         — SnakeConfig, SnakeState, Direction, Vec2
        snakeLogic.ts    — Pure game logic (tick, queueDirection)
        gameLoop.ts      — Fixed-timestep RAF loop
        inputHandler.ts  — Keyboard + gamepad + touch input
        renderer.ts      — Canvas2D renderer (grid, snake, food, HUD)
        audio.ts         — Web Audio API sound effects
```
