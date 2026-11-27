'use strict';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

// ---- Tipos de celda (tipo de pieza = índice de color) ----
const NUT = 8;      // tuerca 3×3 con hueco central (reto)
const PLUS = 9;     // pentominó +
const U_PIECE = 10; // pentominó U
const Y_PIECE = 11; // pentominó Y
const SINGLE = 12;  // 1×1, premio tras un Tetris
const GARBAGE = 13; // bloque gris (modos Basura y Tablero fijo), nunca cae como pieza
const WILD = 14;    // comodín (power-up Tinte), nunca cae como pieza

const COLORS = [
  null,
  '#4dd0e1', // I - cyan
  '#ffd54f', // O - yellow
  '#ba68c8', // T - purple
  '#81c784', // S - green
  '#e57373', // Z - red
  '#90caf9', // J - azul pálido
  '#ffb74d', // L - orange
  '#b0bec5', // N - tuerca (gris metálico)
  '#f06292', // + - rosa
  '#aed581', // U - lima
  '#4db6ac', // Y - verde azulado
  '#fff59d', // single - amarillo claro
  '#5c6070', // basura
  '#ffffff', // comodín (se pinta con degradado arcoíris)
];

// Paleta algo más intensa para fondo claro (mismos índices que COLORS)
const COLORS_LIGHT = [
  null,
  '#00acc1', // I
  '#f9a825', // O
  '#9c27b0', // T
  '#43a047', // S
  '#e53935', // Z
  '#1e88e5', // J
  '#fb8c00', // L
  '#607d8b', // N
  '#d81b60', // +
  '#7cb342', // U
  '#00897b', // Y
  '#fbc02d', // single
  '#9e9e9e', // basura
  '#000000', // comodín
];

const PIECES = [
  null,
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
  [[2,2],[2,2]],                               // O
  [[0,3,0],[3,3,3],[0,0,0]],                  // T
  [[0,4,4],[4,4,0],[0,0,0]],                  // S
  [[5,5,0],[0,5,5],[0,0,0]],                  // Z
  [[6,0,0],[6,6,6],[0,0,0]],                  // J
  [[0,0,7],[7,7,7],[0,0,0]],                  // L
  [[8,8,8],[8,0,8],[8,8,8]],                  // N - tuerca (reto)
  [[0,9,0],[9,9,9],[0,9,0]],                  // +
  [[10,0,10],[10,10,10],[0,0,0]],             // U
  [[0,11,0,0],[11,11,11,11],[0,0,0,0],[0,0,0,0]], // Y
  [[12]],                                      // single 1×1
  null,                                        // basura (solo tablero)
  null,                                        // comodín (solo tablero)
];

// Probabilidad relativa de cada tipo en randomPiece(): las especiales aparecen "de vez en cuando"
const PIECE_WEIGHTS = [0, 1, 1, 1, 1, 1, 1, 1, 0.12, 0.12, 0.12, 0.12, 0, 0, 0];

const LINE_SCORES = [0, 100, 300, 500, 800];
const LINE_NAMES = ['', '', 'DOBLE', 'TRIPLE', 'TETRIS'];
const TSPIN_SCORES = [400, 800, 1200, 1600];
const TSPIN_NAMES = ['T-SPIN', 'T-SPIN SIMPLE', 'T-SPIN DOBLE', 'T-SPIN TRIPLE'];
const PERFECT_CLEAR_BONUS = 3000;
const WILD_BONUS = 50;

const QUEUE_SIZE = 6;

// ---- Power-ups ----
const POWERS = {
  bomba:    { icon: '💣', name: '¡BOMBA!' },
  rayo:     { icon: '⚡', name: '¡RAYO!' },
  tinte:    { icon: '🎨', name: '¡TINTE!' },
  gravedad: { icon: '🧲', name: '¡GRAVEDAD!' },
  congelar: { icon: '❄', name: '¡CONGELADO!' },
};
const POWER_KEYS = Object.keys(POWERS);
const LINES_PER_POWER = 4;
const FREEZE_MS = 5000;

// ---- Modos desafío ----
const MODES = {
  clasico:   { name: 'Clásico',          desc: 'Juego sin fin' },
  sprint:    { name: 'Sprint 40',        desc: '40 líneas en 2 minutos' },
  basura:    { name: 'Basura',           desc: 'Sube una fila cada 10 s' },
  fijo:      { name: 'Tablero fijo',     desc: 'Elimina todos los bloques grises' },
  invisible: { name: 'Invisible',        desc: 'Las piezas desaparecen al caer' },
  inverso:   { name: 'Rotación inversa', desc: 'Desde nivel 5 se invierte el giro' },
};
const SPRINT_LINES = 40;
const SPRINT_TIME = 120000;
const GARBAGE_EVERY = 10000;
const INVERSE_LEVEL = 5;
const REVEAL_MS = 600;
const FIXED_PATTERN = [
  '....##....',
  '...####...',
  '#..####..#',
  '##.#..#.##',
  '###.##.###',
  '#.######.#',
  '####..####',
];

// ---- Habilidades (barra de energía) ----
const ABILITIES = [
  { id: 'ver5',     name: 'Ver 5 próximas',  desc: 'Durante 10 piezas' },
  { id: 'cambiar',  name: 'Cambiar pieza',   desc: 'Otra pieza del pool' },
  { id: 'lento',    name: 'Ralentizar',      desc: 'Caída lenta 10 s' },
  { id: 'deshacer', name: 'Deshacer',        desc: 'Anula la última colocación' },
  { id: 'reserva',  name: 'Reserva extra',   desc: '+2 usos del hold por turno' },
];
const ENERGY_PER_LINE = 10;
const SLOW_MS = 10000;
const REVEAL_PIECES = 10;

// ---- DOM ----
const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const holdCanvas = document.getElementById('hold-canvas');
const holdCtx = holdCanvas.getContext('2d');
const queueCanvas = document.getElementById('queue-canvas');
const queueCtx = queueCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const comboEl = document.getElementById('combo');
const modeNameEl = document.getElementById('mode-name');
const objectiveEl = document.getElementById('objective');
const statusEl = document.getElementById('status');
const energyFill = document.getElementById('energy-fill');
const energyBar = document.getElementById('energy-bar');
const energyHint = document.getElementById('energy-hint');
const holdSlot = document.getElementById('hold-slot');
const holdChargesEl = document.getElementById('hold-charges');
const queueSection = document.getElementById('queue-section');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');
const modeMenu = document.getElementById('mode-menu');
const abilityMenu = document.getElementById('ability-menu');
const restartBtn = document.getElementById('restart-btn');
const pauseMenu = document.getElementById('pause-menu');
const themeBtn = document.getElementById('theme-btn');
const soundBtn = document.getElementById('sound-btn');
const recordsEl = document.getElementById('records');
const recordsBody = document.getElementById('records-body');
const recordsBests = document.getElementById('records-bests');
const nameForm = document.getElementById('name-form');
const nameInput = document.getElementById('name-input');
const resetRecordsBtn = document.getElementById('reset-records-btn');
const skinBtn = document.getElementById('skin-btn');

