import React, { useState, useEffect, useRef, useCallback } from 'react';
import BlockWorkspace from './BlockWorkspace/BlockWorkspace';
import GameView from './GameEngine/GameView';
import { compileProgram, getNextPosition } from './GameEngine/gameInterpreter.js';
import { ALL_LEVELS, getLevelById, getDefaultLevel } from './levels/index.js';
import { playLmsSound, LMS_SOUND_TYPES } from '../../utils/lmsSounds';
import './BlockGameTask.css';

export default function BlockGameTask({
  task,
  state,
  onTaskCompleted,
  onNextTask,
  onPrevTask,
  standalone = false,
  initialLevelId = null,
}) {
  // Determine starting level
  const resolvedLevelId =
    initialLevelId ||
    task?.levelId ||
    task?.metadata?.levelId ||
    getDefaultLevel().id;

  const [currentLevelId, setCurrentLevelId] = useState(resolvedLevelId);
  const level = getLevelById(currentLevelId);

  // Workspace blocks state
  const [blocks, setBlocks] = useState(() => level.initialBlocks || []);
  const [activeBlockId, setActiveBlockId] = useState(null);

  // Game board state
  const [robotState, setRobotState] = useState(() => ({ ...level.initialRobot }));
  const [cargos, setCargos] = useState(() => [...(level.initialCargos || [])]);
  const [plants, setPlants] = useState(() => [...(level.initialPlants || [])]);

  // Effects state
  const [laserActive, setLaserActive] = useState(false);
  const [waterActive, setWaterActive] = useState(false);

  // Execution state
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionStatus, setExecutionStatus] = useState('idle'); // 'idle' | 'running' | 'completed' | 'failed'
  const [statusMessage, setStatusMessage] = useState('');

  // Resizable split pane state ("kéo ra kéo dô" chia cột giao diện)
  const [splitRatio, setSplitRatio] = useState(52); // percentage for left pane
  const [isResizing, setIsResizing] = useState(false);
  const splitContainerRef = useRef(null);

  const handleStartResize = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handlePointerMove = (e) => {
      if (!splitContainerRef.current) return;
      const rect = splitContainerRef.current.getBoundingClientRect();
      const relativeX = e.clientX - rect.left;
      const newPercent = (relativeX / rect.width) * 100;
      // Clamp between 25% and 75%
      const clamped = Math.max(25, Math.min(75, newPercent));
      setSplitRatio(clamped);
    };

    const handlePointerUp = () => {
      setIsResizing(false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isResizing]);

  // Timer ref for stepping loop
  const executionTimerRef = useRef(null);

  // Load level when currentLevelId changes
  useEffect(() => {
    const nextLevel = getLevelById(currentLevelId);
    setBlocks(nextLevel.initialBlocks || []);
    setRobotState({ ...nextLevel.initialRobot });
    setCargos([...(nextLevel.initialCargos || [])]);
    setPlants([...(nextLevel.initialPlants || [])]);
    setExecutionStatus('idle');
    setStatusMessage('');
    setActiveBlockId(null);
    setIsExecuting(false);
  }, [currentLevelId]);

  // Reset level to initial state
  const handleReset = useCallback(() => {
    if (executionTimerRef.current) {
      clearTimeout(executionTimerRef.current);
      executionTimerRef.current = null;
    }

    setRobotState({ ...level.initialRobot });
    setCargos([...(level.initialCargos || [])]);
    setPlants([...(level.initialPlants || [])]);
    setLaserActive(false);
    setWaterActive(false);
    setIsExecuting(false);
    setActiveBlockId(null);
    setExecutionStatus('idle');
    setStatusMessage('');
  }, [level]);

  // Run program
  const handleRun = useCallback(() => {
    if (isExecuting) return;

    // Reset board before running
    setRobotState({ ...level.initialRobot });
    setCargos([...(level.initialCargos || [])]);
    setPlants([...(level.initialPlants || [])]);
    setLaserActive(false);
    setWaterActive(false);
    setStatusMessage('');
    setExecutionStatus('running');

    let steps;
    try {
      steps = compileProgram(blocks);
    } catch (err) {
      setExecutionStatus('failed');
      setStatusMessage(err.message || 'Error compiling program');
      return;
    }

    if (!steps || steps.length === 0) {
      setExecutionStatus('failed');
      setStatusMessage('Add some commands below "When Start clicked" first!');
      return;
    }

    setIsExecuting(true);
    playLmsSound(LMS_SOUND_TYPES.CLICK);

    // Simulation variables
    let stepIndex = 0;
    let simRobot = { ...level.initialRobot };
    let simCargos = [...(level.initialCargos || [])];
    let simPlants = [...(level.initialPlants || [])];
    const tileSet = new Set((level.grid?.tiles || []).map((t) => `${t.x},${t.y}`));

    const stepDelay = 380; // ms per step

    function executeNextStep() {
      if (stepIndex >= steps.length) {
        // Finished all steps -> Check Win Condition
        setIsExecuting(false);
        setActiveBlockId(null);

        if (level.mode === 'radial') {
          const remainingEvil = simPlants.filter((p) => p.isEvil && !p.destroyed);
          if (remainingEvil.length === 0) {
            setExecutionStatus('completed');
            playLmsSound(LMS_SOUND_TYPES.CORRECT);
            onTaskCompleted?.({
              completionType: 'correct',
              isCorrect: true,
              score: 1,
              maxScore: 1,
              feedback: 'All pest plants destroyed!',
            });
          } else {
            setExecutionStatus('failed');
            playLmsSound(LMS_SOUND_TYPES.WRONG);
            setStatusMessage('Pest plant still alive! Aim laser and destroy it.');
          }
        } else {
          // Grid / Mars mode
          if (simCargos.length === 0) {
            setExecutionStatus('completed');
            playLmsSound(LMS_SOUND_TYPES.CORRECT);
            onTaskCompleted?.({
              completionType: 'correct',
              isCorrect: true,
              score: 1,
              maxScore: 1,
              feedback: 'All cargo collected successfully!',
            });
          } else {
            setExecutionStatus('failed');
            playLmsSound(LMS_SOUND_TYPES.WRONG);
            setStatusMessage(`Mission incomplete! ${simCargos.length} cargo box(es) remaining.`);
          }
        }
        return;
      }

      const step = steps[stepIndex];
      setActiveBlockId(step.blockId);

      // Execute current action
      if (step.action === 'move_forward') {
        const nextPos = getNextPosition(simRobot.x, simRobot.y, simRobot.direction);

        // Check if next tile is on the track
        if (tileSet.has(`${nextPos.x},${nextPos.y}`)) {
          simRobot = { ...simRobot, x: nextPos.x, y: nextPos.y };
          setRobotState({ ...simRobot });
        } else {
          // Off track crash!
          setIsExecuting(false);
          setActiveBlockId(null);
          setExecutionStatus('failed');
          playLmsSound(LMS_SOUND_TYPES.WRONG);
          setStatusMessage('Oops! Robot went off the path.');
          return;
        }
      } else if (step.action === 'point_direction') {
        simRobot = { ...simRobot, direction: step.direction };
        setRobotState({ ...simRobot });
      } else if (step.action === 'take_cargo') {
        // Check if cargo on current tile
        const cargoIndex = simCargos.findIndex((c) => c.x === simRobot.x && c.y === simRobot.y);
        if (cargoIndex >= 0) {
          simCargos.splice(cargoIndex, 1);
          simRobot.carriedCargo = (simRobot.carriedCargo || 0) + 1;
          setCargos([...simCargos]);
          setRobotState({ ...simRobot });
          playLmsSound(LMS_SOUND_TYPES.CORRECT);
        } else {
          // Warning no cargo
          setStatusMessage('No cargo found at current tile!');
        }
      } else if (step.action === 'turn_clockwise') {
        simRobot = { ...simRobot, direction: (simRobot.direction + step.angle) % 360 };
        setRobotState({ ...simRobot });
      } else if (step.action === 'turn_counterclockwise') {
        simRobot = {
          ...simRobot,
          direction: ((simRobot.direction - step.angle) % 360 + 360) % 360,
        };
        setRobotState({ ...simRobot });
      } else if (step.action === 'destroy') {
        setLaserActive(true);
        setTimeout(() => setLaserActive(false), 250);

        // Check plant in target direction
        simPlants = simPlants.map((p) => {
          if (p.angle === simRobot.direction && p.isEvil) {
            return { ...p, destroyed: true };
          }
          return p;
        });
        setPlants([...simPlants]);
      } else if (step.action === 'water') {
        setWaterActive(true);
        setTimeout(() => setWaterActive(false), 250);

        simPlants = simPlants.map((p) => {
          if (p.angle === simRobot.direction && !p.isEvil) {
            return { ...p, isWatered: true };
          }
          return p;
        });
        setPlants([...simPlants]);
      }

      stepIndex += 1;
      executionTimerRef.current = setTimeout(executeNextStep, stepDelay);
    }

    executionTimerRef.current = setTimeout(executeNextStep, 150);
  }, [blocks, isExecuting, level, onTaskCompleted]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (executionTimerRef.current) {
        clearTimeout(executionTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="block-game-task-root">
      {/* Top Level Bar (Level 1, Level 2, Level 7...) */}
      <div className="block-game-level-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontWeight: 800, fontSize: '15px', color: '#f8fafc' }}>
            {level.title}
          </span>
        </div>

        <div className="level-pills-container">
          {ALL_LEVELS.map((lvl) => (
            <button
              key={lvl.id}
              type="button"
              className={`level-pill-btn ${lvl.id === currentLevelId ? 'active' : ''}`}
              onClick={() => setCurrentLevelId(lvl.id)}
              title={lvl.title}
            >
              {lvl.levelNumber || lvl.id.split('_').pop()}
            </button>
          ))}
        </div>
      </div>

      {/* Main Split Screen */}
      <div
        className={`block-game-split-pane ${isResizing ? 'is-resizing' : ''}`}
        ref={splitContainerRef}
      >
        {/* Left: Block Workspace */}
        <div
          className="block-game-pane-left"
          style={{ width: `${splitRatio}%`, flex: 'none' }}
        >
          <BlockWorkspace
            blocks={blocks}
            onChangeBlocks={setBlocks}
            toolboxBlockTypes={level.toolboxBlocks}
            maxCommands={level.maxCommands}
            activeBlockId={activeBlockId}
            isExecuting={isExecuting}
          />
        </div>

        {/* Resizer Divider Bar */}
        <div
          className={`block-game-resizer ${isResizing ? 'active' : ''}`}
          onPointerDown={handleStartResize}
          title="Drag to resize panels (Kéo để chỉnh kích thước)"
        >
          <div className="resizer-handle-grip" />
        </div>

        {/* Right: Game View */}
        <div
          className="block-game-pane-right"
          style={{ width: `calc(${100 - splitRatio}% - 10px)`, flex: 'none' }}
        >
          <GameView
            level={level}
            robotState={robotState}
            cargos={cargos}
            plants={plants}
            isExecuting={isExecuting}
            laserActive={laserActive}
            waterActive={waterActive}
            onRun={handleRun}
            onReset={handleReset}
            executionStatus={executionStatus}
            statusMessage={statusMessage}
          />
        </div>
      </div>
    </div>
  );
}
