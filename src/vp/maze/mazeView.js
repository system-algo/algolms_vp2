// Framework-free SVG renderer for the maze game. Draws the map exactly like the original
// (neighbour-based path tiles from the skin sprite, cargo, slots, rocks, minerals, balloons...)
// and replays the frames recorded by mazeEngine.
import skins from './skins.json';
import { T, MazeState, settingsFromConfig, isCargo, isTransporter, isMineral, isCrystalField } from './mazeEngine.js';

const NS = 'http://www.w3.org/2000/svg';
const XLINK = 'http://www.w3.org/1999/xlink';
const S = 50;
const TILE_SHAPES = {
  10010: [4, 0], 10001: [3, 3], 11000: [0, 1], 10100: [0, 2], 11010: [4, 1], 10101: [3, 2], 10110: [0, 0], 10011: [2, 0],
  11001: [4, 2], 11100: [2, 3], 11110: [1, 1], 10111: [1, 0], 11011: [2, 1], 11101: [1, 2], 11111: [2, 2],
  null0: [4, 3], null1: [4, 3], null2: [4, 3], null3: [4, 3], null4: [4, 3],
  '01111': [3, 0], '00111': [3, 0], '01011': [3, 0], '01101': [3, 0], '01110': [3, 0],
};

const el = (name, attrs = {}, parent) => {
  const n = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'href') n.setAttributeNS(XLINK, 'xlink:href', v); else n.setAttribute(k, v);
  }
  if (parent) parent.appendChild(n);
  return n;
};

export function getSkin(name) { return skins[name] || skins.mars; }