const THEME_KEY = 'tetris-theme';
const MUTE_KEY = 'tetris-muted';
const RECORDS_KEY = 'tetris-records';
const BESTS_KEY = 'tetris-bests';
const NAME_KEY = 'tetris-last-name';
const MAX_RECORDS = 5;
const NAME_MAX = 12;
const DEFAULT_NAME = 'Jugador';
let theme = 'dark';
let muted = false;

let board, current, queue, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId;
let mode = 'clasico', started = false, menu = null; // menu: null | 'modes' | 'pause' | 'abilities'
let gameTime = 0;                                    // ms de juego (no avanza en pausa)
let hold, holdUsed, holdCharges;
let combo, b2b, lastMoveRotate;
let maxCombo = 0;
let editingRecordId = null; // récord recién guardado cuyo nombre se puede editar
let nameFocusAt = 0;        // instante (ms) en que se enfocó el campo de nombre
let linesSincePower, frozenUntil, slowUntil;
let energy, queueReveal, snapshot;
let nextGarbageAt, revealUntil;
let floats = [], flashes = [];

const START_LEVEL_KEY = 'tetris-start-level';
const MAX_START_LEVEL = 15;
let startLevel = 1;     // preferencia para la próxima partida
let gameStartLevel = 1; // nivel con el que empezó la partida actual
let ignoreRepeat = false; // tras reanudar, ignora la auto-repetición de teclas mantenidas

// ---------------------------------------------------------------------------
// Piezas
// ---------------------------------------------------------------------------

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function makePiece(type, power = null) {
  const shape = PIECES[type].map(row => [...row]);
  return { type, shape, power, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
}

function clonePiece(p) {
  return p ? { ...p, shape: p.shape.map(row => [...row]) } : null;
}

function randomType() {
  const total = PIECE_WEIGHTS.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let t = 1; t < PIECE_WEIGHTS.length; t++) {
    r -= PIECE_WEIGHTS[t];
    if (r < 0) return t;
  }
  return 1;
}

function randomPiece() {
  return makePiece(randomType());
}

function fillQueue() {
  while (queue.length < QUEUE_SIZE) queue.push(randomPiece());
}

function pieceCells(p) {
  const cells = [];
  for (let r = 0; r < p.shape.length; r++)
    for (let c = 0; c < p.shape[r].length; c++)
      if (p.shape[r][c]) cells.push({ x: p.x + c, y: p.y + r });
  return cells;
}

function collide(shape, ox, oy) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function rotateCW(shape) {
  const rows = shape.length, cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      result[c][rows - 1 - r] = shape[r][c];
  return result;
}

function rotateCCW(shape) {
  const rows = shape.length, cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      result[cols - 1 - c][r] = shape[r][c];
  return result;
}

function rotationInverted() {
  return mode === 'inverso' && level >= INVERSE_LEVEL;
}

// dir: 1 = horario, -1 = antihorario (se invierte en el modo Rotación inversa)
function tryRotate(dir) {
  if (rotationInverted()) dir = -dir;
  const rotated = dir > 0 ? rotateCW(current.shape) : rotateCCW(current.shape);
  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    if (!collide(rotated, current.x + kick, current.y)) {
      current.shape = rotated;
      current.x += kick;
      lastMoveRotate = true;
      return;
    }
  }
}

function move(dx) {
  if (!collide(current.shape, current.x + dx, current.y)) {
    current.x += dx;
    lastMoveRotate = false;
  }
}

// T-spin: pieza T, último movimiento fue un giro y ≥3 de las 4 esquinas de su caja 3×3 ocupadas
function isTSpin() {
  if (current.type !== 3 || !lastMoveRotate) return false;
  const corners = [[0, 0], [2, 0], [0, 2], [2, 2]];
  let filled = 0;
  for (const [dx, dy] of corners) {
    const x = current.x + dx, y = current.y + dy;
    if (x < 0 || x >= COLS || y >= ROWS || (y >= 0 && board[y][x])) filled++;
  }
  return filled >= 3;
}

// Devuelve false si la pieza queda por encima del tablero (top out)
function merge() {
  const cells = pieceCells(current);
  if (cells.some(p => p.y < 0)) return false;
  for (const p of cells) board[p.y][p.x] = current.shape[p.y - current.y][p.x - current.x];
  return true;
}

// ---------------------------------------------------------------------------
// Power-ups
// ---------------------------------------------------------------------------

function grantPower() {
  const target = queue[0].power ? queue.find(p => !p.power) : queue[0];
  if (target) target.power = POWER_KEYS[Math.floor(Math.random() * POWER_KEYS.length)];
}

function applyGravity() {
  for (let c = 0; c < COLS; c++) {
    const col = [];
    for (let r = ROWS - 1; r >= 0; r--) if (board[r][c]) col.push(board[r][c]);
    for (let r = ROWS - 1, i = 0; r >= 0; r--, i++) board[r][c] = col[i] || 0;
  }
}

