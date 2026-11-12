import { useEffect, useId, useRef, useState } from 'react';
import BlockWorkspace from './BlockWorkspace/BlockWorkspace.jsx';
import { BLOCK_TYPES, createBlockInstance, countCommands } from './BlockWorkspace/blockDefinitions.js';
import { compileProgram } from './GameEngine/gameInterpreter.js';
import { stepExcursion, initialExcursionRobot, isExcursionComplete } from './GameEngine/excursionSimulation.js';
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
  if (level.buildings) return <svg className="excursion-board" viewBox={level.viewBox} role="img" aria-label={`Construction board, ${robot.built.length} buildings complete`}>
    {level.cells.map(cell => <image key={`${cell.x},${cell.y}`} href="/vp-assets/construction/field.svg" x={cell.x * 51} y={cell.y * 51} width="51" height="51" />)}
    {level.buildings.map((b,i) => <image key={i} href={b.image} x={b.x * 51 - 25} y={b.y * 51 - 25} width="100" height="100" opacity={robot.built.includes(i) ? 1 : 0.3} />)}
    <svg x={robot.x * 51 - 25} y={robot.y * 51 - 25} width="100" height="100" viewBox={`${robot.direction / 90 * 100} 0 100 100`} overflow="hidden"><image href="/vp-assets/construction/iron_sprite.png" width="400" height="100" /></svg>
  </svg>;
  return (
    <svg className="excursion-board" viewBox={level.viewBox || "0 0 400 400"} role="img" aria-label={`${level.cargo ? "Earth" : "Mars"} route, robot at column ${robot.x + 1}, row ${robot.y + 1}`}>
      {level.background && <image href={level.background} width="400" height="400" />}
      {level.cells.map((cell, index) => (
        <g key={`${cell.x},${cell.y}`}>
          <clipPath id={`${id}-tile-${index}`}><rect x={cell.x * 50} y={cell.y * 50} width="50" height="50" /></clipPath>
          <image href={level.tiles || `${ASSETS}tiles.png`} width="250" height="200" x={(cell.x - cell.atlasX) * 50} y={(cell.y - cell.atlasY) * 50} clipPath={`url(#${id}-tile-${index})`} />
        </g>
      ))}
      {robot.rocks?.map((rock, i) => <svg key={`rock-${i}`} x={rock.x * 50} y={rock.y * 50} width="50" height="50" viewBox="0 0 50 50" overflow="hidden"><image href="/vp-assets/excavation/rock.svg" width="300" height="50" /></svg>)}
      {level.target && <image href={`${ASSETS}marker.png`} x={level.target.x * 50 + 0.5} y={level.target.y * 50 + 0.5} width="49" height="49" />}
      {level.portals?.map((portal, i) => <image key={`portal-${i}`} href={level.portalImage} x={portal.x * 50} y={portal.y * 50} width="49" height="49" />)}
      {robot.boxes?.map((box, i) => <image key={`box-${i}`} href={level.boxImage} x={box.x * 50} y={box.y * 50} width="49" height="49" />)}
      <svg x={robot.x * 50 + 1} y={robot.y * 50 - 8} width="49" height="50" viewBox={`${frame * 49} 0 49 50`} overflow="hidden">
        <image href={`${ASSETS}robot.png`} width="980" height="50" />
      </svg>
      {robot.carrying && <image href={level.boxImage} x={robot.x * 50 + 21} y={robot.y * 50 - 15} width="27" height="27" />}
    </svg>
  );
}

export default function ExcursionTask(props) {
  if (props.level.type) return <ExcursionInterlude {...props} />;
  return <ExcursionMaze {...props} />;
}

function ExcursionInterlude({ level, onNextTask, onTaskCompleted }) {
  const [rating, setRating] = useState(null);
  const [slide, setSlide] = useState(0);
  const image = level.images?.[slide] || level.image;
  if (level.type === 'rating' && rating === null) return <section className="excursion-rating" aria-label="Task feedback"><h2>{level.hint}</h2><div>{['Disliked', 'Neutral', 'Liked'].map((label, i) => <button type="button" aria-label={label} key={label} onClick={() => setRating(i)}><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="60" fill="white" /><g fill="#101b26"><circle cx="39" cy="44" r="7" /><circle cx="81" cy="44" r="7" /></g><path d={i === 0 ? 'M33 83 Q60 48 87 83' : i === 1 ? 'M33 76 H87' : 'M33 70 Q60 105 87 70'} fill="none" stroke="#101b26" strokeWidth="9" strokeLinecap="round" /></svg></button>)}</div></section>;
  return <section className="excursion-interlude" aria-label={`${level.activityName || "Excursion"} task ${level.number}`}>
    {image ? <img src={image} alt={level.hint} /> : <div><h2>{level.type === 'finish' ? level.hint : 'Thanks!'}</h2>{level.type !== 'finish' && <p>We love having cool lessons!</p>}</div>}
    <button type="button" onClick={() => { if (level.images && slide < level.images.length - 1) { setSlide(slide + 1); return; } onTaskCompleted?.({ isCorrect: true, completionType: 'correct', score: 1, maxScore: 1 }); onNextTask?.(); }}>Next</button>
  </section>;
}

