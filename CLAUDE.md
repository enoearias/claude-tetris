# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Vanilla JS Tetris on HTML5 Canvas. No dependencies, no `package.json`, no build, no tests, no linter. UI text and README are in Spanish — keep new user-facing strings in Spanish.

## Running

Open `index.html` directly, or serve statically (preferred):

```bash
python -m http.server 8000   # then http://localhost:8000
```

## Architecture

All logic lives in `game.js` as top-level functions sharing module-level mutable state (`board`, `current`, `next`, `score`, `lines`, `level`, `paused`, `gameOver`, `dropInterval`, `animId`, ...). `init()` resets everything and is also the restart handler.

Key conventions spanning multiple functions:

- **Cell values = piece type = color index.** `PIECES[type]` matrices store `type` (1–7) in filled cells; `merge()` copies those values into `board`, and `drawBlock()` looks them up in `COLORS`. Adding/reordering pieces requires keeping `PIECES` and `COLORS` indices aligned (`randomPiece()` uses `PIECES.length - 1`). Type 8 = `NUT` (3×3 ring with empty center; `drawNutHole()` draws its circle while falling/preview — once locked the center is a real empty cell).
- **Rotation** = `rotateCW()` on the square shape matrix; `tryRotate()` applies simple horizontal kicks `[0,-1,1,-2,2]` (not SRS).
- **Piece lifecycle:** gravity in `loop()` / `softDrop()` / `hardDrop()` → `lockPiece()` → `merge()` → `clearLines()` (updates score/level/`dropInterval`) → `spawn()` (promotes `next`, game over if spawn collides).
- **Game loop:** `requestAnimationFrame` with a `dropAccum` time accumulator. Pause/game over work by `cancelAnimationFrame(animId)`; unpause restarts via `loop(performance.now())`. `endGame()` cancels the pending frame, but since game over is usually triggered from inside `loop()` (whose frame is already running), `loop()` itself returns early when `gameOver` is set instead of scheduling another frame.
- **HUD** is DOM (`#score`, `#lines`, `#level`); `updateHUD()` runs after every keydown. Next-piece preview is a separate 120×120 canvas drawn by `drawNext()` on spawn.

## Coupled constants

`COLS × BLOCK` and `ROWS × BLOCK` must match the `<canvas id="board">` `width`/`height` in `index.html` (currently 300×600). Level speed formula: `max(100, 1000 − (level − 1) × 90)` ms, duplicated as the initial `1000` in `init()`.