function applyPower(p) {
  const cells = pieceCells(p);
  const xs = cells.map(c => c.x), ys = cells.map(c => c.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const cx = Math.round((minX + maxX) / 2), cy = Math.round((minY + maxY) / 2);

  switch (p.power) {
    case 'bomba':
      for (let y = cy - 1; y <= cy + 1; y++)
        for (let x = cx - 1; x <= cx + 1; x++)
          if (y >= 0 && y < ROWS && x >= 0 && x < COLS) board[y][x] = 0;
      addFlash(cx - 1, cy - 1, 3, 3);
      shake();
      break;
    case 'rayo':
      if (maxX - minX >= maxY - minY) {
        board[maxY].fill(0);
        addFlash(0, maxY, COLS, 1);
      } else {
        for (let r = 0; r < ROWS; r++) board[r][cx] = 0;
        addFlash(cx, 0, 1, ROWS);
      }
      break;
    case 'tinte': {
      const counts = {};
      for (const row of board)
        for (const v of row)
          if (v && v !== GARBAGE && v !== WILD) counts[v] = (counts[v] || 0) + 1;
      const best = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
      if (best) {
        const t = Number(best);
        for (const row of board)
          for (let c = 0; c < COLS; c++) if (row[c] === t) row[c] = WILD;
      }
      break;
    }
    case 'gravedad':
      applyGravity();
      addFlash(0, 0, COLS, ROWS);
      break;
    case 'congelar':
      frozenUntil = gameTime + FREEZE_MS;
      break;
  }
  addFloat(POWERS[p.power].name, '#ffffff');
  sfx('power');
}

// ---------------------------------------------------------------------------
// Líneas, puntuación, combos
// ---------------------------------------------------------------------------

function clearLines(tspin) {
  const full = [];
  for (let r = 0; r < ROWS; r++) if (board[r].every(v => v !== 0)) full.push(r);
  const n = full.length;

  let wilds = 0;
  if (n) {
    for (const r of full) addFlash(0, r, COLS, 1);
    board = board.filter((_, i) => !full.includes(i));
    while (board.length < ROWS) board.unshift(new Array(COLS).fill(0));
    // Los comodines explotan al completar cualquier línea
    for (const row of board)
      for (let c = 0; c < COLS; c++)
        if (row[c] === WILD) { row[c] = 0; wilds++; }
    revealUntil = gameTime + REVEAL_MS;
  }

  const labels = [];
  let points = 0;
  if (tspin) {
    points = TSPIN_SCORES[n] * level;
    labels.push(TSPIN_NAMES[n]);
  } else if (n) {
    points = LINE_SCORES[n] * level;
    if (LINE_NAMES[n]) labels.push(LINE_NAMES[n]);
  }

  let perfect = false;
  if (n) {
    const difficult = n === 4 || tspin;
    combo++;
    maxCombo = Math.max(maxCombo, combo);
    if (difficult && b2b) { points = Math.floor(points * 1.5); labels.push('B2B ×1.5'); }
    b2b = difficult;
    if (combo > 1) { points *= combo; labels.push(`COMBO ×${combo}`); }
    if (wilds) { points += wilds * WILD_BONUS * level; labels.push(`COMODINES +${wilds}`); }
    if (board.every(row => row.every(v => !v))) {
      perfect = true;
      points += PERFECT_CLEAR_BONUS * level;
      labels.push('PERFECT CLEAR');
    }

    lines += n;
    linesSincePower += n;
    energy = Math.min(100, energy + n * ENERGY_PER_LINE + (difficult ? ENERGY_PER_LINE : 0));
    level = gameStartLevel + Math.floor(lines / 10);
    dropInterval = Math.max(100, 1000 - (level - 1) * 90);

    if (n === 4) {
      queue.unshift(makePiece(SINGLE)); // premio
      labels.push('PREMIO 1×1');
    }
    while (linesSincePower >= LINES_PER_POWER) {
      linesSincePower -= LINES_PER_POWER;
      grantPower();
    }

    if (perfect) sfx('win');
    else if (n === 4) sfx('tetris');
    else if (combo > 1) sfx('combo', combo);
    else sfx('line', n);
    if (n === 4 || combo >= 3 || perfect) shake();
  } else {
    combo = 0;
  }

  score += points;
  labels.forEach((text, i) => addFloat(text, i === 0 ? '#ffd54f' : '#ffffff', i * 220));
  return n;
}

function ghostY() {
  let gy = current.y;
  while (!collide(current.shape, current.x, gy + 1)) gy++;
  return gy;
}

function hardDrop() {
  const gy = ghostY();
  score += (gy - current.y) * 2;
  if (gy !== current.y) lastMoveRotate = false;
  current.y = gy;
  lockPiece();
}

function softDrop() {
  if (!collide(current.shape, current.x, current.y + 1)) {
    current.y++;
    lastMoveRotate = false;
    score += 1;
  } else {
    lockPiece();
  }
}

function takeSnapshot() {
  return {
    board: board.map(row => [...row]),
    current: makePiece(current.type, current.power),
    queue: queue.map(clonePiece),
    hold: clonePiece(hold),
    score, lines, level, dropInterval, combo, maxCombo, b2b, linesSincePower, holdCharges,
  };
}

function restoreSnapshot(s) {
  board = s.board;
  current = s.current;
  queue = s.queue;
  hold = s.hold;
  ({ score, lines, level, dropInterval, combo, maxCombo, b2b, linesSincePower, holdCharges } = s);
  holdUsed = false;
  lastMoveRotate = false;
  drawPreviews();
}

function lockPiece() {
  snapshot = takeSnapshot();
  const tspin = isTSpin();
  const piece = current;
  if (!merge()) { endGame('GAME OVER'); return; }
  sfx('lock');
  if (piece.power) applyPower(piece);
  clearLines(tspin);
  if (checkObjective()) return;
  holdUsed = false;
  spawn();
}

function spawn() {
  current = queue.shift();
  fillQueue();
  lastMoveRotate = false;
  if (queueReveal > 0) queueReveal--;
  drawPreviews();
  if (collide(current.shape, current.x, current.y)) endGame('GAME OVER');
}

// ---------------------------------------------------------------------------
// Hold
// ---------------------------------------------------------------------------

function canHold() {
  return !holdUsed || holdCharges > 0;
}

function doHold() {
  if (!canHold()) { sfx('deny'); return; }
  if (holdUsed) holdCharges--;
  holdUsed = true;
  const stored = makePiece(current.type, current.power);
  if (hold) {
    current = makePiece(hold.type, hold.power);
    hold = stored;
    lastMoveRotate = false;
    drawPreviews();
    if (collide(current.shape, current.x, current.y)) endGame('GAME OVER');
  } else {
    hold = stored;
    spawn();
  }
  sfx('hold');
}

// ---------------------------------------------------------------------------
// Modos
// ---------------------------------------------------------------------------

function applyFixedPattern() {
  const top = ROWS - FIXED_PATTERN.length;
  FIXED_PATTERN.forEach((line, i) => {
    for (let c = 0; c < COLS; c++) board[top + i][c] = line[c] === '#' ? GARBAGE : 0;
  });
}

function countGarbage() {
  return board.reduce((n, row) => n + row.filter(v => v === GARBAGE).length, 0);
}

function addGarbageRow() {
  if (board[0].some(v => v)) { endGame('GAME OVER'); return; }
  board.shift();
  const row = new Array(COLS).fill(GARBAGE);
  row[Math.floor(Math.random() * COLS)] = 0;
  board.push(row);
  if (collide(current.shape, current.x, current.y)) current.y--;
  sfx('garbage');
}

function tickMode() {
  if (mode === 'sprint' && gameTime >= SPRINT_TIME) endGame('TIEMPO');
  else if (mode === 'basura' && gameTime >= nextGarbageAt) {
    nextGarbageAt += GARBAGE_EVERY;
    addGarbageRow();
  }
}

// Comprueba victoria tras cada colocación; devuelve true si el juego terminó
function checkObjective() {
  if (gameOver) return true;
  if (mode === 'sprint' && lines >= SPRINT_LINES) { endGame('¡VICTORIA!', true); return true; }
  if (mode === 'fijo' && countGarbage() === 0) { endGame('¡VICTORIA!', true); return true; }
  return false;
}

function formatTime(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function objectiveText() {
  switch (mode) {
    case 'sprint':
      return `⏱ ${formatTime(SPRINT_TIME - gameTime)} · faltan ${Math.max(0, SPRINT_LINES - lines)}`;
    case 'basura':
      return `Nueva fila en ${Math.max(0, Math.ceil((nextGarbageAt - gameTime) / 1000))} s`;
    case 'fijo':
      return `Bloques grises: ${countGarbage()}`;
    case 'invisible':
      return 'Memoriza el tablero';
    case 'inverso':
      return rotationInverted() ? '↺ Rotación invertida' : `Se invierte en nivel ${INVERSE_LEVEL}`;
    default:
      return 'Sin límite';
  }
}

// ---------------------------------------------------------------------------
// Habilidades
// ---------------------------------------------------------------------------

function abilityAvailable(id) {
  return id === 'deshacer' ? !!snapshot : true;
}

function openAbilities() {
  if (energy < 100) { sfx('deny'); return; }
  paused = true;
  menu = 'abilities';
  cancelAnimationFrame(animId);
  abilityMenu.querySelectorAll('button').forEach((btn, i) => {
    btn.disabled = !abilityAvailable(ABILITIES[i].id);
  });
  showOverlay({ title: 'HABILIDADES', text: 'Elige con 1–5 · Esc cancela', abilities: true });
}

function closeAbilities() {
  menu = null;
  hideOverlay();
  resume();
}

function useAbility(index) {
  const ab = ABILITIES[index];
  if (!ab || !abilityAvailable(ab.id)) { sfx('deny'); return; }
  energy = 0;
  switch (ab.id) {
    case 'ver5':
      queueReveal = REVEAL_PIECES;
      break;
    case 'cambiar': {
      let t;
      do { t = randomType(); } while (t === current.type);
      current = makePiece(t, current.power);
      lastMoveRotate = false;
      break;
    }
    case 'lento':
      slowUntil = gameTime + SLOW_MS;
      break;
    case 'deshacer':
      restoreSnapshot(snapshot);
      snapshot = null;
      break;
    case 'reserva':
      holdCharges += 2;
      break;
  }
  addFloat(ab.name.toUpperCase(), '#7aa2f7');
  sfx('power');
  drawPreviews();
  closeAbilities();
  if (collide(current.shape, current.x, current.y)) endGame('GAME OVER');
}

// ---------------------------------------------------------------------------
// Efectos visuales
// ---------------------------------------------------------------------------

function addFloat(text, color, delay = 0) {
  floats.push({ text, color, start: gameTime + delay });
}

function addFlash(x, y, w, h) {
  flashes.push({ x, y, w, h, start: gameTime });
}

function shake() {
  canvas.classList.remove('shake');
  void canvas.offsetWidth; // reinicia la animación CSS
  canvas.classList.add('shake');
}

function drawEffects() {
  const FLASH_MS = 350, FLOAT_MS = 1300;
  flashes = flashes.filter(f => gameTime - f.start < FLASH_MS);
  for (const f of flashes) {
    ctx.globalAlpha = 0.7 * (1 - (gameTime - f.start) / FLASH_MS);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(f.x * BLOCK, f.y * BLOCK, f.w * BLOCK, f.h * BLOCK);
  }
  ctx.globalAlpha = 1;

  floats = floats.filter(f => gameTime - f.start < FLOAT_MS);
  const visible = floats.filter(f => gameTime >= f.start);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(0,0,0,0.75)';
  visible.forEach((f, i) => {
    const t = (gameTime - f.start) / FLOAT_MS;
    const y = canvas.height * 0.4 + i * 30 - t * 40;
    ctx.globalAlpha = 1 - t * t;
    ctx.strokeText(f.text, canvas.width / 2, y);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, canvas.width / 2, y);
  });
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Sonido (WebAudio, tonos generados)
// ---------------------------------------------------------------------------

let audioCtx = null;

function tone(freq, dur, type = 'square', vol = 0.05, delay = 0, slideTo = null) {
  const t0 = audioCtx.currentTime + delay;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function sfx(name, arg) {
  if (muted) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch (e) { return; }
  switch (name) {
    case 'lock':    tone(140, 0.06, 'triangle', 0.08); break;
    case 'hold':    tone(330, 0.06, 'triangle', 0.06); break;
    case 'deny':    tone(110, 0.12, 'sawtooth', 0.04); break;
    case 'garbage': tone(90, 0.2, 'sawtooth', 0.05); break;
    case 'line':
      for (let i = 0; i < arg; i++) tone(520 + i * 120, 0.1, 'square', 0.04, i * 0.06);
      break;
    case 'combo':
      tone(400 + arg * 80, 0.1, 'square', 0.05);
      tone(500 + arg * 100, 0.12, 'square', 0.05, 0.08);
      break;
    case 'tetris':
      [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.14, 'square', 0.05, i * 0.08));
      break;
    case 'power':   tone(300, 0.3, 'sawtooth', 0.04, 0, 900); break;
    case 'win':
      [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.18, 'triangle', 0.07, i * 0.1));
      break;
    case 'gameover':
      [392, 330, 262, 196].forEach((f, i) => tone(f, 0.25, 'triangle', 0.07, i * 0.18));
      break;
  }
}

function applyMute(value) {
  muted = value;
  soundBtn.textContent = muted ? '🔇 Sonido: no' : '🔊 Sonido: sí';
  try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch (e) { /* almacenamiento no disponible */ }
}

// ---------------------------------------------------------------------------
// Dibujo
// ---------------------------------------------------------------------------

function updateHUD() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = lines;
  levelEl.textContent = level;
  comboEl.textContent = combo > 1 ? `×${combo}` : '–';
  modeNameEl.textContent = MODES[mode].name;
  objectiveEl.textContent = objectiveText();

  const status = [];
  if (gameTime < frozenUntil) status.push(`❄ Congelado ${((frozenUntil - gameTime) / 1000).toFixed(1)} s`);
  if (gameTime < slowUntil) status.push(`🐢 Lento ${Math.ceil((slowUntil - gameTime) / 1000)} s`);
  if (queueReveal > 0) status.push(`👁 Vista ×5: ${queueReveal} piezas`);
  if (b2b) status.push('B2B listo');
  statusEl.textContent = status.join('\n') || '—';

  energyFill.style.width = `${energy}%`;
  energyBar.classList.toggle('full', energy >= 100);
  energyHint.textContent = energy >= 100 ? '¡Lista! Pulsa E' : `${energy}%`;

  holdSlot.classList.toggle('locked', !canHold());
  holdChargesEl.textContent = holdCharges > 0 ? `+${holdCharges} usos extra` : '';
  queueSection.classList.toggle('hidden', queueReveal <= 0);
}

