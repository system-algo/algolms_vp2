import React, { useEffect, useState } from 'react';

const BASE = import.meta.env.BASE_URL || '/';
const EDITOR = `${BASE}vp-assets/scratch-gui/editor.html`.replace('//', '/');

function Presentation({ p, description }) {
  if (!p && !description) return null;
  return (
    <div className="vp-sc-panel">
      {p?.title && <h3>{p.title}</h3>}
      {p?.image && <img src={p.image} alt="" />}
      {p?.text && <p style={{ whiteSpace: 'pre-line' }}>{p.text}</p>}
      {description && <div className="vp-desc" dangerouslySetInnerHTML={{ __html: description }} />}
    </div>
  );
}

export default function ScratchLevel({ level, onSolved, onNext, hasNext }) {
  const c = level.config;
  const projectId = c.project;
  const showEditor = !c.presentation_only && projectId;
  const [open, setOpen] = useState(true);
  const [editorOk, setEditorOk] = useState(null);
  const [done, setDone] = useState(false);

  useEffect(() => { setDone(false); setOpen(true); }, [level.id]);
  useEffect(() => {
    if (!showEditor) return;
    fetch(EDITOR, { method: 'HEAD' }).then((r) => setEditorOk(r.ok && /html/.test(r.headers.get('content-type') || ''))).catch(() => setEditorOk(false));
  }, [showEditor]);

  if (!showEditor) {
    return (
      <div className="vp-card">
        <Presentation p={c.presentation} description={c.description} />
        <button className="vp-btn" onClick={() => { onSolved?.(); setDone(true); }}>Got it</button>
        {done && hasNext && <button className="vp-btn sec" style={{ marginLeft: 8 }} onClick={onNext}>Next level →</button>}
      </div>
    );
  }
  return (
    <div className={`vp-scratch ${open ? '' : 'collapsed'}`}>
      <div className="vp-sc-frame">
        {editorOk === false
          ? <div className="vp-card"><div className="vp-msg bad">The Scratch editor is not installed. Run <code>npm run vp:scratch-gui</code> and reload.</div></div>
          : <iframe key={level.id} title="Scratch editor" src={`${EDITOR}#${projectId}`} allow="autoplay; microphone; camera; clipboard-write" />}
      </div>
      <aside className="vp-sc-side">
        <button className="vp-sc-toggle" onClick={() => setOpen(!open)} title={open ? 'Hide tasks' : 'Show tasks'}>{open ? '›' : '‹'}</button>
        {open && (
          <>
            <h4>Tasks to check with the teacher</h4>
            <Presentation p={c.presentation} description={c.description} />
            <div className="vp-sc-actions">
              <button className="vp-btn" onClick={() => { onSolved?.(); setDone(true); }}>{done ? '✓ Done' : 'Mark as done'}</button>
              {hasNext && <button className="vp-btn sec" onClick={onNext}>Next level →</button>}
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
