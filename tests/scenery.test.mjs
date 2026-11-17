import test from 'node:test';
import assert from 'node:assert/strict';
import { sceneryPlacement } from '../src/components/BlockGame/GameEngine/sceneryPlacement.js';
import { readFileSync } from 'node:fs';

for (const name of ['rocket', 'excursion']) {
  const levels = JSON.parse(readFileSync(new URL(`../src/components/BlockGame/levels/${name}Reference.json`, import.meta.url)));
  for (const level of Object.values(levels).filter(level => level.scenery)) {
    test(`${name} ${level.number}: scene stays anchored to the route at all pane widths`, () => {
      const [, , width] = level.viewBox.split(/\s+/).map(Number);
      const scene = sceneryPlacement(level.viewBox, level.scenery);
      const asset = readFileSync(new URL(`../public${level.scenery}`, import.meta.url), 'utf8');
      assert.ok(asset.includes(`viewBox="0 0 679 ${level.scenery.endsWith('/map2_2_9.svg') ? 1000 : 768}"`));
      for (const paneWidth of [240, 400, 545, 900]) {
        const scale = Math.min(paneWidth, 400) / width;
        const boardScale = Math.min(paneWidth, 400) / 400;
        assert.ok(Math.abs(scene.x * scale - (-179 * boardScale)) < 1e-9);
        assert.ok(Math.abs(scene.y * scale - (-70 * boardScale)) < 1e-9);
        assert.ok(Math.abs(scene.width * scale - 679 * boardScale) < 1e-9);
        assert.ok(Math.abs(scene.height * scale - (level.scenery.endsWith('/map2_2_9.svg') ? 1000 : 768) * boardScale) < 1e-9);
      }
    });
  }
}
