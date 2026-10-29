// Block catalogue for the VP maze editor (mirrors the original Blockly Games derivative).
const NUM = (n) => Array.from({ length: n }, (_, i) => String(i));
export const COLORS = { move: '#6a5acd', logic: '#2e9e5b', loop: '#e08a1e', cargo: '#d9534f', sensor: '#2b7bd6', var: '#ef7e0f', special: '#8e44ad' };

const sensorBlock = (label, dirs) => ({ kind: 'value', color: COLORS.sensor, fields: [{ name: 'DIR', options: dirs.map(([v, l]) => [v, `${label} ${l}`]) }] });
const inDir = (kind, noun) => sensorBlock('', [[`is${kind}Forward`, `${noun} in front`], [`is${kind}Left`, `${noun} on the left`], [`is${kind}Right`, `${noun} on the right`], [`is${kind}Here`, `${noun} under the robot`]]);

export const DEFS = {
  maze_start: { kind: 'hat', label: 'When ▶ clicked', color: '#f5a623' },
  maze_moveForward: { kind: 'stmt', label: 'move forward', color: COLORS.move },
  maze_moveUp: { kind: 'stmt', label: 'move up ↑', color: COLORS.move },
  maze_moveRight: { kind: 'stmt', label: 'move right →', color: COLORS.move },
  maze_moveDown: { kind: 'stmt', label: 'move down ↓', color: COLORS.move },
  maze_moveLeft: { kind: 'stmt', label: 'move left ←', color: COLORS.move },
  maze_turn: { kind: 'stmt', color: COLORS.move, fields: [{ name: 'DIR', options: [['turnLeft', 'turn left ↺'], ['turnRight', 'turn right ↻']] }] },
  maze_turnInDirection: { kind: 'stmt', color: COLORS.move, fields: [{ name: 'DIR', options: [['turnAbsoluteUp', 'turn to face up'], ['turnAbsoluteRight', 'turn to face right'], ['turnAbsoluteDown', 'turn to face down'], ['turnAbsoluteLeft', 'turn to face left']] }] },
  maze_takeCargo: { kind: 'stmt', label: 'take cargo', color: COLORS.cargo },
  maze_putCargo: { kind: 'stmt', label: 'put cargo', color: COLORS.cargo },
  maze_destroy: { kind: 'stmt', label: 'destroy', color: '#ff0000' },
  maze_harvest: { kind: 'stmt', label: 'harvest', color: COLORS.special },
  maze_repeat_internal: { kind: 'c', label: 'repeat', suffix: 'times', color: COLORS.loop, fields: [{ name: 'TIMES', number: true, def: '4' }], statements: ['DO'] },
  maze_repeat_var_times: { kind: 'c', label: 'repeat', suffix: 'times', color: COLORS.loop, fields: [{ name: 'TIMES', options: [['steps', 'steps'], ['minerals', 'minerals'], ['variable', 'variable']] }], statements: ['DO'] },
  maze_controls_until: { kind: 'c', label: 'repeat until', color: COLORS.loop, values: ['BOOL'], statements: ['DO'] },
  maze_controls_while: { kind: 'c', label: 'repeat while', color: COLORS.loop, values: ['BOOL'], statements: ['DO'] },
  maze_if: { kind: 'c', label: 'if', color: COLORS.logic, values: ['IF0'], statements: ['DO0'] },
  maze_if_else: { kind: 'c', label: 'if', color: COLORS.logic, values: ['IF0'], statements: ['DO0', 'DO1'], elseLabel: 'else' },
  maze_path_in_direction: inDir('Path', 'path'),
  maze_stone_in_direction: inDir('Stone', 'stone'),
  maze_finish_in_direction: inDir('Finish', 'finish'),
  maze_mineral_in_direction: inDir('Mineral', 'mineral'),
  maze_balloon_in_direction: inDir('Balloon', 'balloon'),
  maze_dynamite_in_direction: inDir('Dynamite', 'dynamite'),
  maze_cargo_color: { kind: 'value', color: COLORS.sensor, label: 'cargo colour is', fields: [{ name: 'COLOR', options: [['1', 'red'], ['2', 'blue'], ['3', 'green'], ['4', 'yellow']] }] },
  maze_cargo_type: { kind: 'value', color: COLORS.sensor, label: 'cargo shape is', fields: [{ name: 'TYPE', options: [['1', 'cube'], ['2', 'prism']] }] },
  maze_compare: { kind: 'value', color: COLORS.sensor, values: ['A', 'B'], fields: [{ name: 'OP', options: [['EQ', '='], ['NOTEQ', '≠']] }], infix: true },
  maze_cargo_test: { kind: 'value', color: COLORS.sensor, fields: [{ name: 'cargotest', options: [['Color', 'cargo colour'], ['Type', 'cargo shape']] }] },
  maze_colour: { kind: 'value', color: COLORS.sensor, fields: [{ name: 'colour', options: [['1', '🟥 red'], ['2', '🟦 blue'], ['3', '🟩 green'], ['4', '🟨 yellow']] }] },
  maze_type: { kind: 'value', color: COLORS.sensor, fields: [{ name: 'type', options: [['1', '▣ cube'], ['2', '◭ prism']] }] },
  variables_set: { kind: 'stmt', label: 'set', color: COLORS.var, fields: [{ name: 'VAR', text: true, def: 'variable' }, { name: 'VALUE', options: NUM(5).map((n) => [n, `= ${n}`]) }] },
  variables_change: { kind: 'stmt', label: 'change', color: COLORS.var, fields: [{ name: 'VAR', text: true, def: 'variable' }, { name: 'DELTA', options: NUM(5).map((n) => [n, `by ${n}`]) }] },
  variables_equal: { kind: 'value', color: COLORS.var, fields: [{ name: 'VAR', text: true, def: 'variable' }, { name: 'VALUE', options: NUM(5).map((n) => [n, `= ${n}`]) }] },
  mineral_variables_set: { kind: 'stmt', label: 'set minerals', color: COLORS.var, fixed: { VAR: 'minerals' }, fields: [{ name: 'VALUE', options: NUM(5).map((n) => [n, `= ${n}`]) }] },
  mineral_variables_change: { kind: 'stmt', label: 'change minerals', color: COLORS.var, fixed: { VAR: 'minerals' }, fields: [{ name: 'DELTA', options: NUM(5).map((n) => [n, `by ${n}`]) }] },
  mineral_variables_equal: { kind: 'value', label: 'minerals', color: COLORS.var, fixed: { VAR: 'minerals' }, fields: [{ name: 'VALUE', options: NUM(5).map((n) => [n, `= ${n}`]) }] },
  steps_variables_set: { kind: 'stmt', label: 'set steps', color: COLORS.var, fixed: { VAR: 'steps' }, fields: [{ name: 'VALUE', options: NUM(5).map((n) => [n, `= ${n}`]) }] },
  steps_variables_change: { kind: 'stmt', label: 'change steps', color: COLORS.var, fixed: { VAR: 'steps' }, fields: [{ name: 'DELTA', options: NUM(5).map((n) => [n, `by ${n}`]) }] },
  steps_variables_equal: { kind: 'value', label: 'steps', color: COLORS.var, fixed: { VAR: 'steps' }, fields: [{ name: 'VALUE', options: NUM(5).map((n) => [n, `= ${n}`]) }] },
};

