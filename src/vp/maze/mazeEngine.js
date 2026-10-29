// Pure-logic port of the original platform's maze game rules (all skins share them).
// Tile codes and behaviour were read from the original game source.
import { programFromXml } from './blocklyXml.js';

export const T = {
  WALL: 0, OPEN: 1, START: 2, FINISH: 3, CARGO: 4, TRANSPORTER: 5, STONE: 6, GAS: 8, CRYSTAL: 9, TRAP: 10,
  UNKNOWN_CARGO: 20, RED_CARGO: 21, BLUE_CARGO: 22, GREEN_CARGO: 23, YELLOW_CARGO: 24,
  RED_CARGO2: 25, BLUE_CARGO2: 26, GREEN_CARGO2: 27, YELLOW_CARGO2: 28, MULTI_ROCK: 30,
  RED_TRANSPORTER: 11, BLUE_TRANSPORTER: 12, GREEN_TRANSPORTER: 13, YELLOW_TRANSPORTER: 14,
  RED_TRANSPORTER2: 15, BLUE_TRANSPORTER2: 16, GREEN_TRANSPORTER2: 17, YELLOW_TRANSPORTER2: 18,
};
export const NORTH = 0, EAST = 1, SOUTH = 2, WEST = 3;
const DIRS = { NORTH, EAST, SOUTH, WEST, UP: NORTH, RIGHT: EAST, DOWN: SOUTH, LEFT: WEST };
const mod4 = (n) => ((n % 4) + 4) % 4;
export const isCargo = (t) => (t >= 20 && t <= 28) || t === T.CARGO;
export const isTransporter = (t) => t === T.TRANSPORTER || (t >= 11 && t <= 18);
export const isMineral = (t) => t >= 91 && t <= 100;
export const isCrystalField = (t) => t >= 71 && t <= 76;
const CARGO_COLOR = { 21: 1, 22: 2, 23: 3, 24: 4, 25: 1, 26: 2, 27: 3, 28: 4 };
const CARGO_TYPE = { 21: 1, 22: 1, 23: 1, 24: 1, 25: 2, 26: 2, 27: 2, 28: 2 };
const TRANSPORTER_FOR = { 11: 21, 12: 22, 13: 23, 14: 24, 15: 25, 16: 26, 17: 27, 18: 28 };

/** Normalise the captured config (snake_case + camelCase) into engine settings. */
export function settingsFromConfig(config) {
  const c = config || {};
  const cmd = c.commands;
  const commands = Array.isArray(cmd) ? Object.fromEntries(cmd.map((k) => [k, true])) : { ...(cmd || {}) };
  return {
    map: c.map,
    skin: c.skin || 'mars',
    startDirection: DIRS[String(c.startDirection || 'EAST').toUpperCase()] ?? EAST,
    multibag: !!c.multibag,
    cargoTypes: c.cargoTypes || c.cargo_types || [],
    gasAmount: +(c.gasAmount ?? c.gas_amount ?? 0),
    gasLimit: +(c.gasLimit ?? c.gas_limit ?? 1),
    crystalAmount: +(c.crystalAmount ?? c.crystal_amount ?? 0),
    mineralsNeed: +(c.mineralsNeed ?? c.minerals_need ?? 0),
    limit: c.limit ?? null,
    commands,
  };
}

export class MazeState {
  constructor(settings) {
    this.s = settings;
    this.map = settings.map;
    this.rows = this.map.length;
    this.cols = this.map[0].length;
    this.start = { x: 0, y: 0 };
    this.finish = null;
    for (let y = 0; y < this.rows; y++) for (let x = 0; x < this.cols; x++) {
      if (this.map[y][x] === T.START) this.start = { x, y };
      else if (this.map[y][x] === T.FINISH) this.finish = { x, y };
    }
    this.reset();
  }

  reset() {
    const s = this.s;
    this.x = this.start.x; this.y = this.start.y; this.dir = s.startDirection;
    this.bag = false; this.destroyed = {}; this.multiRock = {};
    this.cargoLeft = 0; this.stoneLeft = 0; this.cargoCollected = [];
    this.mineralStatus = {}; this.minerals = 0;
    this.gas = []; this.gasCollected = []; this.crystals = []; this.crystalCollected = [];
    this.vars = {}; this.frames = [];
    for (let y = 0; y < this.rows; y++) for (let x = 0; x < this.cols; x++) {
      const t = this.map[y][x]; const k = `crystal${x}_${y}`;
      if (isCargo(t)) this.cargoLeft++;
      if (t === T.STONE) this.stoneLeft++;
      if (t === T.MULTI_ROCK) { this.stoneLeft++; this.multiRock[`${y}_${x}`] = 7; }
      if (isMineral(t)) this.mineralStatus[`${y}_${x}`] = t - 90; // tile 91..100 = 1..10 harvests
      if (t === T.GAS) this.gas.push(k);
      if (t === T.CRYSTAL) this.crystals.push(k);
    }
    this.randomise();
  }

