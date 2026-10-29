// Runs every captured maze level's own stored solution through the engine.
import fs from 'node:fs';
import { runXml } from '../src/vp/maze/mazeEngine.js';
const dir = new URL('../public/vp-data/tasks/', import.meta.url);
let pass = 0; const bad = [];
for (const f of fs.readdirSync(dir)) {
  const t = JSON.parse(fs.readFileSync(new URL(f, dir), 'utf8'));
  for (const l of t.levels) {
    if (l.type !== 'static' || l.config.template !== 'maze') continue;
    const xml = l.config.correctSolutionCode;
    if (!xml) { bad.push([l.id, t.id, l.config.skin, 'no solution']); continue; }
    try {
      const r = runXml(l.config, xml);
      if (r.done) pass++; else bad.push([l.id, t.id, l.config.skin, r.error || 'not done']);
    } catch (e) { bad.push([l.id, t.id, l.config.skin, 'ENGINE: ' + e.message]); }
  }
}
console.log('pass', pass, 'fail', bad.length);
for (const b of bad) console.log(b.join(' '));