// ---------------------------------------------------------------------------
// Skins: paleta (index-aligned con COLORS) + función de dibujo de bloque
// ---------------------------------------------------------------------------

const SKIN_KEY = 'tetris-skin';
const RAINBOW = ['#ff5252', '#ffd740', '#69f0ae', '#40c4ff', '#e040fb'];

const NEON_COLORS = [
  null,
  '#00ffff', // I
  '#ffff00', // O
  '#d000ff', // T
  '#39ff14', // S
  '#ff073a', // Z
  '#1f51ff', // J
  '#ff8c00', // L
  '#c0c0ff', // N
  '#ff10f0', // +
  '#ccff00', // U
  '#00ffaa', // Y
  '#fffb96', // single
  '#55557a', // basura
  '#ffffff', // comodín
];

const PASTEL_COLORS = [
  null,
  '#a0e7ef', // I
  '#fff1a8', // O
  '#dcb8f0', // T
  '#b5e8b0', // S
  '#f7b2b2', // Z
  '#b8d8fa', // J
  '#ffd1a1', // L
  '#d3dbe0', // N
  '#f8bbd9', // +
  '#d4ecb0', // U
  '#a8ddd5', // Y
  '#fffbc8', // single
  '#8a8fa0', // basura
  '#ffffff', // comodín
];

const PASTEL_COLORS_LIGHT = [
  null,
  '#7fd6e2', // I
  '#f5d76e', // O
  '#c99ae3', // T
  '#8fd18a', // S
  '#ee9393', // Z
  '#8fbff0', // J
  '#f6b77a', // L
  '#aab6be', // N
  '#ef93bd', // +
  '#b5d986', // U
  '#80c7bd', // Y
  '#f2e27a', // single
  '#b4b8c4', // basura
  '#000000', // comodín
];