export function createMazeView(container, config) {
  const settings = settingsFromConfig(config);
  const skin = getSkin(settings.skin);
  const state = new MazeState(settings); // only used for static layout (start, finish, sizes)
  const { map, rows, cols } = state;
  const scale = Math.max(rows, cols) * S;
  const svg = el('svg', { viewBox: `0 0 ${scale} ${scale}`, width: '100%', height: '100%', preserveAspectRatio: 'xMidYMid meet', class: 'vp-maze-svg' });
  container.innerHTML = '';
  container.appendChild(svg);

  const bgUrl = config.background && String(config.background);
  if (bgUrl) el('image', { href: bgUrl, x: 0, y: 0, width: cols * S, height: rows * S, preserveAspectRatio: 'none' }, svg);
  else if (skin.background) el('image', { href: skin.background, x: 0, y: 0, width: cols * S, height: rows * S }, svg);
  if (skin.graph) {
    for (let r = 0; r < rows; r++) el('line', { x1: 0, x2: cols * S, y1: r * S + S / 2 + 0.5, y2: r * S + S / 2 + 0.5, stroke: skin.graph, 'stroke-width': 1 }, svg);
    for (let c = 0; c < cols; c++) el('line', { y1: 0, y2: rows * S, x1: c * S + S / 2 + 0.5, x2: c * S + S / 2 + 0.5, stroke: skin.graph, 'stroke-width': 1 }, svg);
  }

  const clipRect = (id, x, y, w = S, h = S) => {
    const cp = el('clipPath', { id }, svg); el('rect', { x, y, width: w, height: h }, cp);
  };
  const uid = `m${Math.random().toString(36).slice(2, 7)}`;
  const norm = (x, y) => (x < 0 || x >= cols || y < 0 || y >= rows || map[y][x] === T.WALL ? '0' : '1');

  // objects drawn per cell, keyed so frames can toggle them
  const things = { cargo: {}, rock: {}, mineral: {}, object: {} };

  // 1) path tiles
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    let key = norm(x, y) + norm(x, y - 1) + norm(x + 1, y) + norm(x, y + 1) + norm(x - 1, y);
    if (!TILE_SHAPES[key]) key = key === '00000' && Math.random() > 0.3 ? 'null0' : `null${Math.floor(1 + Math.random() * 4)}`;
    const [l, h] = TILE_SHAPES[key];
    const id = `${uid}t${x}_${y}`;
    clipRect(id, x * S, y * S);
    el('image', { href: skin.tiles, width: 5 * S, height: 4 * S, 'clip-path': `url(#${id})`, x: (x - l) * S, y: (y - h) * S }, svg);
  }

  // 2) finish marker
  if (state.finish) {
    el('image', { href: skin.marker, width: 49, height: 49, x: S * (state.finish.x + 0.5) - 24.5, y: S * (state.finish.y + 0.5) - 24.5 }, svg);
  }

  // 3) per-cell objects
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const t = map[y][x]; const k = `${x}_${y}`;
    if (isCargo(t) && skin.cargo?.[t]) things.cargo[k] = el('image', { href: skin.cargo[t], width: 49, height: 49, x: x * S, y: y * S }, svg);
    if (isTransporter(t) && skin.transporter?.[t]) el('image', { href: skin.transporter[t], width: 49, height: 49, x: x * S, y: y * S }, svg);
    if (t === T.STONE || t === T.MULTI_ROCK) {
      const id = `${uid}r${k}`; clipRect(id, x * S, y * S);
      things.rock[`${y}_${x}`] = { img: el('image', { href: skin.stone, width: 6 * S, height: S, x: x * S, y: y * S, 'clip-path': `url(#${id})` }, svg), x, y };
    }
    if (t === T.CRYSTAL || t === T.GAS || t === T.TRAP || isCrystalField(t)) {
      const l = t === T.CRYSTAL ? 0 : t === T.GAS ? 14 : t === T.TRAP ? 1 : t - 71 + 3;
      const id = `${uid}o${k}`; clipRect(id, x * S, y * S);
      things.object[`crystal${x}_${y}`] = { l, x, y, img: el('image', { href: skin.object, width: 15 * S, height: S, x: (x - l) * S, y: y * S, 'clip-path': `url(#${id})` }, svg) };
    }
    if (isMineral(t)) {
      const l0 = t - 90 < 4 ? 2 : t - 90 < 6 ? 1 : 0; const id = `${uid}m${k}`;
      clipRect(id, x * S, y * S - 10);
      const img = el('image', { href: skin.mineral, width: 4 * S, height: S, x: (x - l0) * S, y: y * S - 10, 'clip-path': `url(#${id})` }, svg);
      const bg = el('ellipse', { cx: x * S + 27, cy: y * S + 27, rx: 12, ry: 10, fill: 'white' }, svg);
      const txt = el('text', { x: x * S + 25 - (t - 90 > 9 ? 6 : 2), y: y * S + 32, 'font-size': 14, 'font-family': 'Verdana', 'font-weight': 'bold' }, svg);
      things.mineral[`${y}_${x}`] = { img, bg, txt, x, y, total: t - 90 };
    }
  }

  // 4) robot
  const robotClip = el('clipPath', { id: `${uid}rc` }, svg);
  const robotClipRect = el('rect', { width: 49, height: 50 }, robotClip);
  const robot = el('image', { href: skin.sprite, width: 49 * (skin.sprite_slides_quantity || 20), height: 50, 'clip-path': `url(#${uid}rc)` }, svg);
  const hud = document.createElement('div'); hud.className = 'vp-maze-hud'; container.appendChild(hud);

  function placeRobot(px, py, dir, bag) {
    const href = bag && skin.sprite_cargo_custom?.[bag] ? skin.sprite_cargo_custom[bag] : (bag ? skin.sprite_cargo : skin.sprite);
    robot.setAttributeNS(XLINK, 'xlink:href', href);
    const x = px * S - dir * 4 * 49 + 1; const y = S * (py + 0.5) - 25 - 8;
    robot.setAttribute('x', x); robot.setAttribute('y', y);
    robotClipRect.setAttribute('x', px * S + 1); robotClipRect.setAttribute('y', y);
  }

  function applyFrame(f) {
    placeRobot(f.x, f.y, f.dir, f.bag);
    for (const [k, node] of Object.entries(things.cargo)) node.style.display = f.cargoCollected.includes(k) ? 'none' : '';
    for (const [k, r] of Object.entries(things.rock)) {
      let off = 0;
      if (f.destroyed[k]) off = 5; else if (f.multiRock[k] !== undefined && f.multiRock[k] < 7) off = Math.min(4, 7 - f.multiRock[k]);
      r.img.setAttribute('x', (r.x - off) * S);
    }
    for (const [k, m] of Object.entries(things.mineral)) {
      const left = f.mineralStatus[k];
      m.txt.textContent = config.commands?.hideMineralTextLabels || (config.commands || []).includes?.('hideMineralTextLabels') ? '?' : left;
      const gone = left <= 0; m.txt.style.display = m.bg.style.display = m.img.style.display = gone ? 'none' : '';
      const l = left < 1 ? 4 : left < 2 ? 3 : left < 4 ? 2 : left < 6 ? 1 : 0;
      m.img.setAttribute('x', (m.x - l) * S);
    }
    for (const [k, o] of Object.entries(things.object)) {
      const taken = f.gasCollected.includes(k) || f.crystalCollected.includes(k);
      o.img.style.display = taken ? 'none' : '';
    }
    const v = Object.entries(f.vars || {});
    hud.textContent = v.length ? v.map(([n, val]) => `${n} = ${val}`).join('   ') : '';
  }

  const initial = state.snapshot('init');
  for (const k of Object.keys(things.mineral)) initial.mineralStatus[k] = state.mineralStatus[k];
  applyFrame(initial);

  let timer = null; let tweenRaf = 0;
  function stop() { clearTimeout(timer); cancelAnimationFrame(tweenRaf); timer = null; }

  /** Replay recorded frames. Resolves when finished. */
  function play(frames, { speed = 6, onFrame } = {}) {
    stop();
    const stepMs = 1000 * Math.pow(1 - speed / 10, 2) * 0.55 + 90;
    return new Promise((resolve) => {
      let prev = initial; let i = 0;
      const next = () => {
        if (i >= frames.length) { resolve(); return; }
        const f = frames[i++]; onFrame?.(f, i - 1);
        const moved = f.x !== prev.x || f.y !== prev.y;
        const start = performance.now(); const from = prev; prev = f;
        if (!moved || /^fail/.test(f.action)) { applyFrame(f); timer = setTimeout(next, stepMs); return; }
        applyFrame({ ...f, x: from.x, y: from.y });
        const tick = (now) => {
          const p = Math.min(1, (now - start) / stepMs);
          placeRobot(from.x + (f.x - from.x) * p, from.y + (f.y - from.y) * p, f.dir, f.bag);
          if (p < 1) tweenRaf = requestAnimationFrame(tick); else { applyFrame(f); timer = setTimeout(next, 30); }
        };
        tweenRaf = requestAnimationFrame(tick);
      };
      next();
    });
  }

  function reset() { stop(); applyFrame(initial); }
  return { svg, play, stop, reset, applyFrame, destroy: () => { stop(); container.innerHTML = ''; } };
}
