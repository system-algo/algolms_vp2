import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { test } from 'node:test';
import { stepExcursion } from '../src/components/BlockGame/GameEngine/excursionSimulation.js';

const levels = JSON.parse(readFileSync(new URL('../src/components/BlockGame/levels/excursionReference.json', import.meta.url)));
const run = (level, code) => [...code].reduce((robot, command) => stepExcursion(level, robot, command === 'F' ? { action: 'move_forward' } : { action: 'turn_direction', direction: command === 'L' ? 'left' : 'right' }), { ...level.start });

test('station route follows the original south-facing robot around the obstacle', () => {
  const level = levels[0];
  const result = run(level, 'FLFFLFRF');
  assert.deepEqual({ x: result.x, y: result.y }, level.target);
});
test('greenhouse route reaches the original destination', () => {
  const level = levels[1];
  const result = run(level, 'FFLFFRFFFLF');
  assert.deepEqual({ x: result.x, y: result.y }, level.target);
});
test('a tan obstacle is not a valid shortcut', () => {
  assert.throws(() => run(levels[0], 'LFF'), /obstacle/);
  assert.throws(() => run(levels[1], 'FFFLF'), /obstacle/);
});
test('leaving the track fails; turns wrap correctly', () => {
  assert.throws(() => run(levels[0], 'RFF'), /off the path/);
  assert.equal(run(levels[0], 'LLLL').direction, levels[0].start.direction);
  assert.equal(run(levels[1], 'RRRR').direction, levels[1].start.direction);
});
test('all original art is bundled locally', () => {
  for (const name of ['background1.png', 'background2.png', 'cave.png', 'robot.png', 'tiles.png', 'marker.png', 'mascot.svg', 'intro.svg']) {
    assert(existsSync(new URL(`../public/vp-assets/excursion/${name}`, import.meta.url)), name);
  }
});

test('all captured maze routes reach their original targets', () => {
  const routes = { 3: 'FRFFLFFLFRF', 4: 'RFRFLFRFLF', 5: 'FRFFLFRFFLFFFRF', 6: 'FFFFFF', 8: 'FFFFRFFFF', 9: 'FFFFRFFFFRFFFF', 11: 'FFFFRFFFFFLFFF', 12: 'FFRFLFFRFLFRFFRFLFRFFLFRFF' };
  for (const [number, code] of Object.entries(routes)) {
    const level = levels.find(item => item.number === Number(number));
    const result = run(level, code);
    assert.deepEqual({ x: result.x, y: result.y }, level.target, `task ${number}`);
  }
});
test('loops execute without moving on their iteration marker', () => {
  const level = levels.find(item => item.number === 6);
  assert.deepEqual(stepExcursion(level, level.start, { action: 'repeat_iteration' }), level.start);
});
test('interludes and every referenced asset are present', () => {
  assert.equal(levels.length, 12);
  assert.equal(levels[6].type, 'feedback');
  assert.equal(levels[9].type, 'image');
  for (const level of levels) for (const key of ['background','tiles','pattern','scenery','image','instructionImage']) {
    if (level[key]) assert(existsSync(new URL(`../public${level[key]}`, import.meta.url)), `${level.number}: ${key}`);
  }
});