const PIXEL_COLORS = [
  null,
  '#3cbcfc', // I
  '#fcc800', // O
  '#a044f0', // T
  '#58d854', // S
  '#f83800', // Z
  '#0058f8', // J
  '#fca044', // L
  '#bcbcbc', // N
  '#f878f8', // +
  '#b8f818', // U
  '#00a8a8', // Y
  '#fce0a8', // single
  '#585858', // basura
  '#ffffff', // comodín
];

// Retro: bloque plano con franja de brillo (estilo original)
function drawBlockRetro(context, px, py, s, fill) {
  context.fillStyle = fill;
  context.fillRect(px, py, s, s);
  context.fillStyle = 'rgba(255,255,255,0.12)';
  context.fillRect(px, py, s, 4);
}

// Neon: interior translúcido + borde brillante con resplandor (shadowBlur)
function drawBlockNeon(context, px, py, s, fill, color) {
  const a = context.globalAlpha;
  context.shadowColor = color;
  context.shadowBlur = Math.max(4, s * 0.45);
  context.globalAlpha = a * 0.3;
  context.fillStyle = fill;
  context.fillRect(px, py, s, s);
  context.globalAlpha = a;
  context.strokeStyle = fill;
  context.lineWidth = Math.max(1.5, s / 12);
  context.strokeRect(px + 1, py + 1, s - 2, s - 2);
}

// Trazado de rectángulo redondeado con arcos (no depende de roundRect)
function roundedRectPath(context, x, y, w, h, r) {
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + w, y, x + w, y + h, r);
  context.arcTo(x + w, y + h, x, y + h, r);
  context.arcTo(x, y + h, x, y, r);
  context.arcTo(x, y, x + w, y, r);
  context.closePath();
}

// Pastel: bloque redondeado con brillo suave arriba
function drawBlockPastel(context, px, py, s, fill) {
  roundedRectPath(context, px, py, s, s, s * 0.28);
  context.fillStyle = fill;
  context.fill();
  context.strokeStyle = 'rgba(0,0,0,0.12)';
  context.lineWidth = 1;
  context.stroke();
  roundedRectPath(context, px + s * 0.18, py + s * 0.12, s * 0.64, s * 0.22, s * 0.11);
  context.fillStyle = 'rgba(255,255,255,0.45)';
  context.fill();
}

// Pixel art: bisel pixelado + tramado (dithering) en damero + píxel de brillo
function drawBlockPixel(context, px, py, s, fill) {
  const u = Math.max(2, Math.floor(s / 7)); // tamaño de "píxel" (4 px a 30, 2 px a 15)
  context.fillStyle = fill;
  context.fillRect(px, py, s, s);
  context.fillStyle = 'rgba(255,255,255,0.35)';
  context.fillRect(px, py, s, u);
  context.fillRect(px, py, u, s);
  context.fillStyle = 'rgba(0,0,0,0.35)';
  context.fillRect(px, py + s - u, s, u);
  context.fillRect(px + s - u, py, u, s);
  context.fillStyle = 'rgba(0,0,0,0.14)';
  const n = Math.floor((s - 2 * u) / u);
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++)
      if ((i + j) % 2) context.fillRect(px + u + i * u, py + u + j * u, u, u);
  context.fillStyle = 'rgba(255,255,255,0.7)';
  context.fillRect(px + u, py + u, u, u);
}

// colors/colorsLight: paleta para tema oscuro/claro; wild: paradas del degradado del comodín
const SKINS = {
  retro:  { name: 'Retro',     colors: COLORS,        colorsLight: COLORS_LIGHT,        wild: RAINBOW, drawBlock: drawBlockRetro },
  neon:   { name: 'Neon',      colors: NEON_COLORS,   colorsLight: NEON_COLORS,         wild: ['#ff073a', '#ffff00', '#39ff14', '#00ffff', '#ff10f0'], drawBlock: drawBlockNeon, glow: true, darkBoard: true },
  pastel: { name: 'Pastel',    colors: PASTEL_COLORS, colorsLight: PASTEL_COLORS_LIGHT, wild: ['#ffb3b3', '#ffe9a8', '#b9f5cf', '#a8dcff', '#e6b3ff'], drawBlock: drawBlockPastel },
  pixel:  { name: 'Pixel art', colors: PIXEL_COLORS,  colorsLight: PIXEL_COLORS,        wild: RAINBOW, drawBlock: drawBlockPixel, dotGrid: true },
};
let skin = 'retro';

function skinColor(colorIndex) {
  const sk = SKINS[skin];
  return (theme === 'light' ? sk.colorsLight : sk.colors)[colorIndex];
}

// Fondo del canvas oscuro (tema oscuro o skin con fondo negro)
function darkCanvas() {
  return theme !== 'light' || !!SKINS[skin].darkBoard;
}

function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return;
  const px = x * size + 1, py = y * size + 1, s = size - 2;
  const sk = SKINS[skin];
  let fill, color;
  if (colorIndex === WILD) {
    fill = context.createLinearGradient(px, py, px + s, py + s);
    sk.wild.forEach((c, i) => fill.addColorStop(i / (sk.wild.length - 1), c));
    color = '#ffffff';
  } else {
    fill = color = skinColor(colorIndex);
  }
  context.save();
  context.globalAlpha = alpha ?? 1;
  sk.drawBlock(context, px, py, s, fill, color);
  context.restore();
}

// Dibuja el círculo del hueco de la tuerca en la celda central (x+1, y+1) de la pieza
function drawNutHole(context, x, y, size, alpha) {
  const color = skinColor(NUT);
  context.save();
  context.globalAlpha = alpha ?? 1;
  if (SKINS[skin].glow) {
    context.shadowColor = color;
    context.shadowBlur = size * 0.4;
  }
  context.strokeStyle = color;
  context.lineWidth = Math.max(2, size / 8);
  context.beginPath();
  context.arc((x + 1.5) * size, (y + 1.5) * size, size * 0.35, 0, Math.PI * 2);
  context.stroke();
  context.restore();
}

