import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './vp.css';
import MazeLevel from './levels/MazeLevel.jsx';
import ContentLevel from './levels/ContentLevel.jsx';
import ScratchLevel from './levels/ScratchLevel.jsx';

const BASE = `${import.meta.env.BASE_URL || '/'}vp-data/`.replace('//', '/');
const PROGRESS_KEY = 'vp_replica_progress_v1';
const loadProgress = () => { try { return JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}'); } catch { return {}; } };
const saveProgress = (p) => { try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(p)); } catch { /* ignore */ } };

const MAZE_LIKE = new Set(['maze']);

function LevelBody({ level, onSolved, onNext, hasNext, registry }) {
  const tpl = level.config?.template;
  if (level.type === 'static' && MAZE_LIKE.has(tpl)) return <MazeLevel key={level.id} level={level} onSolved={onSolved} onNext={onNext} hasNext={hasNext} />;
  const Custom = registry[level.type === 'static' ? `static:${tpl}` : level.type];
  if (Custom) return <Custom key={level.id} level={level} onSolved={onSolved} onNext={onNext} hasNext={hasNext} />;
  if (level.type === 'static' || level.type === 'scratch' || level.type === 'scratch_game') {
    return (
      <div className="vp-card">
        <div className="vp-desc" dangerouslySetInnerHTML={{ __html: level.config.description || '' }} />
        <div className="vp-msg bad">This activity type ({level.type === 'static' ? tpl : level.type}) is not available in the replica yet.</div>
        <button className="vp-btn sec" style={{ marginTop: 10 }} onClick={onSolved}>Mark as done</button>
      </div>
    );
  }
  return <div className="vp-card"><ContentLevel key={level.id} level={level} onSolved={onSolved} /></div>;
}

/** Extra level renderers (games, Scratch) register themselves here. */
export const levelRegistry = { scratch: ScratchLevel, scratch_game: ScratchLevel };

export default function VpPlayer() {
  const params = new URLSearchParams(window.location.search);
  const [course, setCourse] = useState(null);
  const [taskId, setTaskId] = useState(params.get('task') ? Number(params.get('task')) : null);
  const [task, setTask] = useState(null);
  const [idx, setIdx] = useState(params.get('level') ? Math.max(0, Number(params.get('level')) - 1) : 0);
  const [progress, setProgress] = useState(loadProgress);
  const [error, setError] = useState('');

  useEffect(() => { fetch(`${BASE}course.json`).then((r) => r.json()).then(setCourse).catch((e) => setError(String(e))); }, []);
  useEffect(() => {
    if (!taskId) { setTask(null); return; }
    fetch(`${BASE}tasks/${taskId}.json`).then((r) => r.json()).then((t) => { setTask(t); }).catch((e) => setError(String(e)));
  }, [taskId]);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search); p.set('vp', '1');
    if (taskId) p.set('task', taskId); if (task) p.set('level', idx + 1);
    window.history.replaceState(null, '', `?${p.toString()}`);
  }, [taskId, idx, task]);

  const levels = useMemo(() => (task?.levels || []).filter((l) => !l.hide), [task]);
  const level = levels[idx];
  const solve = useCallback(() => {
    if (!level) return;
    setProgress((p) => { if (p[level.id]) return p; const n = { ...p, [level.id]: 1 }; saveProgress(n); return n; });
  }, [level]);
  const open = (id) => { setTaskId(id); setIdx(0); };

  return (
    <div className="vp-root">
      <aside className="vp-side">
        <h1>{course?.title || 'Visual Programming'}</h1>
        {error && <div className="vp-msg bad">{error}</div>}
        {course?.modules.map((m) => (
          <details className="vp-mod" key={m.id} open={m.lessons.some((l) => l.tasks.some((t) => t.id === taskId))}>
            <summary>{m.number}. {m.title}</summary>
            {m.lessons.map((l) => (
              <details className="vp-les" key={l.id} open={l.tasks.some((t) => t.id === taskId)}>
                <summary>{l.title}</summary>
                {l.tasks.map((t) => <button key={t.id} className={`vp-task ${t.id === taskId ? 'on' : ''}`} onClick={() => open(t.id)}>{t.title}</button>)}
              </details>
            ))}
          </details>
        ))}
      </aside>
      <main className="vp-main">
        {task && level ? (
          <>
            <div className="vp-bar">
              <h2>{task.title} — {level.title || `Level ${idx + 1}`}</h2>
              <div className="vp-dots">
                {levels.map((l, i) => <button key={l.id} className={`vp-dot ${i === idx ? 'on' : ''} ${progress[l.id] ? 'done' : ''}`} onClick={() => setIdx(i)}>{i + 1}</button>)}
              </div>
            </div>
            <div className="vp-stage">
              <LevelBody level={level} onSolved={solve} onNext={() => setIdx((i) => Math.min(levels.length - 1, i + 1))} hasNext={idx < levels.length - 1} registry={levelRegistry} />
            </div>
          </>
        ) : <div className="vp-stage"><div className="vp-card"><h2>Pick a task on the left to start.</h2></div></div>}
      </main>
    </div>
  );
}
