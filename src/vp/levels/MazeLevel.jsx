import React, { useEffect, useMemo, useRef, useState } from 'react';
import BlockEditor from '../maze/BlockEditor.jsx';
import { createMazeView } from '../maze/mazeView.js';
import { runProgram, settingsFromConfig } from '../maze/mazeEngine.js';
import { parseBlocklyXml } from '../maze/blocklyXml.js';
import { makeBlock, withIds } from '../maze/blockDefs.js';

function initialRoot(config) {
  const tops = parseBlocklyXml(config.defaultCode);
  const start = tops.find((b) => b.type === 'maze_start');
  return start ? withIds(start) : makeBlock('maze_start');
}

const FAIL_TEXT = {
  fail_forward: "The robot can't go that way.", fail_backward: "The robot can't go that way.",
  fail_take: 'There is nothing to take here.', fail_put: 'The cargo cannot be put here.',
  fail_check_cargo: 'The robot is not carrying any cargo.', fail_undefined_variable: 'The variable has no value yet.',
  fail: 'That command does not work here.', timeout: 'The program runs too long. Check for an endless loop.',
};

export default function MazeLevel({ level, onSolved, onNext, hasNext }) {
  const config = level.config;
  const settings = useMemo(() => settingsFromConfig(config), [config]);
  const boxRef = useRef(null);
  const viewRef = useRef(null);
  const [root, setRoot] = useState(() => initialRoot(config));
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    setRoot(initialRoot(config)); setResult(null); setRunning(false);
    viewRef.current = createMazeView(boxRef.current, config);
    return () => viewRef.current?.destroy();
  }, [level.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = async () => {
    if (running) return;
    setResult(null); viewRef.current.reset(); setRunning(true);
    let r;
    try { r = runProgram(settings, root.next); } catch (e) { setRunning(false); setResult({ ok: false, text: `Unsupported block: ${e.message}` }); return; }
    await viewRef.current.play(r.state.frames, { speed: config.animationSpeed || 7 });
    setRunning(false);
    if (r.done) { setResult({ ok: true, text: config.congrat || 'Well done!' }); onSolved?.(); }
    else setResult({ ok: false, text: r.error ? (FAIL_TEXT[r.error] || config.fail) : (config.fail || 'Something went wrong... Try again.'), hint: config.hint });
  };
  const reset = () => { viewRef.current.reset(); setResult(null); setRunning(false); };

  return (
    <div className="vp-card">
      {config.description && <div className="vp-desc" dangerouslySetInnerHTML={{ __html: config.description }} />}
      {config.description_image && <img src={config.description_image} alt="" style={{ maxWidth: '100%' }} />}
      <div className="vp-maze">
        <div>
          <div className="vp-maze-box" ref={boxRef} />
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button className="vp-btn" onClick={run} disabled={running}>▶ Run</button>
            <button className="vp-btn sec" onClick={reset}>↺ Reset</button>
            {result?.ok && hasNext && <button className="vp-btn" onClick={onNext}>Next level →</button>}
          </div>
          {result && <div className={`vp-msg ${result.ok ? 'ok' : 'bad'}`}>{result.text}{!result.ok && result.hint ? <div style={{ fontWeight: 600, marginTop: 4 }}>{result.hint}</div> : null}</div>}
        </div>
        <BlockEditor root={root} onChange={(r) => { setRoot(r); }} commands={settings.commands} disabled={running} limit={settings.limit ? +settings.limit : null} />
      </div>
    </div>
  );
}