// Pieza completa en (ox, oy) en unidades de celda: bloques + hueco de tuerca + marca de power-up
function drawPiece(context, piece, ox, oy, size, alpha = 1, decorate = true) {
  const shape = piece.shape;
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(context, ox + c, oy + r, shape[r][c], size, alpha);
  if (piece.type === NUT) drawNutHole(context, ox, oy, size, alpha);
  if (!decorate || !piece.power) return;

  context.save();
  context.globalAlpha = alpha;
  context.strokeStyle = darkCanvas() ? '#fff' : '#000';
  context.lineWidth = 2;
  let minC = Infinity, maxC = -Infinity, minR = Infinity, maxR = -Infinity;
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      if (shape[r][c]) {
        context.strokeRect((ox + c) * size + 2, (oy + r) * size + 2, size - 4, size - 4);
        minC = Math.min(minC, c); maxC = Math.max(maxC, c);
        minR = Math.min(minR, r); maxR = Math.max(maxR, r);
      }
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = `${Math.floor(size * 0.8)}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
  context.fillStyle = darkCanvas() ? '#fff' : '#000';
  context.fillText(POWERS[piece.power].icon, (ox + (minC + maxC + 1) / 2) * size, (oy + (minR + maxR + 1) / 2) * size);
  context.restore();
}

function drawGrid() {
  const gridColor = getComputedStyle(document.documentElement).getPropertyValue('--grid').trim();
  if (SKINS[skin].dotGrid) { // pixel art: puntos en las intersecciones
    ctx.fillStyle = gridColor;
    for (let c = 1; c < COLS; c++)
      for (let r = 1; r < ROWS; r++)
        ctx.fillRect(c * BLOCK - 1, r * BLOCK - 1, 2, 2);
    return;
  }
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * BLOCK, 0);
    ctx.lineTo(c * BLOCK, ROWS * BLOCK);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * BLOCK);
    ctx.lineTo(COLS * BLOCK, r * BLOCK);
    ctx.stroke();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();
  if (!board) return;

  // board (en modo Invisible solo se ve brevemente tras limpiar líneas y al terminar)
  const showBoard = mode !== 'invisible' || gameOver || gameTime < revealUntil;
  if (showBoard)
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        drawBlock(ctx, c, r, board[r][c], BLOCK);

  if (current && !gameOver) {
    drawPiece(ctx, current, current.x, ghostY(), BLOCK, 0.2, false); // ghost
    drawPiece(ctx, current, current.x, current.y, BLOCK);
  }

  drawEffects();
}

// Centra una pieza dentro de un área w×h (px) del contexto dado
function drawCentered(context, piece, w, h, size, oy = 0) {
  if (!piece) return;
  let minC = Infinity, maxC = -Infinity, minR = Infinity, maxR = -Infinity;
  piece.shape.forEach((row, r) => row.forEach((v, c) => {
    if (!v) return;
    minC = Math.min(minC, c); maxC = Math.max(maxC, c);
    minR = Math.min(minR, r); maxR = Math.max(maxR, r);
  }));
  const ox = (w - (maxC - minC + 1) * size) / 2 / size - minC;
  const oyCells = (oy + (h - (maxR - minR + 1) * size) / 2) / size - minR;
  drawPiece(context, piece, ox, oyCells, size);
}

function drawPreviews() {
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  drawCentered(nextCtx, queue[0], nextCanvas.width, nextCanvas.height, 30);

  holdCtx.clearRect(0, 0, holdCanvas.width, holdCanvas.height);
  drawCentered(holdCtx, hold, holdCanvas.width, holdCanvas.height, 30);

  queueCtx.clearRect(0, 0, queueCanvas.width, queueCanvas.height);
  const slot = queueCanvas.height / 4;
  for (let i = 1; i <= 4; i++)
    drawCentered(queueCtx, queue[i], queueCanvas.width, slot, 15, (i - 1) * slot);
}

function applyTheme(newTheme) {
  theme = newTheme;
  document.documentElement.dataset.theme = theme;
  themeBtn.textContent = theme === 'dark' ? '☀ Modo claro' : '🌙 Modo oscuro';
  try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* almacenamiento no disponible */ }
  // Redibujar aunque el juego esté en pausa o terminado
  draw();
  if (queue) drawPreviews();
}

function applySkin(name) {
  skin = Object.hasOwn(SKINS, name) ? name : 'retro';
  document.documentElement.dataset.skin = skin;
  skinBtn.textContent = `🎨 Skin: ${SKINS[skin].name}`;
  try { localStorage.setItem(SKIN_KEY, skin); } catch (e) { /* almacenamiento no disponible */ }
  // Redibujar aunque el juego esté en pausa o terminado (el fondo/rejilla dependen de CSS)
  draw();
  if (queue) drawPreviews();
}

// ---------------------------------------------------------------------------
// Records (localStorage)
// ---------------------------------------------------------------------------

function cleanName(name) {
  // Corta por puntos de código para no partir emojis
  return (typeof name === 'string' ? [...name.trim()].slice(0, NAME_MAX).join('').trim() : '') || DEFAULT_NAME;
}

function loadRecords() {
  try {
    const data = JSON.parse(localStorage.getItem(RECORDS_KEY));
    if (!Array.isArray(data)) return [];
    return data
      .filter(r => r && typeof r === 'object' && Number.isFinite(r.score))
      .map(r => ({
        id: Number.isFinite(r.id) ? r.id : 0,
        name: cleanName(r.name),
        score: r.score,
        lines: Number.isFinite(r.lines) ? r.lines : 0,
        maxCombo: Number.isFinite(r.maxCombo) ? r.maxCombo : 0,
        mode: typeof r.mode === 'string' ? r.mode : 'clasico',
        date: Number.isFinite(r.date) ? r.date : 0,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_RECORDS);
  } catch (e) {
    return [];
  }
}

function saveRecords(records) {
  try { localStorage.setItem(RECORDS_KEY, JSON.stringify(records)); } catch (e) { /* almacenamiento no disponible */ }
}

function loadBests() {
  try {
    const data = JSON.parse(localStorage.getItem(BESTS_KEY));
    if (data && typeof data === 'object')
      return {
        maxCombo: Number.isFinite(data.maxCombo) ? data.maxCombo : 0,
        maxLines: Number.isFinite(data.maxLines) ? data.maxLines : 0,
      };
  } catch (e) { /* ignorar */ }
  return { maxCombo: 0, maxLines: 0 };
}

function loadLastName() {
  try { return cleanName(localStorage.getItem(NAME_KEY)); } catch (e) { return DEFAULT_NAME; }
}

// Guarda la partida terminada: actualiza las mejores marcas y, si entra en el top, la añade.
// Devuelve { entry, rank } (rank empieza en 1) o null si no entra.
function recordGame() {
  const bests = loadBests();
  bests.maxCombo = Math.max(bests.maxCombo, maxCombo);
  bests.maxLines = Math.max(bests.maxLines, lines);
  try { localStorage.setItem(BESTS_KEY, JSON.stringify(bests)); } catch (e) { /* almacenamiento no disponible */ }

  if (score <= 0) return null;
  const records = loadRecords();
  if (records.length >= MAX_RECORDS && score <= records[records.length - 1].score) return null;
  const now = Date.now();
  const id = Math.max(now, ...records.map(r => r.id + 1)); // único aunque el reloj retroceda
  const entry = { id, name: loadLastName(), score, lines, maxCombo, mode, date: now };
  records.push(entry);
  records.sort((a, b) => b.score - a.score);
  saveRecords(records.slice(0, MAX_RECORDS));
  return { entry, rank: records.indexOf(entry) + 1 };
}

function renameRecord(id, name) {
  try { localStorage.setItem(NAME_KEY, name); } catch (e) { /* almacenamiento no disponible */ }
  const records = loadRecords();
  const entry = records.find(r => r.id === id);
  if (!entry) return;
  entry.name = name;
  saveRecords(records);
}

function renderRecords(highlightId = null) {
  const records = loadRecords();
  recordsBody.replaceChildren();
  if (!records.length) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 6;
    td.className = 'records-empty';
    td.textContent = 'Aún no hay records';
    tr.appendChild(td);
    recordsBody.appendChild(tr);
  }
  records.forEach((r, i) => {
    const tr = document.createElement('tr');
    if (highlightId !== null && r.id === highlightId) tr.className = 'highlight';
    const cells = [
      i + 1,
      r.name,
      r.score.toLocaleString(),
      r.lines,
      r.maxCombo > 1 ? `×${r.maxCombo}` : '–',
      MODES[r.mode] ? MODES[r.mode].name : r.mode,
    ];
    for (const value of cells) {
      const td = document.createElement('td');
      td.textContent = value; // nunca innerHTML con datos del usuario
      tr.appendChild(td);
    }
    recordsBody.appendChild(tr);
  });
  const bests = loadBests();
  const comboText = bests.maxCombo > 1 ? `×${bests.maxCombo}` : '–';
  recordsBests.textContent = `Mejor combo: ${comboText} · Líneas máx.: ${bests.maxLines}`;
}

// ---------------------------------------------------------------------------
// Overlay, estados y bucle
// ---------------------------------------------------------------------------

// variant: 'win' (verde) | 'lose' (rojo) | null (color de acento)
function showOverlay({ title, text = '', modes = false, abilities = false, restart = false, variant = null, pause = false, records = false }) {
  pauseMenu.classList.toggle('hidden', !pause);
  overlayTitle.textContent = title;
  overlayTitle.classList.toggle('win', variant === 'win');
  overlayTitle.classList.toggle('lose', variant === 'lose');
  overlayScore.textContent = text;
  modeMenu.classList.toggle('hidden', !modes);
  abilityMenu.classList.toggle('hidden', !abilities);
  restartBtn.classList.toggle('hidden', !restart);
  recordsEl.classList.toggle('hidden', !records);
  nameForm.classList.add('hidden');
  editingRecordId = null;
  if (records) renderRecords();
  overlay.classList.remove('hidden');
}

function hideOverlay() {
  overlay.classList.add('hidden');
}

function showModeMenu() {
  menu = 'modes';
  showOverlay({ title: 'ELIGE UN MODO', modes: true, records: true });
}

function endGame(title, win = false) {
  if (gameOver) return;
  gameOver = true;
  cancelAnimationFrame(animId);
  draw();
  updateHUD();
  sfx(win ? 'win' : 'gameover');
  let text = `Puntuación: ${score.toLocaleString()}`;
  if (win && mode === 'sprint') text += ` · Tiempo ${formatTime(gameTime)}`;
  const record = recordGame();
  if (record) text += ` · ¡Nuevo récord #${record.rank}!`;
  menu = 'modes';
  showOverlay({ title, text, modes: true, restart: true, variant: win ? 'win' : 'lose', records: true });
  if (record) {
    renderRecords(record.entry.id);
    editingRecordId = record.entry.id;
    nameInput.value = record.entry.name;
    nameForm.classList.remove('hidden');
    nameFocusAt = performance.now();
    nameInput.focus();
    nameInput.select();
  }
}

