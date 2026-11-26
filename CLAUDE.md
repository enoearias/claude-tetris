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

All logic lives in `game.js` (sectioned by comment banners) as top-level functions sharing module-level mutable state (`board`, `current`, `queue`, `hold`, `score`, `lines`, `level`, `combo`, `b2b`, `energy`, `mode`, `gameTime`, `paused`, `gameOver`, `menu`, ...). `init(mode)` resets everything and starts a game; the page boots into the mode menu (`showModeMenu()`), and game over/victory re-shows it via `endGame(title, win)`.

Key conventions spanning multiple functions:

- **Cell values = piece type = color index.** `PIECES[type]` matrices store `type` in filled cells; `merge()` copies them into `board`, `drawBlock()` looks them up in `COLORS`/`COLORS_LIGHT`. Keep `PIECES`, `COLORS`, `COLORS_LIGHT`, `PIECE_WEIGHTS` index-aligned. Types: 1–7 tetrominoes, 8 `NUT` (3×3 ring; `drawNutHole()` draws its circle), 9 `+`, 10 U, 11 Y, 12 `SINGLE` (1×1, only given as reward after a Tetris), 13 `GARBAGE` and 14 `WILD` (board-only, `PIECES` entry is `null`, weight 0). `WILD` is drawn as a rainbow gradient.
- **Pieces** are `{ type, shape, power, x, y }` built by `makePiece()`. `power` (key of `POWERS`) is set on a queued piece every `LINES_PER_POWER` lines by `grantPower()` and applied in `applyPower()` after `merge()`, before `clearLines()`.
- **Queue:** `queue` (≥ `QUEUE_SIZE`) replaces a single `next`; `queue[0]` is the next piece. `spawn()` shifts it and refills. `drawPreviews()` redraws next/hold/queue canvases — call it whenever `queue` or `hold` changes.
- **Rotation** = `rotateCW()`/`rotateCCW()`; `tryRotate(dir)` applies horizontal kicks `[0,-1,1,-2,2]` (not SRS), flips `dir` when `rotationInverted()`, and sets `lastMoveRotate` (used by `isTSpin()`). Any move/drop clears it.
- **Piece lifecycle:** gravity in `loop()` / `softDrop()` / `hardDrop()` → `lockPiece()` (saves `snapshot` for the Undo ability) → `merge()` → `applyPower()` → `clearLines(tspin)` (all scoring: combo multiplier, T-spin, B2B, perfect clear, wildcards, energy, level/`dropInterval`, Tetris reward, power grants, effects/sfx) → `checkObjective()` (mode victory) → `spawn()`.
- **Time:** every timer (sprint clock, garbage rows, freeze, slow, floating texts/flashes) uses `gameTime`, which only advances in `loop()`, so pause/menus stop them. Don't use `performance.now()` for game timers.
- **Game loop:** `requestAnimationFrame`; `loop()` returns early when `paused || gameOver`, `resume()` restarts it. Game over can trigger inside `loop()`/`lockPiece()`/`tickMode()` — check `gameOver` after those calls.
- **Overlay** (`showOverlay({...})`) is shared by mode menu, pause, ability menu (`menu === 'abilities'`) and game over. Mode/ability buttons are generated from `MODES`/`ABILITIES`.
- **HUD** is DOM, refreshed by `updateHUD()` every frame and after each keydown.
- **Sound:** `sfx(name)` synthesizes WebAudio tones (no assets); mute persisted in `localStorage` like the theme.

## Coupled constants

`COLS × BLOCK` and `ROWS × BLOCK` must match the `<canvas id="board">` `width`/`height` in `index.html` (currently 300×600). Level speed formula: `max(100, 1000 − (level − 1) × 90)` ms, duplicated as the initial `1000` in `init()`.
