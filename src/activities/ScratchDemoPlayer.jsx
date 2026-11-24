import { useEffect, useRef, useState } from 'react';

export default function ScratchDemoPlayer({ project, title }) {
  const frame = useRef(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    function onMessage(event) {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
      if (event.data?.type === 'SCRATCH_DEMO_READY') {
        setReady(true);
        setFailed(false);
        window.clearInterval(poll);
        window.clearTimeout(timeout);
      }
    }

    window.addEventListener('message', onMessage);
    const poll = window.setInterval(() => {
      frame.current?.contentWindow?.postMessage({ type: 'SCRATCH_DEMO_PING' }, window.location.origin);
    }, 300);
    const timeout = window.setTimeout(() => setFailed(true), 30000);
    return () => {
      window.removeEventListener('message', onMessage);
      window.clearInterval(poll);
      window.clearTimeout(timeout);
    };
  }, [attempt]);

  function control(type) {
    const player = frame.current?.contentWindow;
    if (!ready || !player) return;
    if (type === 'SCRATCH_DEMO_RUN') player.focus();
    player.postMessage({ type }, window.location.origin);
  }

  return (
    <section aria-label={title} style={{ width: '100%', background: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px', background: '#e7ebef' }}>
        <button type="button" aria-label="Start demo" disabled={!ready}
          onClick={() => control('SCRATCH_DEMO_RUN')} style={{ color: '#15803d', fontSize: 20 }}>⚑</button>
        <button type="button" aria-label="Stop demo" disabled={!ready}
          onClick={() => control('SCRATCH_DEMO_STOP')}>🛑</button>
        {!ready && <span role="status">{failed ? 'The demo is taking longer than expected.' : 'Loading demo…'}</span>}
        {failed && <button type="button" onClick={() => {
          setFailed(false);
          setAttempt(attempt + 1);
        }}>Retry</button>}
      </div>
      <iframe
        key={attempt}
        ref={frame}
        title={title}
        src={`/scratch-gui/index.html?project=${encodeURIComponent(project)}&isPlayerOnly=true&fitStage=true&bridge=2`}
        allow="autoplay"
        style={{ display: 'block', width: '100%', height: 'max(240px, calc(100dvh - 12rem))', border: 0 }}
      />
    </section>
  );
}