function resume() {
  paused = false;
  lastTime = performance.now();
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

function togglePause() {
  if (gameOver || menu === 'abilities') return;
  if (paused) {
    menu = null;
    ignoreRepeat = true;
    hideOverlay();
    resume();
  } else {
    paused = true;
    menu = 'pause';
    cancelAnimationFrame(animId);
    pauseView = 'main';
    pauseSel = 0;
    renderPauseMenu();
    showOverlay({ title: 'PAUSA', text: '↑↓ elegir · Enter aceptar · P/Esc reanudar', pause: true });
  }
}

// ---------------------------------------------------------------------------
// Menú de pausa
// ---------------------------------------------------------------------------

const PAUSE_OPTIONS = [
  { id: 'resume',   name: 'Reanudar',      desc: 'Volver al juego' },
  { id: 'restart',  name: 'Reiniciar',     desc: 'Nueva partida en el modo actual' },
  { id: 'controls', name: 'Ver controles', desc: 'Lista de teclas' },
  { id: 'level',    name: 'Nivel inicial', desc: '← → para cambiar · próxima partida' },
];

const CONTROL_KEYS = [
  ['← →', 'mover'],
  ['↑ / X', 'rotar horario'],
  ['Z', 'rotar antihorario'],
  ['↓', 'bajar'],
  ['Espacio', 'caída rápida'],
  ['C / Shift', 'guardar pieza'],
  ['E', 'habilidades (energía llena)'],
  ['P / Esc', 'pausa'],
  ['M', 'sonido'],
];

let pauseView = 'main', pauseSel = 0; // pauseView: 'main' | 'controls'

function setStartLevel(n) {
  startLevel = Math.min(MAX_START_LEVEL, Math.max(1, n));
  try { localStorage.setItem(START_LEVEL_KEY, String(startLevel)); } catch (e) { /* almacenamiento no disponible */ }
  if (menu === 'pause') renderPauseMenu();
}

function renderPauseMenu() {
  pauseMenu.innerHTML = '';
  if (pauseView === 'controls') {
    const list = document.createElement('ul');
    list.className = 'pause-controls';
    for (const [keys, action] of CONTROL_KEYS) {
      const li = document.createElement('li');
      li.innerHTML = `<kbd>${keys}</kbd><span>${action}</span>`;
      list.appendChild(li);
    }
    pauseMenu.appendChild(list);
    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'menu-btn selected';
    back.innerHTML = '<strong>Volver</strong><small>Enter / Retroceso</small>';
    back.addEventListener('click', () => { back.blur(); pauseView = 'main'; renderPauseMenu(); });
    pauseMenu.appendChild(back);
    return;
  }
  PAUSE_OPTIONS.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'menu-btn' + (i === pauseSel ? ' selected' : '');
    if (opt.id === 'level') {
      btn.classList.add('level-row');
      btn.innerHTML = `<strong>${opt.name}: <span class="level-value">${startLevel}</span></strong><small>${opt.desc}</small>` +
        '<span class="level-ctrl"><span data-d="-1">−</span><span data-d="1">+</span></span>';
      btn.addEventListener('click', ev => {
        btn.blur();
        pauseSel = i;
        const d = Number(ev.target.dataset && ev.target.dataset.d);
        if (d) setStartLevel(startLevel + d);
        else renderPauseMenu();
      });
    } else {
      btn.innerHTML = `<strong>${opt.name}</strong><small>${opt.desc}</small>`;
      btn.addEventListener('click', () => { btn.blur(); pauseSel = i; activatePauseOption(opt.id); });
    }
    pauseMenu.appendChild(btn);
  });
}

function activatePauseOption(id) {
  if (id === 'resume') togglePause();
  else if (id === 'restart') init(mode);
  else if (id === 'controls') { pauseView = 'controls'; renderPauseMenu(); }
}

function handlePauseKey(e) {
  if (e.repeat) return; // una tecla mantenida desde el juego no navega el menú
  if (e.code === 'KeyP' || e.code === 'Escape') {
    togglePause();
    return;
  }
  if (pauseView === 'controls') {
    if (['Enter', 'NumpadEnter', 'Space', 'Backspace'].includes(e.code)) {
      e.preventDefault();
      pauseView = 'main';
      renderPauseMenu();
    }
    return;
  }
  const n = PAUSE_OPTIONS.length;
  switch (e.code) {
    case 'ArrowUp':   pauseSel = (pauseSel + n - 1) % n; renderPauseMenu(); break;
    case 'ArrowDown': pauseSel = (pauseSel + 1) % n; renderPauseMenu(); break;
    case 'ArrowLeft':
    case 'ArrowRight':
      if (PAUSE_OPTIONS[pauseSel].id === 'level') setStartLevel(startLevel + (e.code === 'ArrowRight' ? 1 : -1));
      break;
    case 'Enter':
    case 'NumpadEnter':
    case 'Space':
      e.preventDefault();
      activatePauseOption(PAUSE_OPTIONS[pauseSel].id);
      break;
  }
}

