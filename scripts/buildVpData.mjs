// Builds public/vp-data from the raw capture in input/vp-capture/vp_capture_all.json.
//   node scripts/buildVpData.mjs
//
// Output
//   public/vp-data/course.json        modules -> lessons -> tasks (no student progress)
//   public/vp-data/tasks/<id>.json    the levels of one task, asset URLs rewritten
//
// Asset URL rules (files live in public/vp-assets):
//   /uploads/...            -> /vp-assets/uploads/...
//   /img/...                -> /vp-assets/game/img/...
//   maze/img/..., turtle/img/...  -> /vp-assets/game/img/games/maze|turtle/...

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CAPTURE = path.join(ROOT, 'input/vp-capture/vp_capture_all.json');
const OUT = path.join(ROOT, 'public/vp-data');

const capture = JSON.parse(fs.readFileSync(CAPTURE, 'utf8'));
const { syllabus, tasks } = capture;

function encodePath(p) {
  return p.split('/').map((seg) => encodeURIComponent(decodeURIComponent(seg))).join('/');
}

function rewriteUrl(url) {
  const clean = url.split('?')[0];
  if (clean.startsWith('/uploads/')) return '/vp-assets/uploads' + encodePath(clean.slice('/uploads'.length));
  if (clean.startsWith('/img/')) return '/vp-assets/game/img' + encodePath(clean.slice('/img'.length));
  const m = clean.match(/^(maze|turtle)\/img\/(.+)$/);
  if (m) return `/vp-assets/game/img/games/${m[1]}/` + encodePath(m[2]);
  return url;
}

function rewriteString(s) {
  // whole-string asset paths
  if (/^(\/uploads\/|\/img\/|maze\/img\/|turtle\/img\/)/.test(s)) return rewriteUrl(s);
  // asset paths inside html strings
  if (s.includes('/uploads/') || s.includes('/img/')) {
    return s.replace(/(["'(])(\/(?:uploads|img)\/[^"')\s]+)/g, (_, q, u) => q + rewriteUrl(u));
  }
  return s;
}

function walk(value) {
  if (typeof value === 'string') return rewriteString(value);
  if (Array.isArray(value)) return value.map(walk);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = walk(v);
    return out;
  }
  return value;
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'tasks'), { recursive: true });

const moduleIndex = new Map(syllabus.modules.map((m, i) => [m.id, i + 1]));

const course = {
  courseId: syllabus.course.id,
  title: syllabus.course.displayName,
  modules: syllabus.modules.map((m, i) => ({
    id: m.id,
    number: i + 1,
    title: m.title,
    lessons: syllabus.lessons
      .filter((l) => l.moduleId === m.id)
      .map((l) => ({
        id: l.id,
        title: l.publicTitle || l.title,
        moduleNumber: i + 1,
        tasks: syllabus.tasks
          .filter((t) => t.lessonId === l.id)
          .map((t) => {
            const td = tasks[String(t.id)]?.data;
            return {
              id: t.id,
              title: t.title,
              type: t.type,
              isBonus: Boolean(t.isBonus),
              levelCount: td?.levels?.length || 0,
            };
          }),
      })),
  })),
};

fs.writeFileSync(path.join(OUT, 'course.json'), JSON.stringify(course, null, 1));

let levelCount = 0;
for (const t of syllabus.tasks) {
  const td = tasks[String(t.id)]?.data;
  if (!td) continue;
  const levels = (td.levels || []).map((l) => {
    levelCount += 1;
    return walk({
      id: l.id,
      position: l.position,
      type: l.type,
      title: l.title,
      levelScore: l.levelScore,
      isAllowFail: l.isAllowFail,
      hide: l.hide,
      config: l.config || {},
      comics: l.comics || [],
      timerType: l.timerType,
      timerSeconds: l.timerSeconds,
    });
  });
  const lesson = syllabus.lessons.find((l) => l.id === t.lessonId);
  fs.writeFileSync(
    path.join(OUT, 'tasks', `${t.id}.json`),
    JSON.stringify({
      id: t.id,
      title: t.title,
      lessonId: t.lessonId,
      moduleNumber: moduleIndex.get(lesson?.moduleId),
      type: t.type,
      isBonus: Boolean(t.isBonus),
      levels,
    }),
  );
}

console.log(`vp-data: ${course.modules.length} modules, ${syllabus.lessons.length} lessons, ${syllabus.tasks.length} tasks, ${levelCount} levels`);
