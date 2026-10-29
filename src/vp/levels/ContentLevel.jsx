import React, { useEffect, useState } from 'react';

const Html = ({ html }) => <div className="vp-desc" dangerouslySetInnerHTML={{ __html: html }} />;

function Comics({ level, onSolved }) {
  const [i, setI] = useState(0); const pages = level.comics || [];
  useEffect(() => { if (i >= pages.length - 1) onSolved?.(); }, [i]); // eslint-disable-line
  if (!pages.length) return <Html html={level.config.description || ''} />;
  return (
    <div className="vp-comics">
      <img src={pages[i].url} alt="" />
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 10 }}>
        <button className="vp-btn sec" disabled={i === 0} onClick={() => setI(i - 1)}>←</button>
        <span style={{ alignSelf: 'center' }}>{i + 1} / {pages.length}</span>
        <button className="vp-btn sec" disabled={i >= pages.length - 1} onClick={() => setI(i + 1)}>→</button>
      </div>
    </div>
  );
}

function Quiz({ level, onSolved }) {
  const q = level.config.quiz3Data || level.config.quizData || {};
  const choices = q.choices || [];
  const [sel, setSel] = useState([]); const [checked, setChecked] = useState(false);
  const multi = choices.filter((c) => c.correct).length > 1;
  const ok = checked && choices.every((c) => c.correct === sel.includes(c.id));
  const toggle = (id) => { if (checked && ok) return; setChecked(false); setSel(multi ? (sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]) : [id]); };
  const questionImg = q.questionImage?.url || (q.items || []).map((x) => x.image?.url).find(Boolean);
  return (
    <div>
      {q.question && <Html html={q.question.replace(/\n/g, '<br/>')} />}
      {questionImg && <img src={questionImg} alt="" style={{ maxWidth: '100%', maxHeight: 260 }} />}
      {choices.map((c) => {
        const cls = checked ? (c.correct ? 'right' : sel.includes(c.id) ? 'wrong' : '') : (sel.includes(c.id) ? 'sel' : '');
        return (
          <button key={c.id} className={`vp-quiz-choice ${cls}`} onClick={() => toggle(c.id)}>
            {c.image?.url && <img src={c.image.url} alt="" />}<span>{c.text}</span>
          </button>
        );
      })}
      <button className="vp-btn" disabled={!sel.length} onClick={() => { setChecked(true); if (choices.every((c) => c.correct === sel.includes(c.id))) onSolved?.(); }}>Check</button>
      {checked && <div className={`vp-msg ${ok ? 'ok' : 'bad'}`}>{ok ? (level.config.congrat || 'Correct!') : (level.config.fail || 'Not quite. Try again.')}</div>}
      {checked && ok && q.explanation && <Html html={q.explanation} />}
    </div>
  );
}

function Rating({ onSolved }) {
  const [v, setV] = useState(0);
  return (
    <div>
      <p>How did you like this lesson?</p>
      <div className="vp-stars">{[1, 2, 3, 4, 5].map((n) => <button key={n} className={n <= v ? 'on' : ''} onClick={() => { setV(n); onSolved?.(); }}>★</button>)}</div>
    </div>
  );
}

function Typing({ level, onSolved }) {
  const pattern = level.config.pattern || '';
  const [txt, setTxt] = useState('');
  useEffect(() => { if (pattern && txt === pattern) onSolved?.(); }, [txt]); // eslint-disable-line
  return (
    <div>
      <p style={{ fontFamily: 'monospace', fontSize: 22, letterSpacing: 2 }}>{pattern}</p>
      <input value={txt} onChange={(e) => setTxt(e.target.value)} style={{ fontSize: 22, padding: 8, width: '100%', fontFamily: 'monospace' }} autoFocus />
      {txt && pattern.startsWith(txt) ? null : txt ? <div className="vp-msg bad">Check the highlighted text and try again.</div> : null}
      {txt === pattern && <div className="vp-msg ok">{level.config.congrat || 'Well done!'}</div>}
    </div>
  );
}

function Finish({ level, onSolved }) {
  useEffect(() => { onSolved?.(); }, []); // eslint-disable-line
  const c = level.config;
  return <div style={{ textAlign: 'center' }}><h2>🎉 {level.title}</h2><Html html={c.congrat || c.description || ''} /></div>;
}

export default function ContentLevel({ level, onSolved }) {
  const c = level.config;
  switch (level.type) {
    case 'comics': return <Comics level={level} onSolved={onSolved} />;
    case 'quiz3': return <Quiz level={level} onSolved={onSolved} />;
    case 'rating': return <Rating onSolved={onSolved} />;
    case 'typing': return <Typing level={level} onSolved={onSolved} />;
    case 'finish': return <Finish level={level} onSolved={onSolved} />;
    case 'html': return <iframe title={level.title} sandbox="" srcDoc={c.content || ''} style={{ width: '100%', minHeight: 420, border: 0 }} />;
    default: return <Html html={c.description || c.question || ''} />;
  }
}