  /** Crystal fields (71-76): `gasLimit` random tiles of each field hide a balloon. */
  randomise() {
    for (let f = 71; f <= 76; f++) {
      const tiles = [];
      for (let y = 0; y < this.rows; y++) for (let x = 0; x < this.cols; x++) if (this.map[y][x] === f) tiles.push(`crystal${x}_${y}`);
      if (!tiles.length) continue;
      for (let i = 0; i < this.s.gasLimit; i++) this.gas.push(tiles[Math.floor(Math.random() * tiles.length)]);
    }
  }

  cell(x, y) { return this.map[y] ? this.map[y][x] : undefined; }
  here() { return this.map[this.y][this.x]; }
  target(rel) {
    const d = mod4(this.dir + rel);
    const dx = d === EAST ? 1 : d === WEST ? -1 : 0; const dy = d === SOUTH ? 1 : d === NORTH ? -1 : 0;
    return { x: this.x + dx, y: this.y + dy };
  }
  tileAt(rel) { const p = this.target(rel); return this.cell(p.x, p.y); }

  snapshot(action) {
    return {
      action, x: this.x, y: this.y, dir: this.dir, bag: this.bag,
      cargoCollected: [...this.cargoCollected], destroyed: { ...this.destroyed }, multiRock: { ...this.multiRock },
      mineralStatus: { ...this.mineralStatus }, gasCollected: [...this.gasCollected], crystalCollected: [...this.crystalCollected],
      vars: { ...this.vars },
    };
  }
  record(action) { (this.frames ||= []).push(this.snapshot(action)); }

  fail(msg) { this.record(msg); const e = new Error(msg); e.mazeFail = msg; throw e; }

  // ---- commands ----
  move(rel = 0) {
    const t = this.tileAt(rel);
    if (t === undefined || t === T.WALL || t === T.TRAP) this.fail(rel ? 'fail_backward' : 'fail_forward');
    const p = this.target(rel); this.x = p.x; this.y = p.y;
  }
  turn(right) { this.dir = mod4(this.dir + (right ? 1 : -1)); }
  turnAbsolute(d) {
    const diff = this.dir - d;
    if (diff === 0) return;
    if (diff === 1 || diff === -3) this.turn(false);
    else if (diff === -1 || diff === 3) this.turn(true);
    else { this.turn(false); this.turn(false); }
  }
  moveInDirection(d) { this.turnAbsolute(d); this.move(0); }
  take() {
    const t = this.here(); const key = `${this.x}_${this.y}`;
    const free = !this.bag || this.s.multibag;
    if (isCargo(t) && free && !this.cargoCollected.includes(key)) {
      if (!this.s.multibag) this.bag = t;
      this.cargoLeft--; this.cargoCollected.push(key); return;
    }
    const k = `crystal${this.x}_${this.y}`;
    const taken = this.gasCollected.includes(k) || this.crystalCollected.includes(k);
    if (!taken && t === T.GAS) { this.gasCollected.push(k); return; }
    if (!taken && t === T.CRYSTAL) { this.crystalCollected.push(k); return; }
    if (!taken && isCrystalField(t) && (this.gas.includes(k) || this.crystals.includes(k))) { this.gasCollected.push(k); return; }
    this.fail('fail_take');
  }
  put() {
    const t = this.here(); const b = this.bag;
    const ok = isTransporter(t) && !!b && (t === T.TRANSPORTER || TRANSPORTER_FOR[t] === b);
    if (!ok) this.fail('fail_put');
    this.bag = false;
  }
  destroy() {
    const t = this.here(); const k = `${this.y}_${this.x}`;
    if (t === T.STONE && !this.destroyed[k]) { this.destroyed[k] = true; this.stoneLeft--; return; }
    if (t === T.MULTI_ROCK && !this.destroyed[k]) {
      this.multiRock[k]--;
      if (this.multiRock[k] <= 1) { this.destroyed[k] = true; this.stoneLeft--; }
      return;
    }
    this.fail('fail');
  }
  harvest() {
    const t = this.here(); const k = `${this.y}_${this.x}`;
    if (!(t > 90 && t <= 100 && this.mineralStatus[k] > 0)) this.fail('fail');
    this.mineralStatus[k]--; this.minerals++;
  }

