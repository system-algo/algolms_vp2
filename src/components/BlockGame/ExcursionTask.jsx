import { useEffect, useId, useRef, useState } from 'react';
import BlockWorkspace from './BlockWorkspace/BlockWorkspace.jsx';
import { BLOCK_TYPES, createBlockInstance, countCommands } from './BlockWorkspace/blockDefinitions.js';
import { referenceProgram } from './GameEngine/referenceProgram.js';
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
  if (level.mode === 'retro') return <div className="retro-laboratory" aria-label="Retro laboratory crystal conveyor">
    <h3>Retro laboratory</h3><div className="retro-monitors">{['A','B','C','D'].map(name=><div key={name}>{name}: <output>{robot.variables[name] ?? '—'}</output></div>)}</div>
    <div className="retro-machine"><span aria-hidden="true">◉ ▥ ◉</span><p>Crystal {robot.crystalIndex+1}</p><output aria-label="Current crystal size">{robot.crystals[robot.crystalIndex].size}</output></div>
    <div className="retro-conveyor">{robot.crystals.slice(robot.crystalIndex,robot.crystalIndex+5).map((c,i)=><div className={`retro-crystal ${i===0?'retro-current':''}`} key={i} style={{'--crystal-color':c.color==='red'?'#f25879':c.color==='green'?'#5adba4':'#5eabf3'}}><svg width="55" height="75" viewBox="0 0 55 75" aria-label={`${c.color} crystal`}><path d="M27 2 48 20 53 53 27 73 3 53 8 20Z" fill="var(--crystal-color)" stroke="white" strokeWidth="2"/><path d="M27 2 16 24 18 54 27 73 38 54 39 24Z" fill="white" opacity=".25"/></svg><b>{c.size}</b></div>)}</div>
    <p>{robot.sent===null?'Measure · calculate · send':`Value sent: ${robot.sent}`}</p>
  </div>;
  if (level.mode === 'field') return <svg className="excursion-board" viewBox="0 0 600 460" role="img" aria-label="Soccer field coordinate regions">
    <rect x="20" y="20" width="560" height="420" rx="20" fill="#301d31" stroke="#518d74" strokeWidth="4" />
    {Array.from({length:17},(_,i)=>i*30-240).map(x=><g key={`x${x}`}><line x1={300+x} y1="30" x2={300+x} y2="430" stroke={x===0?'white':'#66525c'}/>{x%60===0&&x!==0&&<text x={300+x} y="246" fill="white" fontSize="11" textAnchor="middle">{x}</text>}</g>)}
    {Array.from({length:13},(_,i)=>i*30-180).map(y=><g key={`y${y}`}><line x1="30" y1={230-y} x2="570" y2={230-y} stroke={y===0?'white':'#66525c'}/>{y%60===0&&y!==0&&<text x="306" y={234-y} fill="white" fontSize="11">{y}</text>}</g>)}
    {level.objects.map((o,i)=>!robot.destroyed.includes(i)&&<g key={i}><image href={`https://learn.alg.academy/img/games/weed/${o.kind}_object.png`} x={300+o.x-15} y={230-o.y-15} width="30" height="30"/>{i===robot.fruitIndex&&<circle cx={300+o.x} cy={230-o.y} r="23" fill="none" stroke="#ffcf32" strokeWidth="3"/>}</g>)}
  </svg>;
  if (level.mode === 'chef') return <div className="chef-stage">
    <svg className="excursion-board" viewBox="0 0 600 560" role="img" aria-label={`Martian Chef, ingredient ${Math.min(robot.fruitIndex + 1, level.fruits.length)} of ${level.fruits.length}`}>
      <image href="https://learn.alg.academy/img/games/fruits/holodilnik.png" x="377" y="192" width="200" height="288" />
      <image href="https://learn.alg.academy/img/games/fruits/povar.png" x="264" y="166" width="139" height="217" />
      <image href="https://learn.alg.academy/img/games/fruits/table.png" x="113" y="355" width="285" height="137" />
      <image href="https://learn.alg.academy/img/games/fruits/borsch.png" x="180" y="429" width="173" height="121" />
      <image href="https://learn.alg.academy/img/games/fruits/tube.png" width="429" height="362" />
      {level.fruits.slice(robot.fruitIndex, robot.fruitIndex + 7).map((fruit, i) => <image key={i} href={`https://learn.alg.academy/img/games/fruits/${fruit.name}.png`} width="75" height="75" x={i < 3 ? 20 : 20 + (i - 2) * 75} y={i < 3 ? 277 - i * 75 : 52} />)}
    </svg><p>Ingredients processed: {robot.fruitIndex} / {level.fruits.length} · Cooked: {robot.cooked.length}</p>
  </div>;
  if (level.mode === 'coordinates') return <svg className="excursion-board excursion-coordinate-board" viewBox="0 0 798 704" role="img" aria-label={`Rocket at ${robot.x}, ${robot.y}`}>
    <image href="/vp-assets/flight/tablet.png" width="798" height="704" />
    {Array.from({ length: 9 }, (_, i) => i - 4).filter(n => n).map(n => <text key={`x${n}`} x={427 + n * 40} y="388" fill="white" fontSize="13" textAnchor="middle">{n * 2 * level.unit}</text>)}
    {Array.from({ length: 7 }, (_, i) => i - 3).filter(n => n).map(n => <text key={`y${n}`} x="439" y={373 - n * 40} fill="white" fontSize="13">{n * 2 * level.unit}</text>)}
    {level.points.map((p, i) => <circle key={i} cx={427 + p.x / level.unit * 20} cy={369 - p.y / level.unit * 20} r="3" fill={robot.visited.includes(i) ? '#fff' : '#ff6300'} />)}
    <image href="/vp-assets/flight/rocket.svg" width="20" height="20" x={417 + robot.x / level.unit * 20} y={359 - robot.y / level.unit * 20} />
  </svg>;
  if (level.plants) return <svg className="excursion-board" viewBox="0 0 540 540" role="img" aria-label={`Greenhouse laser pointing ${robot.direction} degrees`}>
    {level.decorations.map((d, i) => <image key={`deco-${i}`} href={d.image} x={d.x} y={d.y} width={d.width} height={d.height} />)}
    {robot.plants.filter(p => !p.removed).map(p => <image key={p.angle} href={p.image} x={p.x} y={p.y} width={p.width} height={p.height} />)}
    {robot.beam && <line x1="270" y1="270" x2={270 + 180 * Math.sin(robot.direction * Math.PI / 180)} y2={270 - 180 * Math.cos(robot.direction * Math.PI / 180)} stroke={robot.beam === 'water' ? '#00baff' : '#36ef18'} strokeWidth="7" opacity="0.85" />}
    <image href="/vp-assets/plants/gun.89a0db426da095bc51af.png" x="180" y="180" width="180" height="180" transform={`rotate(${robot.direction} 270 270)`} />
  </svg>;
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
      {robot.minerals?.filter(m=>m.amount>0).map((m,i)=><g key={`mineral-${i}`}><svg x={m.x*50} y={m.y*50-10} width="50" height="50" viewBox="0 0 50 50" overflow="hidden"><image href="https://learn.alg.academy/img/games/maze/lesson11/crystall.svg" width="200" height="50" /></svg><ellipse cx={m.x*50+27} cy={m.y*50+27} rx="12" ry="10" fill="white"/><text x={m.x*50+27} y={m.y*50+32} textAnchor="middle" fontSize="14" fontWeight="bold">{level.hideMineralCounts?'?':m.amount}</text></g>)}
      {level.items?.map((item,i) => {
        const present = robot.tanks?.some(t=>t.x===item.x&&t.y===item.y);
        const hidden = item.kind === 'hidden' && !robot.revealed?.includes(`${item.x},${item.y}`);
        if (item.kind !== 'dynamite' && !present && !hidden) return null;
        const frame = hidden ? item.group - 68 : item.kind === 'dynamite' ? 1 : 14;
        return <svg key={`item-${i}`} x={item.x*50} y={item.y*50} width="50" height="50" viewBox={`${frame*50} 0 50 50`} overflow="hidden"><image href="https://learn.alg.academy/img/games/maze/lesson6/objects.svg" width="750" height="50" /></svg>;
      })}
      {level.target && <image href={`${ASSETS}marker.png`} x={level.target.x * 50 + 0.5} y={level.target.y * 50 + 0.5} width="49" height="49" />}
      {level.portals?.map((portal, i) => <image key={`portal-${i}`} href={portal.image || level.portalImage} x={portal.x * 50} y={portal.y * 50} width="49" height="49" />)}
      {robot.boxes?.map((box, i) => <image key={`box-${i}`} href={box.image || level.boxImage} x={box.x * 50} y={box.y * 50} width="49" height="49" />)}
      <svg x={robot.x * 50 + 1} y={robot.y * 50 - 8} width="49" height="50" viewBox={`${frame * 49} 0 49 50`} overflow="hidden">
        <image href={`${ASSETS}robot.png`} width="980" height="50" />
      </svg>
      {robot.carrying && <image href={level.boxImage} x={robot.x * 50 + 21} y={robot.y * 50 - 15} width="27" height="27" />}
    </svg>
  );
}

