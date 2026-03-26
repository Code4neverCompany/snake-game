# Snake Game

Modern Snake game for PC built with Electron + PixiJS + React + TypeScript.

## Stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | [Electron](https://www.electronjs.org/) via [electron-vite](https://electron-vite.org/) |
| Game renderer | [PixiJS](https://pixijs.com/) (WebGL/Canvas 2D) |
| UI / menus | [React](https://react.dev/) 18 |
| Language | TypeScript 5 |
| Build | Vite 5 |

## Prerequisites

- Node.js 18+ (LTS recommended)
- npm 9+

## Setup

```bash
npm install
```

## Development

```bash
npm run dev
```

Electron opens with hot-reload enabled. Changes to renderer code refresh instantly; changes to main/preload trigger an Electron restart.

## Build

```bash
npm run build
```

Output goes to `out/`.

## Lint & Format

```bash
npm run lint      # ESLint
npm run format    # Prettier
npm run typecheck # tsc --noEmit
```

## Project Structure

```
src/
  main/        Electron main process (Node.js)
  preload/     Context-bridge preload script
  renderer/    Vite + React frontend
    src/
      game/    PixiJS game canvas & loop
      App.tsx  Root React component (menu/game/gameover screens)
```