function loop(ts) {
  if (gameOver || paused) return;
  const dt = Math.min(250, Math.max(0, ts - lastTime));
  lastTime = ts;
  gameTime += dt;

  tickMode();
  if (gameOver) return;

  if (gameTime >= frozenUntil) {
    dropAccum += dt;
    const interval = dropInterval * (gameTime < slowUntil ? 3 : 1);
    if (dropAccum >= interval) {
      dropAccum = 0;
      if (!collide(current.shape, current.x, current.y + 1)) {
        current.y++;
        lastMoveRotate = false;
      } else {
        lockPiece();
        if (gameOver) return; // no agendar más frames tras Game Over
      }
    }
  }
  draw();
  updateHUD();
  animId = requestAnimationFrame(loop);
}

function init(newMode = mode) {
  mode = newMode;
  started = true;
  menu = null;
  board = createBoard();
  if (mode === 'fijo') applyFixedPattern();
  score = 0;
  lines = 0;
  // Inverso depende de subir hasta INVERSE_LEVEL: siempre empieza en 1
  gameStartLevel = mode === 'inverso' ? 1 : startLevel;
  ignoreRepeat = true; // p.ej. Espacio mantenido tras «Reiniciar» no debe hacer caída rápida
  level = gameStartLevel;
  paused = false;
  gameOver = false;
  dropInterval = Math.max(100, 1000 - (level - 1) * 90);
  dropAccum = 0;
  gameTime = 0;
  hold = null;
  holdUsed = false;
  holdCharges = 0;
  combo = 0;
  maxCombo = 0;
  b2b = false;
  lastMoveRotate = false;
  linesSincePower = 0;
  frozenUntil = 0;
  slowUntil = 0;
  energy = 0;
  queueReveal = 0;
  snapshot = null;
  nextGarbageAt = GARBAGE_EVERY;
  revealUntil = REVEAL_MS * 3; // en Invisible se muestra el tablero inicial un momento
  floats = [];
  flashes = [];
  queue = [];
  fillQueue();
  spawn();
  updateHUD();
  hideOverlay();
  resume();
}

// ---------------------------------------------------------------------------
// Entrada y arranque
// ---------------------------------------------------------------------------

document.addEventListener('keydown', e => {
  // Escribir en un campo de texto (nombre del récord) no debe controlar el juego
  if (e.target instanceof Element && e.target.matches('input, textarea')) return;
  if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', 'Space'].includes(e.code)) e.preventDefault();
  if (e.code === 'KeyM') { applyMute(!muted); return; }

  if (menu === 'abilities') {
    if (e.code === 'Escape') closeAbilities();
    const m = /^(?:Digit|Numpad)([1-5])$/.exec(e.code);
    if (m) useAbility(Number(m[1]) - 1);
    return;
  }
  if (!started) return;
  if (menu === 'pause') { handlePauseKey(e); return; } // bloquea las entradas del juego
  if (e.code === 'KeyP' || e.code === 'Escape') { if (!e.repeat) togglePause(); return; }
  if (paused || gameOver) return;
  // Tras reanudar, una tecla mantenida desde el menú no debe mover la pieza
  if (ignoreRepeat) {
    if (e.repeat) return;
    ignoreRepeat = false;
  }

  switch (e.code) {
    case 'ArrowLeft':  move(-1); break;
    case 'ArrowRight': move(1); break;
    case 'ArrowDown':  softDrop(); break;
    case 'ArrowUp':
    case 'KeyX':       tryRotate(1); break;
    case 'KeyZ':       tryRotate(-1); break;
    case 'Space':      hardDrop(); break;
    case 'KeyC':
    case 'ShiftLeft':
    case 'ShiftRight':
      if (!e.repeat) doHold();
      break;
    case 'KeyE':
      if (!e.repeat) openAbilities();
      return;
  }
  if (!gameOver) updateHUD();
});

// Menús generados desde MODES / ABILITIES
for (const [id, m] of Object.entries(MODES)) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'menu-btn';
  btn.innerHTML = `<strong>${m.name}</strong><small>${m.desc}</small>`;
  btn.addEventListener('click', () => { btn.blur(); init(id); });
  modeMenu.appendChild(btn);
}
ABILITIES.forEach((ab, i) => {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'menu-btn';
  btn.innerHTML = `<strong>${i + 1} · ${ab.name}</strong><small>${ab.desc}</small>`;
  btn.addEventListener('click', () => { btn.blur(); useAbility(i); });
  abilityMenu.appendChild(btn);
});

restartBtn.addEventListener('click', () => { restartBtn.blur(); init(mode); });

function saveRecordName() {
  if (editingRecordId === null) return;
  renameRecord(editingRecordId, cleanName(nameInput.value));
  renderRecords(editingRecordId);
}

nameForm.addEventListener('submit', e => {
  e.preventDefault();
  saveRecordName();
  nameInput.blur();
  nameForm.classList.add('hidden');
});

// Guarda también al salir del campo (p. ej. al pulsar Reiniciar sin dar a Guardar)
nameInput.addEventListener('change', saveRecordName);

// Ignora teclas mantenidas o pulsadas justo al terminar la partida (Space, X, Z...)
nameInput.addEventListener('keydown', e => {
  if (e.repeat || performance.now() - nameFocusAt < 600) e.preventDefault();
});

resetRecordsBtn.addEventListener('click', () => {
  resetRecordsBtn.blur();
  if (!confirm('¿Borrar todos los records? Esta acción no se puede deshacer.')) return;
  try {
    localStorage.removeItem(RECORDS_KEY);
    localStorage.removeItem(BESTS_KEY);
  } catch (e) { /* almacenamiento no disponible */ }
  nameForm.classList.add('hidden');
  editingRecordId = null;
  overlayScore.textContent = overlayScore.textContent.replace(/ · ¡Nuevo récord #\d+!$/, '');
  renderRecords();
});

themeBtn.addEventListener('click', () => {
  applyTheme(theme === 'dark' ? 'light' : 'dark');
  themeBtn.blur(); // evita que Space active el botón en vez de la caída rápida
});

soundBtn.addEventListener('click', () => {
  applyMute(!muted);
  soundBtn.blur();
});

let savedTheme = null, savedMute = null;
try {
  savedTheme = localStorage.getItem(THEME_KEY);
  savedMute = localStorage.getItem(MUTE_KEY);
} catch (e) { /* ignorar */ }
try {
  const savedLevel = parseInt(localStorage.getItem(START_LEVEL_KEY), 10);
  if (savedLevel >= 1 && savedLevel <= MAX_START_LEVEL) startLevel = savedLevel;
} catch (e) { /* ignorar */ }

applyTheme(savedTheme === 'light' ? 'light' : 'dark');
applyMute(savedMute === '1');

skinBtn.addEventListener('click', () => {
  const names = Object.keys(SKINS);
  applySkin(names[(names.indexOf(skin) + 1) % names.length]);
  skinBtn.blur();
});

let savedSkin = null;
try { savedSkin = localStorage.getItem(SKIN_KEY); } catch (e) { /* ignorar */ }
applySkin(savedSkin);
showModeMenu();