function ExcursionMaze({ level, onNextTask, onTaskCompleted }) {
  const [blocks, setBlocks] = useState(() => {
    const make = b => ({ ...createBlockInstance(b.type), params: { ...createBlockInstance(b.type).params, ...b.params }, ...(b.children ? { children: b.children.map(make) } : {}) });
    const hat = createBlockInstance(BLOCK_TYPES.START_HAT);
    return [hat, ...(level.starter || []).map(make)];
  });
  const [robot, setRobot] = useState(() => initialExcursionRobot(level));
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
    setRobot(initialExcursionRobot(level));
    setActiveBlockId(null);
    setStatus('idle');
    setMessage('');
  }

  function run() {
    reset();
    if (level.maxCommands && countCommands(blocks) > level.maxCommands) { setStatus('failed'); setMessage(`Use no more than ${level.maxCommands} commands.`); return; }
    let steps;
    try { steps = compileProgram(blocks); }
    catch (error) { setStatus('failed'); setMessage(error.message); return; }
    if (!steps.length) { setGuide('workspace'); return; }
    setStatus('running');
    let current = initialExcursionRobot(level);
    let index = 0;
    function advance() {
      if (index >= steps.length) {
        setActiveBlockId(null);
        if (isExcursionComplete(level, current)) {
          setStatus('completed');
        } else {
          setStatus('failed');
          setMessage(level.cargo ? 'Deliver all the boxes to the portals. Check your commands and try again.' : 'The robot has not reached the marked destination. Check your commands and try again.');
        }
        return;
      }
      if (isExcursionComplete(level, current)) { setStatus('completed'); setActiveBlockId(null); return; }
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
    <section className={`excursion-task ${level.loops ? "excursion-loop-task" : ""}`} ref={root} aria-label={`${level.activityName || "Excursion"} task ${level.number}`}>
      <div className="excursion-editor" style={{ width: `${split}%` }}>
        <BlockWorkspace blocks={blocks} onChangeBlocks={setBlocks} toolboxBlockTypes={[...COMMANDS, ...(level.cargoCommands ? [BLOCK_TYPES.TAKE_CARGO, BLOCK_TYPES.PUT_CARGO] : []), ...(level.loops ? [{ type: BLOCK_TYPES.REPEAT, params: { times: level.repeatDefault || 4 } }] : []), ...(level.rocks ? [BLOCK_TYPES.DESTROY] : []), ...(level.buildings ? [...new Set(level.buildings.map(b => `build_${b.kind}`))] : [])]} maxCommands={level.maxCommands ?? null} compact activeBlockId={activeBlockId} isExecuting={status === 'running'} />
      </div>
      <div className="excursion-divider" role="separator" aria-label="Resize code and game panels" aria-orientation="vertical" onPointerDown={startResize} />
      <div className={`excursion-stage ${level.loops ? "excursion-forest" : ""}`} style={level.pattern ? { backgroundImage: `url("${level.pattern}")`, backgroundColor: level.stageColor, backgroundSize: level.buildings ? "cover" : undefined } : undefined}>
        <div className="excursion-world" style={level.scenery ? { backgroundImage: `url("${level.scenery}")` } : undefined}><ReferenceBoard level={level} robot={robot} /></div>
        <div className="excursion-controls">
          <button className="excursion-play" type="button" aria-label={status === 'running' ? 'Stop program' : 'Run program'} onClick={status === 'running' ? reset : run}>
            {status === 'running' ? <span className="excursion-stop-icon" /> : <span className="excursion-play-icon" />}
          </button>
          <p>{level.hint}</p>{level.cargo && <p className="excursion-cargo-count" aria-live="polite">Boxes delivered: {robot.delivered} / {level.cargo.length}{robot.carrying ? " · Carrying one box" : ""}</p>}
          <button className="excursion-guide-link" type="button" onClick={() => setGuide('intro')}>Show instructions</button>
        </div>
      </div>
      {(guide || status === 'completed' || status === 'failed') && (
        <div className={`excursion-overlay ${guide === 'workspace' ? 'excursion-overlay-workspace' : ''}`}>
          <div className="excursion-dialog" role="dialog" aria-modal="true" aria-label={guide ? 'Task instructions' : status === 'completed' ? 'Congratulations!' : 'Try again'}>
            {(guide === 'intro' || !guide) && <img className="excursion-mascot" src={`${ASSETS}mascot.svg`} alt="" />}
            {!guide && <h2>{status === 'completed' ? 'Congratulations!' : 'Try again'}</h2>}
            <p>{guide ? guideText : status === 'completed' ? level.success : message}</p>
            {guide === 'intro' && level.number === 1 && !level.cargo && !level.buildings && <img className="excursion-intro-diagram" src={`${ASSETS}intro.svg`} alt="Lead the robot to the marked station" />}
            {guide === "intro" && level.instructionImage && <img className="excursion-instruction-image" src={level.instructionImage} alt="Repeat six times: move forward" />}
            <div className="excursion-dialog-actions">
              <button type="button" onClick={() => {
                if (guide) setGuide(guide === 'intro' && level.number === 1 && !level.cargo && !level.buildings ? 'workspace' : guide === 'workspace' ? 'run' : null);
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