  // ---- sensors ----
  isPath(rel) { const t = this.tileAt(rel); return t !== T.WALL && t !== undefined && t !== T.TRAP; }
  isStone(rel) { const t = this.tileAt(rel); return t === T.STONE || t === T.MULTI_ROCK; }
  isStoneHere() { return !this.destroyed[`${this.y}_${this.x}`] && (this.here() === T.STONE || this.here() === T.MULTI_ROCK); }
  isFinish(rel) { return this.tileAt(rel) === T.FINISH; }
  isMineralAt(rel) {
    const p = this.target(rel); const t = this.cell(p.x, p.y);
    return isMineral(t) && this.mineralStatus[`${p.y}_${p.x}`] !== 0;
  }
  isBalloonAt(rel, here) {
    const p = here ? { x: this.x, y: this.y } : this.target(rel); const t = this.cell(p.x, p.y);
    const k = `crystal${p.x}_${p.y}`;
    return (t === T.GAS || this.gas.includes(k)) && !this.gasCollected.includes(k);
  }
  isDynamiteAt(rel, here) { return (here ? this.here() : this.tileAt(rel)) === T.TRAP; }
  resolveBag() {
    if (!isCargo(this.bag)) this.fail('fail_check_cargo');
    if (this.bag === T.UNKNOWN_CARGO || this.bag === T.CARGO) {
      const opts = this.s.cargoTypes;
      if (opts.length) this.bag = opts[Math.floor(Math.random() * opts.length)];
    }
  }
  cargoColor() { this.resolveBag(); return CARGO_COLOR[this.bag] ?? 0; }
  cargoType() { this.resolveBag(); return CARGO_TYPE[this.bag] ?? 0; }

  isDone() {
    const s = this.s;
    if (this.gasCollected.length < s.gasAmount || this.crystalCollected.length < s.crystalAmount) return false;
    if (s.mineralsNeed !== this.minerals) return false;
    if (this.cargoLeft > 0 || this.bag || this.stoneLeft > 0) return false;
    return !this.finish || (this.x === this.finish.x && this.y === this.finish.y);
  }
}

const REL = { Forward: 0, Right: 1, Backward: 2, Left: 3 };
function sensor(state, name) {
  const m = /^is(Path|Stone|Finish|Mineral|Balloon|Dynamite)(Forward|Right|Backward|Left|Here)$/.exec(name);
  if (!m) throw new Error(`unknown sensor ${name}`);
  const [, kind, where] = m; const here = where === 'Here'; const rel = REL[where];
  switch (kind) {
    case 'Path': return here ? true : state.isPath(rel);
    case 'Stone': return here ? state.isStoneHere() : state.isStone(rel);
    case 'Finish': return here ? state.here() === T.FINISH : state.isFinish(rel);
    case 'Mineral': return here ? (state.here() > 90 && state.here() <= 100 && state.mineralStatus[`${state.y}_${state.x}`] > 0) : state.isMineralAt(rel);
    case 'Balloon': return state.isBalloonAt(rel, here);
    default: return state.isDynamiteAt(rel, here);
  }
}

const MAX_STEPS = 10000;
// mineral_/steps_ variable blocks always address one fixed variable (their label is localised in captured XML)
const varName = (b) => (b.type.startsWith('mineral_') ? 'minerals' : b.type.startsWith('steps_') ? 'steps' : b.fields.VAR);