export default function ExcursionTask(props) {
  if (props.level.type === 'typing') return <CoordinateTyping {...props} />;
  if (props.level.type) return <ExcursionInterlude {...props} />;
  return <ExcursionMaze {...props} />;
}

function CoordinateTyping({ level, onNextTask, onTaskCompleted }) {
  const [text, setText] = useState('');
  const correct = text.trim().replace(/\s+/g, ' ') === level.text;
  return <section className="excursion-interlude excursion-typing"><h2>{level.hint}</h2><pre>{level.text}</pre><textarea aria-label="Type the negative numbers" autoComplete="off" spellCheck="false" value={text} onChange={e => setText(e.target.value)} /><button disabled={!correct} onClick={() => { onTaskCompleted?.({ isCorrect: true, score: 1, maxScore: 1 }); onNextTask?.(); }}>Continue</button></section>;
}

function ExcursionInterlude({ level, onNextTask, onTaskCompleted }) {
  if (level.type === 'source') return <section className="excursion-interlude"><h2>{level.hint}</h2><a href={level.sourceUrl} target="_blank" rel="noreferrer">Open original activity</a><button type="button" onClick={onNextTask}>Next</button></section>;
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
    let iterator;
    try { steps = level.dynamic ? [] : compileProgram(blocks); }
    catch (error) { setStatus('failed'); setMessage(error.message); return; }
    if (!level.dynamic && !steps.length) { setGuide('workspace'); return; }
    setStatus('running');
    let current = initialExcursionRobot(level);
    if(level.dynamic) iterator = referenceProgram(blocks,level,()=>current);
    let index = 0;
    function advance() {
      let next;
      try { next = iterator ? iterator.next() : {done:index>=steps.length,value:steps[index++]}; } catch(error) {setStatus('failed');setMessage(error.message);return;}
      if (next.done) {
        setActiveBlockId(null);
        if (isExcursionComplete(level, current)) {
          setStatus('completed');
        } else {
          setStatus('failed');
          setMessage(level.mode === 'retro' ? 'Send the correct value to the base using a variable.' : level.mode === 'minerals' ? 'Collect the required minerals. Check your variable values, mine commands and loop conditions.' : level.mode === 'field' ? 'Process every point, remove all weeds and preserve the healthy plants.' : level.mode === 'chef' ? 'Process every ingredient using forever, if and the logical conditions.' : level.mode === 'coordinates' ? 'Visit every orange landing point. Check the X and Y coordinates.' : level.plants ? 'Destroy the pest plants and water every small sprout. Check the direction of the laser.' : level.cargo ? 'Deliver all the boxes to the portals. Check your commands and try again.' : 'The robot has not reached the marked destination. Check your commands and try again.');
        }
        return;
      }
      if (isExcursionComplete(level, current)) { setStatus('completed'); setActiveBlockId(null); return; }
      const step = next.value;
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
    <section className={`excursion-task ${level.loops ? "excursion-loop-task" : ""} ${level.mode === "coordinates" ? "excursion-coordinate-task" : level.plants ? "excursion-plants-task" : ""}`} ref={root} aria-label={`${level.activityName || "Excursion"} task ${level.number}`}>
      <div className="excursion-editor" style={{ width: `${split}%` }}>
        <BlockWorkspace blocks={blocks} onChangeBlocks={setBlocks} toolboxBlockTypes={level.toolbox || [...(level.mode === 'coordinates' ? [`go_to_${level.unit}`] : level.plants ? [BLOCK_TYPES.TURN_CLOCKWISE, BLOCK_TYPES.TURN_COUNTERCLOCKWISE] : level.collectOnly ? [BLOCK_TYPES.MOVE_FORWARD, 'collect_direction', BLOCK_TYPES.TAKE_CARGO] : COMMANDS), ...(level.cargoCommands ? [BLOCK_TYPES.TAKE_CARGO, BLOCK_TYPES.PUT_CARGO] : []), ...(level.loops ? [{ type: BLOCK_TYPES.REPEAT, params: { times: level.repeatDefault || 4 } }] : []), ...(level.plants ? [BLOCK_TYPES.DESTROY, BLOCK_TYPES.WATER] : level.rocks ? [BLOCK_TYPES.DESTROY] : []), ...(level.buildings ? [...new Set(level.buildings.map(b => `build_${b.kind}`))] : [])]} maxCommands={level.maxCommands ?? null} compact activeBlockId={activeBlockId} isExecuting={status === 'running'} />
      </div>
      <div className="excursion-divider" role="separator" aria-label="Resize code and game panels" aria-orientation="vertical" onPointerDown={startResize} />
      <div className={`excursion-stage ${level.loops ? "excursion-forest" : ""}`} style={level.pattern ? { backgroundImage: `url("${level.pattern}")`, backgroundColor: level.stageColor, backgroundSize: level.buildings ? "cover" : undefined } : undefined}>
        <div className="excursion-world" style={level.scenery ? { backgroundImage: `url("${level.scenery}")` } : undefined}><ReferenceBoard level={level} robot={robot} /></div>
        <div className="excursion-controls">
          <button className="excursion-play" type="button" aria-label={status === 'running' ? 'Stop program' : 'Run program'} onClick={status === 'running' ? reset : run}>
            {status === 'running' ? <span className="excursion-stop-icon" /> : <span className="excursion-play-icon" />}
          </button>
          <p>{level.hint}</p>{robot.variables&&<p aria-live="polite">{Object.entries(robot.variables).map(([name,value])=>`${name} = ${value}`).join(' · ')}{level.mode==='minerals'&&` · Minerals collected: ${robot.collected}${level.targetMinerals?` / ${level.targetMinerals}`:''}`}</p>}{level.cargo && <p className="excursion-cargo-count" aria-live="polite">{level.collectOnly ? 'Boxes collected' : 'Boxes delivered'}: {robot.delivered} / {level.cargo.length}{robot.carrying ? " · Carrying one box" : ""}</p>}
          <button className="excursion-guide-link" type="button" onClick={() => setGuide('intro')}>Show instructions</button>
        </div>
      </div>
      {(guide || status === 'completed' || status === 'failed') && (
        <div className={`excursion-overlay ${guide === 'workspace' ? 'excursion-overlay-workspace' : ''}`}>
          <div className="excursion-dialog" role="dialog" aria-modal="true" aria-label={guide ? 'Task instructions' : status === 'completed' ? 'Congratulations!' : 'Try again'}>
            {(guide === 'intro' || !guide) && <img className="excursion-mascot" src={`${ASSETS}mascot.svg`} alt="" />}
            {!guide && <h2>{status === 'completed' ? 'Congratulations!' : 'Try again'}</h2>}
            <p>{guide ? guideText : status === 'completed' ? (level.success || 'Task completed!') : message}</p>
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