/** Ordered toolbox for a level, following the original Toolbox.getContent(). */
export function toolboxFor(commands) {
  const c = commands || {};
  const out = [];
  const add = (type, preset) => out.push({ type, preset });
  if (c.canMoveInDirection) ['Up', 'Right', 'Down', 'Left'].forEach((d) => add(`maze_move${d}`));
  else if (c.turnInDirection) { add('maze_moveForward'); add('maze_turnInDirection'); }
  else { add('maze_moveForward'); add('maze_turn', { DIR: 'turnLeft' }); add('maze_turn', { DIR: 'turnRight' }); }
  if (c.takeCargo) add('maze_takeCargo');
  if (c.putCargo) add('maze_putCargo');
  if (c.destroy) add('maze_destroy');
  if (c.harvest) add('maze_harvest');
  if (c.repeat) add('maze_repeat_internal', { TIMES: '4' });
  if (c.repeatVarTimes) add('maze_repeat_var_times');
  if (c.maze_controls_until || c.until) add('maze_controls_until');
  if (c.maze_controls_while) add('maze_controls_while');
  if (c.if) add('maze_if');
  if (c.ifElse) add('maze_if_else');
  if (c.pathInDirection) add('maze_path_in_direction');
  if (c.stoneInDirection) add('maze_stone_in_direction');
  if (c.finishInDirection) add('maze_finish_in_direction');
  if (c.mineralInDirection) add('maze_mineral_in_direction');
  if (c.balloonInDirection) add('maze_balloon_in_direction');
  if (c.dynamiteInDirection) add('maze_dynamite_in_direction');
  if (c.cargoColor) add('maze_cargo_color');
  if (c.cargoType) add('maze_cargo_type');
  if (c.compare) {
    add('maze_compare'); add('maze_cargo_test', { cargotest: 'Color' }); add('maze_cargo_test', { cargotest: 'Type' });
    [1, 2, 3, 4].forEach((n) => add('maze_colour', { colour: String(n) })); [1, 2].forEach((n) => add('maze_type', { type: String(n) }));
  }
  if (c.mineralVariables) { add('mineral_variables_set'); add('mineral_variables_change'); add('mineral_variables_equal'); }
  if (c.stepsVariables) { add('steps_variables_set'); add('steps_variables_change'); add('steps_variables_equal'); }
  if (c.variables) { add('variables_set'); add('variables_change'); add('variables_equal'); }
  return out;
}

let counter = 0;
export const newId = () => `b${Date.now().toString(36)}${(counter++).toString(36)}`;

export function makeBlock(type, preset = {}) {
  const def = DEFS[type];
  const fields = { ...(def.fixed || {}) };
  for (const f of def.fields || []) fields[f.name] = preset[f.name] ?? f.def ?? (f.options ? f.options[0][0] : '');
  return { id: newId(), type, fields, values: {}, statements: {}, next: null };
}

/** Assign ids to a parsed tree (so editor operations can address blocks). */
export function withIds(b) {
  if (!b) return null;
  return { ...b, id: newId(), values: Object.fromEntries(Object.entries(b.values).map(([k, v]) => [k, withIds(v)])), statements: Object.fromEntries(Object.entries(b.statements).map(([k, v]) => [k, withIds(v)])), next: withIds(b.next) };
}

export function countBlocks(b) {
  if (!b) return 0;
  return 1 + countBlocks(b.next) + Object.values(b.values).reduce((n, v) => n + countBlocks(v), 0) + Object.values(b.statements).reduce((n, v) => n + countBlocks(v), 0);
}