/** Evaluate a value block to a primitive. */
function evalValue(state, b) {
  if (!b) return false;
  switch (b.type) {
    case 'maze_path_in_direction': case 'maze_stone_in_direction': case 'maze_finish_in_direction':
    case 'maze_mineral_in_direction': case 'maze_balloon_in_direction': case 'maze_dynamite_in_direction':
      return sensor(state, b.fields.DIR);
    case 'maze_logical_not': return !evalValue(state, b.values.NOT);
    case 'maze_compare': {
      const eq = evalValue(state, b.values.A) == evalValue(state, b.values.B); // eslint-disable-line eqeqeq
      return b.fields.OP === 'EQ' ? eq : !eq;
    }
    case 'maze_cargo_test': return b.fields.cargotest === 'Color' ? state.cargoColor() : state.cargoType();
    case 'maze_colour': return +b.fields.colour;
    case 'maze_type': return +b.fields.type;
    case 'maze_cargo_color': return state.cargoColor() === +b.fields.COLOR;
    case 'maze_cargo_type': return state.cargoType() === +b.fields.TYPE;
    case 'mineral_variables_equal': case 'steps_variables_equal': case 'variables_equal': {
      const v = state.vars[varName(b)];
      if (typeof v !== 'number') state.fail('fail_undefined_variable');
      return v === (Number(b.fields.VALUE) || 0);
    }
    case 'variables_get': case 'maze_variable_get': return state.vars[varName(b)];
    default: throw new Error(`unsupported value block ${b.type}`);
  }
}

/**
 * Run a block program against a fresh state.
 * Returns { ok, done, error, steps, state }.
 */
export function runProgram(settings, program) {
  const state = new MazeState(settings);
  let steps = 0;
  const tick = () => { if (++steps > MAX_STEPS) { const e = new Error('timeout'); e.mazeTimeout = true; throw e; } };

  function exec(b) {
    for (; b; b = b.next) {
      tick();
      switch (b.type) {
        case 'maze_moveForward': state.move(0); break;
        case 'maze_moveBackward': state.move(2); break;
        case 'maze_moveUp': state.moveInDirection(NORTH); break;
        case 'maze_moveRight': state.moveInDirection(EAST); break;
        case 'maze_moveDown': state.moveInDirection(SOUTH); break;
        case 'maze_moveLeft': state.moveInDirection(WEST); break;
        case 'maze_turn': state.turn(b.fields.DIR === 'turnRight'); break;
        case 'maze_turnInDirection': {
          const d = { turnAbsoluteRight: EAST, turnAbsoluteLeft: WEST, turnAbsoluteUp: NORTH, turnAbsoluteDown: SOUTH }[b.fields.DIR];
          state.turnAbsolute(d); break;
        }
        case 'maze_takeCargo': state.take(); break;
        case 'maze_putCargo': state.put(); break;
        case 'maze_destroy': state.destroy(); break;
        case 'maze_harvest': state.harvest(); break;
        case 'maze_repeat_internal': case 'controls_repeat': case 'controls_repeat_ext': {
          const n = b.type === 'controls_repeat_ext' ? +evalValue(state, b.values.TIMES) : +b.fields.TIMES;
          for (let i = 0; i < n; i++) exec(b.statements.DO);
          break;
        }
        case 'maze_repeat_var_times': {
          const n = state.vars[b.fields.TIMES];
          if (typeof n !== 'number') state.fail('fail_undefined_variable');
          for (let i = 0; i < n; i++) exec(b.statements.DO);
          break;
        }
        case 'maze_controls_until': case 'maze_until': while (!evalValue(state, b.values.BOOL)) { tick(); exec(b.statements.DO); } break;
        case 'maze_controls_while': while (evalValue(state, b.values.BOOL)) { tick(); exec(b.statements.DO); } break;
        case 'maze_if': if (evalValue(state, b.values.IF0)) exec(b.statements.DO0); break;
        case 'maze_if_else': exec(evalValue(state, b.values.IF0) ? b.statements.DO0 : b.statements.DO1); break;
        case 'variables_set': case 'mineral_variables_set': case 'steps_variables_set': state.vars[varName(b)] = Number(b.fields.VALUE) || 0; break;
        case 'variables_change': case 'mineral_variables_change': case 'steps_variables_change': {
          if (typeof state.vars[varName(b)] !== 'number') state.fail('fail_undefined_variable');
          state.vars[varName(b)] += Number(b.fields.DELTA) || 0; break;
        }
        case 'maze_start': break;
        default: throw new Error(`unsupported block ${b.type}`);
      }
      if (/^(maze_(move|turn|take|put|destroy|harvest)|(variables|mineral_variables|steps_variables)_(set|change))/.test(b.type)) state.record(b.type);
    }
  }

  let error = null;
  try { exec(program); } catch (e) { error = e; }
  const failMsg = error && (error.mazeFail || (error.mazeTimeout ? 'timeout' : null));
  if (error && !failMsg) throw error; // genuine engine bug / unsupported block
  return { ok: !error, done: !error && state.isDone(), error: failMsg, steps, state };
}

export function runXml(config, xml) {
  return runProgram(settingsFromConfig(config), programFromXml(xml));
}
