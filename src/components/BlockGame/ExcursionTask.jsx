import { useEffect, useId, useRef, useState } from 'react';
import BlockWorkspace from './BlockWorkspace/BlockWorkspace.jsx';
import { BLOCK_TYPES, createBlockInstance } from './BlockWorkspace/blockDefinitions.js';
import { compileProgram } from './GameEngine/gameInterpreter.js';
import { stepExcursion } from './GameEngine/excursionSimulation.js';
import './ExcursionTask.css';

const ASSETS = '/vp-assets/excursion/';
const COMMANDS = [
  BLOCK_TYPES.MOVE_FORWARD,
  { type: BLOCK_TYPES.TURN_DIRECTION, params: { direction: 'left' } },
  { type: BLOCK_TYPES.TURN_DIRECTION, params: { direction: 'right' } },
];


function ReferenceBoard({ level, robot }) {
  const id = useId().replace(/:/g, '');
  const frame = ({ 0: 0, 90: 4, 180: 8, 270: 12 })[robot.direction] ?? 8;
  return (
    <svg className="excursion-board" viewBox="0 0 400 400" role="img" aria-label={`Mars route, robot at column ${robot.x + 1}, row ${robot.y + 1}`}>
      <image href={level.background} width="400" height="400" />
      {level.cells.map((cell, index) => (
        <g key={`${cell.x},${cell.y}`}>
          <clipPath id={`${id}-tile-${index}`}><rect x={cell.x * 50} y={cell.y * 50} width="50" height="50" /></clipPath>
          <image href={`${ASSETS}tiles.png`} width="250" height="200" x={(cell.x - cell.atlasX) * 50} y={(cell.y - cell.atlasY) * 50} clipPath={`url(#${id}-tile-${index})`} />
        </g>
      ))}
      <image href={`${ASSETS}marker.png`} x={level.target.x * 50 + 0.5} y={level.target.y * 50 + 0.5} width="49" height="49" />
      <svg x={robot.x * 50 + 1} y={robot.y * 50 - 8} width="49" height="50" viewBox={`${frame * 49} 0 49 50`} overflow="hidden">
        <image href={`${ASSETS}robot.png`} width="980" height="50" />
      </svg>
    </svg>
  );
}

export default function ExcursionTask({ level, onNextTask, onTaskCompleted }) {
  const [blocks, setBlocks] = useState(() => [createBlockInstance(BLOCK_TYPES.START_HAT)]);
  const [robot, setRobot] = useState(level.start);
  const [activeBlockId, setActiveBlockId] = useState(null);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [guide, setGuide] = useState('intro');
  const [split, setSplit] = useState(60);
  const timer = useRef(null);
  const root = useRef(null);
  const resize = useRef(null);

  useEffect(() => () => {
    clearTimeout(timer.current);
    resize.current?.();
  }, []);

  function reset() {
    clearTimeout(timer.current);
    setRobot(level.start);
    setActiveBlockId(null);
    setStatus('idle');
    setMessage('');
  }

  function run() {
    reset();
    const steps = compileProgram(blocks);
    if (!steps.length) { setGuide('workspace'); return; }
    setStatus('running');
    let current = { ...level.start };
    let index = 0;
    function advance() {
      if (index >= steps.length) {
        setActiveBlockId(null);
        if (current.x === level.target.x && current.y === level.target.y) {
          setStatus('completed');
        } else {
          setStatus('failed');
          setMessage('The robot has not reached the marked destination. Check your commands and try again.');
        }
        return;
      }
      const step = steps[index++];
      setActiveBlockId(step.blockId);
      try { current = stepExcursion(level, current, step); setRobot(current); }
      catch (error) { setStatus('failed'); setMessage(error.message); setActiveBlockId(null); return; }
      timer.current = setTimeout(advance, 380);
    }
    timer.current = setTimeout(advance, 100);
  }

  function startResize(event) {
    event.preventDefault();
    const move = e => {
      const rect = root.current?.getBoundingClientRect();
      if (rect) setSplit(Math.max(35, Math.min(70, (e.clientX - rect.left) / rect.width * 100)));
    };
    const stop = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', stop); resize.current = null; };
    resize.current?.();
    resize.current = stop;
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop, { once: true });
  }

  const guideText = guide === 'workspace'
    ? 'This is where all the available commands are; drag them to the right and pin one to the other.'
    : guide === 'run' ? 'Create your own sequence of commands and click this button to start the program.' : level.hint;

  return (
    <section className="excursion-task" ref={root} aria-label={`Excursion task ${level.number}`}>
      <div className="excursion-editor" style={{ width: `${split}%` }}>
        <BlockWorkspace blocks={blocks} onChangeBlocks={setBlocks} toolboxBlockTypes={COMMANDS} maxCommands={null} compact activeBlockId={activeBlockId} isExecuting={status === 'running'} />
      </div>
      <div className="excursion-divider" role="separator" aria-label="Resize code and game panels" aria-orientation="vertical" onPointerDown={startResize} />
      <div className="excursion-stage">
        <div className="excursion-world"><ReferenceBoard level={level} robot={robot} /></div>
        <div className="excursion-controls">
          <button className="excursion-play" type="button" aria-label={status === 'running' ? 'Stop program' : 'Run program'} onClick={status === 'running' ? reset : run}>
            {status === 'running' ? <span className="excursion-stop-icon" /> : <span className="excursion-play-icon" />}
          </button>
          <p>{level.hint}</p>
          <button className="excursion-guide-link" type="button" onClick={() => setGuide('intro')}>Show instructions</button>
        </div>
      </div>
      {(guide || status === 'completed' || status === 'failed') && (
        <div className={`excursion-overlay ${guide === 'workspace' ? 'excursion-overlay-workspace' : ''}`}>
          <div className="excursion-dialog" role="dialog" aria-modal="true" aria-label={guide ? 'Task instructions' : status === 'completed' ? 'Congratulations!' : 'Try again'}>
            {(guide === 'intro' || !guide) && <img className="excursion-mascot" src={`${ASSETS}mascot.svg`} alt="" />}
            {!guide && <h2>{status === 'completed' ? 'Congratulations!' : 'Try again'}</h2>}
            <p>{guide ? guideText : status === 'completed' ? level.success : message}</p>
            {guide === 'intro' && level.number === 1 && <img className="excursion-intro-diagram" src={`${ASSETS}intro.svg`} alt="Lead the robot to the marked station" />}
            <div className="excursion-dialog-actions">
              <button type="button" onClick={() => {
                if (guide) setGuide(guide === 'intro' && level.number === 1 ? 'workspace' : guide === 'workspace' ? 'run' : null);
                else if (status === 'completed') { onTaskCompleted?.({ isCorrect: true, completionType: 'correct', score: 1, maxScore: 1 }); onNextTask?.(); }
                else reset();
              }}>{guide || status === 'completed' ? 'Continue' : 'Try again'}</button>
              {!guide && status === 'completed' && <button className="excursion-secondary" type="button" onClick={reset}>Go again</button>}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
