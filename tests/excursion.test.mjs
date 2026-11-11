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
